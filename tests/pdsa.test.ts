import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import { ringkasEfisiensi, type KeputusanPdsa } from "@/lib/perbaikan";
import type { Pengguna } from "@/modules/auth/service";
import { aturAktifIndikator, tambahUnitPelapor } from "@/modules/indikator/service";
import {
  ambilAnalisis,
  ambilPdsa,
  buatPdsa,
  daftarPdsa,
  simpanAnalisis,
  simpanEfisiensiPdsa,
  simpanTahapPdsa,
  type PlanPdsa,
} from "@/modules/perbaikan/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, indikatorBaru, komiteMutu, sebagai, terverifikasi, unitBaru, unitPelapor } from "./bantuan";

let komite: Pengguna;
before(async () => {
  komite = await komiteMutu();
});

const plan = (ubahan: Partial<PlanPdsa> = {}): PlanPdsa => ({
  judul: "Uji coba handrub di setiap tempat tidur",
  masalah: "Kepatuhan kebersihan tangan shift malam rendah.",
  tujuan: "Kepatuhan shift malam ≥ 85%.",
  prediksi: "Handrub di tempat tidur menaikkan kepatuhan 10 poin.",
  rencana: "Pasang handrub di 6 tempat tidur ICU selama dua bulan; observasi oleh IPCN.",
  bulanMulai: "2026-03",
  bulanAkhir: "2026-04",
  ...ubahan,
});

/** IMP-RS baru dengan satu Unit Pelapor mulai Januari 2026. */
async function siapkan() {
  const indikatorId = await indikatorBaru();
  const unit = await unitPelapor(indikatorId, "ICU");
  return { indikatorId, unit };
}

/** Isi Do, Study, dan Act lalu lanjut sampai Selesai. */
async function selesaikan(aktor: Pengguna, id: string, keputusan: KeputusanPdsa = "adaptasi") {
  await simpanTahapPdsa(aktor, id, "do", { pelaksanaan: "Handrub dipasang di 6 tempat tidur." }, true);
  await simpanTahapPdsa(aktor, id, "study", { hasil: "Kepatuhan naik 7 poin, di bawah prediksi." }, true);
  await simpanTahapPdsa(aktor, id, "act", { keputusan, penjelasan: "Tambah pengingat visual." }, true);
}

describe("memulai PDSA", () => {
  it("Komite Mutu memulai PDSA Lingkup RS; Plan tersimpan dan tahap aktif langsung Do", async () => {
    const { indikatorId } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: null, ...plan({ judul: "  Handrub  " }) });
    const p = await ambilPdsa(komite, id);
    assert.deepEqual(
      [p.judul, p.tahap, p.siklus, p.unit, p.bulanMulai, p.bulanAkhir, p.masalah, p.diubahOleh],
      ["Handrub", "do", 1, null, "2026-03", "2026-04", plan().masalah, komite.nama],
    );
    assert.deepEqual([p.sebelumnya, p.berikutnya, p.bolehTulis], [null, null, true]);
  });

  it("Kepala Unit memulai PDSA Lingkup Unit-nya saja; Petugas Input Data dan Direktur tidak boleh", async () => {
    const { indikatorId, unit } = await siapkan();
    const lain = await unitPelapor(indikatorId, "IGD");
    const kepala = await sebagai("kepalaUnit", [unit.id]);
    await buatPdsa(kepala, { indikatorId, unitId: unit.id, ...plan() });
    await assert.rejects(buatPdsa(kepala, { indikatorId, unitId: null, ...plan() }), { status: 403 });
    await assert.rejects(buatPdsa(kepala, { indikatorId, unitId: lain.id, ...plan() }), { status: 403 });
    for (const aktor of [await sebagai("petugasInputData", [unit.id]), await sebagai("direktur")]) {
      await assert.rejects(buatPdsa(aktor, { indikatorId, unitId: unit.id, ...plan() }), { status: 403 });
    }
    await buatPdsa(await adminSistem(), { indikatorId, unitId: lain.id, ...plan() });
  });

  it("judul dan isian Plan wajib; bulan akhir tidak boleh sebelum bulan mulai; bulan mulai boleh di masa depan", async () => {
    const { indikatorId } = await siapkan();
    for (const kosong of ["judul", "masalah", "tujuan", "prediksi", "rencana"] as const) {
      await assert.rejects(buatPdsa(komite, { indikatorId, unitId: null, ...plan({ [kosong]: " " }) }), { status: 400 }, kosong);
    }
    await assert.rejects(
      buatPdsa(komite, { indikatorId, unitId: null, ...plan({ bulanMulai: "2026-05", bulanAkhir: "2026-04" }) }),
      { status: 400, message: /bulan akhir/i },
    );
    await assert.rejects(buatPdsa(komite, { indikatorId, unitId: null, ...plan({ bulanAkhir: "April" }) }), { status: 400 });
    await buatPdsa(komite, { indikatorId, unitId: null, ...plan({ bulanMulai: "2030-01", bulanAkhir: "2030-03" }) });
  });

  it("Indikator nonaktif dan IMP-Unit dengan Lingkup RS ditolak", async () => {
    const { indikatorId } = await siapkan();
    await aturAktifIndikator(komite, indikatorId, false);
    await assert.rejects(buatPdsa(komite, { indikatorId, unitId: null, ...plan() }), { status: 400, message: /nonaktif/ });
    const impUnit = await indikatorBaru({ kelompok: "IMP-Unit" });
    const unit = await unitPelapor(impUnit, "ICU");
    await assert.rejects(buatPdsa(komite, { indikatorId: impUnit, unitId: null, ...plan() }), { status: 400, message: /IMP-Unit/ });
    await buatPdsa(komite, { indikatorId: impUnit, unitId: unit.id, ...plan() });
  });

  it("Lingkup Unit: Unit harus aktif dan menjadi Unit Pelapor pada bulan mulai", async () => {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU", "2026-05");
    await assert.rejects(
      buatPdsa(komite, { indikatorId, unitId: icu.id, ...plan({ bulanMulai: "2026-04", bulanAkhir: "2026-06" }) }),
      { status: 400, message: /bukan Unit Pelapor/ },
    );
    await buatPdsa(komite, { indikatorId, unitId: icu.id, ...plan({ bulanMulai: "2026-05", bulanAkhir: "2026-06" }) });

    const tutup = await unitBaru("Bangsal Lama");
    await tambahUnitPelapor(komite, indikatorId, { unitId: tutup.id, bulanMulai: "2026-01", bulanBerhenti: "2026-03" });
    await aturAktifUnit(await adminSistem(), tutup.id, false);
    await assert.rejects(buatPdsa(komite, { indikatorId, unitId: tutup.id, ...plan() }), { status: 400, message: /nonaktif/ });
  });
});

describe("tahap PDSA", () => {
  it("tahap diisi berurutan: lanjut hanya dari tahap aktif dengan isian wajibnya, Act berakhir di Selesai", async () => {
    const { indikatorId } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: null, ...plan() });
    await assert.rejects(simpanTahapPdsa(komite, id, "study", { hasil: "terlalu cepat" }, false), { status: 409, message: /Do/ });
    await assert.rejects(simpanTahapPdsa(komite, id, "do", { pelaksanaan: " " }, true), { status: 400 });
    await simpanTahapPdsa(komite, id, "do", { pelaksanaan: "Draf catatan" }, false);
    assert.equal((await ambilPdsa(komite, id)).tahap, "do");
    await simpanTahapPdsa(komite, id, "do", { pelaksanaan: "Handrub dipasang." }, true);
    assert.equal((await ambilPdsa(komite, id)).tahap, "study");
    await simpanTahapPdsa(komite, id, "study", { hasil: "Naik 7 poin." }, true);
    await assert.rejects(
      simpanTahapPdsa(komite, id, "act", { keputusan: "lanjutkan" as KeputusanPdsa, penjelasan: "x" }, true),
      { status: 400 },
    );
    await assert.rejects(simpanTahapPdsa(komite, id, "act", { keputusan: "adopsi", penjelasan: "" }, true), { status: 400 });
    await simpanTahapPdsa(komite, id, "act", { keputusan: "adopsi", penjelasan: "SPO handrub di tempat tidur." }, true);

    const p = await ambilPdsa(komite, id);
    assert.deepEqual(
      [p.tahap, p.pelaksanaan, p.hasil, p.keputusan, p.penjelasan],
      ["selesai", "Handrub dipasang.", "Naik 7 poin.", "adopsi", "SPO handrub di tempat tidur."],
    );
    await assert.rejects(simpanTahapPdsa(komite, id, "act", { keputusan: "adopsi", penjelasan: "x" }, true), { status: 409 });
    await assert.rejects(
      simpanTahapPdsa(komite, id, "selesai" as "act", { keputusan: "adopsi", penjelasan: "x" }, false),
      { status: 400 },
    );
  });

  it("teks tahap yang sudah lewat tetap bisa diperbaiki, termasuk periode uji coba di Plan", async () => {
    const { indikatorId } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: null, ...plan() });
    await simpanTahapPdsa(komite, id, "do", { pelaksanaan: "Dipasang." }, true);
    await simpanTahapPdsa(komite, id, "plan", plan({ judul: "Handrub v2", bulanAkhir: "2026-06" }), false);
    await simpanTahapPdsa(komite, id, "do", { pelaksanaan: "Dipasang di 6 tempat tidur." }, false);
    const p = await ambilPdsa(komite, id);
    assert.deepEqual([p.judul, p.bulanAkhir, p.pelaksanaan, p.tahap], ["Handrub v2", "2026-06", "Dipasang di 6 tempat tidur.", "study"]);
    await assert.rejects(simpanTahapPdsa(komite, id, "plan", plan({ bulanAkhir: "2026-01" }), false), { status: 400 });
  });

  it("hak tulis tahap mengikuti Lingkup PDSA", async () => {
    const { indikatorId, unit } = await siapkan();
    const kepala = await sebagai("kepalaUnit", [unit.id]);
    const { id } = await buatPdsa(kepala, { indikatorId, unitId: unit.id, ...plan() });
    await simpanTahapPdsa(kepala, id, "do", { pelaksanaan: "Dipasang." }, true);
    for (const aktor of [await sebagai("kepalaUnit"), await sebagai("petugasInputData", [unit.id]), await sebagai("direktur")]) {
      await assert.rejects(simpanTahapPdsa(aktor, id, "study", { hasil: "x" }, false), { status: 403 });
    }
    await simpanTahapPdsa(komite, id, "study", { hasil: "Dibantu Komite Mutu." }, false);
  });
});

describe("siklus berikutnya", () => {
  it("hanya dari PDSA Selesai, menyalin Indikator, Lingkup, dan judul, dan hanya sekali", async () => {
    const { indikatorId, unit } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan({ judul: "Handrub" }) });
    const lanjutan = plan({ judul: "diabaikan", bulanMulai: "2026-05", bulanAkhir: "2026-06" });
    await assert.rejects(
      buatPdsa(komite, { indikatorId, unitId: unit.id, sebelumnyaId: id, ...lanjutan }),
      { status: 409, message: /Selesai/ },
    );
    await selesaikan(komite, id);

    const kedua = await buatPdsa(komite, { indikatorId: "", unitId: null, sebelumnyaId: id, ...lanjutan });
    const p2 = await ambilPdsa(komite, kedua.id);
    assert.deepEqual(
      [p2.indikator.id, p2.unit?.id, p2.judul, p2.siklus, p2.sebelumnya?.id, p2.tahap],
      [indikatorId, unit.id, "Handrub", 2, id, "do"],
    );
    assert.equal((await ambilPdsa(komite, id)).berikutnya?.id, kedua.id);
    await assert.rejects(buatPdsa(komite, { indikatorId, unitId: unit.id, sebelumnyaId: id, ...lanjutan }), { status: 409 });
  });

  it("Kepala Unit lain tidak bisa melanjutkan siklus PDSA Unit lain", async () => {
    const { indikatorId, unit } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() });
    await selesaikan(komite, id, "tinggalkan");
    await assert.rejects(
      buatPdsa(await sebagai("kepalaUnit"), { indikatorId, unitId: null, sebelumnyaId: id, ...plan() }),
      { status: 403 },
    );
  });
});

describe("membaca PDSA", () => {
  it("grafik Study = Capaian 12 bulan sampai bulan akhir uji coba, deret RS atau Unit Lingkup itu", async () => {
    const { indikatorId, unit } = await siapkan();
    const igd = await unitPelapor(indikatorId, "IGD");
    await terverifikasi(indikatorId, unit.id, "2026-03", 9, 10);
    await terverifikasi(indikatorId, igd.id, "2026-03", 50, 100);

    const rs = await ambilPdsa(komite, (await buatPdsa(komite, { indikatorId, unitId: null, ...plan() })).id);
    assert.deepEqual([rs.study.length, rs.study.at(-1)?.bulan], [12, "2026-04"]);
    assert.equal(Math.round(rs.study.find((t) => t.bulan === "2026-03")!.capaian! * 10) / 10, 53.6);

    const perUnit = await ambilPdsa(komite, (await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() })).id);
    assert.equal(perUnit.study.find((t) => t.bulan === "2026-03")?.capaian, 90);

    // Uji coba yang belum berakhir: grafik sampai bulan berjalan.
    const jauh = await buatPdsa(komite, { indikatorId, unitId: null, ...plan({ bulanMulai: "2026-03", bulanAkhir: "2027-03" }) });
    assert.equal((await ambilPdsa(komite, jauh.id, new Date("2026-05-10T04:00:00Z"))).study.at(-1)?.bulan, "2026-05");
  });

  it("daftar bawaan = PDSA yang belum Selesai, hanya Lingkup yang boleh dibaca", async () => {
    const { indikatorId, unit } = await siapkan();
    const milikUnit = (await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() })).id;
    const selesai = (await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() })).id;
    await selesaikan(komite, selesai);
    const milikRs = (await buatPdsa(komite, { indikatorId, unitId: null, ...plan() })).id;

    const petugas = await sebagai("petugasInputData", [unit.id]);
    assert.deepEqual((await daftarPdsa(petugas)).map((p) => p.id), [milikUnit]);
    assert.deepEqual((await daftarPdsa(petugas, { semua: true })).map((p) => p.id).sort(), [milikUnit, selesai].sort());
    await assert.rejects(ambilPdsa(petugas, milikRs), { status: 403 });
    assert.equal((await ambilPdsa(petugas, milikUnit)).bolehTulis, false);

    const direktur = (await daftarPdsa(await sebagai("direktur"))).map((p) => p.id);
    assert.ok(direktur.includes(milikUnit) && direktur.includes(milikRs) && !direktur.includes(selesai));
    await assert.rejects(ambilPdsa(komite, "bukan-uuid"), { status: 404 });
  });

  it("halaman Analisis menampilkan PDSA yang belum Selesai untuk Indikator dan Lingkup yang sama", async () => {
    const { indikatorId, unit } = await siapkan();
    const berjalan = (await buatPdsa(komite, { indikatorId, unitId: null, ...plan() })).id;
    const selesai = (await buatPdsa(komite, { indikatorId, unitId: null, ...plan() })).id;
    await selesaikan(komite, selesai);
    await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() });
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" });
    const a = await ambilAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03" });
    assert.deepEqual(a.pdsa.map((p) => p.id), [berjalan]);
  });
});

describe("Analisis Efisiensi PDSA (PMKP 4 g)", () => {
  const kosong = Number.NaN;
  const baris = (jenis: string, sebelum: number, sesudah: number, keterangan = "") => ({ jenis, sebelum, sesudah, keterangan });
  const ditolak = (status: number, pesan: RegExp) => (e: unknown) => e instanceof ServiceError && e.status === status && pesan.test(e.message);

  it("ringkasan: total sebelum dan sesudah, hemat, dan persennya", () => {
    assert.deepEqual(ringkasEfisiensi([{ sebelum: 1000, sesudah: 600 }, { sebelum: 0, sesudah: 150 }]), {
      sebelum: 1000,
      sesudah: 750,
      hemat: 250,
      persen: 25,
    });
    assert.equal(ringkasEfisiensi([{ sebelum: 0, sesudah: 100 }]).persen, null);
  });

  it("Kepala Unit Lingkup itu menyimpan biaya per sumber daya; jenis kosong dilewati, menyimpan ulang mengganti semuanya", async () => {
    const { indikatorId, unit } = await siapkan();
    const kepala = await sebagai("kepalaUnit", [unit.id]);
    const { id } = await buatPdsa(kepala, { indikatorId, unitId: unit.id, ...plan() });
    await simpanEfisiensiPdsa(kepala, id, {
      baris: [baris("tenaga", 4_000_000, 3_000_000, "Lembur perawat"), baris("bahan", 1_000_000, 1_200_000), baris("alat", kosong, kosong)],
      kesimpulan: "Per bulan, Januari dibanding April.",
    });
    let p = await ambilPdsa(kepala, id);
    assert.deepEqual(
      p.efisiensi?.baris.map((b) => [b.jenis, b.sebelum, b.sesudah]),
      [
        ["tenaga", 4_000_000, 3_000_000],
        ["bahan", 1_000_000, 1_200_000],
      ],
    );
    assert.deepEqual([p.efisiensi?.ringkasan.hemat, p.efisiensi?.kesimpulan], [800_000, "Per bulan, Januari dibanding April."]);
    assert.equal((await daftarPdsa(kepala, { lingkup: unit.id })).find((x) => x.id === id)?.efisiensi?.sebelum, 5_000_000);

    await simpanEfisiensiPdsa(kepala, id, { baris: [baris("waktu", 500, 300)], kesimpulan: "Lama rawat." });
    p = await ambilPdsa(kepala, id);
    assert.deepEqual(p.efisiensi?.baris.map((b) => b.jenis), ["waktu"]);
  });

  it("menolak isian tidak sah dan penulis di luar Lingkup", async () => {
    const { indikatorId, unit } = await siapkan();
    const { id } = await buatPdsa(komite, { indikatorId, unitId: unit.id, ...plan() });
    const kesimpulan = "Per bulan.";
    await assert.rejects(simpanEfisiensiPdsa(komite, id, { baris: [], kesimpulan }), ditolak(400, /setidaknya satu/));
    await assert.rejects(simpanEfisiensiPdsa(komite, id, { baris: [baris("tenaga", 100, kosong)], kesimpulan }), ditolak(400, /Tenaga/));
    await assert.rejects(simpanEfisiensiPdsa(komite, id, { baris: [baris("tenaga", 1.5, 1)], kesimpulan }), ditolak(400, /Rupiah/));
    await assert.rejects(simpanEfisiensiPdsa(komite, id, { baris: [baris("lain", 1, 1)], kesimpulan }), ditolak(400, /tidak dikenal/));
    await assert.rejects(simpanEfisiensiPdsa(komite, id, { baris: [baris("tenaga", 1, 1)], kesimpulan: " " }), ditolak(400, /Kesimpulan/));
    await assert.rejects(
      simpanEfisiensiPdsa(await sebagai("kepalaUnit"), id, { baris: [baris("tenaga", 1, 1)], kesimpulan }),
      ditolak(403, /Lingkup Unit/),
    );
    await simpanEfisiensiPdsa(await adminSistem(), id, { baris: [baris("tenaga", 1, 1)], kesimpulan });
  });
});
