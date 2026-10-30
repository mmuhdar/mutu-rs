import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { config } from "@/lib/config";
import type { Frekuensi } from "@/lib/indikator";
import type { AksiVerifikasi } from "@/lib/pengukuran";
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
import {
  ajukanPengukuran,
  ambilIsian,
  ambilPengukuran,
  antreanVerifikasi,
  bukaKembaliPengukuran,
  daftarIsian,
  kembalikanPengukuran,
  pengukuranDikembalikan,
  simpanPengukuran,
  statusPengukuranBulan,
  ubahStatusPengukuran,
  unitPengisi,
  verifikasiPengukuran,
} from "@/modules/pengukuran/service";
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
    const { unit, indikatorId, komite, unitPelaporId, petugas } = await siapkan();
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-09" };
    await simpanPengukuran(petugas, { ...kunci, n: 1, d: 2 });

    await aturAktifIndikator(komite, indikatorId, false);
    await assert.rejects(simpanPengukuran(petugas, { ...kunci, n: 2, d: 2 }), { status: 400, message: /^Indikator .* nonaktif, jadi tidak bisa diisi\.$/ });
    assert.deepEqual(await daftarIsian(petugas, { unitId: unit.id, bulan: "2026-09" }), []);
    await aturAktifIndikator(komite, indikatorId, true);

    // Unit hanya bisa dinonaktifkan setelah periode Unit Pelapor-nya berakhir sebelum bulan berjalan.
    await akhiriUnitPelapor(komite, unitPelaporId, "2026-09");
    await aturAktifUnit(admin, unit.id, false, new Date("2026-10-15T12:00:00+08:00"));
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

  it("bulan berhenti Unit Pelapor tidak boleh lebih awal dari Pengukuran terakhir (status apa pun) dalam periodenya", async () => {
    const { unit, indikatorId, komite, unitPelaporId, petugas } = await siapkan();
    const sekarang = new Date("2026-10-15T12:00:00+08:00");
    const kunci = { indikatorId, unitId: unit.id, n: 1, d: 2 };
    await simpanPengukuran(petugas, { ...kunci, bulan: "2026-03" }, sekarang);
    await ajukanPengukuran(petugas, { ...kunci, bulan: "2026-05" }, sekarang);

    await assert.rejects(akhiriUnitPelapor(komite, unitPelaporId, "2026-04"), {
      status: 409,
      message: `Unit ${unit.nama} sudah punya Pengukuran Indikator ini pada Mei 2026, jadi bulan berhenti tidak boleh lebih awal dari Mei 2026.`,
    });
    await akhiriUnitPelapor(komite, unitPelaporId, "2026-05");

    // Pengukuran di periode lain tidak menghalangi.
    await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai: "2026-08" });
    await simpanPengukuran(petugas, { ...kunci, bulan: "2026-09" }, sekarang);
    await akhiriUnitPelapor(komite, unitPelaporId, "2026-06");
  });
});

describe("Verifikasi Pengukuran", () => {
  /** Pengukuran Diajukan di Unit baru, beserta Petugas dan Kepala Unit dari Unit itu. */
  async function diajukan(bulan = "2026-03") {
    const s = await siapkan();
    const kepala = await penggunaBaru("kepalaUnit", [s.unit.id]);
    const kunci = { indikatorId: s.indikatorId, unitId: s.unit.id, bulan };
    const { id } = await ajukanPengukuran(s.petugas, { ...kunci, n: 9, d: 10 });
    return { ...s, kepala, kunci, id };
  }

  /** Riwayat Status sebagai [asal, tujuan, oleh, alasan], dibaca lewat formulir isian. */
  async function riwayat(aktor: Pengguna, kunci: { indikatorId: string; unitId: string; bulan: string }) {
    return (await ambilIsian(aktor, kunci)).riwayat.map((r) => [r.statusAsal, r.statusTujuan, r.oleh, r.alasan]);
  }

  it("Kepala Unit dari Unit itu memverifikasi Pengukuran Diajukan; Riwayat Status mencatatnya tanpa alasan", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    assert.deepEqual(await verifikasiPengukuran(kepala, id), { id, status: "terverifikasi" });

    assert.equal((await ambilIsian(petugas, kunci)).pengukuran?.status, "terverifikasi");
    assert.deepEqual((await riwayat(petugas, kunci)).at(-1), ["diajukan", "terverifikasi", kepala.nama, null]);
  });

  it("siklus dikembalikan → diperbaiki → diajukan → diverifikasi tercatat lengkap di Riwayat Status beserta alasannya", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    assert.deepEqual(await kembalikanPengukuran(kepala, id, "  D harus jumlah pasien, bukan jumlah tindakan "), {
      id,
      status: "draf",
    });

    // Petugas melihat alasan pengembalian pada Pengukuran Draf, memperbaikinya, lalu mengajukannya lagi.
    const isian = await ambilIsian(petugas, kunci);
    assert.equal(isian.pengukuran?.status, "draf");
    assert.equal(isian.riwayat.at(-1)?.alasan, "D harus jumlah pasien, bukan jumlah tindakan");
    await simpanPengukuran(petugas, { ...kunci, n: 9, d: 12 });
    await ajukanPengukuran(petugas, { ...kunci, n: 9, d: 12 });
    await verifikasiPengukuran(kepala, id);

    const { pengukuran } = await ambilIsian(petugas, kunci);
    assert.deepEqual([pengukuran?.n, pengukuran?.d, pengukuran?.status], [9, 12, "terverifikasi"]);
    assert.deepEqual(await riwayat(petugas, kunci), [
      [null, "draf", petugas.nama, null],
      ["draf", "diajukan", petugas.nama, null],
      ["diajukan", "draf", kepala.nama, "D harus jumlah pasien, bukan jumlah tindakan"],
      ["draf", "diajukan", petugas.nama, null],
      ["diajukan", "terverifikasi", kepala.nama, null],
    ]);
  });

  it("Pengukuran yang dikembalikan tetap Draf, tetapi daftar isian dan daftar dikembalikan menyebut alasannya sampai diajukan lagi", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    const isianBulan = { unitId: kunci.unitId, bulan: kunci.bulan };
    await kembalikanPengukuran(kepala, id, "D harus jumlah pasien");
    // Draf biasa (belum pernah diajukan) tidak disebut dikembalikan.
    await simpanPengukuran(petugas, { ...kunci, bulan: "2026-04", n: 1, d: 1 });

    const alasan = async () => (await daftarIsian(petugas, isianBulan)).map((i) => [i.status, i.alasanPengembalian]);
    assert.deepEqual(await alasan(), [["draf", "D harus jumlah pasien"]]);
    assert.deepEqual(
      (await daftarIsian(petugas, { ...isianBulan, bulan: "2026-04" })).map((i) => [i.status, i.alasanPengembalian]),
      [["draf", null]],
    );
    const dikembalikan = async (aktor: Pengguna) =>
      (await pengukuranDikembalikan(aktor)).map((p) => [p.id, p.indikator.id, p.unit.id, p.bulan, p.alasan]);
    const satu = [[id, kunci.indikatorId, kunci.unitId, kunci.bulan, "D harus jumlah pasien"]];
    assert.deepEqual(await dikembalikan(petugas), satu);
    assert.deepEqual(await dikembalikan(kepala), satu);

    // Menyimpan perbaikan sebagai Draf belum menghapus tanda dikembalikan; mengajukan lagi menghapusnya.
    await simpanPengukuran(petugas, { ...kunci, n: 9, d: 12 });
    assert.deepEqual(await alasan(), [["draf", "D harus jumlah pasien"]]);
    await ajukanPengukuran(petugas, { ...kunci, n: 9, d: 12 });
    assert.deepEqual(await alasan(), [["diajukan", null]]);
    assert.deepEqual(await dikembalikan(petugas), []);

    const lain = await penggunaBaru("petugasInputData", [(await tambahUnit(admin, { nama: unik("IGD") })).id]);
    await kembalikanPengukuran(kepala, id, "Masih salah");
    assert.deepEqual(await dikembalikan(lain), []);
    await assert.rejects(pengukuranDikembalikan(await penggunaBaru("komiteMutu")), { status: 403 });
  });

  it("Kepala Unit membuka kembali Pengukuran Terverifikasi menjadi Diajukan dengan alasan", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    await verifikasiPengukuran(kepala, id);
    assert.deepEqual(await bukaKembaliPengukuran(kepala, id, "Ada laporan susulan"), { id, status: "diajukan" });

    assert.equal((await ambilIsian(petugas, kunci)).pengukuran?.status, "diajukan");
    assert.deepEqual((await riwayat(petugas, kunci)).at(-1), ["terverifikasi", "diajukan", kepala.nama, "Ada laporan susulan"]);
  });

  it("mengembalikan dan membuka kembali tanpa alasan ditolak, statusnya tidak berubah", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    const tanpaAlasan = { status: 400, message: "Alasan wajib diisi." };
    for (const alasan of ["", "   ", undefined as unknown as string]) {
      await assert.rejects(kembalikanPengukuran(kepala, id, alasan), tanpaAlasan);
    }
    await verifikasiPengukuran(kepala, id);
    await assert.rejects(bukaKembaliPengukuran(kepala, id, " "), tanpaAlasan);
    await assert.rejects(bukaKembaliPengukuran(kepala, id, "x".repeat(1001)), {
      status: 400,
      message: "Alasan maksimal 1000 karakter.",
    });

    assert.equal((await ambilIsian(petugas, kunci)).pengukuran?.status, "terverifikasi");
    assert.equal((await riwayat(petugas, kunci)).length, 3);
  });

  it("perpindahan selain Diajukan → Terverifikasi/Draf dan Terverifikasi → Diajukan ditolak", async () => {
    const { kepala, petugas, kunci, id } = await diajukan();
    const alasan = "cek ulang";
    await assert.rejects(bukaKembaliPengukuran(kepala, id, alasan), {
      status: 409,
      message: "Pengukuran ini Diajukan; hanya Pengukuran Terverifikasi yang bisa dibuka kembali.",
    });

    await kembalikanPengukuran(kepala, id, alasan);
    // Aksi form Verifikasi hanya verifikasi, kembalikan, dan buka kembali; mengajukan bukan aksi Verifikasi.
    for (const aksi of ["ajukan", "hapus"]) {
      await assert.rejects(ubahStatusPengukuran(kepala, id, aksi as AksiVerifikasi), { status: 400, message: "Aksi tidak dikenal." });
    }
    for (const pindah of [() => verifikasiPengukuran(kepala, id), () => kembalikanPengukuran(kepala, id, alasan)]) {
      await assert.rejects(pindah, { status: 409, message: /^Pengukuran ini Draf; hanya Pengukuran Diajukan yang bisa/ });
    }
    await assert.rejects(bukaKembaliPengukuran(kepala, id, alasan), { status: 409 });

    await ajukanPengukuran(petugas, { ...kunci, n: 9, d: 10 });
    await verifikasiPengukuran(kepala, id);
    await assert.rejects(verifikasiPengukuran(kepala, id), {
      status: 409,
      message: "Pengukuran ini Terverifikasi; hanya Pengukuran Diajukan yang bisa diverifikasi.",
    });
    await assert.rejects(kembalikanPengukuran(kepala, id, alasan), {
      status: 409,
      message: "Pengukuran ini Terverifikasi; hanya Pengukuran Diajukan yang bisa dikembalikan.",
    });
    // Terverifikasi juga tidak bisa diubah lewat isian.
    await assert.rejects(simpanPengukuran(kepala, { ...kunci, n: 1, d: 10 }), { status: 409 });
    assert.deepEqual(
      (await riwayat(petugas, kunci)).map(([asal, tujuan]) => `${asal}→${tujuan}`),
      ["null→draf", "draf→diajukan", "diajukan→draf", "draf→diajukan", "diajukan→terverifikasi"],
    );
  });

  it("Petugas Input Data, Kepala Unit dari Unit lain, Komite Mutu, Direktur, dan Admin Sistem tidak bisa memverifikasi", async () => {
    const { unit, petugas, kunci, id } = await diajukan();
    const lain = await tambahUnit(admin, { nama: unik("IGD") });
    const kepalaLain = await penggunaBaru("kepalaUnit", [lain.id]);
    const alasan = "cek ulang";
    const semua = (aktor: Pengguna | null) => [
      () => verifikasiPengukuran(aktor, id),
      () => kembalikanPengukuran(aktor, id, alasan),
      () => bukaKembaliPengukuran(aktor, id, alasan),
    ];

    const bukanKepala = { status: 403, message: "Hanya Kepala Unit yang boleh memverifikasi Pengukuran." };
    for (const peran of ["komiteMutu", "direktur", "adminSistem"] as const) {
      // Unit di sesi tidak membuat peran ini berhak memverifikasi.
      const aktor = { ...(await penggunaBaru(peran)), unitIds: [unit.id] };
      for (const p of semua(aktor)) await assert.rejects(p, bukanKepala, peran);
    }
    for (const p of semua(petugas)) await assert.rejects(p, bukanKepala);
    for (const p of semua(kepalaLain)) {
      await assert.rejects(p, { status: 403, message: "Anda hanya bisa memverifikasi Pengukuran Unit Anda sendiri." });
    }
    for (const p of semua(null)) await assert.rejects(p, { status: 401 });

    assert.equal((await ambilIsian(petugas, kunci)).pengukuran?.status, "diajukan");
    assert.equal((await riwayat(petugas, kunci)).length, 2);
    const kepala = await penggunaBaru("kepalaUnit", [unit.id]);
    for (const tidakAda of [randomUUID(), "bukan-uuid"]) {
      await assert.rejects(verifikasiPengukuran(kepala, tidakAda), { status: 404, message: "Pengukuran tidak ditemukan." });
    }
  });

  it("Kepala Unit boleh mengisi, mengajukan, dan memverifikasi Pengukuran yang diisinya sendiri", async () => {
    const { unit, indikatorId } = await siapkan();
    const kepala = await penggunaBaru("kepalaUnit", [unit.id]);
    const kunci = { indikatorId, unitId: unit.id, bulan: "2026-04" };
    const { id } = await ajukanPengukuran(kepala, { ...kunci, n: 3, d: 4 });
    await verifikasiPengukuran(kepala, id);
    assert.deepEqual(await riwayat(kepala, kunci), [
      [null, "draf", kepala.nama, null],
      ["draf", "diajukan", kepala.nama, null],
      ["diajukan", "terverifikasi", kepala.nama, null],
    ]);
  });

  it("antrean Verifikasi berisi semua Pengukuran Diajukan dari Unit-Unit Kepala Unit, di bulan mana pun", async () => {
    const icu = await siapkan();
    const hcu = await siapkan();
    const igd = await siapkan();
    const kepala = await penggunaBaru("kepalaUnit", [icu.unit.id, hcu.unit.id]);
    const isi = (s: typeof icu, bulan: string) =>
      ajukanPengukuran(s.petugas, { indikatorId: s.indikatorId, unitId: s.unit.id, bulan, n: 9, d: 10 });

    const icuMaret = await isi(icu, "2026-03");
    const icuJanuari = await isi(icu, "2026-01");
    const hcuFebruari = await isi(hcu, "2026-02");
    await verifikasiPengukuran(kepala, (await isi(icu, "2026-04")).id);
    await simpanPengukuran(icu.petugas, { indikatorId: icu.indikatorId, unitId: icu.unit.id, bulan: "2026-05", n: 1, d: 1 });
    await isi(igd, "2026-03"); // Unit lain.

    const antrean = await antreanVerifikasi(kepala);
    assert.deepEqual(
      antrean.map((p) => [p.id, p.unit.nama, p.bulan]),
      [
        [icuJanuari.id, icu.unit.nama, "2026-01"],
        [hcuFebruari.id, hcu.unit.nama, "2026-02"],
        [icuMaret.id, icu.unit.nama, "2026-03"],
      ],
    );
    assert.deepEqual(
      [antrean[0].indikator.id, antrean[0].n, antrean[0].d, antrean[0].capaian, antrean[0].pengisi],
      [icu.indikatorId, 9, 10, 90, icu.petugas.nama],
    );

    // Pengukuran yang sudah diverifikasi keluar dari antrean.
    await verifikasiPengukuran(kepala, icuJanuari.id);
    assert.equal((await antreanVerifikasi(kepala)).length, 2);

    for (const aktor of [icu.petugas, icu.komite, admin]) {
      await assert.rejects(antreanVerifikasi(aktor), { status: 403, message: "Hanya Kepala Unit yang boleh memverifikasi Pengukuran." });
    }
  });

  it("detail Pengukuran beserta Riwayat Status terbuka untuk Unit itu, Komite Mutu, dan Admin Sistem", async () => {
    const { unit, indikatorId, komite, kepala, petugas, id } = await diajukan("2026-02");
    await kembalikanPengukuran(kepala, id, "Periksa D");

    for (const aktor of [petugas, kepala, komite, admin]) {
      const detail = await ambilPengukuran(aktor, id);
      assert.deepEqual(
        [detail.indikator.id, detail.unit.id, detail.bulan, detail.n, detail.d, detail.capaian, detail.status, detail.pengisi],
        [indikatorId, unit.id, "2026-02", 9, 10, 90, "draf", petugas.nama],
      );
      assert.deepEqual(
        detail.riwayat.map((r) => [r.statusAsal, r.statusTujuan, r.oleh, r.alasan]),
        [
          [null, "draf", petugas.nama, null],
          ["draf", "diajukan", petugas.nama, null],
          ["diajukan", "draf", kepala.nama, "Periksa D"],
        ],
      );
    }

    const lain = await tambahUnit(admin, { nama: unik("IGD") });
    for (const aktor of [await penggunaBaru("petugasInputData", [lain.id]), await penggunaBaru("kepalaUnit", [lain.id])]) {
      await assert.rejects(ambilPengukuran(aktor, id), { status: 403, message: "Anda hanya bisa melihat Pengukuran Unit Anda sendiri." });
    }
    await assert.rejects(ambilPengukuran(await penggunaBaru("direktur"), id), { status: 403 });
    await assert.rejects(ambilPengukuran(komite, "bukan-uuid"), { status: 404, message: "Pengukuran tidak ditemukan." });
    await assert.rejects(ambilPengukuran(komite, randomUUID()), { status: 404 });
  });

  it("Komite Mutu dan Admin Sistem melihat status semua Pengukuran sebulan, termasuk Unit Pelapor yang belum mengisi", async () => {
    const icu = await siapkan();
    const { unit: hcu, komite } = await siapkan();
    await tambahUnitPelapor(komite, icu.indikatorId, { unitId: hcu.id, bulanMulai: "2026-01" });
    const kepalaIcu = await penggunaBaru("kepalaUnit", [icu.unit.id]);
    const isi = (indikatorId: string, bulan = "2026-03") => ({ indikatorId, unitId: icu.unit.id, bulan, n: 1, d: 2 });

    const diajukanIcu = await ajukanPengukuran(icu.petugas, isi(icu.indikatorId));
    await verifikasiPengukuran(kepalaIcu, diajukanIcu.id);
    // Semesteran tidak diharapkan pada Maret.
    const { id: semesteran } = await indikatorBaru({ frekuensi: "semesteran" });
    await tambahUnitPelapor(komite, semesteran, { unitId: icu.unit.id, bulanMulai: "2026-01" });
    // Indikator yang kini nonaktif: Pengukurannya tetap tampil, tetapi tidak lagi ditagih.
    const { id: lama } = await indikatorBaru();
    const { id: lamaKosong } = await indikatorBaru();
    for (const id of [lama, lamaKosong]) await tambahUnitPelapor(komite, id, { unitId: icu.unit.id, bulanMulai: "2026-01" });
    const drafLama = await simpanPengukuran(icu.petugas, isi(lama));
    for (const id of [lama, lamaKosong]) await aturAktifIndikator(komite, id, false);
    // Unit Pelapor yang periodenya sudah berakhir tidak ditagih.
    const { id: berakhir } = await indikatorBaru();
    await akhiriUnitPelapor(komite, await tambahUnitPelapor(komite, berakhir, { unitId: icu.unit.id, bulanMulai: "2026-01" }), "2026-02");

    const milikTes = new Set([icu.indikatorId, semesteran, lama, lamaKosong, berakhir]);
    for (const aktor of [komite, admin]) {
      const baris = (await statusPengukuranBulan(aktor, "2026-03")).filter((b) => milikTes.has(b.indikator.id));
      assert.deepEqual(
        baris.map((b) => [b.id, b.indikator.id, b.unit.nama, b.status]).sort((a, b) => String(a).localeCompare(String(b))),
        [
          [diajukanIcu.id, icu.indikatorId, icu.unit.nama, "terverifikasi"],
          [drafLama.id, lama, icu.unit.nama, "draf"],
          [null, icu.indikatorId, hcu.nama, null],
        ].sort((a, b) => String(a).localeCompare(String(b))),
      );
    }

    for (const aktor of [icu.petugas, kepalaIcu, await penggunaBaru("direktur")]) {
      await assert.rejects(statusPengukuranBulan(aktor, "2026-03"), {
        status: 403,
        message: "Hanya Komite Mutu dan Admin Sistem yang boleh melihat status Pengukuran semua Unit.",
      });
    }
    await assert.rejects(statusPengukuranBulan(komite, "2026-13"), { status: 400, message: "Pilih bulan." });
  });
});
