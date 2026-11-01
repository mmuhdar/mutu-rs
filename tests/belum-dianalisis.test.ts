import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import type { Pengguna } from "@/modules/auth/service";
import { aturAktifIndikator, tambahUnitPelapor } from "@/modules/indikator/service";
import { belumDianalisis, simpanAnalisis } from "@/modules/perbaikan/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, indikatorBaru, komiteMutu, sebagai, unitBaru } from "./bantuan";

/*
 * Daftar "Belum dianalisis" mencakup seluruh database tes bersama, jadi semua Unit Pelapor di file ini memakai tahun
 * 2018 yang tidak dipakai tes lain.
 */

let komite: Pengguna;
before(async () => {
  komite = await komiteMutu();
});

/** Unit baru yang menjadi Unit Pelapor Indikator selama tahun 2018 saja. */
async function pelapor2018(indikatorId: string, awalan: string) {
  const unit = await unitBaru(awalan);
  await tambahUnitPelapor(komite, indikatorId, { unitId: unit.id, bulanMulai: "2018-01", bulanBerhenti: "2018-12" });
  return unit;
}

describe("Belum dianalisis", () => {
  it("INM/IMP-RS diharapkan Lingkup RS, IMP-Unit Lingkup Unit Pelapor-nya; yang sudah dianalisis tidak muncul", async () => {
    const impRs = await indikatorBaru();
    const a = await pelapor2018(impRs, "Unit A");
    await pelapor2018(impRs, "Unit B");
    const impUnit = await indikatorBaru({ kelompok: "IMP-Unit" });
    const c = await pelapor2018(impUnit, "Unit C");

    const awal = await belumDianalisis(komite, "2018-03");
    assert.equal(awal.bulan, "2018-03");
    const harapan = awal.daftar.filter((b) => [impRs, impUnit].includes(b.indikator.id));
    assert.deepEqual(
      harapan.map((b) => [b.indikator.id, b.unit?.id ?? null]).sort(),
      [[impRs, null], [impUnit, c.id]].sort(),
    );

    await simpanAnalisis(komite, { indikatorId: impRs, unitId: null, bulan: "2018-03", teks: "RS" });
    // Analisis Lingkup Unit untuk IMP-RS opsional, tidak mengubah harapan Lingkup RS.
    await simpanAnalisis(komite, { indikatorId: impRs, unitId: a.id, bulan: "2018-04", teks: "Unit A" });
    const sesudah = await belumDianalisis(komite, "2018-03");
    assert.deepEqual(
      sesudah.daftar.filter((b) => [impRs, impUnit].includes(b.indikator.id)).map((b) => b.indikator.id),
      [impUnit],
    );
    assert.ok((await belumDianalisis(komite, "2018-04")).daftar.some((b) => b.indikator.id === impRs && b.unit === null));
    // Di luar periode Unit Pelapor tidak ada harapan.
    assert.ok(!(await belumDianalisis(komite, "2019-01")).daftar.some((b) => [impRs, impUnit].includes(b.indikator.id)));
  });

  it("Indikator Semesteran hanya diharapkan pada Juni dan Desember; Indikator nonaktif tidak diharapkan", async () => {
    const semesteran = await indikatorBaru({ frekuensi: "semesteran" });
    await pelapor2018(semesteran, "Unit S");
    const nonaktif = await indikatorBaru();
    await pelapor2018(nonaktif, "Unit N");
    await aturAktifIndikator(komite, nonaktif, false);
    const ada = async (bulan: string, id: string) => (await belumDianalisis(komite, bulan)).daftar.some((b) => b.indikator.id === id);
    assert.deepEqual([await ada("2018-05", semesteran), await ada("2018-06", semesteran)], [false, true]);
    assert.equal(await ada("2018-06", nonaktif), false);
  });

  it("Kepala Unit dan Petugas Input Data hanya melihat IMP-Unit Unit-nya, termasuk Unit yang kini nonaktif", async () => {
    const impRs = await indikatorBaru();
    const a = await pelapor2018(impRs, "Unit A");
    const impUnit = await indikatorBaru({ kelompok: "IMP-Unit" });
    const c = await pelapor2018(impUnit, "Unit C");
    const lain = await indikatorBaru({ kelompok: "IMP-Unit" });
    await pelapor2018(lain, "Unit D");

    for (const aktor of [await sebagai("kepalaUnit", [c.id]), await sebagai("petugasInputData", [c.id])]) {
      assert.deepEqual(
        (await belumDianalisis(aktor, "2018-03")).daftar.map((b) => [b.indikator.id, b.unit?.id]),
        [[impUnit, c.id]],
      );
    }
    assert.deepEqual((await belumDianalisis(await sebagai("kepalaUnit", [a.id]), "2018-03")).daftar, []);

    // Periode 2018 sudah berakhir, jadi Unit C boleh dinonaktifkan; harapan bulan itu tetap ada.
    await aturAktifUnit(await adminSistem(), c.id, false);
    const direktur = (await belumDianalisis(await sebagai("direktur"), "2018-03")).daftar;
    assert.ok(direktur.some((b) => b.indikator.id === impUnit && b.unit?.id === c.id));
  });

  it("tanpa bulan = bulan lalu; bulan yang belum berjalan ditolak", async () => {
    const sekarang = new Date("2026-03-15T04:00:00Z");
    assert.equal((await belumDianalisis(komite, undefined, sekarang)).bulan, "2026-02");
    await assert.rejects(
      belumDianalisis(komite, "2026-04", sekarang),
      (e: unknown) => e instanceof ServiceError && e.status === 400,
    );
    await assert.rejects(belumDianalisis(null, "2026-01"), (e: unknown) => e instanceof ServiceError && e.status === 401);
  });
});
