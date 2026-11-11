import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { Pengguna } from "@/modules/auth/service";
import { capaianTriwulan } from "@/modules/capaian/service";
import { aturAktifIndikator, tambahUnitPelapor, tetapkanTarget } from "@/modules/indikator/service";
import { laporanTriwulan, simpanRekomendasi } from "@/modules/laporan/service";
import { ajukanPengukuran } from "@/modules/pengukuran/service";
import { buatPdsa, simpanAnalisis, tambahTindakLanjut } from "@/modules/perbaikan/service";

import { adminSistem, indikatorBaru, komiteMutu, sebagai, terverifikasi, unitBaru } from "./bantuan";

/*
 * Capaian Triwulan dan Laporan Triwulan mencakup seluruh database tes bersama, jadi semua Unit Pelapor di file ini
 * memakai tahun 2016 yang tidak dipakai tes lain, dan pemeriksaan disaring ke Indikator buatan tes itu sendiri.
 */

let komite: Pengguna;
before(async () => {
  komite = await komiteMutu();
});

/** Unit baru yang menjadi Unit Pelapor Indikator selama periode di tahun 2016 (bawaan sepanjang 2016). */
async function pelapor2016(indikatorId: string, awalan: string, bulanMulai = "2016-01", bulanBerhenti = "2016-12") {
  const unit = await unitBaru(awalan);
  await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai, bulanBerhenti });
  return unit;
}

const barisCapaian = async (triwulan: string, id: string) =>
  (await capaianTriwulan(komite, triwulan)).find((b) => b.indikator.id === id);

const PLAN = { judul: "Uji coba", masalah: "M", tujuan: "T", prediksi: "P", rencana: "R" };

describe("Capaian Triwulan", () => {
  it("= ΣN/ΣD Pengukuran Terverifikasi tiga bulan (bukan rata-rata Capaian bulanan), dinilai dengan Target bulan terakhir", async () => {
    const ind = await indikatorBaru({ target: { nilai: 80, berlakuMulai: "2016-01" } });
    await tetapkanTarget(komite, ind, { nilai: 90, berlakuMulai: "2016-03" });
    const a = await pelapor2016(ind, "Unit A");
    const b = await pelapor2016(ind, "Unit B");
    await terverifikasi(ind, a.id, "2016-01", 90, 100);
    await terverifikasi(ind, a.id, "2016-02", 1, 10);
    await terverifikasi(ind, a.id, "2016-03", 45, 50);
    await terverifikasi(ind, b.id, "2016-03", 9, 10);
    // Diajukan tetapi belum Terverifikasi: tidak dihitung.
    await ajukanPengukuran(await sebagai("kepalaUnit", [b.id]), { indikatorId: ind, unitId: b.id, bulan: "2016-02", n: 0, d: 50 });

    const r = (await barisCapaian("2016-1", ind))!;
    assert.deepEqual(
      { n: r.triwulan.n, d: r.triwulan.d, target: r.triwulan.target, status: r.triwulan.status, k: r.triwulan.kelengkapan },
      { n: 145, d: 170, target: 90, status: "belumTercapai", k: { terverifikasi: 4, wajib: 6 } },
    );
    assert.equal(r.triwulan.capaian, (145 * 100) / 170);
    assert.deepEqual(
      r.bulan.map((m) => [m.bulan, m.capaian, m.target, m.status]),
      [
        ["2016-01", 90, 80, "tercapai"],
        ["2016-02", 10, 80, "belumTercapai"],
        ["2016-03", 90, 90, "tercapai"],
      ],
    );
    assert.deepEqual(r.unit.map((u) => u.id).sort(), [a.id, b.id].sort());
  });

  it("mengikuti periode Unit Pelapor per bulan; Triwulan tanpa Unit Pelapor tidak memuat Indikator itu", async () => {
    const ind = await indikatorBaru();
    const a = await pelapor2016(ind, "Unit A", "2016-01", "2016-01");
    const b = await pelapor2016(ind, "Unit B", "2016-02", "2016-03");
    await terverifikasi(ind, a.id, "2016-01", 8, 10);
    await terverifikasi(ind, b.id, "2016-03", 10, 10);

    const r = (await barisCapaian("2016-1", ind))!;
    assert.deepEqual(r.triwulan.kelengkapan, { terverifikasi: 2, wajib: 3 });
    assert.equal(r.triwulan.capaian, 90);
    assert.deepEqual(
      r.bulan.map((m) => m.unit.map((u) => u.id)),
      [[a.id], [b.id], [b.id]],
    );
    assert.equal(await barisCapaian("2016-2", ind), undefined);
  });

  it("Indikator Semesteran hanya dimuat di TW II dan TW IV, dengan bulan Juni atau Desember saja", async () => {
    const ind = await indikatorBaru({ frekuensi: "semesteran" });
    const s = await pelapor2016(ind, "Unit S");
    await terverifikasi(ind, s.id, "2016-06", 7, 10);
    await terverifikasi(ind, s.id, "2016-12", 9, 10);
    assert.equal(await barisCapaian("2016-1", ind), undefined);
    assert.equal(await barisCapaian("2016-3", ind), undefined);
    const r = (await barisCapaian("2016-2", ind))!;
    assert.deepEqual(r.bulan.map((m) => m.bulan), ["2016-06"]);
    assert.equal(r.triwulan.capaian, 70);
    assert.deepEqual((await barisCapaian("2016-4", ind))!.bulan.map((m) => [m.bulan, m.capaian]), [["2016-12", 90]]);
  });

  it("Indikator nonaktif hanya dimuat bila punya Pengukuran Terverifikasi dalam Triwulan itu", async () => {
    const terukur = await indikatorBaru();
    const x = await pelapor2016(terukur, "Unit X");
    await terverifikasi(terukur, x.id, "2016-02", 5, 10);
    const kosong = await indikatorBaru();
    await pelapor2016(kosong, "Unit Y");
    await aturAktifIndikator(komite, terukur, false);
    await aturAktifIndikator(komite, kosong, false);
    assert.equal((await barisCapaian("2016-1", terukur))?.triwulan.capaian, 50);
    assert.equal(await barisCapaian("2016-1", kosong), undefined);
  });

  it("hanya untuk Komite Mutu, Direktur, dan Admin Sistem; Triwulan yang belum selesai ditolak", async () => {
    await capaianTriwulan(await sebagai("direktur"), "2016-1");
    await capaianTriwulan(await adminSistem(), "2016-1");
    await assert.rejects(capaianTriwulan(await sebagai("kepalaUnit"), "2016-1"), { status: 403 });
    await assert.rejects(capaianTriwulan(await sebagai("petugasInputData"), "2016-1"), { status: 403 });
    await assert.rejects(capaianTriwulan(null, "2016-1"), { status: 401 });
    await assert.rejects(capaianTriwulan(komite, "2026-4", new Date("2026-11-11T04:00:00Z")), { status: 400 });
    await assert.rejects(capaianTriwulan(komite, "2016-03"), { status: 400, message: "Triwulan tidak valid." });
  });
});

describe("Laporan Triwulan", () => {
  it("memuat Analisis setiap bulan yang dinilai: Lingkup RS untuk INM/IMP-RS, Lingkup Unit untuk IMP-Unit; yang belum = null", async () => {
    const impRs = await indikatorBaru();
    const a = await pelapor2016(impRs, "Unit A");
    await simpanAnalisis(komite, { indikatorId: impRs, unitId: null, bulan: "2016-02", teks: "RS Februari" });
    // Analisis Lingkup Unit untuk IMP-RS tidak dimuat di laporan.
    await simpanAnalisis(komite, { indikatorId: impRs, unitId: a.id, bulan: "2016-02", teks: "Unit A Februari" });
    const impUnit = await indikatorBaru({ kelompok: "IMP-Unit" });
    const c = await pelapor2016(impUnit, "Unit C", "2016-02");
    await simpanAnalisis(komite, { indikatorId: impUnit, unitId: c.id, bulan: "2016-03", teks: "Unit C Maret" });

    const lap = await laporanTriwulan(komite, "2016-1");
    assert.deepEqual(lap.bulan, ["2016-01", "2016-02", "2016-03"]);
    const milik = (id: string) =>
      lap.analisis.filter((x) => x.indikator.id === id).map((x) => [x.bulan, x.unit?.id ?? null, x.analisis?.teks ?? null]);
    assert.deepEqual(milik(impRs), [
      ["2016-01", null, null],
      ["2016-02", null, "RS Februari"],
      ["2016-03", null, null],
    ]);
    // Januari: Unit C belum Unit Pelapor, jadi tidak ada Analisis yang diharapkan.
    assert.deepEqual(milik(impUnit), [
      ["2016-02", c.id, null],
      ["2016-03", c.id, "Unit C Maret"],
    ]);
  });

  it("memuat Tindak Lanjut milik Analisis Triwulan itu dan PDSA yang periode uji cobanya bersinggungan", async () => {
    const ind = await indikatorBaru();
    await pelapor2016(ind, "Unit A");
    const { id: analisisId } = await simpanAnalisis(komite, { indikatorId: ind, unitId: null, bulan: "2016-02", teks: "RS" });
    const tl = await tambahTindakLanjut(komite, analisisId, { tindakan: "Audit", pic: "IPCN", tenggat: "2016-03-31" });
    const masuk = await buatPdsa(komite, { indikatorId: ind, unitId: null, ...PLAN, bulanMulai: "2015-11", bulanAkhir: "2016-01" });
    await buatPdsa(komite, { indikatorId: ind, unitId: null, ...PLAN, bulanMulai: "2016-04", bulanAkhir: "2016-05" });

    const lap = await laporanTriwulan(komite, "2016-1");
    const tindak = lap.analisis.filter((x) => x.indikator.id === ind).flatMap((x) => x.analisis?.tindakLanjut ?? []);
    assert.deepEqual(
      tindak.map((t) => [t.id, t.bulan, t.lewatTenggat]),
      [[tl.id, "2016-02", true]],
    );
    assert.deepEqual(
      lap.pdsa.filter((p) => p.indikator.id === ind).map((p) => p.id),
      [masuk.id],
    );
  });

  it("ringkasan dihitung dari baris Capaian Triwulan", async () => {
    const lap = await laporanTriwulan(komite, "2016-1");
    const { ringkasan: r, capaian } = lap;
    assert.equal(r.dinilai, capaian.length);
    assert.equal(r.tercapai, capaian.filter((b) => b.triwulan.status === "tercapai").length);
    assert.equal(r.belumTercapai, capaian.filter((b) => b.triwulan.status === "belumTercapai").length);
    assert.equal(r.tercapai + r.belumTercapai + r.kosong, r.dinilai);
    assert.equal(r.kelengkapan.wajib, capaian.reduce((t, b) => t + b.triwulan.kelengkapan.wajib, 0));
  });

  it("Rekomendasi ditulis Komite Mutu atau Admin Sistem, menulis ulang mengubah yang sama; isian wajib dan dibatasi", async () => {
    const triwulan = "2016-1";
    await simpanRekomendasi(komite, { triwulan, teks: "  Pertahankan audit mingguan.  " });
    let rek = (await laporanTriwulan(komite, triwulan)).rekomendasi;
    assert.equal(rek?.teks, "Pertahankan audit mingguan.");
    assert.equal(rek?.diubahOleh, komite.nama);

    const admin = await adminSistem();
    await simpanRekomendasi(admin, { triwulan, teks: "Perluas ke semua Unit." });
    rek = (await laporanTriwulan(await sebagai("direktur"), triwulan)).rekomendasi;
    assert.deepEqual([rek?.teks, rek?.diubahOleh], ["Perluas ke semua Unit.", admin.nama]);

    await assert.rejects(simpanRekomendasi(komite, { triwulan, teks: "   " }), { status: 400 });
    await assert.rejects(simpanRekomendasi(komite, { triwulan, teks: "x".repeat(8001) }), { status: 400 });
    await assert.rejects(simpanRekomendasi(komite, { triwulan: "2016-5", teks: "x" }), { status: 400 });
    await assert.rejects(
      simpanRekomendasi(komite, { triwulan: "2026-4", teks: "x" }, new Date("2026-11-11T04:00:00Z")),
      { status: 400, message: "Triwulan IV 2026 belum selesai." },
    );
    for (const peran of ["direktur", "kepalaUnit", "petugasInputData"] as const) {
      await assert.rejects(simpanRekomendasi(await sebagai(peran), { triwulan, teks: "x" }), { status: 403 }, peran);
    }
  });

  it("dibaca Komite Mutu, Direktur, dan Admin Sistem (hanya Komite Mutu dan Admin Sistem boleh menulis); tanpa Triwulan = Triwulan lalu", async () => {
    assert.equal((await laporanTriwulan(komite, "2016-1")).bolehTulis, true);
    assert.equal((await laporanTriwulan(await sebagai("direktur"), "2016-1")).bolehTulis, false);
    assert.equal((await laporanTriwulan(komite, undefined, new Date("2016-05-10T04:00:00Z"))).triwulan, "2016-1");
    await assert.rejects(laporanTriwulan(await sebagai("kepalaUnit"), "2016-1"), {
      status: 403,
      message: "Laporan Triwulan hanya untuk Komite Mutu, Direktur, dan Admin Sistem.",
    });
    await assert.rejects(laporanTriwulan(await sebagai("petugasInputData"), "2016-1"), { status: 403 });
    await assert.rejects(laporanTriwulan(komite, "2016-2", new Date("2016-05-10T04:00:00Z")), { status: 400 });
    await assert.rejects(laporanTriwulan(komite, "2016-5"), { status: 400, message: "Triwulan tidak valid." });
  });
});
