import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { Pengguna } from "@/modules/auth/service";
import { rekapBulanan } from "@/modules/capaian/service";
import { aturAktifIndikator } from "@/modules/indikator/service";
import { ajukanPengukuran } from "@/modules/pengukuran/service";

import { indikatorBaru, komiteMutu, sebagai, terverifikasi, unik, unitPelapor } from "./bantuan";

/*
 * Rekap Bulanan membaca semua Indikator RS, jadi file ini memakai tahun 2017 yang tidak dipakai tes lain dan hanya
 * memeriksa baris Indikator buatannya sendiri.
 */

let komite: Pengguna;
const kode = { rs: unik("A-RS"), unit: unik("B-UNIT"), spm: unik("C-SPM"), nonaktif: unik("D-NONAKTIF") };
let unitA: { id: string; nama: string };
let unitB: { id: string; nama: string };
let unitC: { id: string; nama: string };
let unitS: { id: string; nama: string };
before(async () => {
  komite = await komiteMutu();
  const target = { nilai: 80, berlakuMulai: "2017-01" };
  const rs = await indikatorBaru({ kode: kode.rs, kelompok: "IMP-RS", target });
  unitA = await unitPelapor(rs, "Unit A", "2017-01");
  unitB = await unitPelapor(rs, "Unit B", "2017-01");
  const imu = await indikatorBaru({ kode: kode.unit, kelompok: "IMP-Unit", target });
  unitC = await unitPelapor(imu, "Unit C", "2017-01");
  const spm = await indikatorBaru({ kode: kode.spm, kelompok: "SPM", target });
  unitS = await unitPelapor(spm, "Unit S", "2017-01");
  const nonaktif = await indikatorBaru({ kode: kode.nonaktif, target });
  await unitPelapor(nonaktif, "Unit N", "2017-01");
  await aturAktifIndikator(komite, nonaktif, false);

  await terverifikasi(rs, unitA.id, "2017-03", 8, 10);
  // Diajukan tetapi belum Terverifikasi: tidak dihitung.
  await ajukanPengukuran(await sebagai("kepalaUnit", [unitB.id]), { indikatorId: rs, unitId: unitB.id, bulan: "2017-03", n: 1, d: 10 });
  await terverifikasi(imu, unitC.id, "2017-03", 5, 10);
});

const milikTes = (baris: Awaited<ReturnType<typeof rekapBulanan>>["baris"]) =>
  baris.filter((b) => Object.values(kode).includes(b.indikator.kode));

describe("Rekap Bulanan", () => {
  it("baris Capaian RS lalu tiap Unit Pelapor, urut kelompok lalu kode; hanya Pengukuran Terverifikasi yang dihitung", async () => {
    const rekap = await rekapBulanan(komite, "2017-03");
    assert.equal(rekap.bulan, "2017-03");
    const baris = milikTes(rekap.baris).map((b) => ({
      kode: b.indikator.kode,
      unit: b.unit?.nama ?? null,
      n: b.n,
      d: b.d,
      capaian: b.capaian,
      status: b.status,
      kelengkapan: b.kelengkapan,
      target: b.target,
    }));
    const kosong = { n: 0, d: 0, capaian: null, status: null, target: 80 };
    assert.deepEqual(baris, [
      { kode: kode.rs, unit: null, n: 8, d: 10, capaian: 80, status: "tercapai", kelengkapan: { terverifikasi: 1, wajib: 2 }, target: 80 },
      { kode: kode.rs, unit: unitA.nama, n: 8, d: 10, capaian: 80, status: "tercapai", kelengkapan: { terverifikasi: 1, wajib: 1 }, target: 80 },
      { kode: kode.rs, unit: unitB.nama, ...kosong, kelengkapan: { terverifikasi: 0, wajib: 1 } },
      // IMP-Unit hanya punya Lingkup Unit, jadi tanpa baris RS.
      { kode: kode.unit, unit: unitC.nama, n: 5, d: 10, capaian: 50, status: "belumTercapai", kelengkapan: { terverifikasi: 1, wajib: 1 }, target: 80 },
      { kode: kode.spm, unit: null, ...kosong, kelengkapan: { terverifikasi: 0, wajib: 1 } },
      { kode: kode.spm, unit: unitS.nama, ...kosong, kelengkapan: { terverifikasi: 0, wajib: 1 } },
    ]);
  });

  it("tanpa bulan memakai bulan lalu; bulan yang belum berjalan ditolak", async () => {
    assert.equal((await rekapBulanan(komite, undefined, new Date("2017-04-10T03:00:00Z"))).bulan, "2017-03");
    await assert.rejects(rekapBulanan(komite, "2017-05", new Date("2017-04-10T03:00:00Z")), { status: 400 });
  });

  it("hanya Komite Mutu, Direktur, dan Admin Sistem", async () => {
    await rekapBulanan(await sebagai("direktur"), "2017-03");
    await assert.rejects(rekapBulanan(await sebagai("kepalaUnit", [unitA.id]), "2017-03"), { status: 403 });
    await assert.rejects(rekapBulanan(await sebagai("petugasInputData", [unitA.id]), "2017-03"), { status: 403 });
    await assert.rejects(rekapBulanan(null, "2017-03"), { status: 401 });
  });
});
