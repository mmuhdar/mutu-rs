import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import type { Pengguna } from "@/modules/auth/service";
import { laporanTriwulan, simpanTindakLanjutUmpanBalik, simpanUmpanBalik } from "@/modules/laporan/service";

import { adminSistem, komiteMutu, sebagai } from "./bantuan";

/* Umpan Balik Dewan Pengawas (TKRS 1). Hanya file ini yang mencatatnya; memakai tahun 2012. */

const SEKARANG = new Date("2013-06-15T02:00:00Z");
const ditolak = (status: number, pesan?: RegExp) => (e: unknown) =>
  e instanceof ServiceError && e.status === status && (!pesan || pesan.test(e.message));

let komite: Pengguna;
let direktur: Pengguna;
before(async () => {
  komite = await komiteMutu();
  direktur = await sebagai("direktur");
});

describe("Umpan Balik Dewan Pengawas", () => {
  it("dicatat Direktur setelah Triwulan berakhir, lalu tindak lanjutnya tampil di Laporan Triwulan berikutnya", async () => {
    await simpanUmpanBalik(direktur, { triwulan: "2012-3", teks: "Percepat perbaikan kepatuhan APD.", diterimaPada: "2012-10-20" }, SEKARANG);
    let lap = await laporanTriwulan(komite, "2012-3", SEKARANG);
    assert.equal(lap.umpanBalik?.teks, "Percepat perbaikan kepatuhan APD.");
    assert.equal(lap.umpanBalik?.diubahOleh, direktur.nama);
    assert.equal(lap.bolehCatatUmpanBalik, true);

    await simpanTindakLanjutUmpanBalik(komite, { triwulan: "2012-3", tindakLanjut: "Audit APD mingguan sejak November." });
    lap = await laporanTriwulan(direktur, "2012-4", SEKARANG);
    assert.equal(lap.umpanBalik, null);
    assert.deepEqual([lap.umpanBalikSebelumnya?.triwulan, lap.umpanBalikSebelumnya?.tindakLanjut], ["2012-3", "Audit APD mingguan sejak November."]);
  });

  it("mencatat ulang mengubah umpan balik yang sama, tindak lanjutnya tetap", async () => {
    await simpanUmpanBalik(komite, { triwulan: "2012-3", teks: "Percepat perbaikan APD dan identifikasi pasien.", diterimaPada: "2012-10-21" }, SEKARANG);
    const lap = await laporanTriwulan(komite, "2012-3", SEKARANG);
    assert.deepEqual([lap.umpanBalik?.teks, lap.umpanBalik?.diterimaPada, lap.umpanBalik?.tindakLanjut], [
      "Percepat perbaikan APD dan identifikasi pasien.",
      "2012-10-21",
      "Audit APD mingguan sejak November.",
    ]);
  });

  it("menolak isian dan peran yang tidak sah", async () => {
    const isian = { triwulan: "2012-2", teks: "Umpan balik.", diterimaPada: "2012-07-10" };
    await assert.rejects(simpanUmpanBalik(await sebagai("kepalaUnit"), isian, SEKARANG), ditolak(403));
    await assert.rejects(simpanUmpanBalik(komite, { ...isian, teks: " " }, SEKARANG), ditolak(400, /Umpan balik/));
    await assert.rejects(simpanUmpanBalik(komite, { ...isian, diterimaPada: "2012-06-30" }, SEKARANG), ditolak(400, /berakhir/));
    await assert.rejects(simpanUmpanBalik(komite, { ...isian, diterimaPada: "2013-06-16" }, SEKARANG), ditolak(400, /masa depan/));
    await assert.rejects(simpanUmpanBalik(komite, { ...isian, triwulan: "2013-2" }, SEKARANG), ditolak(400, /belum selesai/));
    await assert.rejects(simpanTindakLanjutUmpanBalik(komite, { triwulan: "2012-1", tindakLanjut: "Sudah." }), ditolak(404));
    await simpanUmpanBalik(await adminSistem(), isian, SEKARANG);
  });
});
