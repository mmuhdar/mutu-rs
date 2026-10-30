import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { config } from "@/lib/config";
import { ServiceError } from "@/lib/errors";
import type { Arah, Frekuensi } from "@/lib/indikator";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import { ringkasanCapaian, trenCapaian } from "@/modules/capaian/service";
import { aturAktifIndikator, tambahIndikator, tambahUnitPelapor, tetapkanTarget } from "@/modules/indikator/service";
import {
  ajukanPengukuran,
  bukaKembaliPengukuran,
  simpanPengukuran,
  verifikasiPengukuran,
} from "@/modules/pengukuran/service";
import { aturAktifUnit, tambahUnit } from "@/modules/unit/service";

let admin: Pengguna;
before(async () => {
  admin = (await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.10.0.1" })))!;
});

// Satu database untuk semua tes: nama Unit dan kode Indikator dibuat unik.
const unik = (awalan: string) => `${awalan}-${randomUUID().slice(0, 8)}`;
const komite = () => ({ ...admin, peran: "komiteMutu" as const });
/** Kepala Unit dari Unit-Unit ini: mengisi, mengajukan, dan memverifikasi sendiri. */
const kepalaUnit = (...unitIds: string[]): Pengguna => ({ ...admin, peran: "kepalaUnit", unitIds });
/** Capaian dibulatkan satu desimal, seperti contoh di spesifikasi. */
const satuDesimal = (x: number | null | undefined) => (x == null ? x : Math.round(x * 10) / 10);

async function indikatorBaru(ubah: { arah?: Arah; frekuensi?: Frekuensi; target?: number } = {}) {
  return tambahIndikator(komite(), {
    kode: unik("IMP"),
    kelompok: "IMP-RS",
    nama: "Kepatuhan identifikasi pasien sebelum tindakan",
    definisiOperasional: "Identifikasi dengan dua penanda sebelum setiap tindakan.",
    definisiNumerator: "Jumlah tindakan dengan identifikasi benar",
    definisiDenominator: "Jumlah tindakan yang diobservasi",
    sumberData: "Lembar observasi",
    faktor: 100,
    satuan: "%",
    arah: ubah.arah ?? "makinTinggi",
    frekuensi: ubah.frekuensi ?? "bulanan",
    pic: "",
    target: { nilai: ubah.target ?? 80, berlakuMulai: "2026-01" },
  });
}

/** Unit baru yang menjadi Unit Pelapor Indikator mulai bulan tertentu. */
async function unitPelapor(indikatorId: string, awalan: string, bulanMulai = "2026-01") {
  const unit = await tambahUnit(admin, { nama: unik(awalan) });
  await tambahUnitPelapor(komite(), indikatorId, { unitId: unit.id, bulanMulai });
  return unit;
}

/** Isi, ajukan, lalu verifikasi Pengukuran sebagai Kepala Unit dari Unit itu. */
async function terverifikasi(indikatorId: string, unitId: string, bulan: string, n: number, d: number) {
  const kepala = kepalaUnit(unitId);
  const { id } = await ajukanPengukuran(kepala, { indikatorId, unitId, bulan, n, d });
  await verifikasiPengukuran(kepala, id);
  return id;
}

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

    const tren = await trenCapaian(komite(), indikatorId, "2026-03");
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
    await simpanPengukuran(kepalaUnit(igd.id), { indikatorId, unitId: igd.id, bulan: "2026-04", n: 0, d: 50 });
    await ajukanPengukuran(kepalaUnit(ri.id), { indikatorId, unitId: ri.id, bulan: "2026-04", n: 0, d: 50 });

    const tren = await trenCapaian(komite(), indikatorId, "2026-04");
    const rs = pada(tren.rs, "2026-04");
    assert.deepEqual([rs?.n, rs?.d, rs?.capaian], [9, 10, 90]);
    assert.deepEqual(rs?.kelengkapan, { terverifikasi: 1, wajib: 3 });
    const capaianUnit = (id: string) => pada(tren.unit.find((u) => u.unit.id === id)?.titik, "2026-04")?.capaian;
    assert.deepEqual([capaianUnit(icu.id), capaianUnit(igd.id), capaianUnit(ri.id)], [90, null, null]);

    await bukaKembaliPengukuran(kepalaUnit(icu.id), idIcu, "N salah hitung");
    const rsSesudah = pada((await trenCapaian(komite(), indikatorId, "2026-04")).rs, "2026-04");
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

    const tren = await trenCapaian(komite(), indikatorId, "2026-06");
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

    const tren = await trenCapaian(komite(), indikatorId, "2026-03");
    assert.deepEqual(pada(tren.rs, "2026-02")?.kelengkapan, { terverifikasi: 2, wajib: 2 });
    assert.deepEqual(pada(tren.rs, "2026-03")?.kelengkapan, { terverifikasi: 2, wajib: 3 });
    assert.deepEqual(pada(tren.rs, "2025-12")?.kelengkapan, { terverifikasi: 0, wajib: 0 });
    // Februari: HCU belum menjadi Unit Pelapor.
    assert.deepEqual(pada(tren.unit.find((u) => u.unit.id === hcu.id)?.titik, "2026-02")?.kelengkapan, {
      terverifikasi: 0,
      wajib: 0,
    });

    await terverifikasi(indikatorId, hcu.id, "2026-03", 10, 10);
    const sesudah = await trenCapaian(komite(), indikatorId, "2026-03");
    assert.deepEqual(pada(sesudah.rs, "2026-03")?.kelengkapan, { terverifikasi: 3, wajib: 3 });
    assert.equal(satuDesimal(pada(sesudah.rs, "2026-03")?.capaian), 90);
  });
});

describe("Status Capaian dan Target", () => {
  it("Arah makin rendah: penundaan operasi elektif 4% ≤ Target 5% Tercapai, 5% Tercapai, 6% Belum Tercapai", async () => {
    const indikatorId = await indikatorBaru({ arah: "makinRendah", target: 5 });
    const ok = await unitPelapor(indikatorId, "Kamar Operasi");
    await terverifikasi(indikatorId, ok.id, "2026-01", 4, 100);
    await terverifikasi(indikatorId, ok.id, "2026-02", 5, 100);
    await terverifikasi(indikatorId, ok.id, "2026-03", 6, 100);

    const rs = (await trenCapaian(komite(), indikatorId, "2026-03")).rs;
    const ringkas = (bulan: string) => [pada(rs, bulan)?.capaian, pada(rs, bulan)?.selisih, pada(rs, bulan)?.status];
    assert.deepEqual(ringkas("2026-01"), [4, -1, "tercapai"]);
    assert.deepEqual(ringkas("2026-02"), [5, 0, "tercapai"]);
    assert.deepEqual(ringkas("2026-03"), [6, 1, "belumTercapai"]);
  });

  it("Arah makin tinggi: Capaian sama dengan Target Tercapai (57/100 = 57%, tanpa galat pembulatan)", async () => {
    const indikatorId = await indikatorBaru({ target: 57 });
    const icu = await unitPelapor(indikatorId, "ICU");
    await terverifikasi(indikatorId, icu.id, "2026-01", 57, 100);
    await terverifikasi(indikatorId, icu.id, "2026-02", 56, 100);

    const rs = (await trenCapaian(komite(), indikatorId, "2026-02")).rs;
    assert.deepEqual([pada(rs, "2026-01")?.capaian, pada(rs, "2026-01")?.status], [57, "tercapai"]);
    assert.deepEqual([pada(rs, "2026-02")?.capaian, pada(rs, "2026-02")?.status], [56, "belumTercapai"]);
  });

  it("setiap bulan dinilai dengan Target yang berlaku bulan itu; Target pertama berlaku mundur", async () => {
    const indikatorId = await indikatorBaru({ target: 80 });
    await tetapkanTarget(komite(), indikatorId, { nilai: 85, berlakuMulai: "2026-06" });
    const icu = await unitPelapor(indikatorId, "ICU", "2025-01");
    await terverifikasi(indikatorId, icu.id, "2025-09", 82, 100);
    await terverifikasi(indikatorId, icu.id, "2026-05", 82, 100);
    await terverifikasi(indikatorId, icu.id, "2026-06", 82, 100);

    const tren = await trenCapaian(komite(), indikatorId, "2026-07");
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

    const tren = await trenCapaian(komite(), indikatorId, "2026-09");
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
    const petugas: Pengguna = { ...admin, peran: "petugasInputData", unitIds: [icu.id] };
    const tren = await trenCapaian(petugas, indikatorId, "2026-07");
    assert.equal(tren.rs, null);
    assert.deepEqual(
      tren.unit.map((u) => [u.unit.id, pada(u.titik, "2026-07")?.capaian]),
      [[icu.id, 90]],
    );

    const kepala = await trenCapaian(kepalaUnit(icu.id, hcu.id), indikatorId, "2026-07");
    assert.equal(kepala.rs, null);
    assert.deepEqual(new Set(kepala.unit.map((u) => u.unit.id)), new Set([icu.id, hcu.id]));

    // Unit yang bukan Unit Pelapor Indikator ini: tidak ada Capaian yang terlihat.
    const lain = await tambahUnit(admin, { nama: unik("IGD") });
    assert.deepEqual((await trenCapaian(kepalaUnit(lain.id), indikatorId, "2026-07")).unit, []);
    assert.deepEqual((await trenCapaian(kepalaUnit(), indikatorId, "2026-07")).unit, []);
  });

  for (const peran of ["komiteMutu", "direktur", "adminSistem"] satisfies Peran[]) {
    it(`${LABEL_PERAN[peran]} melihat Capaian RS dan Capaian semua Unit`, async () => {
      const { indikatorId, icu, hcu, ri } = await tigaUnit();
      const tren = await trenCapaian({ ...admin, peran }, indikatorId, "2026-07");
      assert.equal(satuDesimal(pada(tren.rs, "2026-07")?.capaian), 52.5);
      assert.deepEqual(new Set(tren.unit.map((u) => u.unit.id)), new Set([icu.id, hcu.id, ri.id]));
    });
  }

  it("tanpa sesi ditolak; bulan tidak valid dan Indikator yang tidak ada ditolak", async () => {
    const { indikatorId } = await tigaUnit();
    await assert.rejects(trenCapaian(null, indikatorId, "2026-07"), { status: 401 });
    await assert.rejects(trenCapaian(komite(), indikatorId, "2026-13"), { status: 400 });
    await assert.rejects(trenCapaian(komite(), "bukan-uuid", "2026-07"), { status: 404 });
    await assert.rejects(trenCapaian(komite(), randomUUID(), "2026-07"), (e) => e instanceof ServiceError && e.status === 404);
  });

  it("Indikator dan Unit yang nonaktif tetap tampil dalam riwayat beserta Capaian-nya", async () => {
    const { indikatorId, hcu } = await tigaUnit();
    await aturAktifUnit(admin, hcu.id, false);
    await aturAktifIndikator(komite(), indikatorId, false);

    const tren = await trenCapaian(komite(), indikatorId, "2026-07");
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
    const icu = await tambahUnit(admin, { nama: unik("ICU") });
    const ri = await tambahUnit(admin, { nama: unik("Rawat Inap") });
    const pelapor = async (indikatorId: string, ...unitIds: string[]) => {
      for (const unitId of unitIds) {
        await tambahUnitPelapor(komite(), indikatorId, { unitId, bulanMulai: `${tahun}-01`, bulanBerhenti: `${tahun}-06` });
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
    await aturAktifIndikator(komite(), nonaktif, false);
    return { icu, ri, a, b, c, d, s, nonaktif };
  }

  it("Capaian RS: jumlah Indikator dinilai, Tercapai, Belum Tercapai, kosong, Kelengkapan keseluruhan, dan daftar Belum Tercapai", async () => {
    const { a, b, c, d, s } = await dataCampuran("2023");
    const r = await ringkasanCapaian({ ...admin, peran: "direktur" }, "2023-06");

    assert.deepEqual(new Set(r.baris.map((x) => x.indikator.id)), new Set([a, b, c, d, s]));
    assert.ok(r.baris.every((x) => x.unit === null));
    assert.deepEqual(r.jumlah, { dinilai: 5, tercapai: 2, belumTercapai: 1, kosong: 2 });
    assert.deepEqual(r.kelengkapan, { terverifikasi: 5, wajib: 7 });
    assert.deepEqual(
      r.belumTercapai.map((x) => [x.indikator.id, satuDesimal(x.capaian), x.target]),
      [[a, 53.6, 80]],
    );
    assert.deepEqual(r.baris.find((x) => x.indikator.id === b)?.kelengkapan, { terverifikasi: 1, wajib: 2 });

    // Mei: Indikator Semesteran tidak dinilai, Indikator Bulanan belum punya Capaian.
    const mei = await ringkasanCapaian({ ...admin, peran: "direktur" }, "2023-05");
    assert.deepEqual(mei.jumlah, { dinilai: 4, tercapai: 0, belumTercapai: 0, kosong: 4 });
    assert.deepEqual(mei.kelengkapan, { terverifikasi: 0, wajib: 6 });
  });

  it("Petugas Input Data dan Kepala Unit: satu baris per Indikator dan Unit-nya, dari Capaian Unit", async () => {
    const { icu, ri, a, b } = await dataCampuran("2024");
    const r = await ringkasanCapaian({ ...admin, peran: "petugasInputData", unitIds: [ri.id] }, "2024-06");
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

    const kepala = await ringkasanCapaian(kepalaUnit(icu.id, ri.id), "2024-06");
    assert.deepEqual(kepala.jumlah, { dinilai: 7, tercapai: 3, belumTercapai: 1, kosong: 3 });
    assert.deepEqual(kepala.kelengkapan, { terverifikasi: 5, wajib: 7 });
  });

  it("tanpa sesi dan bulan tidak valid ditolak", async () => {
    await assert.rejects(ringkasanCapaian(null, "2024-06"), { status: 401 });
    await assert.rejects(ringkasanCapaian(komite(), "Juni"), { status: 400 });
  });
});
