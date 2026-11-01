import { and, eq, inArray, isNull, type AnyColumn } from "drizzle-orm";

import { db } from "@/db";
import { analisis, indikator, pengguna, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan, dariTanggal, keTanggal, labelBulan, wajibBulan } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan } from "@/lib/indikator";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { melihatCapaianRs, trenCapaian } from "@/modules/capaian/service";
import { bersinggungan } from "@/modules/indikator/service";

/*
 * Modul Perbaikan: Analisis, Tindak Lanjut, dan PDSA (glosarium bagian Perbaikan). Lingkup = `unitId`; null = Lingkup
 * RS. Angka Capaian hanya dibaca dari modul Capaian, tidak dihitung di sini.
 */

/** Lingkup: id Unit, atau null = Lingkup RS. */
export type Lingkup = string | null;
/** Satu Analisis: Indikator, Lingkup, dan bulan "YYYY-MM". */
export type KunciAnalisis = { indikatorId: string; unitId: Lingkup; bulan: string };

const MAKS_ANALISIS = 4000;

/** Komite Mutu dan Admin Sistem menulis untuk semua Lingkup; Kepala Unit hanya Lingkup Unit-nya. */
const PENULIS_SEMUA: readonly Peran[] = ["komiteMutu", "adminSistem"];

/**
 * Membaca Lingkup ini: yang melihat Capaian RS (Komite Mutu, Direktur, Admin Sistem) membaca semua Lingkup; Petugas
 * Input Data dan Kepala Unit hanya Lingkup Unit-nya, sama seperti Capaian.
 */
export const bolehBacaLingkup = (aktor: Pengguna, unitId: Lingkup) =>
  melihatCapaianRs(aktor) || (unitId !== null && aktor.unitIds.includes(unitId));

/** Menulis Analisis, Tindak Lanjut, dan PDSA pada Lingkup ini. Juga untuk tampilan. */
export const bolehTulisLingkup = (aktor: Pengguna, unitId: Lingkup) =>
  PENULIS_SEMUA.includes(aktor.peran) ||
  (aktor.peran === "kepalaUnit" && unitId !== null && aktor.unitIds.includes(unitId));

/** Saringan query: Lingkup yang boleh dibaca aktor (semua, atau hanya Unit miliknya; Lingkup RS tidak). */
const saringLingkup = (aktor: Pengguna, kolomUnit: AnyColumn) =>
  melihatCapaianRs(aktor) ? undefined : inArray(kolomUnit, aktor.unitIds);

function wajibBaca(aktor: Pengguna | null, unitId: Lingkup): asserts aktor is Pengguna {
  wajibPengguna(aktor);
  if (!bolehBacaLingkup(aktor, unitId)) throw new ServiceError(403, "Anda hanya bisa melihat Lingkup Unit Anda sendiri.");
}

function wajibTulis(aktor: Pengguna | null, unitId: Lingkup): asserts aktor is Pengguna {
  wajibPengguna(aktor);
  if (bolehTulisLingkup(aktor, unitId)) return;
  throw new ServiceError(
    403,
    unitId === null
      ? "Lingkup RS hanya ditulis Komite Mutu dan Admin Sistem."
      : "Lingkup Unit hanya ditulis Komite Mutu, Admin Sistem, dan Kepala Unit dari Unit itu.",
  );
}

/** Teks wajib dari isian: dirapikan, tidak kosong, dan dibatasi panjangnya. */
function wajibTeks(nilai: unknown, label: string, maks: number) {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  if (!teks) throw new ServiceError(400, `${label} wajib diisi.`);
  if (teks.length > maks) throw new ServiceError(400, `${label} maksimal ${maks} karakter.`);
  return teks;
}

/** `db` atau transaksi yang sedang berjalan. */
type Kueri = Pick<typeof db, "select">;

const kolomIndikator = {
  id: indikator.id,
  kode: indikator.kode,
  nama: indikator.nama,
  kelompok: indikator.kelompok,
  satuan: indikator.satuan,
  arah: indikator.arah,
  frekuensi: indikator.frekuensi,
  aktif: indikator.aktif,
};

/**
 * Indikator dan Unit sebuah Lingkup (unit null = Lingkup RS). IMP-Unit tidak punya Lingkup RS. Baris Indikator dikunci
 * `for share`, jadi di dalam transaksi perubahan Unit Pelapor (yang menguncinya `for update`) menunggu sampai selesai.
 */
async function ambilLingkup(q: Kueri, indikatorId: string, unitId: Lingkup) {
  const [ind] = apakahUuid(indikatorId)
    ? await q.select(kolomIndikator).from(indikator).where(eq(indikator.id, indikatorId)).for("share")
    : [];
  if (!ind) throw new ServiceError(404, "Indikator tidak ditemukan.");
  let u: { id: string; nama: string; aktif: boolean } | null = null;
  if (unitId !== null) {
    [u] = apakahUuid(unitId)
      ? await q.select({ id: unit.id, nama: unit.nama, aktif: unit.aktif }).from(unit).where(eq(unit.id, unitId))
      : [];
    if (!u) throw new ServiceError(404, "Unit tidak ditemukan.");
  }
  if (ind.kelompok === "IMP-Unit" && !u) {
    throw new ServiceError(400, `${ind.kode} adalah IMP-Unit, jadi Lingkup-nya Unit Pelapor-nya, bukan RS.`);
  }
  return { indikator: ind, unit: u };
}

type DataLingkup = Awaited<ReturnType<typeof ambilLingkup>>;

/** Lingkup Unit: Unit itu Unit Pelapor Indikator pada bulan itu. Lingkup RS: Indikator punya Unit Pelapor bulan itu. */
async function wajibUnitPelapor(q: Kueri, { indikator: ind, unit: u }: DataLingkup, bulan: string) {
  const [ada] = await q
    .select({ id: unitPelapor.id })
    .from(unitPelapor)
    .where(and(eq(unitPelapor.indikatorId, ind.id), u ? eq(unitPelapor.unitId, u.id) : undefined, bersinggungan(bulan, bulan)))
    .limit(1);
  if (ada) return;
  throw new ServiceError(
    400,
    u
      ? `Unit ${u.nama} bukan Unit Pelapor Indikator ${ind.kode} pada ${labelBulan(bulan)}.`
      : `Indikator ${ind.kode} tidak punya Unit Pelapor pada ${labelBulan(bulan)}.`,
  );
}

/** Bulan yang bisa dianalisis untuk Lingkup ini: sudah berjalan, sesuai Frekuensi, dan ada Unit Pelapor-nya. */
async function wajibBulanDinilai(q: Kueri, l: DataLingkup, bulan: string, sekarang: Date) {
  if (bulan > bulanBerjalan(sekarang)) throw new ServiceError(400, `${labelBulan(bulan)} belum berjalan.`);
  if (!diukurPadaBulan(l.indikator.frekuensi, bulan)) {
    throw new ServiceError(400, `Indikator ${l.indikator.kode} Semesteran hanya dinilai pada bulan Juni dan Desember.`);
  }
  await wajibUnitPelapor(q, l, bulan);
}

/** Analisis milik Indikator + Lingkup + bulan "YYYY-MM". */
const analisisUntuk = (indikatorId: string, unitId: Lingkup, bulan: string) =>
  and(
    eq(analisis.indikatorId, indikatorId),
    unitId === null ? isNull(analisis.unitId) : eq(analisis.unitId, unitId),
    eq(analisis.bulan, keTanggal(bulan)),
  );

/**
 * Menulis Analisis; menulis ulang Indikator + Lingkup + bulan yang sama mengubah Analisis yang sama. Indikator harus
 * aktif dan dinilai bulan itu; Lingkup Unit harus Unit Pelapor bulan itu (Unit yang kini nonaktif boleh).
 */
export async function simpanAnalisis(aktor: Pengguna | null, isian: KunciAnalisis & { teks: string }, sekarang = new Date()) {
  wajibTulis(aktor, isian.unitId);
  wajibBulan(isian.bulan, "Pilih bulan.");
  const teks = wajibTeks(isian.teks, "Analisis", MAKS_ANALISIS);
  return db.transaction(async (tx) => {
    const l = await ambilLingkup(tx, isian.indikatorId, isian.unitId);
    if (!l.indikator.aktif) {
      throw new ServiceError(400, `Indikator ${l.indikator.kode} nonaktif, jadi tidak bisa dianalisis.`);
    }
    await wajibBulanDinilai(tx, l, isian.bulan, sekarang);
    const data = { teks, diubahOlehId: aktor.id, diubahPada: new Date() };
    const [baris] = await tx
      .insert(analisis)
      .values({ indikatorId: l.indikator.id, unitId: l.unit?.id ?? null, bulan: keTanggal(isian.bulan), ...data })
      .onConflictDoUpdate({ target: [analisis.indikatorId, analisis.unitId, analisis.bulan], set: data })
      .returning({ id: analisis.id });
    return { id: baris.id };
  });
}

/**
 * Bahan halaman Analisis: Indikator, Unit (null = RS), Analisis yang ada (null = belum), Capaian terkini Lingkup itu
 * pada bulan itu dari modul Capaian (null bila tidak ada), dan apakah aktor boleh menulisnya. Analisis yang sudah ada
 * selalu terbaca; bulan tanpa Analisis hanya bisa dibuka bila memang bisa dianalisis.
 */
export async function ambilAnalisis(aktor: Pengguna | null, k: KunciAnalisis, sekarang = new Date()) {
  wajibBaca(aktor, k.unitId);
  wajibBulan(k.bulan);
  const l = await ambilLingkup(db, k.indikatorId, k.unitId);
  const [ada] = await db
    .select({ id: analisis.id, teks: analisis.teks, diubahOleh: pengguna.nama, diubahPada: analisis.diubahPada })
    .from(analisis)
    .innerJoin(pengguna, eq(pengguna.id, analisis.diubahOlehId))
    .where(analisisUntuk(l.indikator.id, k.unitId, k.bulan));
  if (!ada) await wajibBulanDinilai(db, l, k.bulan, sekarang);
  const tren = await trenCapaian(aktor, l.indikator.id, k.bulan, sekarang);
  const deret = l.unit ? tren.unit.find((u) => u.unit.id === l.unit!.id)?.titik : tren.rs;
  return {
    ...l,
    bulan: k.bulan,
    capaian: deret?.find((t) => t.bulan === k.bulan) ?? null,
    analisis: ada ?? null,
    bolehTulis: bolehTulisLingkup(aktor, k.unitId) && l.indikator.aktif,
  };
}

/** Lingkup + bulan yang sudah punya Analisis untuk satu Indikator di antara bulan-bulan ini (tautan Monitoring). */
export async function analisisTersedia(aktor: Pengguna | null, indikatorId: string, bulan: string[]) {
  wajibPengguna(aktor);
  bulan.forEach((b) => wajibBulan(b));
  if (!apakahUuid(indikatorId) || bulan.length === 0) return [];
  const baris = await db
    .select({ unitId: analisis.unitId, bulan: analisis.bulan })
    .from(analisis)
    .where(
      and(
        eq(analisis.indikatorId, indikatorId),
        inArray(analisis.bulan, bulan.map(keTanggal)),
        saringLingkup(aktor, analisis.unitId),
      ),
    );
  return baris.map((b) => ({ unitId: b.unitId, bulan: dariTanggal(b.bulan) }));
}
