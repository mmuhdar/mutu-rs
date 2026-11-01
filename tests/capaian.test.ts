import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import type { Pengguna } from "@/modules/auth/service";
import { ringkasanCapaian, trenCapaian, trenRingkasan } from "@/modules/capaian/service";
import { akhiriUnitPelapor, ambilIndikator, aturAktifIndikator, tambahUnitPelapor, tetapkanTarget } from "@/modules/indikator/service";
import {
  ajukanPengukuran,
  bukaKembaliPengukuran,
  simpanPengukuran,
} from "@/modules/pengukuran/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, indikatorBaru, komiteMutu, sebagai, terverifikasi, unitBaru, unitPelapor } from "./bantuan";

let admin: Pengguna;
let komite: Pengguna;
let direktur: Pengguna;
before(async () => {
  [admin, komite, direktur] = [await adminSistem(), await komiteMutu(), await sebagai("direktur")];
});

/** Kepala Unit dari Unit-Unit ini: mengisi, mengajukan, dan memverifikasi sendiri. */
const kepalaUnit = (...unitIds: string[]) => sebagai("kepalaUnit", unitIds);
/** Capaian dibulatkan satu desimal, seperti contoh di spesifikasi. */
const satuDesimal = (x: number | null | undefined) => (x == null ? x : Math.round(x * 10) / 10);
/** Target awal IMP buatan tes berlaku mulai Januari 2026 (Target pertama juga berlaku mundur). */
const target = (nilai: number) => ({ target: { nilai, berlakuMulai: "2026-01" } });

/** Titik bulan tertentu dari deret Capaian. */
const pada = <T extends { bulan: string }>(titik: readonly T[] | null | undefined, bulan: string) =>
  titik?.find((t) => t.bulan === bulan);

describe("Capaian RS dan Capaian Unit", () => {
  it("ICU 9/10 dan Rawat Inap 50/100 menghasilkan Capaian RS 53,6% (ΣN/ΣD), bukan rata-rata 70%", async () => {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU");
    const ri = await unitPelapor(indikatorId, "Rawat Inap");
    await terverifikasi(indikatorId, icu.id, "2026-03", 9, 10);
    await terverifikasi(indikatorId, ri.id, "2026-03", 50, 100);

    const tren = await trenCapaian(komite, indikatorId, "2026-03");
    const rs = pada(tren.rs, "2026-03");
    assert.deepEqual([rs?.n, rs?.d, satuDesimal(rs?.capaian)], [59, 110, 53.6]);
    assert.deepEqual(rs?.kelengkapan, { terverifikasi: 2, wajib: 2 });

    const perUnit = new Map(tren.unit.map((u) => [u.unit.id, satuDesimal(pada(u.titik, "2026-03")?.capaian)]));
    assert.deepEqual(perUnit, new Map([[icu.id, 90], [ri.id, 50]]));
  });

  it("Pengukuran Draf dan Diajukan tidak dihitung; Capaian ikut berubah saat Pengukuran dibuka kembali", async () => {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU");
    const igd = await unitPelapor(indikatorId, "IGD");
    const ri = await unitPelapor(indikatorId, "Rawat Inap");
    const idIcu = await terverifikasi(indikatorId, icu.id, "2026-04", 9, 10);
    await simpanPengukuran(await kepalaUnit(igd.id), { indikatorId, unitId: igd.id, bulan: "2026-04", n: 0, d: 50 });
    await ajukanPengukuran(await kepalaUnit(ri.id), { indikatorId, unitId: ri.id, bulan: "2026-04", n: 0, d: 50 });

    const tren = await trenCapaian(komite, indikatorId, "2026-04");
    const rs = pada(tren.rs, "2026-04");
    assert.deepEqual([rs?.n, rs?.d, rs?.capaian], [9, 10, 90]);
    assert.deepEqual(rs?.kelengkapan, { terverifikasi: 1, wajib: 3 });
    const capaianUnit = (id: string) => pada(tren.unit.find((u) => u.unit.id === id)?.titik, "2026-04")?.capaian;
    assert.deepEqual([capaianUnit(icu.id), capaianUnit(igd.id), capaianUnit(ri.id)], [90, null, null]);

    await bukaKembaliPengukuran(await kepalaUnit(icu.id), idIcu, "N salah hitung");
    const rsSesudah = pada((await trenCapaian(komite, indikatorId, "2026-04")).rs, "2026-04");
    assert.deepEqual([rsSesudah?.capaian, rsSesudah?.status, rsSesudah?.kelengkapan.terverifikasi], [null, null, 0]);
  });

  it("D = 0 menghasilkan Capaian Unit kosong tanpa Status Capaian; ΣD = 0 menghasilkan Capaian RS kosong tanpa status", async () => {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU");
    const ri = await unitPelapor(indikatorId, "Rawat Inap");
    await terverifikasi(indikatorId, icu.id, "2026-05", 0, 0);
    await terverifikasi(indikatorId, ri.id, "2026-05", 9, 10);
    await terverifikasi(indikatorId, icu.id, "2026-06", 0, 0);
    await terverifikasi(indikatorId, ri.id, "2026-06", 0, 0);

    const tren = await trenCapaian(komite, indikatorId, "2026-06");
    const titikIcu = (bulan: string) => pada(tren.unit.find((u) => u.unit.id === icu.id)?.titik, bulan);
    assert.deepEqual([titikIcu("2026-05")?.capaian, titikIcu("2026-05")?.status, titikIcu("2026-05")?.selisih], [null, null, null]);
    // D = 0 tetap Pengukuran Terverifikasi: ikut Kelengkapan, tidak menurunkan Capaian RS.
    const mei = pada(tren.rs, "2026-05");
    assert.deepEqual([mei?.capaian, mei?.status, mei?.kelengkapan], [90, "tercapai", { terverifikasi: 2, wajib: 2 }]);
    const juni = pada(tren.rs, "2026-06");
    assert.deepEqual([juni?.capaian, juni?.status, juni?.selisih, juni?.kelengkapan], [null, null, null, { terverifikasi: 2, wajib: 2 }]);
  });
});

describe("Kelengkapan", () => {
  it("HCU menjadi Unit Pelapor mulai Maret: Februari tetap lengkap (2/2), Maret belum lengkap (2/3) sampai HCU terverifikasi", async () => {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU");
    const ri = await unitPelapor(indikatorId, "Rawat Inap");
    const hcu = await unitPelapor(indikatorId, "HCU", "2026-03");
    for (const bulan of ["2026-02", "2026-03"]) {
      await terverifikasi(indikatorId, icu.id, bulan, 8, 10);
      await terverifikasi(indikatorId, ri.id, bulan, 9, 10);
    }

    const tren = await trenCapaian(komite, indikatorId, "2026-03");
    assert.deepEqual(pada(tren.rs, "2026-02")?.kelengkapan, { terverifikasi: 2, wajib: 2 });
    assert.deepEqual(pada(tren.rs, "2026-03")?.kelengkapan, { terverifikasi: 2, wajib: 3 });
    assert.deepEqual(pada(tren.rs, "2025-12")?.kelengkapan, { terverifikasi: 0, wajib: 0 });
    // Februari: HCU belum menjadi Unit Pelapor.
    assert.deepEqual(pada(tren.unit.find((u) => u.unit.id === hcu.id)?.titik, "2026-02")?.kelengkapan, {
      terverifikasi: 0,
      wajib: 0,
    });

    await terverifikasi(indikatorId, hcu.id, "2026-03", 10, 10);
    const sesudah = await trenCapaian(komite, indikatorId, "2026-03");
    assert.deepEqual(pada(sesudah.rs, "2026-03")?.kelengkapan, { terverifikasi: 3, wajib: 3 });
    assert.equal(satuDesimal(pada(sesudah.rs, "2026-03")?.capaian), 90);
  });
});

describe("Status Capaian dan Target", () => {
  it("Arah makin rendah: penundaan operasi elektif 4% ≤ Target 5% Tercapai, 5% Tercapai, 6% Belum Tercapai", async () => {
    const indikatorId = await indikatorBaru({ arah: "makinRendah", ...target(5) });
    const ok = await unitPelapor(indikatorId, "Kamar Operasi");
    await terverifikasi(indikatorId, ok.id, "2026-01", 4, 100);
    await terverifikasi(indikatorId, ok.id, "2026-02", 5, 100);
    await terverifikasi(indikatorId, ok.id, "2026-03", 6, 100);

    const rs = (await trenCapaian(komite, indikatorId, "2026-03")).rs;
    const ringkas = (bulan: string) => [pada(rs, bulan)?.capaian, pada(rs, bulan)?.selisih, pada(rs, bulan)?.status];
    assert.deepEqual(ringkas("2026-01"), [4, -1, "tercapai"]);
    assert.deepEqual(ringkas("2026-02"), [5, 0, "tercapai"]);
    assert.deepEqual(ringkas("2026-03"), [6, 1, "belumTercapai"]);
  });

  it("Arah makin tinggi: Capaian sama dengan Target Tercapai (57/100 = 57%, tanpa galat pembulatan)", async () => {
    const indikatorId = await indikatorBaru(target(57));
    const icu = await unitPelapor(indikatorId, "ICU");
    await terverifikasi(indikatorId, icu.id, "2026-01", 57, 100);
    await terverifikasi(indikatorId, icu.id, "2026-02", 56, 100);

    const rs = (await trenCapaian(komite, indikatorId, "2026-02")).rs;
    assert.deepEqual([pada(rs, "2026-01")?.capaian, pada(rs, "2026-01")?.status], [57, "tercapai"]);
    assert.deepEqual([pada(rs, "2026-02")?.capaian, pada(rs, "2026-02")?.status], [56, "belumTercapai"]);
  });

  it("setiap bulan dinilai dengan Target yang berlaku bulan itu; Target pertama berlaku mundur", async () => {
    const indikatorId = await indikatorBaru(target(80));
    await tetapkanTarget(komite, indikatorId, { nilai: 85, berlakuMulai: "2026-06" });
    const icu = await unitPelapor(indikatorId, "ICU", "2025-01");
    await terverifikasi(indikatorId, icu.id, "2025-09", 82, 100);
    await terverifikasi(indikatorId, icu.id, "2026-05", 82, 100);
    await terverifikasi(indikatorId, icu.id, "2026-06", 82, 100);

    const tren = await trenCapaian(komite, indikatorId, "2026-07");
    assert.deepEqual(tren.bulan, [
      "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01",
      "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
    ]);
    assert.deepEqual(tren.rs?.map((t) => t.target), [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 85, 85]);
    const ringkas = (bulan: string) => [pada(tren.rs, bulan)?.selisih, pada(tren.rs, bulan)?.status];
    assert.deepEqual(ringkas("2025-09"), [2, "tercapai"]);
    assert.deepEqual(ringkas("2026-05"), [2, "tercapai"]);
    assert.deepEqual(ringkas("2026-06"), [-3, "belumTercapai"]);
    assert.deepEqual(ringkas("2026-07"), [null, null]);
  });

  it("Indikator Semesteran hanya punya titik di bulan Juni dan Desember", async () => {
    const indikatorId = await indikatorBaru({ frekuensi: "semesteran" });
    const ri = await unitPelapor(indikatorId, "Rawat Inap", "2025-01");
    await terverifikasi(indikatorId, ri.id, "2025-12", 70, 100);
    await terverifikasi(indikatorId, ri.id, "2026-06", 90, 100);

    const tren = await trenCapaian(komite, indikatorId, "2026-09");
    assert.deepEqual(tren.bulan, ["2025-12", "2026-06"]);
    assert.deepEqual(
      tren.rs?.map((t) => [t.bulan, t.capaian, t.status, t.kelengkapan.wajib]),
      [
        ["2025-12", 70, "belumTercapai", 1],
        ["2026-06", 90, "tercapai", 1],
      ],
    );
    assert.deepEqual(tren.unit[0].titik.map((t) => t.bulan), ["2025-12", "2026-06"]);
  });
});

describe("Pembatasan dan riwayat", () => {
  /** Indikator dengan ICU, HCU, dan Rawat Inap yang semuanya terverifikasi pada Juli 2026. */
  async function tigaUnit() {
    const indikatorId = await indikatorBaru();
    const icu = await unitPelapor(indikatorId, "ICU");
    const hcu = await unitPelapor(indikatorId, "HCU");
    const ri = await unitPelapor(indikatorId, "Rawat Inap");
    await terverifikasi(indikatorId, icu.id, "2026-07", 9, 10);
    await terverifikasi(indikatorId, hcu.id, "2026-07", 4, 10);
    await terverifikasi(indikatorId, ri.id, "2026-07", 50, 100);
    return { indikatorId, icu, hcu, ri };
  }

  it("Petugas Input Data dan Kepala Unit hanya melihat Capaian Unit-nya, tanpa Capaian RS", async () => {
    const { indikatorId, icu, hcu } = await tigaUnit();
    const tren = await trenCapaian(await sebagai("petugasInputData", [icu.id]), indikatorId, "2026-07");
    assert.equal(tren.rs, null);
    assert.deepEqual(
      tren.unit.map((u) => [u.unit.id, pada(u.titik, "2026-07")?.capaian]),
      [[icu.id, 90]],
    );

    const kepala = await trenCapaian(await kepalaUnit(icu.id, hcu.id), indikatorId, "2026-07");
    assert.equal(kepala.rs, null);
    assert.deepEqual(new Set(kepala.unit.map((u) => u.unit.id)), new Set([icu.id, hcu.id]));

    // Unit yang bukan Unit Pelapor Indikator ini: tidak ada Capaian yang terlihat.
    const lain = await unitBaru("IGD");
    const kepalaLain = await kepalaUnit(lain.id);
    assert.deepEqual((await trenCapaian(kepalaLain, indikatorId, "2026-07")).unit, []);
    // Sesi tanpa Unit (tidak bisa dibuat lewat service Pengguna) juga tidak melihat Capaian apa pun.
    assert.deepEqual((await trenCapaian({ ...kepalaLain, unitIds: [] }, indikatorId, "2026-07")).unit, []);
  });

  for (const peran of ["komiteMutu", "direktur", "adminSistem"] satisfies Peran[]) {
    it(`${LABEL_PERAN[peran]} melihat Capaian RS dan Capaian semua Unit`, async () => {
      const { indikatorId, icu, hcu, ri } = await tigaUnit();
      const tren = await trenCapaian(await sebagai(peran), indikatorId, "2026-07");
      assert.equal(satuDesimal(pada(tren.rs, "2026-07")?.capaian), 52.5);
      assert.deepEqual(new Set(tren.unit.map((u) => u.unit.id)), new Set([icu.id, hcu.id, ri.id]));
    });
  }

  it("tanpa sesi ditolak; bulan tidak valid dan Indikator yang tidak ada ditolak", async () => {
    const { indikatorId } = await tigaUnit();
    await assert.rejects(trenCapaian(null, indikatorId, "2026-07"), { status: 401 });
    await assert.rejects(trenCapaian(komite, indikatorId, "2026-13"), { status: 400 });
    await assert.rejects(trenCapaian(komite, "bukan-uuid", "2026-07"), { status: 404 });
    await assert.rejects(trenCapaian(komite, randomUUID(), "2026-07"), (e) => e instanceof ServiceError && e.status === 404);
  });

  it("Indikator dan Unit yang nonaktif tetap tampil dalam riwayat beserta Capaian-nya", async () => {
    const { indikatorId, hcu } = await tigaUnit();
    // Unit hanya bisa dinonaktifkan setelah periode Unit Pelapor-nya berakhir sebelum bulan berjalan.
    const periodeHcu = (await ambilIndikator(komite, indikatorId)).unitPelapor.find((p) => p.unitId === hcu.id)!;
    await akhiriUnitPelapor(komite, periodeHcu.id, "2026-07");
    await aturAktifUnit(admin, hcu.id, false, new Date("2026-10-15T12:00:00+08:00"));
    await aturAktifIndikator(komite, indikatorId, false);

    const tren = await trenCapaian(komite, indikatorId, "2026-07");
    assert.equal(tren.indikator.aktif, false);
    const titikHcu = tren.unit.find((u) => u.unit.id === hcu.id);
    assert.deepEqual([titikHcu?.unit.aktif, pada(titikHcu?.titik, "2026-07")?.capaian], [false, 40]);
    assert.deepEqual(pada(tren.rs, "2026-07")?.kelengkapan, { terverifikasi: 3, wajib: 3 });
    await aturAktifUnit(admin, hcu.id, true);
  });
});

describe("ringkasan Capaian sebulan (bahan Dashboard)", () => {
  /**
   * Data campuran Juni `tahun`. Ringkasan Capaian RS mencakup seluruh database bersama, jadi setiap tes memakai tahun
   * yang tidak dipakai tes lain (periode Unit Pelapor Januari s.d. Juni tahun itu):
   * A Belum Tercapai (ICU 9/10 + Rawat Inap 50/100), B Tercapai tetapi belum lengkap (hanya ICU 9/10),
   * C kosong (ICU 0/0), D kosong karena belum ada Pengukuran Terverifikasi, S Semesteran Tercapai,
   * dan satu Indikator nonaktif yang tidak dinilai.
   */
  async function dataCampuran(tahun: string) {
    const icu = await unitBaru("ICU");
    const ri = await unitBaru("Rawat Inap");
    const pelapor = async (indikatorId: string, ...unitIds: string[]) => {
      for (const unitId of unitIds) {
        await tambahUnitPelapor(komite, indikatorId, { unitId, bulanMulai: `${tahun}-01`, bulanBerhenti: `${tahun}-06` });
      }
    };
    const [a, b, c, d, s, nonaktif] = [
      await indikatorBaru(),
      await indikatorBaru(),
      await indikatorBaru(),
      await indikatorBaru(),
      await indikatorBaru({ frekuensi: "semesteran" }),
      await indikatorBaru(),
    ];
    await pelapor(a, icu.id, ri.id);
    await pelapor(b, icu.id, ri.id);
    await pelapor(c, icu.id);
    await pelapor(d, icu.id);
    await pelapor(s, icu.id);
    await pelapor(nonaktif, icu.id);
    await terverifikasi(a, icu.id, `${tahun}-06`, 9, 10);
    await terverifikasi(a, ri.id, `${tahun}-06`, 50, 100);
    await terverifikasi(b, icu.id, `${tahun}-06`, 9, 10);
    await terverifikasi(c, icu.id, `${tahun}-06`, 0, 0);
    await terverifikasi(s, icu.id, `${tahun}-06`, 95, 100);
    await terverifikasi(nonaktif, icu.id, `${tahun}-06`, 1, 10);
    await aturAktifIndikator(komite, nonaktif, false);
    return { icu, ri, a, b, c, d, s, nonaktif };
  }

  it("Capaian RS: jumlah Indikator dinilai, Tercapai, Belum Tercapai, kosong, Kelengkapan keseluruhan, dan daftar Belum Tercapai", async () => {
    const { a, b, c, d, s } = await dataCampuran("2023");
    const r = await ringkasanCapaian(direktur, "2023-06");

    assert.deepEqual(new Set(r.baris.map((x) => x.indikator.id)), new Set([a, b, c, d, s]));
    assert.ok(r.baris.every((x) => x.unit === null));
    assert.deepEqual(r.jumlah, { dinilai: 5, tercapai: 2, belumTercapai: 1, kosong: 2 });
    assert.deepEqual(r.kelengkapan, { terverifikasi: 5, wajib: 7 });
    assert.deepEqual(
      r.belumTercapai.map((x) => [x.indikator.id, satuDesimal(x.capaian), x.target]),
      [[a, 53.6, 80]],
    );
    assert.deepEqual(r.baris.find((x) => x.indikator.id === b)?.kelengkapan, { terverifikasi: 1, wajib: 2 });
    for (const peran of ["komiteMutu", "adminSistem"] satisfies Peran[]) {
      const lain = await ringkasanCapaian(await sebagai(peran), "2023-06");
      assert.deepEqual([lain.jumlah, lain.kelengkapan], [{ dinilai: 5, tercapai: 2, belumTercapai: 1, kosong: 2 }, { terverifikasi: 5, wajib: 7 }]);
    }

    // Mei: Indikator Semesteran tidak dinilai, Indikator Bulanan belum punya Capaian.
    const mei = await ringkasanCapaian(direktur, "2023-05");
    assert.deepEqual(mei.jumlah, { dinilai: 4, tercapai: 0, belumTercapai: 0, kosong: 4 });
    assert.deepEqual(mei.kelengkapan, { terverifikasi: 0, wajib: 6 });
  });

  it("Petugas Input Data dan Kepala Unit: satu baris per Indikator dan Unit-nya, dari Capaian Unit", async () => {
    const { icu, ri, a, b } = await dataCampuran("2024");
    const petugas = await sebagai("petugasInputData", [ri.id]);
    const r = await ringkasanCapaian(petugas, "2024-06");
    assert.deepEqual(
      new Map(r.baris.map((x) => [x.indikator.id, [x.unit?.id, x.status]])),
      new Map([
        [a, [ri.id, "belumTercapai"]],
        [b, [ri.id, null]],
      ]),
    );
    assert.deepEqual(r.jumlah, { dinilai: 2, tercapai: 0, belumTercapai: 1, kosong: 1 });
    assert.deepEqual(r.kelengkapan, { terverifikasi: 1, wajib: 2 });
    assert.deepEqual(r.belumTercapai.map((x) => [x.indikator.id, x.capaian]), [[a, 50]]);

    const kepala = await ringkasanCapaian(await kepalaUnit(icu.id, ri.id), "2024-06");
    assert.deepEqual(kepala.jumlah, { dinilai: 7, tercapai: 3, belumTercapai: 1, kosong: 3 });
    assert.deepEqual(kepala.kelengkapan, { terverifikasi: 5, wajib: 7 });

    // Sesi tanpa Unit (tidak bisa dibuat lewat service Pengguna): tidak melihat Capaian apa pun, termasuk Capaian RS.
    const tanpaUnit = await ringkasanCapaian({ ...petugas, unitIds: [] }, "2024-06");
    assert.deepEqual([tanpaUnit.baris, tanpaUnit.kelengkapan], [[], { terverifikasi: 0, wajib: 0 }]);
  });

  it("tanpa bulan pilihan, ringkasan untuk bulan lalu menurut WITA: 1 November 00.30 WITA = Oktober", async () => {
    // 31 Oktober 16.30 UTC = 1 November 00.30 WITA; 15.59 UTC = 31 Oktober 23.59 WITA.
    assert.equal((await ringkasanCapaian(direktur, undefined, new Date("2026-10-31T16:30:00Z"))).bulan, "2026-10");
    assert.equal((await ringkasanCapaian(direktur, undefined, new Date("2026-10-31T15:59:00Z"))).bulan, "2026-09");
    assert.equal((await ringkasanCapaian(direktur, "", new Date("2026-12-31T16:00:00Z"))).bulan, "2026-12");
    assert.equal((await ringkasanCapaian(direktur, "2025-03", new Date("2026-10-31T16:30:00Z"))).bulan, "2025-03");
  });

  it("Tercapai dan Belum Tercapai menyebut berapa di antaranya yang belum lengkap (Capaian RS sementara)", async () => {
    const icu = await unitBaru("ICU");
    const ri = await unitBaru("Rawat Inap");
    const [tercapaiLengkap, tercapaiSementara, belumTercapaiSementara] = [
      await indikatorBaru(),
      await indikatorBaru(),
      await indikatorBaru(),
    ];
    for (const indikatorId of [tercapaiLengkap, tercapaiSementara, belumTercapaiSementara]) {
      for (const unitId of [icu.id, ri.id]) {
        await tambahUnitPelapor(komite, indikatorId, { unitId, bulanMulai: "2022-01", bulanBerhenti: "2022-06" });
      }
    }
    // Target 80 %: ICU dan Rawat Inap 9/10 = Tercapai lengkap; hanya ICU 9/10 = Tercapai, hanya ICU 1/10 = Belum Tercapai.
    await terverifikasi(tercapaiLengkap, icu.id, "2022-06", 9, 10);
    await terverifikasi(tercapaiLengkap, ri.id, "2022-06", 9, 10);
    await terverifikasi(tercapaiSementara, icu.id, "2022-06", 9, 10);
    await terverifikasi(belumTercapaiSementara, icu.id, "2022-06", 1, 10);

    const r = await ringkasanCapaian(direktur, "2022-06");
    assert.deepEqual(r.jumlah, { dinilai: 3, tercapai: 2, belumTercapai: 1, kosong: 0 });
    assert.deepEqual(r.jumlahBelumLengkap, { tercapai: 1, belumTercapai: 1 });

    // Capaian Unit selalu dari satu Pengukuran Terverifikasi, jadi tidak pernah belum lengkap.
    const kepala = await ringkasanCapaian(await kepalaUnit(icu.id, ri.id), "2022-06");
    assert.deepEqual(kepala.jumlah, { dinilai: 6, tercapai: 3, belumTercapai: 1, kosong: 2 });
    assert.deepEqual(kepala.jumlahBelumLengkap, { tercapai: 0, belumTercapai: 0 });
  });

  it("tanpa sesi, bulan tidak valid, dan bulan setelah bulan berjalan ditolak", async () => {
    const sekarang = new Date("2026-10-15T12:00:00+08:00");
    await assert.rejects(ringkasanCapaian(null, "2024-06"), { status: 401 });
    await assert.rejects(ringkasanCapaian(komite, "Juni"), { status: 400 });
    await assert.rejects(ringkasanCapaian(komite, "2026-11", sekarang), {
      status: 400,
      message: "November 2026 belum berjalan.",
    });
    assert.equal((await ringkasanCapaian(komite, "2026-10", sekarang)).bulan, "2026-10");

    const indikatorId = await indikatorBaru();
    await assert.rejects(trenCapaian(komite, indikatorId, "2026-11", sekarang), {
      status: 400,
      message: "November 2026 belum berjalan.",
    });
    assert.equal((await trenCapaian(komite, indikatorId, "2026-10", sekarang)).bulan.at(-1), "2026-10");
  });
});

describe("tren ringkasan Dashboard", () => {
  it("12 bulan sampai bulan akhir, jumlah Tercapai dan Belum Tercapai per bulan sama dengan ringkasan bulan itu", async () => {
    const indikatorId = await indikatorBaru(target(80));
    const icu = await unitPelapor(indikatorId, "ICU");
    await terverifikasi(indikatorId, icu.id, "2026-02", 9, 10);
    await terverifikasi(indikatorId, icu.id, "2026-03", 5, 10);
    // Kepala Unit melihat Unit-nya saja, jadi data tes lain tidak ikut terhitung.
    const kepala = await sebagai("kepalaUnit", [icu.id]);
    const tren = await trenRingkasan(kepala, "2026-03");
    assert.deepEqual([tren.length, tren[0].bulan, tren.at(-1)?.bulan], [12, "2025-04", "2026-03"]);
    const pada = (b: string) => tren.find((t) => t.bulan === b);
    assert.deepEqual([pada("2026-02")?.tercapai, pada("2026-02")?.belumTercapai], [1, 0]);
    assert.deepEqual([pada("2026-03")?.tercapai, pada("2026-03")?.belumTercapai, pada("2026-03")?.dinilai], [0, 1, 1]);
    assert.equal(pada("2025-12")?.dinilai, 0);
    assert.deepEqual(pada("2026-03"), { bulan: "2026-03", ...(await ringkasanCapaian(kepala, "2026-03")).jumlah });
    await assert.rejects(trenRingkasan(kepala, "2026-04", new Date("2026-03-15T04:00:00Z")), { status: 400 });
  });
});
