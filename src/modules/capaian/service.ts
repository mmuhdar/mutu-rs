import { and, asc, eq, inArray, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { indikator, pengukuran, unit, unitPelapor } from "@/db/schema";
import { bulanLalu, bulanTriwulan, geserBulan, keTanggal, wajibBulanBerjalan, wajibTriwulanSelesai } from "@/lib/bulan";
import { capaianDari } from "@/lib/capaian";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan, targetPadaBulan } from "@/lib/indikator";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { bersinggungan, riwayatTarget } from "@/modules/indikator/service";

/*
 * Modul Capaian: satu-satunya sumber angka Monitoring dan Dashboard. Rumusnya di `src/lib/capaian.ts`; di sini
 * pembacaan data (hanya Pengukuran Terverifikasi dari Unit Pelapor yang aktif bulan itu) dan pembatasan peran + Unit.
 */

/** Komite Mutu, Direktur, dan Admin Sistem melihat Capaian RS dan semua Unit; peran lain hanya Capaian Unit-nya. */
const PELIHAT_RS: readonly Peran[] = ["komiteMutu", "direktur", "adminSistem"];
/** Benar bila aktor melihat Capaian RS (dan semua Unit); salah = hanya Capaian Unit-nya. Juga untuk tampilan. */
export const melihatCapaianRs = (aktor: Pengguna) => PELIHAT_RS.includes(aktor.peran);

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
  melihatCapaianRs(aktor) ? undefined : inArray(unitPelapor.unitId, aktor.unitIds);

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
  const riwayat = await riwayatTarget(indikatorIds);
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
 * Indikator dan Unit nonaktif tetap tampil. Semua peran boleh membaca. Bulan setelah bulan berjalan ditolak.
 */
export async function trenCapaian(aktor: Pengguna | null, indikatorId: string, bulanAkhir: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  // Bulan depan belum punya Pengukuran.
  wajibBulanBerjalan(bulanAkhir, sekarang);
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
    bulan.map((b, i) => ({ bulan: b, ...capaianDari(pilih(perBulan[i]), ind, targetPada(ind.id, b)) }));
  const daftarUnit = [...new Map(perBulan.flat().map((b) => [b.unit.id, b.unit])).values()].sort((a, b) =>
    a.nama.localeCompare(b.nama, "id"),
  );

  return {
    indikator: ind,
    bulan,
    rs: melihatCapaianRs(aktor) ? deret((baris) => baris) : null,
    unit: daftarUnit.map((u) => ({ unit: u, titik: deret((baris) => baris.filter((b) => b.unit.id === u.id)) })),
  };
}

export type TrenCapaian = Awaited<ReturnType<typeof trenCapaian>>;
export type TitikCapaian = TrenCapaian["unit"][number]["titik"][number];

/**
 * Ringkasan Capaian satu bulan "YYYY-MM" untuk Dashboard: Indikator aktif yang dinilai bulan itu (punya Unit Pelapor
 * aktif; Semesteran hanya Juni dan Desember), urut kode. Komite Mutu, Direktur, dan Admin Sistem: satu baris per
 * Indikator dari Capaian RS (`unit` null). Petugas Input Data dan Kepala Unit: satu baris per Indikator + Unit-nya
 * dari Capaian Unit. `jumlah`, `kelengkapan` (keseluruhan), dan `belumTercapai` dihitung dari baris itu;
 * `jumlahBelumLengkap` = berapa baris Tercapai / Belum Tercapai yang Kelengkapan-nya belum penuh (Capaian RS sementara).
 * Tanpa bulan (kosong) = bulan lalu menurut zona waktu konfigurasi, bulan bawaan Dashboard; bulan setelah bulan
 * berjalan ditolak.
 */
export async function ringkasanCapaian(aktor: Pengguna | null, bulan?: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  bulan ||= bulanLalu(sekarang);
  wajibBulanBerjalan(bulan, sekarang);
  const pelapor = (await unitPelaporBulan(bulan, and(eq(indikator.aktif, true), saringUnit(aktor)))).filter((p) =>
    diukurPadaBulan(p.indikator.frekuensi, bulan),
  );
  const daftar = [...new Map(pelapor.map((p) => [p.indikator.id, p.indikator])).values()];
  const targetPada = await targetUntuk(daftar.map((i) => i.id));
  const barisCapaian = (ind: (typeof daftar)[number], dari: typeof pelapor) => ({
    indikator: ind,
    bulan,
    ...capaianDari(dari, ind, targetPada(ind.id, bulan)),
  });

  const baris: (ReturnType<typeof barisCapaian> & { unit: (typeof pelapor)[number]["unit"] | null })[] = melihatCapaianRs(aktor)
    ? daftar.map((ind) => ({ ...barisCapaian(ind, pelapor.filter((p) => p.indikator.id === ind.id)), unit: null }))
    : pelapor.map((p) => ({ ...barisCapaian(p.indikator, [p]), unit: p.unit }));
  const jumlahStatus = (status: (typeof baris)[number]["status"], daftar = baris) =>
    daftar.filter((b) => b.status === status).length;
  const belumLengkap = baris.filter((b) => b.kelengkapan.terverifikasi < b.kelengkapan.wajib);
  return {
    bulan,
    baris,
    jumlah: {
      dinilai: baris.length,
      tercapai: jumlahStatus("tercapai"),
      belumTercapai: jumlahStatus("belumTercapai"),
      kosong: jumlahStatus(null),
    },
    jumlahBelumLengkap: {
      tercapai: jumlahStatus("tercapai", belumLengkap),
      belumTercapai: jumlahStatus("belumTercapai", belumLengkap),
    },
    kelengkapan: {
      terverifikasi: baris.reduce((total, b) => total + b.kelengkapan.terverifikasi, 0),
      wajib: baris.reduce((total, b) => total + b.kelengkapan.wajib, 0),
    },
    belumTercapai: baris.filter((b) => b.status === "belumTercapai"),
  };
}

/**
 * Capaian Triwulan ("YYYY-T", hanya yang sudah selesai) untuk Laporan Triwulan; hanya yang melihat Capaian RS. Satu
 * baris per Indikator yang dinilai pada setidaknya satu bulan Triwulan itu (punya Unit Pelapor aktif dan diukur bulan
 * itu; Semesteran hanya Juni/Desember), yang aktif atau punya Pengukuran Terverifikasi dalam Triwulan itu, urut kode:
 * - `bulan`: Capaian RS setiap bulan yang diukur beserta Unit Pelapor bulan itu (`wajib` 0 = tanpa Unit Pelapor);
 * - `triwulan`: ΣN/ΣD seluruh Unit Pelapor ketiga bulan (Kelengkapan = selama Triwulan), dinilai dengan Target bulan
 *   terakhir Triwulan;
 * - `unit`: Unit Pelapor selama Triwulan itu, urut nama.
 */
export async function capaianTriwulan(aktor: Pengguna | null, triwulan: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  if (!melihatCapaianRs(aktor)) throw new ServiceError(403, "Capaian Triwulan hanya untuk Komite Mutu, Direktur, dan Admin Sistem.");
  wajibTriwulanSelesai(triwulan, sekarang);
  const bulan = bulanTriwulan(triwulan);
  const pelapor = (await Promise.all(bulan.map((b) => unitPelaporBulan(b, undefined)))).flatMap((baris, i) =>
    baris.filter((p) => diukurPadaBulan(p.indikator.frekuensi, bulan[i])).map((p) => ({ ...p, bulan: bulan[i] })),
  );
  const daftar = [...new Map(pelapor.map((p) => [p.indikator.id, p.indikator])).values()].sort((a, b) => a.kode.localeCompare(b.kode));
  const targetPada = await targetUntuk(daftar.map((i) => i.id));
  const urutNama = (unit: (typeof pelapor)[number]["unit"][]) =>
    [...new Map(unit.map((u) => [u.id, u])).values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return daftar
    .map((ind) => {
      const milik = pelapor.filter((p) => p.indikator.id === ind.id);
      return {
        indikator: ind,
        unit: urutNama(milik.map((p) => p.unit)),
        bulan: bulan
          .filter((b) => diukurPadaBulan(ind.frekuensi, b))
          .map((b) => {
            const bulanIni = milik.filter((p) => p.bulan === b);
            return { bulan: b, unit: urutNama(bulanIni.map((p) => p.unit)), ...capaianDari(bulanIni, ind, targetPada(ind.id, b)) };
          }),
        triwulan: capaianDari(milik, ind, targetPada(ind.id, bulan[2])),
      };
    })
    .filter((b) => b.indikator.aktif || b.triwulan.kelengkapan.terverifikasi > 0);
}

export type BarisCapaianTriwulan = Awaited<ReturnType<typeof capaianTriwulan>>[number];

/**
 * Jumlah Indikator yang dinilai, Tercapai, dan Belum Tercapai setiap bulan selama 12 bulan sampai `bulanAkhir` (grafik
 * Dashboard), dari `ringkasanCapaian` bulan demi bulan dengan hak akses yang sama. Tanpa bulan = bulan lalu.
 */
// ponytail: 12 × ringkasanCapaian (2 query per bulan); gabungkan jadi satu query bila Dashboard terasa lambat.
export async function trenRingkasan(aktor: Pengguna | null, bulanAkhir?: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  bulanAkhir ||= bulanLalu(sekarang);
  wajibBulanBerjalan(bulanAkhir, sekarang);
  const bulan = Array.from({ length: 12 }, (_, i) => geserBulan(bulanAkhir, i - 11));
  return Promise.all(bulan.map(async (b) => ({ bulan: b, ...(await ringkasanCapaian(aktor, b, sekarang)).jumlah })));
}
