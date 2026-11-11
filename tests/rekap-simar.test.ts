import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { jadwalSimar, tandaSimar } from "@/lib/laporan";
import type { Pengguna } from "@/modules/auth/service";
import { daftarIndikator, tambahUnitPelapor } from "@/modules/indikator/service";
import { rekapSimar } from "@/modules/laporan/service";
import { ajukanPengukuran } from "@/modules/pengukuran/service";
import { simpanAnalisis, tambahTindakLanjut, ubahTindakLanjut } from "@/modules/perbaikan/service";

import { komiteMutu, sebagai, terverifikasi, unitBaru } from "./bantuan";

/*
 * Rekap SIMAR membaca INM bersama (data awal), jadi file ini memakai tahun 2015 yang tidak dipakai tes lain: Unit
 * Pelapor INM-01 di sini hanya berlaku sepanjang 2015, sehingga INM lain dan tahun lain tidak berubah.
 */

let komite: Pengguna;
let inm01: string;
let a: { id: string };
let b: { id: string };
before(async () => {
  komite = await komiteMutu();
  inm01 = (await daftarIndikator(komite)).find((i) => i.kode === "INM-01")!.id;
  for (const awalan of ["Unit A", "Unit B"]) {
    const unit = await unitBaru(awalan);
    await tambahUnitPelapor(komite, inm01, { unitId: unit.id, bulanMulai: "2015-01", bulanBerhenti: "2015-12" });
    if (awalan === "Unit A") a = unit;
    else b = unit;
  }
});

const barisInm01 = async (bulan: string) => (await rekapSimar(komite, bulan)).baris.find((x) => x.indikator.kode === "INM-01")!;
const kodeTanda = (x: { tanda: { kode: string }[] }) => x.tanda.map((t) => t.kode);

describe("Rekap SIMAR", () => {
  it("N dan D dari Pengukuran Terverifikasi; INM tanpa Unit Pelapor tetap muncul bertanda; INM Semesteran hanya Juni dan Desember", async () => {
    await terverifikasi(inm01, a.id, "2015-03", 150, 180);
    await ajukanPengukuran(await sebagai("kepalaUnit", [b.id]), { indikatorId: inm01, unitId: b.id, bulan: "2015-03", n: 10, d: 20 });

    const rekap = await rekapSimar(komite, "2015-03");
    const x = rekap.baris.find((r) => r.indikator.kode === "INM-01")!;
    assert.deepEqual([x.n, x.d, x.kelengkapan], [150, 180, { terverifikasi: 1, wajib: 2 }]);
    assert.deepEqual(kodeTanda(x), ["belumLengkap", "belumDianalisis"]);
    const inm02 = rekap.baris.find((r) => r.indikator.kode === "INM-02")!;
    assert.deepEqual(kodeTanda(inm02), ["tanpaUnitPelapor"]);

    const kode = rekap.baris.map((r) => r.indikator.kode);
    assert.deepEqual(kode, kode.toSorted());
    assert.ok(kode.includes("INM-12") && !kode.includes("INM-13"));
    assert.ok((await rekapSimar(komite, "2015-06")).baris.some((r) => r.indikator.kode === "INM-13"));
  });

  it("Analisa Capaian = Analisis Lingkup RS; Rencana Tindak Lanjut = Tindak Lanjut-nya tanpa yang Dibatalkan; tanpa tanda = siap", async () => {
    await terverifikasi(inm01, a.id, "2015-04", 180, 200);
    await terverifikasi(inm01, b.id, "2015-04", 30, 40);
    const { id } = await simpanAnalisis(komite, { indikatorId: inm01, unitId: null, bulan: "2015-04", teks: "Analisis RS April" });
    await simpanAnalisis(komite, { indikatorId: inm01, unitId: a.id, bulan: "2015-04", teks: "Analisis Unit A" });
    await tambahTindakLanjut(komite, id, { tindakan: "Audit mingguan", pic: "IPCN", tenggat: "2015-05-15" });
    const batal = await tambahTindakLanjut(komite, id, { tindakan: "Batal", pic: "X", tenggat: "2015-05-20" });
    await ubahTindakLanjut(komite, batal.id, { tindakan: "Batal", pic: "X", tenggat: "2015-05-20", status: "dibatalkan", catatan: "Diganti" });
    await tambahTindakLanjut(komite, id, { tindakan: "Pelatihan 5 momen", pic: "Komite PPI", tenggat: "2015-06-01" });

    const x = await barisInm01("2015-04");
    assert.equal(x.analisa, "Analisis RS April");
    assert.equal(x.rencana, "1. Audit mingguan (PIC: IPCN, tenggat 15 Mei 2015)\n2. Pelatihan 5 momen (PIC: Komite PPI, tenggat 1 Jun 2015)");
    assert.deepEqual(x.tanda, []);
    assert.equal(x.capaian, (210 * 100) / 240);
  });

  it("menandai D di bawah minimal SIMAR, Analisis tanpa Tindak Lanjut, teks lebih dari 1000 karakter, dan D = 0 tanpa Analisis", async () => {
    await terverifikasi(inm01, a.id, "2015-05", 50, 100);
    await terverifikasi(inm01, b.id, "2015-05", 50, 90);
    await simpanAnalisis(komite, { indikatorId: inm01, unitId: null, bulan: "2015-05", teks: "x".repeat(1001) });
    assert.deepEqual(kodeTanda(await barisInm01("2015-05")), ["dKurang", "tanpaTindakLanjut", "terlaluPanjang"]);

    await terverifikasi(inm01, a.id, "2015-07", 0, 0);
    await terverifikasi(inm01, b.id, "2015-07", 0, 0);
    const nol = await barisInm01("2015-07");
    assert.deepEqual([nol.d, nol.capaian, kodeTanda(nol)], [0, null, ["dNol"]]);
  });

  it("dibaca Komite Mutu, Direktur, dan Admin Sistem; tanpa bulan = bulan lalu dengan tenggat tanggal 10 bulan berikutnya", async () => {
    const sekarang = new Date("2015-08-15T04:00:00Z");
    const rekap = await rekapSimar(await sebagai("direktur"), undefined, sekarang);
    assert.deepEqual([rekap.bulan, rekap.tenggat, rekap.lewatTenggat], ["2015-07", "2015-08-10", true]);
    assert.equal(rekap.jumlahSiap, rekap.baris.filter((x) => x.tanda.length === 0).length);
    assert.equal((await rekapSimar(komite, "2015-07", new Date("2015-08-10T15:00:00Z"))).lewatTenggat, false);
    await assert.rejects(rekapSimar(komite, "2015-09", sekarang), { status: 400 });
    for (const peran of ["kepalaUnit", "petugasInputData"] as const) {
      await assert.rejects(rekapSimar(await sebagai(peran), "2015-07"), { status: 403 }, peran);
    }
    await assert.rejects(rekapSimar(null, "2015-07"), { status: 401 });
  });

  it("tenggat SIMAR = tanggal 10 bulan berikutnya, lewat mulai tanggal 11 menurut zona waktu konfigurasi", () => {
    assert.deepEqual(jadwalSimar("2026-10", new Date("2026-11-10T15:59:00Z")), { tenggat: "2026-11-10", lewatTenggat: false });
    assert.deepEqual(jadwalSimar("2026-10", new Date("2026-11-10T16:00:00Z")), { tenggat: "2026-11-10", lewatTenggat: true });
    assert.equal(jadwalSimar("2026-12").tenggat, "2027-01-10");
  });

  it("Rencana Tindak Lanjut lebih dari 1000 karakter juga ditandai", () => {
    const tanda = tandaSimar({ kode: "INM-02", d: 10, kelengkapan: { terverifikasi: 1, wajib: 1 }, analisa: "A", rencana: "x".repeat(1001) });
    assert.deepEqual(tanda, [{ kode: "terlaluPanjang", pesan: "Rencana Tindak Lanjut 1001 karakter, melebihi 1000." }]);
  });
});
