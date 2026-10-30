import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { config } from "@/lib/config";
import type { Peran } from "@/lib/peran";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import {
  ambilIndikator,
  daftarIndikator,
  tambahIndikator,
  targetBerlaku,
  tambahUnitPelapor,
  tetapkanTarget,
  ubahIndikator,
  type Indikator,
  type IndikatorBaru,
  type IsianIndikator,
} from "@/modules/indikator/service";
import { simpanPengukuran } from "@/modules/pengukuran/service";
import { tambahUnit } from "@/modules/unit/service";

let admin: Pengguna;
before(async () => {
  admin = (await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.9.0.1" })))!;
});

// Satu database untuk semua tes: kode Indikator dan username dibuat unik.
const unik = (awalan: string) => `${awalan}-${randomUUID().slice(0, 8)}`;

/** Aktor peran lain = sesi Admin Sistem dengan peran itu (hak akses diperiksa dari peran). */
const sebagai = (peran: Peran): Pengguna => ({ ...admin, peran });

function impBaru(ubahan: Partial<IndikatorBaru> = {}): IndikatorBaru {
  return {
    kode: unik("IMP"),
    kelompok: "IMP-RS",
    nama: "Kepatuhan identifikasi pasien sebelum tindakan",
    definisiOperasional: "Identifikasi dengan dua penanda sebelum setiap tindakan.",
    definisiNumerator: "Jumlah tindakan dengan identifikasi benar",
    definisiDenominator: "Jumlah tindakan yang diobservasi",
    sumberData: "Lembar observasi",
    faktor: 100,
    satuan: "%",
    arah: "makinTinggi",
    frekuensi: "bulanan",
    pic: "",
    target: { nilai: 80, berlakuMulai: "2026-01" },
    ...ubahan,
  };
}

describe("Target berlaku", () => {
  it("Target 80% diganti 85% mulai Januari 2027: Desember 2026 tetap 80%, Januari 2027 dan sesudahnya 85%", async () => {
    const komite = sebagai("komiteMutu");
    const id = await tambahIndikator(komite, impBaru());
    await tetapkanTarget(komite, id, { nilai: 85, berlakuMulai: "2027-01" });

    const direktur = sebagai("direktur");
    assert.equal(await targetBerlaku(direktur, id, "2026-12"), 80);
    assert.equal(await targetBerlaku(direktur, id, "2027-01"), 85);
    assert.equal(await targetBerlaku(direktur, id, "2027-06"), 85);
  });

  it("Target pertama berlaku mundur ke semua bulan sebelumnya, termasuk Target awal INM", async () => {
    const komite = sebagai("komiteMutu");
    const id = await tambahIndikator(komite, impBaru({ target: { nilai: 90, berlakuMulai: "2026-03" } }));
    await tetapkanTarget(komite, id, { nilai: 95, berlakuMulai: "2026-09" });

    const petugas = sebagai("petugasInputData");
    assert.equal(await targetBerlaku(petugas, id, "2026-02"), 90);
    assert.equal(await targetBerlaku(petugas, id, "2019-01"), 90);
    assert.equal(await targetBerlaku(petugas, id, "2026-08"), 90);

    // Target awal INM berlaku mulai Oktober 2022; data arsip sebelum itu tetap punya Target.
    const inm01 = (await daftarIndikator(petugas)).find((i) => i.kode === "INM-01")!;
    assert.equal(await targetBerlaku(petugas, inm01.id, "2021-05"), 85);
  });

  it("menetapkan Target pada bulan mulai yang sudah punya Target mengganti nilainya (koreksi salah ketik)", async () => {
    const id = await tambahIndikator(admin, impBaru());
    await tetapkanTarget(admin, id, { nilai: 58, berlakuMulai: "2027-01" });
    await tetapkanTarget(sebagai("komiteMutu"), id, { nilai: 85.5, berlakuMulai: "2027-01" });

    assert.deepEqual((await ambilIndikator(admin, id)).target, [
      { nilai: 80, berlakuMulai: "2026-01" },
      { nilai: 85.5, berlakuMulai: "2027-01" },
    ]);
    assert.equal(await targetBerlaku(admin, id, "2027-02"), 85.5);
  });

  it("hanya Komite Mutu dan Admin Sistem yang menetapkan Target; isian yang tidak sah ditolak", async () => {
    const id = await tambahIndikator(admin, impBaru());
    for (const peran of ["petugasInputData", "kepalaUnit", "direktur"] as const) {
      await assert.rejects(tetapkanTarget(sebagai(peran), id, { nilai: 90, berlakuMulai: "2027-01" }), { status: 403 });
    }
    const ditolak = { status: 400 };
    await assert.rejects(tetapkanTarget(admin, id, { nilai: -1, berlakuMulai: "2027-01" }), ditolak);
    await assert.rejects(tetapkanTarget(admin, id, { nilai: Number.NaN, berlakuMulai: "2027-01" }), ditolak);
    await assert.rejects(tetapkanTarget(admin, id, { nilai: 90, berlakuMulai: "2027-13" }), ditolak);
    await assert.rejects(tetapkanTarget(admin, randomUUID(), { nilai: 90, berlakuMulai: "2027-01" }), { status: 404 });
    await assert.rejects(targetBerlaku(admin, "bukan-uuid", "2027-01"), { status: 404 });
    assert.deepEqual((await ambilIndikator(admin, id)).target, [{ nilai: 80, berlakuMulai: "2026-01" }]);
  });
});

describe("penguncian cara hitung Indikator", () => {
  /** IMP dengan Unit Pelapor sejak Januari 2026 dan satu Pengukuran Draf (Maret 2026). */
  async function indikatorBerpengukuran() {
    const komite = sebagai("komiteMutu");
    const id = await tambahIndikator(komite, impBaru());
    const unit = await tambahUnit(admin, { nama: unik("ICU") });
    await tambahUnitPelapor(komite, id, { unitId: unit.id, bulanMulai: "2026-01" });
    assert.equal((await ambilIndikator(komite, id)).terkunci, false);

    const petugas = { ...sebagai("petugasInputData"), unitIds: [unit.id] };
    await simpanPengukuran(petugas, { indikatorId: id, unitId: unit.id, bulan: "2026-03", n: 9, d: 10 });
    return { id, komite, detail: await ambilIndikator(komite, id) };
  }

  const isianDari = (i: Indikator): IsianIndikator => ({
    nama: i.nama,
    definisiOperasional: i.definisiOperasional,
    definisiNumerator: i.definisiNumerator,
    definisiDenominator: i.definisiDenominator,
    sumberData: i.sumberData,
    faktor: i.faktor,
    satuan: i.satuan,
    arah: i.arah,
    frekuensi: i.frekuensi,
    pic: i.pic,
  });

  it("faktor, satuan, Arah, definisi N/D, dan Frekuensi tidak bisa diubah setelah Indikator punya Pengukuran", async () => {
    const { id, komite, detail } = await indikatorBerpengukuran();
    assert.equal(detail.terkunci, true);

    const ubahan: Partial<IsianIndikator>[] = [
      { faktor: 1000 },
      { satuan: "‰" },
      { arah: "makinRendah" },
      { definisiNumerator: "Jumlah tindakan dengan identifikasi dua penanda" },
      { definisiDenominator: "Jumlah seluruh tindakan" },
      { frekuensi: "semesteran" },
    ];
    for (const ubah of ubahan) {
      await assert.rejects(ubahIndikator(komite, id, { ...isianDari(detail), ...ubah }), (e: Error & { status?: number }) => {
        assert.equal(e.status, 409, Object.keys(ubah)[0]);
        assert.match(e.message, /Pengukuran/);
        assert.match(e.message, /Indikator baru/);
        return true;
      });
    }
    assert.deepEqual(await ambilIndikator(komite, id), detail);
  });

  it("nama, definisi operasional, Sumber Data, dan PIC tetap bisa diubah setelah ada Pengukuran", async () => {
    const { id, detail } = await indikatorBerpengukuran();
    const teks = {
      nama: "Kepatuhan identifikasi pasien (revisi)",
      definisiOperasional: "Identifikasi dengan nama dan tanggal lahir sebelum setiap tindakan.",
      sumberData: "Lembar observasi harian",
      pic: "Kepala Ruang",
    };
    await ubahIndikator(admin, id, { ...isianDari(detail), ...teks });

    const sesudah = await ambilIndikator(admin, id);
    assert.deepEqual(isianDari(sesudah), { ...isianDari(detail), ...teks });
    assert.equal(sesudah.terkunci, true);
  });
});
