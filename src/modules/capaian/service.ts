import { and, asc, eq, inArray, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { indikator, pengukuran, target, unit, unitPelapor } from "@/db/schema";
import { bulanValid, dariTanggal, geserBulan, keTanggal } from "@/lib/bulan";
import { nilaiCapaian } from "@/lib/capaian";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan, targetPadaBulan } from "@/lib/indikator";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { bersinggungan } from "@/modules/indikator/service";

/*
 * Modul Capaian: satu-satunya sumber angka Monitoring dan Dashboard. Rumusnya di `src/lib/capaian.ts`; di sini
 * pembacaan data (hanya Pengukuran Terverifikasi dari Unit Pelapor yang aktif bulan itu) dan pembatasan peran + Unit.
 */

/** Komite Mutu, Direktur, dan Admin Sistem melihat Capaian RS dan semua Unit; peran lain hanya Capaian Unit-nya. */
const PELIHAT_RS: readonly Peran[] = ["komiteMutu", "direktur", "adminSistem"];

const kolomIndikator = {
  id: indikator.id,
  kode: indikator.kode,
  nama: indikator.nama,
  kelompok: indikator.kelompok,
  faktor: indikator.faktor,
  satuan: indikator.satuan,
  arah: indikator.arah,
  frekuensi: indikator.frekuensi,
  aktif: indikator.aktif,
};

/** Unit yang boleh dilihat aktor: semua, atau hanya Unit miliknya (termasuk yang kini nonaktif). */
const saringUnit = (aktor: Pengguna) =>
  PELIHAT_RS.includes(aktor.peran) ? undefined : inArray(unitPelapor.unitId, aktor.unitIds);

/**
 * Unit Pelapor yang aktif pada bulan "YYYY-MM" beserta Indikator dan Pengukuran Terverifikasi-nya (n dan d null =
 * belum Terverifikasi), urut kode Indikator lalu nama Unit. Unit dan Indikator yang kini nonaktif ikut, kecuali disaring.
 */
const unitPelaporBulan = (bulan: string, saring: SQL | undefined) =>
  db
    .select({
      indikator: kolomIndikator,
      unit: { id: unit.id, nama: unit.nama, aktif: unit.aktif },
      n: pengukuran.n,
      d: pengukuran.d,
    })
    .from(unitPelapor)
    .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
    .innerJoin(indikator, eq(indikator.id, unitPelapor.indikatorId))
    .leftJoin(
      pengukuran,
      and(
        eq(pengukuran.indikatorId, unitPelapor.indikatorId),
        eq(pengukuran.unitId, unitPelapor.unitId),
        eq(pengukuran.bulan, keTanggal(bulan)),
        eq(pengukuran.status, "terverifikasi"),
      ),
    )
    .where(and(bersinggungan(bulan, bulan), saring))
    .orderBy(asc(indikator.kode), asc(unit.nama));

/** Riwayat Target beberapa Indikator dibaca sekali; hasilnya = Target yang berlaku untuk Indikator pada suatu bulan. */
async function targetUntuk(indikatorIds: string[]) {
  const riwayat = (
    await db
      .select({ indikatorId: target.indikatorId, nilai: target.nilai, berlakuMulai: target.berlakuMulai })
      .from(target)
      .where(inArray(target.indikatorId, indikatorIds))
  ).map((t) => ({ ...t, berlakuMulai: dariTanggal(t.berlakuMulai) }));
  // Setiap Indikator punya Target sejak dibuat.
  return (indikatorId: string, bulan: string) =>
    targetPadaBulan(
      riwayat.filter((t) => t.indikatorId === indikatorId),
      bulan,
    )!;
}

/**
 * Tren Capaian satu Indikator: 12 bulan yang berakhir di `bulanAkhir` ("YYYY-MM"); Indikator Semesteran hanya punya
 * titik di bulan Juni dan Desember. Setiap deret sejajar dengan `bulan`:
 * - `rs`: Capaian RS + Kelengkapan; null untuk Petugas Input Data dan Kepala Unit.
 * - `unit`: Capaian per Unit yang menjadi Unit Pelapor dalam rentang itu (Petugas dan Kepala Unit: hanya Unit-nya);
 *   titik dengan `kelengkapan.wajib` 0 = Unit itu bukan Unit Pelapor pada bulan tersebut.
 * Indikator dan Unit nonaktif tetap tampil. Semua peran boleh membaca.
 */
export async function trenCapaian(aktor: Pengguna | null, indikatorId: string, bulanAkhir: string) {
  wajibPengguna(aktor);
  if (typeof bulanAkhir !== "string" || !bulanValid(bulanAkhir)) throw new ServiceError(400, "Bulan tidak valid.");
  const [ind] = apakahUuid(indikatorId)
    ? await db.select(kolomIndikator).from(indikator).where(eq(indikator.id, indikatorId))
    : [];
  if (!ind) throw new ServiceError(404, "Indikator tidak ditemukan.");

  const bulan = Array.from({ length: 12 }, (_, i) => geserBulan(bulanAkhir, i - 11)).filter((b) =>
    diukurPadaBulan(ind.frekuensi, b),
  );
  const [targetPada, perBulan] = await Promise.all([
    targetUntuk([ind.id]),
    Promise.all(bulan.map((b) => unitPelaporBulan(b, and(eq(unitPelapor.indikatorId, ind.id), saringUnit(aktor))))),
  ]);
  const deret = (pilih: (baris: (typeof perBulan)[number]) => typeof baris) =>
    bulan.map((b, i) => ({ bulan: b, ...nilaiCapaian(pilih(perBulan[i]), ind, targetPada(ind.id, b)) }));
  const daftarUnit = [...new Map(perBulan.flat().map((b) => [b.unit.id, b.unit])).values()].sort((a, b) =>
    a.nama.localeCompare(b.nama, "id"),
  );

  return {
    indikator: ind,
    bulan,
    rs: PELIHAT_RS.includes(aktor.peran) ? deret((baris) => baris) : null,
    unit: daftarUnit.map((u) => ({ unit: u, titik: deret((baris) => baris.filter((b) => b.unit.id === u.id)) })),
  };
}

export type TrenCapaian = Awaited<ReturnType<typeof trenCapaian>>;
export type TitikCapaian = TrenCapaian["unit"][number]["titik"][number];

/**
 * Ringkasan Capaian satu bulan "YYYY-MM" untuk Dashboard: Indikator aktif yang dinilai bulan itu (punya Unit Pelapor
 * aktif; Semesteran hanya Juni dan Desember), urut kode. Komite Mutu, Direktur, dan Admin Sistem: satu baris per
 * Indikator dari Capaian RS (`unit` null). Petugas Input Data dan Kepala Unit: satu baris per Indikator + Unit-nya
 * dari Capaian Unit. `jumlah`, `kelengkapan` (keseluruhan), dan `belumTercapai` dihitung dari baris itu.
 */
export async function ringkasanCapaian(aktor: Pengguna | null, bulan: string) {
  wajibPengguna(aktor);
  if (typeof bulan !== "string" || !bulanValid(bulan)) throw new ServiceError(400, "Bulan tidak valid.");
  const pelapor = (await unitPelaporBulan(bulan, and(eq(indikator.aktif, true), saringUnit(aktor)))).filter((p) =>
    diukurPadaBulan(p.indikator.frekuensi, bulan),
  );
  const daftar = [...new Map(pelapor.map((p) => [p.indikator.id, p.indikator])).values()];
  const targetPada = await targetUntuk(daftar.map((i) => i.id));
  const nilai = (ind: (typeof daftar)[number], baris: typeof pelapor) => ({
    indikator: ind,
    bulan,
    ...nilaiCapaian(baris, ind, targetPada(ind.id, bulan)),
  });

  const baris: (ReturnType<typeof nilai> & { unit: (typeof pelapor)[number]["unit"] | null })[] = PELIHAT_RS.includes(
    aktor.peran,
  )
    ? daftar.map((ind) => ({ ...nilai(ind, pelapor.filter((p) => p.indikator.id === ind.id)), unit: null }))
    : pelapor.map((p) => ({ ...nilai(p.indikator, [p]), unit: p.unit }));
  const jumlahStatus = (status: (typeof baris)[number]["status"]) => baris.filter((b) => b.status === status).length;
  return {
    bulan,
    baris,
    jumlah: {
      dinilai: baris.length,
      tercapai: jumlahStatus("tercapai"),
      belumTercapai: jumlahStatus("belumTercapai"),
      kosong: jumlahStatus(null),
    },
    kelengkapan: {
      terverifikasi: baris.reduce((total, b) => total + b.kelengkapan.terverifikasi, 0),
      wajib: baris.reduce((total, b) => total + b.kelengkapan.wajib, 0),
    },
    belumTercapai: baris.filter((b) => b.status === "belumTercapai"),
  };
}
