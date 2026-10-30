import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { config } from "@/lib/config";
import type { Frekuensi } from "@/lib/indikator";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import {
  akhiriUnitPelapor,
  aturAktifIndikator,
  hapusUnitPelapor,
  tambahIndikator,
  tambahUnitPelapor,
} from "@/modules/indikator/service";
import { tambahPengguna } from "@/modules/pengguna/service";
import { ajukanPengukuran, ambilIsian, daftarIsian, simpanPengukuran, unitPengisi } from "@/modules/pengukuran/service";
import { aturAktifUnit, tambahUnit } from "@/modules/unit/service";

let admin: Pengguna;
before(async () => {
  admin = (await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.7.0.1" })))!;
});

// Satu database untuk semua tes: nama Unit, kode Indikator, dan username dibuat unik.
const unik = (awalan: string) => `${awalan}-${randomUUID().slice(0, 8)}`;
const SANDI = "sandi-awal-1";

async function penggunaBaru(peran: Peran, unitIds: string[] = []) {
  const username = unik(peran);
  await tambahPengguna(admin, { username, nama: `Nama ${username}`, sandi: SANDI, peran, unitIds });
  return (await penggunaDariToken(await masuk({ username, sandi: SANDI, ip: "10.7.0.2" })))!;
}

async function indikatorBaru(ubah: { faktor?: number; frekuensi?: Frekuensi } = {}) {
  const komite = await penggunaBaru("komiteMutu");
  const id = await tambahIndikator(komite, {
    kode: unik("IMP"),
    kelompok: "IMP-RS",
    nama: "Kepatuhan identifikasi pasien sebelum tindakan",
    definisiOperasional: "Identifikasi dengan dua penanda sebelum setiap tindakan.",
    definisiNumerator: "Jumlah tindakan dengan identifikasi benar",
    definisiDenominator: "Jumlah tindakan yang diobservasi",
    sumberData: "Lembar observasi",
    faktor: ubah.faktor ?? 100,
    satuan: "%",
    arah: "makinTinggi",
    frekuensi: ubah.frekuensi ?? "bulanan",
    pic: "",
    target: { nilai: 100, berlakuMulai: "2026-01" },
  });
  return { id, komite };
}

/** Unit baru yang menjadi Unit Pelapor Indikator baru mulai Januari 2026, beserta Petugas Input Data-nya. */
async function siapkan(ubah: Parameters<typeof indikatorBaru>[0] = {}) {
  const unit = await tambahUnit(admin, { nama: unik("ICU") });
  const { id: indikatorId, komite } = await indikatorBaru(ubah);
  const unitPelaporId = await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai: "2026-01" });
  const petugas = await penggunaBaru("petugasInputData", [unit.id]);
  return { unit, indikatorId, komite, unitPelaporId, petugas };
}

describe("isi dan ajukan Pengukuran", () => {
  it("Petugas menyimpan Draf; pengisi diambil dari sesi; daftar isian menampilkan statusnya", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const lain = await penggunaBaru("petugasInputData", [unit.id]);
    const isian = { indikatorId, unitId: unit.id, bulan: "2026-03", n: 9, d: 10, catatan: " Observasi pagi " };

    const sebelum = await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-03" });
    assert.deepEqual(
      sebelum.map((i) => [i.indikator.id, i.status]),
      [[indikatorId, null]],
    );

    // Field pengisi dari isian diabaikan.
    const hasil = await simpanPengukuran(petugas, { ...isian, pengisiId: lain.id } as typeof isian);
    assert.equal(hasil.status, "draf");

    const detail = await ambilIsian(petugas, { indikatorId, unitId: unit.id, bulan: "2026-03" });
    assert.equal(detail.pengukuran?.id, hasil.id);
    assert.equal(detail.pengukuran?.n, 9);
    assert.equal(detail.pengukuran?.d, 10);
    assert.equal(detail.pengukuran?.catatan, "Observasi pagi");
    assert.equal(detail.pengukuran?.status, "draf");
    assert.equal(detail.pengukuran?.pengisi, petugas.nama);

    const sesudah = await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-03" });
    assert.deepEqual(
      sesudah.map((i) => [i.indikator.id, i.status]),
      [[indikatorId, "draf"]],
    );
  });

  it("mengisi ulang Indikator, Unit, dan bulan yang sama mengubah Pengukuran yang sama", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-04" };
    const pertama = await simpanPengukuran(petugas, { ...kunci, n: 3, d: 10, catatan: "salah hitung" });
    const kedua = await simpanPengukuran(petugas, { ...kunci, n: 7, d: 10 });

    assert.equal(kedua.id, pertama.id);
    const { pengukuran } = await ambilIsian(petugas, kunci);
    assert.deepEqual([pengukuran?.n, pengukuran?.d, pengukuran?.catatan], [7, 10, ""]);
    assert.equal((await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-04" })).length, 1);
  });

  it("mengajukan memindahkan Draf ke Diajukan; Pengukuran Diajukan tidak bisa diubah lagi", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-05" };
    await simpanPengukuran(petugas, { ...kunci, n: 8, d: 10 });
    const hasil = await ajukanPengukuran(petugas, { ...kunci, n: 9, d: 10, catatan: "final" });
    assert.equal(hasil.status, "diajukan");

    const { pengukuran } = await ambilIsian(petugas, kunci);
    assert.deepEqual([pengukuran?.n, pengukuran?.status, pengukuran?.catatan], [9, "diajukan", "final"]);

    const terkunci = { status: 409, message: "Pengukuran ini sudah Diajukan; hanya Pengukuran Draf yang bisa diubah." };
    await assert.rejects(simpanPengukuran(petugas, { ...kunci, n: 1, d: 10 }), terkunci);
    await assert.rejects(ajukanPengukuran(petugas, { ...kunci, n: 1, d: 10 }), terkunci);
    assert.equal((await ambilIsian(petugas, kunci)).pengukuran?.n, 9);
    assert.deepEqual(
      (await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-05" })).map((i) => i.status),
      ["diajukan"],
    );
  });

  it("Riwayat Status mencatat simpan pertama dan pengajuan (siapa, kapan, dari dan ke status apa), bukan simpan ulang Draf", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const rekan = await penggunaBaru("petugasInputData", [unit.id]);
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-06" };
    const mulai = Date.now();
    await simpanPengukuran(petugas, { ...kunci, n: 1, d: 2 });
    await simpanPengukuran(rekan, { ...kunci, n: 2, d: 2 });
    await ajukanPengukuran(rekan, { ...kunci, n: 2, d: 2 });

    const { riwayat, pengukuran } = await ambilIsian(petugas, kunci);
    assert.deepEqual(
      riwayat.map((r) => [r.statusAsal, r.statusTujuan, r.oleh, r.alasan]),
      [
        [null, "draf", petugas.nama, null],
        ["draf", "diajukan", rekan.nama, null],
      ],
    );
    assert.ok(riwayat.every((r) => r.waktu.getTime() >= mulai - 1000));
    // Pengisi = Pengguna yang terakhir menyimpan angka.
    assert.equal(pengukuran?.pengisi, rekan.nama);
  });

  it("mengajukan isian yang belum pernah disimpan mencatat simpan pertama lalu pengajuan, berurutan", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-07" };
    await ajukanPengukuran(petugas, { ...kunci, n: 0, d: 0 });

    const { riwayat, pengukuran } = await ambilIsian(petugas, kunci);
    assert.equal(pengukuran?.status, "diajukan");
    assert.deepEqual(
      riwayat.map((r) => [r.statusAsal, r.statusTujuan]),
      [
        [null, "draf"],
        ["draf", "diajukan"],
      ],
    );
  });

  it("N dan D harus bilangan bulat ≥ 0, N ≤ D untuk faktor 100, D = 0 hanya bila N = 0; aturan berlaku saat menyimpan dan mengajukan", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-08" };
    const ditolak: [number, number, string][] = [
      [-1, 10, "N dan D harus bilangan bulat ≥ 0."],
      [1, -10, "N dan D harus bilangan bulat ≥ 0."],
      [1.5, 10, "N dan D harus bilangan bulat ≥ 0."],
      [Number.NaN, 10, "N dan D harus bilangan bulat ≥ 0."],
      [1, Number.NaN, "N dan D harus bilangan bulat ≥ 0."],
      [11, 10, "N tidak boleh lebih dari D pada Indikator persen."],
      [1, 0, "D = 0 hanya boleh bila N = 0."],
      [1, 3_000_000_000, "N atau D terlalu besar."],
    ];
    for (const [n, d, message] of ditolak) {
      await assert.rejects(simpanPengukuran(petugas, { ...kunci, n, d }), { status: 400, message }, `simpan ${n}/${d}`);
      await assert.rejects(ajukanPengukuran(petugas, { ...kunci, n, d }), { status: 400, message }, `ajukan ${n}/${d}`);
    }
    assert.equal((await ambilIsian(petugas, kunci)).pengukuran, null);

    // Bulan tanpa kejadian: D = 0 dengan N = 0 diterima.
    await simpanPengukuran(petugas, { ...kunci, n: 0, d: 0 });
    await assert.rejects(ajukanPengukuran(petugas, { ...kunci, n: 5, d: 4 }), { status: 400 });
    assert.equal((await ajukanPengukuran(petugas, { ...kunci, n: 0, d: 0 })).status, "diajukan");
  });

  it("Indikator yang bukan persen (faktor selain 100) boleh N lebih dari D", async () => {
    const { unit, indikatorId, petugas } = await siapkan({ faktor: 1 });
    await simpanPengukuran(petugas, { indikatorId, unitId: unit.id, bulan: "2026-08", n: 450, d: 30 });
    const { pengukuran } = await ambilIsian(petugas, { indikatorId, unitId: unit.id, bulan: "2026-08" });
    assert.deepEqual([pengukuran?.n, pengukuran?.d], [450, 30]);
  });

  it("bulan berjalan boleh diisi, bulan depan ditolak (menurut zona waktu konfigurasi)", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    // 31 Mei 16.30 UTC = 1 Juni 00.30 WITA: bulan berjalan sudah Juni.
    const sekarang = new Date("2026-05-31T16:30:00Z");
    const isian = { indikatorId, unitId: unit.id, n: 1, d: 1 };
    await simpanPengukuran(petugas, { ...isian, bulan: "2026-06" }, sekarang);

    const bulanDepan = { status: 400, message: "Juli 2026 belum berjalan, jadi belum bisa diisi." };
    await assert.rejects(simpanPengukuran(petugas, { ...isian, bulan: "2026-07" }, sekarang), bulanDepan);
    await assert.rejects(ajukanPengukuran(petugas, { ...isian, bulan: "2026-07" }, sekarang), bulanDepan);
    await assert.rejects(daftarIsian(petugas, { unitId: unit.id, bulan: "2026-07" }, sekarang), bulanDepan);
    await assert.rejects(simpanPengukuran(petugas, { ...isian, bulan: "2026-13" }, sekarang), { status: 400, message: "Pilih bulan." });
  });

  it("Indikator Semesteran hanya muncul dan bisa diisi pada bulan Juni dan Desember", async () => {
    const { unit, indikatorId, petugas } = await siapkan({ frekuensi: "semesteran" });
    const isian = { indikatorId, unitId: unit.id, n: 80, d: 100 };
    const sekarang = new Date("2027-01-15T00:00:00Z");
    for (const bulan of ["2026-01", "2026-05", "2026-07", "2026-11"]) {
      await assert.rejects(simpanPengukuran(petugas, { ...isian, bulan }, sekarang), {
        status: 400,
        message: /Semesteran hanya diisi pada bulan Juni dan Desember/,
      });
      assert.deepEqual(await daftarIsian(petugas, { unitId: unit.id, bulan }, sekarang), [], bulan);
    }
    for (const bulan of ["2026-06", "2026-12"]) {
      await simpanPengukuran(petugas, { ...isian, bulan }, sekarang);
      assert.deepEqual(
        (await daftarIsian(petugas, { unitId: unit.id, bulan }, sekarang)).map((i) => i.status),
        ["draf"],
        bulan,
      );
    }
  });

  it("Unit yang bukan Unit Pelapor pada bulan itu ditolak dan Indikatornya tidak muncul di daftar isian", async () => {
    const { unit, indikatorId, petugas } = await siapkan();
    const hcu = await tambahUnit(admin, { nama: unik("HCU") });
    const { komite } = await indikatorBaru();
    // HCU menjadi Unit Pelapor mulai Maret saja.
    await tambahUnitPelapor(komite, indikatorId, { unitId: hcu.id, bulanMulai: "2026-03" });
    const petugasHcu = await penggunaBaru("petugasInputData", [hcu.id]);
    const isian = { indikatorId, unitId: hcu.id, n: 1, d: 1 };

    await assert.rejects(simpanPengukuran(petugasHcu, { ...isian, bulan: "2026-02" }), {
      status: 400,
      message: new RegExp(`^Unit ${hcu.nama} bukan Unit Pelapor Indikator .* pada Februari 2026\\.$`),
    });
    assert.deepEqual(await daftarIsian(petugasHcu, { unitId: hcu.id, bulan: "2026-02" }), []);
    await simpanPengukuran(petugasHcu, { ...isian, bulan: "2026-03" });

    // Unit Pelapor dari Indikator lain tidak membuat Unit ini menjadi Unit Pelapor Indikator ini.
    const { id: lain } = await indikatorBaru();
    await assert.rejects(simpanPengukuran(petugas, { indikatorId: lain, unitId: unit.id, bulan: "2026-03", n: 1, d: 1 }), {
      status: 400,
    });
    await assert.rejects(simpanPengukuran(petugas, { indikatorId: randomUUID(), unitId: unit.id, bulan: "2026-03", n: 1, d: 1 }), {
      status: 404,
    });
  });

  it("Indikator nonaktif dan Unit nonaktif hilang dari isian dan tidak bisa diisi", async () => {
    const { unit, indikatorId, komite, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-09" };
    await simpanPengukuran(petugas, { ...kunci, n: 1, d: 2 });

    await aturAktifIndikator(komite, indikatorId, false);
    await assert.rejects(simpanPengukuran(petugas, { ...kunci, n: 2, d: 2 }), { status: 400, message: /^Indikator .* nonaktif, jadi tidak bisa diisi\.$/ });
    assert.deepEqual(await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-09" }), []);
    await aturAktifIndikator(komite, indikatorId, true);

    await aturAktifUnit(admin, unit.id, false);
    const unitNonaktif = { status: 400, message: `Unit ${unit.nama} nonaktif, jadi tidak bisa mengisi Pengukuran.` };
    // Unit masih ada di sesi Petugas (unitIds), tetapi tidak lagi di pilihan Unit.
    await assert.rejects(ajukanPengukuran(petugas, { ...kunci, n: 2, d: 2 }), unitNonaktif);
    await assert.rejects(daftarIsian(petugas, { unitId: unit.id, bulan: "2026-09" }), unitNonaktif);
    assert.deepEqual(await unitPengisi(petugas), []);
    await aturAktifUnit(admin, unit.id, true);
    assert.equal((await ajukanPengukuran(petugas, { ...kunci, n: 2, d: 2 })).status, "diajukan");
  });

  it("Kepala Unit dari Unit itu boleh mengisi dan mengajukan; Petugas yang punya dua Unit memilih di antara keduanya", async () => {
    const { unit, indikatorId } = await siapkan();
    const kepala = await penggunaBaru("kepalaUnit", [unit.id]);
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-02" };
    await simpanPengukuran(kepala, { ...kunci, n: 4, d: 5 });
    assert.equal((await ajukanPengukuran(kepala, { ...kunci, n: 4, d: 5 })).status, "diajukan");
    assert.equal((await ambilIsian(kepala, kunci)).pengukuran?.pengisi, kepala.nama);

    const hcu = await tambahUnit(admin, { nama: unik("HCU") });
    const ganda = await penggunaBaru("petugasInputData", [unit.id, hcu.id]);
    assert.deepEqual(
      (await unitPengisi(ganda)).map((u) => u.id).sort(),
      [unit.id, hcu.id].sort(),
    );
  });

  it("Petugas dari Unit lain ditolak saat mengisi, mengajukan, dan melihat daftar isian Unit itu", async () => {
    const { unit, indikatorId } = await siapkan();
    const lain = await tambahUnit(admin, { nama: unik("IGD") });
    const petugasLain = await penggunaBaru("petugasInputData", [lain.id]);
    const kepalaLain = await penggunaBaru("kepalaUnit", [lain.id]);
    const isian = { indikatorId, unitId: unit.id, bulan: "2026-02", n: 1, d: 1 };

    const bukanUnitnya = { status: 403, message: "Anda hanya bisa mengisi Pengukuran untuk Unit Anda sendiri." };
    for (const aktor of [petugasLain, kepalaLain]) {
      await assert.rejects(simpanPengukuran(aktor, isian), bukanUnitnya);
      await assert.rejects(ajukanPengukuran(aktor, isian), bukanUnitnya);
      await assert.rejects(daftarIsian(aktor, { unitId: unit.id, bulan: "2026-02" }), bukanUnitnya);
      await assert.rejects(ambilIsian(aktor, isian), bukanUnitnya);
    }
  });

  for (const peran of ["komiteMutu", "direktur", "adminSistem"] as const) {
    it(`${LABEL_PERAN[peran]} ditolak saat mengisi dan mengajukan Pengukuran`, async () => {
      const { unit, indikatorId } = await siapkan();
      // Unit dari isian maupun sesi tidak membuat peran ini berhak mengisi.
      const aktor = { ...(await penggunaBaru(peran)), unitIds: [unit.id] };
      const isian = { indikatorId, unitId: unit.id, bulan: "2026-02", n: 1, d: 1 };

      const ditolak = { status: 403, message: "Hanya Petugas Input Data dan Kepala Unit yang boleh mengisi dan mengajukan Pengukuran." };
      await assert.rejects(simpanPengukuran(aktor, isian), ditolak);
      await assert.rejects(ajukanPengukuran(aktor, isian), ditolak);
      await assert.rejects(daftarIsian(aktor, { unitId: unit.id, bulan: "2026-02" }), ditolak);
      await assert.rejects(unitPengisi(aktor), ditolak);
      await assert.rejects(simpanPengukuran(null, isian), { status: 401 });
    });
  }

  it("periode Unit Pelapor yang sudah punya Pengukuran tidak bisa dihapus, tetapi tetap bisa diakhiri", async () => {
    const { unit, indikatorId, komite, unitPelaporId, petugas } = await siapkan();
    // Pengukuran di luar periode lain (periode kedua mulai 2027) tidak menghalangi penghapusan periode itu.
    await akhiriUnitPelapor(komite, unitPelaporId, "2026-12");
    const periodeBaru = await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai: "2027-01" });
    await simpanPengukuran(petugas, { indikatorId, unitId: unit.id, bulan: "2026-12", n: 1, d: 1 }, new Date("2027-02-15"));

    await assert.rejects(hapusUnitPelapor(komite, unitPelaporId), {
      status: 409,
      message: "Periode Unit Pelapor ini sudah punya Pengukuran, jadi tidak bisa dihapus. Akhiri periodenya bila Unit berhenti melapor.",
    });
    await akhiriUnitPelapor(komite, unitPelaporId, "2026-12");
    await hapusUnitPelapor(komite, periodeBaru);
  });
});
