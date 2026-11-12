import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import { kesesuaian, sampelMinimalValidasi, validData } from "@/lib/validasi";
import type { Pengguna } from "@/modules/auth/service";
import { laporanTriwulan } from "@/modules/laporan/service";
import { ambilValidasi, daftarValidasi, simpanValidasi, type IsianValidasi } from "@/modules/validasi/service";

import { indikatorBaru, komiteMutu, sebagai, terverifikasi, unitBaru, unitPelapor } from "./bantuan";

/* Validasi Data (PMKP 5). Hanya file ini yang mencatat validasi; memakai tahun 2011. */

const SEKARANG = new Date("2011-12-15T02:00:00Z");
const ditolak = (status: number, pesan?: RegExp) => (e: unknown) =>
  e instanceof ServiceError && e.status === status && (!pesan || pesan.test(e.message));

let komite: Pengguna;
let kepala: Pengguna;
let indikatorId: string;
let unitV: { id: string; nama: string };
const isian = (ubahan: Partial<IsianValidasi> = {}): IsianValidasi => ({
  indikatorId,
  unitId: unitV.id,
  bulan: "2011-09",
  pemicu: "indikatorBaru",
  tanggal: "2011-10-05",
  pengumpulData: "Ns. Ayu",
  validator: "Ns. Dewi",
  populasi: 120,
  sampel: 16,
  sesuai: 15,
  penyebab: [],
  perbaikan: "",
  catatan: "",
  ...ubahan,
});

before(async () => {
  komite = await komiteMutu();
  indikatorId = await indikatorBaru({ target: { nilai: 80, berlakuMulai: "2011-01" } });
  unitV = await unitPelapor(indikatorId, "Unit Validasi", "2011-01");
  kepala = await sebagai("kepalaUnit", [unitV.id]);
  // Yang divalidasi adalah data yang sudah dikumpulkan: Pengukuran Agustus dan September ada, Juni tidak.
  await terverifikasi(indikatorId, unitV.id, "2011-08", 90, 100);
  await terverifikasi(indikatorId, unitV.id, "2011-09", 92, 100);
});

describe("aturan murni Validasi Data", () => {
  it("sampel minimal validator menurut PMK 30/2022 Tabel 3", () => {
    assert.deepEqual([1, 10, 16, 17, 160, 161, 480, 5000].map(sampelMinimalValidasi), [1, 10, 16, 16, 16, 48, 48, 48]);
  });
  it("valid bila kesesuaian mencapai 90%", () => {
    assert.deepEqual([validData(9, 10), validData(8, 10), validData(43, 48), validData(44, 48)], [true, false, false, true]);
    assert.equal(kesesuaian(15, 16), 93.75);
  });
});

describe("mencatat validasi", () => {
  it("tidak valid wajib beralasan; validasi ulang yang valid menutup status belum valid", async () => {
    await assert.rejects(simpanValidasi(komite, isian({ bulan: "2011-08", sesuai: 13 }), undefined, SEKARANG), ditolak(400, /di bawah 90%/));
    const { id: gagal } = await simpanValidasi(
      komite,
      isian({ bulan: "2011-08", sesuai: 13, penyebab: ["definisi", "input", "definisi"], perbaikan: "Pelatihan ulang definisi operasional." }),
      undefined,
      SEKARANG,
    );
    let v = await ambilValidasi(komite, gagal);
    assert.deepEqual([v.valid, v.belumValid, v.diulang, v.penyebab], [false, true, false, ["definisi", "input"]]);
    assert.equal((await daftarValidasi(komite, { belumValid: true })).some((x) => x.id === gagal), true);

    const { id: ulang } = await simpanValidasi(komite, isian({ bulan: "2011-08", tanggal: "2011-10-20", sesuai: 16 }), undefined, SEKARANG);
    v = await ambilValidasi(komite, gagal);
    assert.deepEqual([v.belumValid, v.diulang, v.riwayat.map((r) => r.id)], [false, true, [gagal, ulang]]);
    assert.equal((await daftarValidasi(komite, { belumValid: true })).some((x) => x.id === gagal), false);
  });

  it("Kepala Unit Unit itu mencatat dan memperbaiki; Indikator, Unit, dan bulannya tetap", async () => {
    const { id } = await simpanValidasi(kepala, isian(), undefined, SEKARANG);
    await simpanValidasi(kepala, isian({ bulan: "2011-07", sesuai: 16, catatan: "Salah ketik." }), id, SEKARANG);
    const v = await ambilValidasi(kepala, id);
    assert.deepEqual([v.bulan, v.sesuai, v.catatan, v.diubahOleh, v.bolehTulis], ["2011-09", 16, "Salah ketik.", kepala.nama, true]);
  });

  it("menolak isian yang tidak sesuai aturan validasi", async () => {
    const coba = (u: Partial<IsianValidasi>) => simpanValidasi(komite, isian(u), undefined, SEKARANG);
    await assert.rejects(coba({ validator: " ns. ayu " }), ditolak(400, /orang yang berbeda/));
    await assert.rejects(coba({ sampel: 10 }), ditolak(400, /minimal 16 untuk populasi 120/));
    await assert.rejects(coba({ populasi: 10, sampel: 11 }), ditolak(400, /sebesar populasi/));
    await assert.rejects(coba({ sesuai: 17 }), ditolak(400, /sebesar sampel/));
    await assert.rejects(coba({ pemicu: "berkala" }), ditolak(400, /pemicu/));
    await assert.rejects(coba({ tanggal: "2011-12-16" }), ditolak(400, /masa depan/));
    await assert.rejects(coba({ tanggal: "2011-08-31" }), ditolak(400, /sebelum September 2011/));
    await assert.rejects(coba({ bulan: "2012-01" }), ditolak(400));
    await assert.rejects(coba({ unitId: (await unitBaru()).id }), ditolak(400, /bukan Unit Pelapor/));
    await assert.rejects(coba({ bulan: "2011-06", tanggal: "2011-07-05" }), ditolak(400, /Belum ada Pengukuran/));
  });

  it("hak akses mengikuti Lingkup Unit", async () => {
    const { id } = await simpanValidasi(komite, isian(), undefined, SEKARANG);
    const kepalaLain = await sebagai("kepalaUnit");
    await assert.rejects(simpanValidasi(kepalaLain, isian(), undefined, SEKARANG), ditolak(403));
    await assert.rejects(simpanValidasi(await sebagai("petugasInputData", [unitV.id]), isian(), undefined, SEKARANG), ditolak(403));
    await assert.rejects(ambilValidasi(kepalaLain, id), ditolak(403));
    assert.equal((await daftarValidasi(kepalaLain)).some((x) => x.id === id), false);
    const petugas = await sebagai("petugasInputData", [unitV.id]);
    assert.equal((await ambilValidasi(petugas, id)).bolehTulis, false);
  });

  it("Laporan Triwulan memuat validasi yang tanggalnya di Triwulan itu", async () => {
    const lap = await laporanTriwulan(komite, "2011-4", new Date("2012-02-01T02:00:00Z"));
    assert.equal(lap.validasi.length >= 4, true);
    assert.equal(lap.validasi.every((v) => v.tanggal >= "2011-10-01" && v.tanggal <= "2011-12-31"), true);
  });
});
