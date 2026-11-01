import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { Pengguna } from "@/modules/auth/service";
import { aturAktifIndikator, tambahUnitPelapor } from "@/modules/indikator/service";
import { bukaKembaliPengukuran } from "@/modules/pengukuran/service";
import { ambilAnalisis, analisisTersedia, simpanAnalisis } from "@/modules/perbaikan/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, indikatorBaru, komiteMutu, sebagai, terverifikasi, unitBaru, unitPelapor } from "./bantuan";

let admin: Pengguna;
let komite: Pengguna;
let direktur: Pengguna;
before(async () => {
  [admin, komite, direktur] = [await adminSistem(), await komiteMutu(), await sebagai("direktur")];
});

/** IMP-RS baru dengan satu Unit Pelapor mulai Januari 2026. */
async function siapkan(ubahan: Parameters<typeof indikatorBaru>[0] = {}) {
  const indikatorId = await indikatorBaru(ubahan);
  const unit = await unitPelapor(indikatorId, "ICU");
  return { indikatorId, unit };
}

describe("menulis Analisis", () => {
  it("Komite Mutu menulis Analisis Lingkup RS; menyimpan lagi mengubah Analisis yang sama", async () => {
    const { indikatorId } = await siapkan();
    const kunci = { indikatorId, unitId: null, bulan: "2026-03" };
    const { id } = await simpanAnalisis(komite, { ...kunci, teks: "  Capaian turun karena observasi malam.  " });
    const ubah = await simpanAnalisis(admin, { ...kunci, teks: "Capaian turun; observasi malam kurang." });
    assert.equal(ubah.id, id);

    const a = await ambilAnalisis(komite, kunci);
    assert.equal(a.analisis?.teks, "Capaian turun; observasi malam kurang.");
    assert.equal(a.analisis?.diubahOleh, admin.nama);
    assert.equal(a.unit, null);
    assert.equal(a.bolehTulis, true);
  });

  it("Kepala Unit menulis Analisis Lingkup Unit-nya, tetapi tidak Lingkup RS atau Unit lain", async () => {
    const { indikatorId, unit } = await siapkan();
    const lain = await unitPelapor(indikatorId, "IGD");
    const kepala = await sebagai("kepalaUnit", [unit.id]);
    await simpanAnalisis(kepala, { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "Analisis ICU" });
    await assert.rejects(simpanAnalisis(kepala, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }), { status: 403 });
    await assert.rejects(simpanAnalisis(kepala, { indikatorId, unitId: lain.id, bulan: "2026-03", teks: "x" }), { status: 403 });
    // Komite Mutu juga boleh menulis Analisis Lingkup Unit.
    await simpanAnalisis(komite, { indikatorId, unitId: lain.id, bulan: "2026-03", teks: "Analisis IGD" });
  });

  it("Petugas Input Data dan Direktur tidak boleh menulis Analisis", async () => {
    const { indikatorId, unit } = await siapkan();
    const petugas = await sebagai("petugasInputData", [unit.id]);
    for (const aktor of [petugas, direktur]) {
      await assert.rejects(simpanAnalisis(aktor, { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "x" }), { status: 403 });
      await assert.rejects(simpanAnalisis(aktor, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }), { status: 403 });
    }
    await assert.rejects(simpanAnalisis(null, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }), { status: 401 });
  });

  it("teks Analisis wajib diisi", async () => {
    const { indikatorId } = await siapkan();
    await assert.rejects(simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "   " }), { status: 400 });
  });

  it("bulan yang belum berjalan dan bulan tidak valid ditolak", async () => {
    const { indikatorId } = await siapkan();
    const pertengahanMaret = new Date("2026-03-15T03:00:00Z");
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-04", teks: "x" }, pertengahanMaret),
      { status: 400, message: /belum berjalan/ },
    );
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }, pertengahanMaret);
    await assert.rejects(simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-13", teks: "x" }), { status: 400 });
  });

  it("Analisis hanya untuk bulan yang dinilai: ada Unit Pelapor, dan Unit Lingkup adalah Unit Pelapor bulan itu", async () => {
    const indikatorId = await indikatorBaru();
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }),
      { status: 400, message: /tidak punya Unit Pelapor/ },
    );
    const icu = await unitPelapor(indikatorId, "ICU", "2026-05");
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: icu.id, bulan: "2026-04", teks: "x" }),
      { status: 400, message: /bukan Unit Pelapor/ },
    );
    const bukanPelapor = await unitBaru("Farmasi");
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: bukanPelapor.id, bulan: "2026-05", teks: "x" }),
      { status: 400, message: /bukan Unit Pelapor/ },
    );
    await simpanAnalisis(komite, { indikatorId, unitId: icu.id, bulan: "2026-05", teks: "x" });
  });

  it("Indikator Semesteran hanya dianalisis pada bulan Juni dan Desember", async () => {
    const { indikatorId } = await siapkan({ frekuensi: "semesteran" });
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-05", teks: "x" }),
      { status: 400, message: /Juni dan Desember/ },
    );
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-06", teks: "x" });
  });

  it("IMP-Unit tidak punya Analisis Lingkup RS, hanya Lingkup Unit Pelapor-nya", async () => {
    const { indikatorId, unit } = await siapkan({ kelompok: "IMP-Unit" });
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "x" }),
      { status: 400, message: /IMP-Unit/ },
    );
    await simpanAnalisis(await sebagai("kepalaUnit", [unit.id]), { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "x" });
  });

  it("Indikator nonaktif tidak bisa dianalisis lagi, tetapi Analisis lamanya tetap terbaca dan Tindak Lanjut-nya tetap dikelola", async () => {
    const { indikatorId } = await siapkan();
    const kunci = { indikatorId, unitId: null, bulan: "2026-03" };
    await simpanAnalisis(komite, { ...kunci, teks: "Analisis lama" });
    await aturAktifIndikator(komite, indikatorId, false);
    await assert.rejects(simpanAnalisis(komite, { ...kunci, teks: "baru" }), { status: 400, message: /nonaktif/ });
    const a = await ambilAnalisis(komite, kunci);
    assert.deepEqual([a.analisis?.teks, a.bolehTulisAnalisis, a.bolehTulis], ["Analisis lama", false, true]);
    // Bulan tanpa Analisis milik Indikator nonaktif tidak bisa dibuka.
    await assert.rejects(ambilAnalisis(komite, { ...kunci, bulan: "2026-04" }), { status: 400, message: /nonaktif/ });
  });

  it("Unit yang kini nonaktif tetap bisa dianalisis untuk bulan saat ia menjadi Unit Pelapor", async () => {
    const indikatorId = await indikatorBaru();
    const unit = await unitBaru("Bangsal Lama");
    await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai: "2026-01", bulanBerhenti: "2026-03" });
    await aturAktifUnit(admin, unit.id, false);
    await simpanAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "Analisis sebelum ditutup" });
    assert.equal((await ambilAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03" })).unit?.aktif, false);
  });

  it("Indikator dan Unit yang tidak ada ditolak 404", async () => {
    const { indikatorId } = await siapkan();
    await assert.rejects(
      simpanAnalisis(komite, { indikatorId: "bukan-uuid", unitId: null, bulan: "2026-03", teks: "x" }),
      { status: 404 },
    );
    await assert.rejects(
      ambilAnalisis(komite, { indikatorId, unitId: "00000000-0000-0000-0000-000000000000", bulan: "2026-03" }),
      { status: 404 },
    );
  });
});

describe("membaca Analisis", () => {
  it("Petugas Input Data dan Kepala Unit hanya membaca Lingkup Unit-nya; Direktur membaca semua tanpa menulis", async () => {
    const { indikatorId, unit } = await siapkan();
    const lain = await unitPelapor(indikatorId, "IGD");
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "RS" });
    await simpanAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "ICU" });

    for (const aktor of [await sebagai("petugasInputData", [unit.id]), await sebagai("kepalaUnit", [unit.id])]) {
      const a = await ambilAnalisis(aktor, { indikatorId, unitId: unit.id, bulan: "2026-03" });
      assert.equal(a.analisis?.teks, "ICU");
      assert.equal(a.bolehTulisAnalisis, aktor.peran === "kepalaUnit");
      await assert.rejects(ambilAnalisis(aktor, { indikatorId, unitId: null, bulan: "2026-03" }), { status: 403 });
      await assert.rejects(ambilAnalisis(aktor, { indikatorId, unitId: lain.id, bulan: "2026-03" }), { status: 403 });
    }
    const d = await ambilAnalisis(direktur, { indikatorId, unitId: null, bulan: "2026-03" });
    assert.equal(d.analisis?.teks, "RS");
    assert.deepEqual([d.bolehTulis, d.bolehTulisAnalisis], [false, false]);
  });

  it("bulan tanpa Analisis tetap bisa dibuka untuk ditulis; bulan yang tidak dinilai ditolak", async () => {
    const { indikatorId, unit } = await siapkan();
    const a = await ambilAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03" });
    assert.deepEqual([a.analisis, a.bolehTulis, a.bolehTulisAnalisis], [null, true, true]);
    await assert.rejects(ambilAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2025-12" }), { status: 400 });
  });

  it("Capaian yang tampil adalah Capaian terkini, ikut berubah saat Pengukuran dibuka kembali", async () => {
    const { indikatorId, unit } = await siapkan();
    const id = await terverifikasi(indikatorId, unit.id, "2026-03", 9, 10);
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03", teks: "Capaian 90%" });

    const rs = await ambilAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03" });
    assert.deepEqual([rs.capaian?.capaian, rs.capaian?.target, rs.capaian?.status], [90, 80, "tercapai"]);
    assert.deepEqual(rs.capaian?.kelengkapan, { terverifikasi: 1, wajib: 1 });
    const icu = await ambilAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03" });
    assert.equal(icu.capaian?.capaian, 90);

    await bukaKembaliPengukuran(await sebagai("kepalaUnit", [unit.id]), id, "Salah hitung D");
    const sesudah = await ambilAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-03" });
    assert.deepEqual(sesudah.capaian?.kelengkapan, { terverifikasi: 0, wajib: 1 });
    assert.equal(sesudah.capaian?.capaian, null);
  });

  it("Analisis yang tersedia untuk Monitoring hanya Lingkup yang boleh dibaca aktor", async () => {
    const { indikatorId, unit } = await siapkan();
    const lain = await unitPelapor(indikatorId, "IGD");
    await simpanAnalisis(komite, { indikatorId, unitId: null, bulan: "2026-02", teks: "RS" });
    await simpanAnalisis(komite, { indikatorId, unitId: unit.id, bulan: "2026-03", teks: "ICU" });
    await simpanAnalisis(komite, { indikatorId, unitId: lain.id, bulan: "2026-03", teks: "IGD" });
    const bulan = ["2026-01", "2026-02", "2026-03"];

    const semua = await analisisTersedia(direktur, indikatorId, bulan);
    assert.deepEqual(
      semua.map((a) => `${a.unitId ?? "RS"} ${a.bulan}`).sort(),
      [`${lain.id} 2026-03`, `${unit.id} 2026-03`, "RS 2026-02"].sort(),
    );
    const petugas = await analisisTersedia(await sebagai("petugasInputData", [unit.id]), indikatorId, bulan);
    assert.deepEqual(petugas, [{ unitId: unit.id, bulan: "2026-03" }]);
    assert.deepEqual(await analisisTersedia(komite, indikatorId, ["2026-04"]), []);
  });
});
