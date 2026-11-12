import { and, asc, eq, gte, inArray, isNull, lt, lte, ne, type AnyColumn } from "drizzle-orm";

import { db } from "@/db";
import { analisis, indikator, pdsa, pengguna, tindakLanjut, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan, bulanLalu, dariTanggal, hariIni, keTanggal, labelBulan, tanggalValid, wajibBulan, wajibBulanBerjalan } from "@/lib/bulan";
import { kodePg, ServiceError } from "@/lib/errors";
import { wajibTeks } from "@/lib/form";
import { diukurPadaBulan } from "@/lib/indikator";
import {
  KEPUTUSAN_PDSA,
  LABEL_TAHAP_PDSA,
  lewatTenggat,
  mendekatiTenggat,
  punyaLingkupRs,
  STATUS_TERBUKA,
  STATUS_TINDAK_LANJUT,
  sudahDicapai,
  tahapBerikutnya,
  TAHAP_PDSA,
  type KeputusanPdsa,
  type StatusTindakLanjut,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { melihatCapaianRs, trenCapaian, type TrenCapaian } from "@/modules/capaian/service";
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
const MAKS_TEKS = 1000;
const MAKS_PIC = 120;
const MAKS_JUDUL = 200;

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

/** Untuk tampilan (tombol "Mulai PDSA"): aktor bisa menulis pada setidaknya satu Lingkup. */
export const bolehMulaiPdsa = (aktor: Pengguna) => PENULIS_SEMUA.includes(aktor.peran) || aktor.peran === "kepalaUnit";

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
  if (!punyaLingkupRs(ind.kelompok) && !u) {
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

/**
 * Bisa dianalisis: Indikator aktif dan dinilai pada bulan itu (sudah berjalan, sesuai Frekuensi, ada Unit Pelapor-nya;
 * Lingkup Unit = Unit itu Unit Pelapor bulan itu, walau kini nonaktif).
 */
async function wajibBisaDianalisis(q: Kueri, l: DataLingkup, bulan: string, sekarang: Date) {
  if (!l.indikator.aktif) throw new ServiceError(400, `Indikator ${l.indikator.kode} nonaktif, jadi tidak bisa dianalisis.`);
  wajibBulanBerjalan(bulan, sekarang);
  if (!diukurPadaBulan(l.indikator.frekuensi, bulan)) {
    throw new ServiceError(400, `Indikator ${l.indikator.kode} Semesteran hanya dinilai pada bulan Juni dan Desember.`);
  }
  await wajibUnitPelapor(q, l, bulan);
}

/** Kolom Lingkup (unit) sama dengan Lingkup ini; null = Lingkup RS. */
const lingkupSama = (kolomUnit: AnyColumn, unitId: Lingkup) => (unitId === null ? isNull(kolomUnit) : eq(kolomUnit, unitId));

/** Analisis milik Indikator + Lingkup + bulan "YYYY-MM". */
const analisisUntuk = (indikatorId: string, unitId: Lingkup, bulan: string) =>
  and(eq(analisis.indikatorId, indikatorId), lingkupSama(analisis.unitId, unitId), eq(analisis.bulan, keTanggal(bulan)));

/** Tindak Lanjut beserta Indikator, Lingkup (unit null = RS), dan bulan Analisis-nya. */
const pilihTindakLanjut = () =>
  db
    .select({
      id: tindakLanjut.id,
      analisisId: tindakLanjut.analisisId,
      tindakan: tindakLanjut.tindakan,
      pic: tindakLanjut.pic,
      tenggat: tindakLanjut.tenggat,
      status: tindakLanjut.status,
      catatan: tindakLanjut.catatan,
      diubahOleh: pengguna.nama,
      diubahPada: tindakLanjut.diubahPada,
      bulan: analisis.bulan,
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama },
      unit: { id: unit.id, nama: unit.nama },
    })
    .from(tindakLanjut)
    .innerJoin(analisis, eq(analisis.id, tindakLanjut.analisisId))
    .innerJoin(indikator, eq(indikator.id, analisis.indikatorId))
    .leftJoin(unit, eq(unit.id, analisis.unitId))
    .innerJoin(pengguna, eq(pengguna.id, tindakLanjut.diubahOlehId));

/** Baris `pilihTindakLanjut` untuk tampilan: bulan "YYYY-MM" dan apakah lewat atau mendekati tenggat pada hari ini. */
const denganTenggat = (hari: string) => (t: Awaited<ReturnType<typeof pilihTindakLanjut>>[number]) => ({
  ...t,
  bulan: dariTanggal(t.bulan),
  lewatTenggat: lewatTenggat(t, hari),
  mendekatiTenggat: mendekatiTenggat(t, hari),
});

/**
 * Menulis Analisis; menulis ulang Indikator + Lingkup + bulan yang sama mengubah Analisis yang sama. Hanya selama
 * bulan itu bisa dianalisis (`wajibBisaDianalisis`), juga untuk mengubah Analisis yang sudah ada.
 */
export async function simpanAnalisis(aktor: Pengguna | null, isian: KunciAnalisis & { teks: string }, sekarang = new Date()) {
  wajibTulis(aktor, isian.unitId);
  wajibBulan(isian.bulan, "Pilih bulan.");
  const teks = wajibTeks(isian.teks, "Analisis", MAKS_ANALISIS);
  return db.transaction(async (tx) => {
    const l = await ambilLingkup(tx, isian.indikatorId, isian.unitId);
    await wajibBisaDianalisis(tx, l, isian.bulan, sekarang);
    const data = { teks, diubahOlehId: aktor.id, diubahPada: new Date() };
    const [baris] = await tx
      .insert(analisis)
      .values({ indikatorId: l.indikator.id, unitId: l.unit?.id ?? null, bulan: keTanggal(isian.bulan), ...data })
      .onConflictDoUpdate({ target: [analisis.indikatorId, analisis.unitId, analisis.bulan], set: data })
      .returning({ id: analisis.id });
    return { id: baris.id };
  });
}

/** Deret Capaian satu Lingkup dari `trenCapaian`: Capaian RS, atau Unit itu (undefined bila bukan Unit Pelapor). */
const deretLingkup = (tren: TrenCapaian, unitId: Lingkup) =>
  unitId === null ? tren.rs : tren.unit.find((u) => u.unit.id === unitId)?.titik;

/**
 * Bahan halaman Analisis: Indikator, Unit (null = RS), Analisis yang ada (null = belum), Capaian terkini Lingkup itu
 * pada bulan itu dari modul Capaian (null bila tidak ada), Tindak Lanjut, dan PDSA berjalan. Analisis yang sudah ada
 * selalu terbaca; bulan tanpa Analisis hanya bisa dibuka bila bisa dianalisis. `bolehTulis` = hak tulis Lingkup
 * (Tindak Lanjut tetap bisa dikelola walau Indikator kini nonaktif); `bolehTulisAnalisis` = juga bisa dianalisis.
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
  let bisaDianalisis = true;
  try {
    await wajibBisaDianalisis(db, l, k.bulan, sekarang);
  } catch (error) {
    if (ada && error instanceof ServiceError) bisaDianalisis = false;
    else throw error;
  }
  const [tren, milik, sebelumnya, pdsaBerjalan] = await Promise.all([
    trenCapaian(aktor, l.indikator.id, k.bulan, sekarang),
    ada ? pilihTindakLanjut().where(eq(tindakLanjut.analisisId, ada.id)).orderBy(asc(tindakLanjut.createdAt)) : [],
    pilihTindakLanjut()
      .where(
        and(
          eq(analisis.indikatorId, l.indikator.id),
          lingkupSama(analisis.unitId, k.unitId),
          lt(analisis.bulan, keTanggal(k.bulan)),
          inArray(tindakLanjut.status, [...STATUS_TERBUKA]),
        ),
      )
      .orderBy(asc(analisis.bulan), asc(tindakLanjut.createdAt)),
    daftarPdsa(aktor, { indikatorId: l.indikator.id, lingkup: k.unitId }),
  ]);
  const hari = hariIni(sekarang);
  return {
    ...l,
    bulan: k.bulan,
    capaian: deretLingkup(tren, k.unitId)?.find((t) => t.bulan === k.bulan) ?? null,
    analisis: ada ?? null,
    bolehTulis: bolehTulisLingkup(aktor, k.unitId),
    bolehTulisAnalisis: bolehTulisLingkup(aktor, k.unitId) && bisaDianalisis,
    /** Tindak Lanjut milik Analisis ini. */
    tindakLanjut: milik.map(denganTenggat(hari)),
    /** Tindak Lanjut bulan-bulan sebelumnya (Indikator + Lingkup sama) yang masih Direncanakan atau Berjalan. */
    tindakLanjutSebelumnya: sebelumnya.map(denganTenggat(hari)),
    /** PDSA yang belum Selesai untuk Indikator + Lingkup yang sama. */
    pdsa: pdsaBerjalan,
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

/**
 * Analisis beberapa Indikator pada bulan-bulan "YYYY-MM" ini beserta Tindak Lanjut-nya (urut dibuat), hanya Lingkup
 * yang boleh dibaca aktor; untuk Laporan Triwulan dan Rekap SIMAR. Indikator atau bulan yang belum dianalisis tidak
 * punya baris.
 */
export async function analisisPada(aktor: Pengguna | null, indikatorIds: string[], bulan: string[], sekarang = new Date()) {
  wajibPengguna(aktor);
  bulan.forEach((b) => wajibBulan(b));
  const ids = indikatorIds.filter(apakahUuid);
  if (ids.length === 0 || bulan.length === 0) return [];
  const daftar = await db
    .select({
      id: analisis.id,
      indikatorId: analisis.indikatorId,
      unitId: analisis.unitId,
      bulan: analisis.bulan,
      teks: analisis.teks,
      diubahOleh: pengguna.nama,
      diubahPada: analisis.diubahPada,
    })
    .from(analisis)
    .innerJoin(pengguna, eq(pengguna.id, analisis.diubahOlehId))
    .where(and(inArray(analisis.indikatorId, ids), inArray(analisis.bulan, bulan.map(keTanggal)), saringLingkup(aktor, analisis.unitId)));
  const tindak =
    daftar.length === 0
      ? []
      : (
          await pilihTindakLanjut()
            .where(inArray(tindakLanjut.analisisId, daftar.map((a) => a.id)))
            .orderBy(asc(tindakLanjut.createdAt))
        ).map(denganTenggat(hariIni(sekarang)));
  return daftar.map((a) => ({ ...a, bulan: dariTanggal(a.bulan), tindakLanjut: tindak.filter((t) => t.analisisId === a.id) }));
}

/** Tindakan, PIC, dan tenggat Tindak Lanjut dari form. */
export type IsianTindakLanjut = { tindakan: string; pic: string; tenggat: string };

function periksaTindakLanjut(isian: IsianTindakLanjut) {
  const tindakan = wajibTeks(isian.tindakan, "Tindakan", MAKS_TEKS);
  const pic = wajibTeks(isian.pic, "PIC", MAKS_PIC);
  if (typeof isian.tenggat !== "string" || !tanggalValid(isian.tenggat)) {
    throw new ServiceError(400, "Tenggat harus tanggal yang valid.");
  }
  return { tindakan, pic, tenggat: isian.tenggat };
}

/** Menambahkan Tindak Lanjut (status Direncanakan) ke Analisis yang sudah ada; hak tulis = Lingkup Analisis itu. */
export async function tambahTindakLanjut(aktor: Pengguna | null, analisisId: string, isian: IsianTindakLanjut) {
  wajibPengguna(aktor);
  const [a] = apakahUuid(analisisId)
    ? await db.select({ id: analisis.id, unitId: analisis.unitId }).from(analisis).where(eq(analisis.id, analisisId))
    : [];
  if (!a) throw new ServiceError(404, "Analisis tidak ditemukan. Simpan Analisis dulu sebelum menambah Tindak Lanjut.");
  wajibTulis(aktor, a.unitId);
  const [baru] = await db
    .insert(tindakLanjut)
    .values({ analisisId: a.id, ...periksaTindakLanjut(isian), status: "direncanakan", diubahOlehId: aktor.id })
    .returning({ id: tindakLanjut.id });
  return { id: baru.id };
}

/**
 * Mengubah Tindak Lanjut, termasuk statusnya (boleh berpindah ke status mana pun). Catatan wajib saat Selesai (hasil)
 * dan Dibatalkan (alasan). Tidak ada hapus: yang batal berstatus Dibatalkan.
 */
export async function ubahTindakLanjut(
  aktor: Pengguna | null,
  id: string,
  isian: IsianTindakLanjut & { status: StatusTindakLanjut; catatan?: string },
) {
  wajibPengguna(aktor);
  const [tl] = apakahUuid(id)
    ? await db
        .select({ id: tindakLanjut.id, unitId: analisis.unitId })
        .from(tindakLanjut)
        .innerJoin(analisis, eq(analisis.id, tindakLanjut.analisisId))
        .where(eq(tindakLanjut.id, id))
    : [];
  if (!tl) throw new ServiceError(404, "Tindak Lanjut tidak ditemukan.");
  wajibTulis(aktor, tl.unitId);
  const data = periksaTindakLanjut(isian);
  // Nilai dari form bisa diutak-atik.
  if (!STATUS_TINDAK_LANJUT.includes(isian.status)) throw new ServiceError(400, "Status Tindak Lanjut tidak dikenal.");
  const catatan = typeof isian.catatan === "string" ? isian.catatan.trim() : "";
  if (catatan.length > MAKS_TEKS) throw new ServiceError(400, `Catatan maksimal ${MAKS_TEKS} karakter.`);
  if (isian.status === "selesai" && !catatan) {
    throw new ServiceError(400, "Catatan hasil wajib diisi saat Tindak Lanjut Selesai.");
  }
  if (isian.status === "dibatalkan" && !catatan) {
    throw new ServiceError(400, "Alasan pembatalan wajib diisi saat Tindak Lanjut Dibatalkan.");
  }
  await db
    .update(tindakLanjut)
    .set({ ...data, status: isian.status, catatan, diubahOlehId: aktor.id, diubahPada: new Date() })
    .where(eq(tindakLanjut.id, tl.id));
}

/** Saringan status daftar Tindak Lanjut: satu status, "terbuka" (Direncanakan + Berjalan, bawaan), atau "semua". */
export type SaringanStatusTindakLanjut = StatusTindakLanjut | "terbuka" | "semua";

/**
 * Daftar Tindak Lanjut yang boleh dilihat aktor, disaring status (bawaan: terbuka) dan Lingkup (tanpa = semua Lingkup
 * yang boleh dilihat; null = Lingkup RS). Yang lewat tenggat paling atas, lalu urut tenggat.
 */
export async function daftarTindakLanjut(
  aktor: Pengguna | null,
  saringan: { status?: SaringanStatusTindakLanjut; lingkup?: Lingkup } = {},
  sekarang = new Date(),
) {
  wajibPengguna(aktor);
  const status = saringan.status ?? "terbuka";
  if (status !== "terbuka" && status !== "semua" && !STATUS_TINDAK_LANJUT.includes(status)) {
    throw new ServiceError(400, "Saringan status tidak dikenal.");
  }
  const { lingkup } = saringan;
  if (lingkup !== undefined) wajibBaca(aktor, lingkup);
  if (lingkup && !apakahUuid(lingkup)) return [];
  const hari = hariIni(sekarang);
  const baris = await pilihTindakLanjut()
    .where(
      and(
        status === "semua" ? undefined : inArray(tindakLanjut.status, status === "terbuka" ? [...STATUS_TERBUKA] : [status]),
        lingkup === undefined ? saringLingkup(aktor, analisis.unitId) : lingkupSama(analisis.unitId, lingkup),
      ),
    )
    .orderBy(asc(tindakLanjut.tenggat), asc(tindakLanjut.createdAt));
  return baris
    .map(denganTenggat(hari))
    .sort((a, b) => Number(b.lewatTenggat) - Number(a.lewatTenggat) || a.tenggat.localeCompare(b.tenggat));
}

/** Isian Plan: judul, masalah, tujuan, prediksi, rencana perubahan, dan periode uji coba ("YYYY-MM", keduanya termasuk). */
export type PlanPdsa = {
  judul: string;
  masalah: string;
  tujuan: string;
  prediksi: string;
  rencana: string;
  bulanMulai: string;
  bulanAkhir: string;
};
/** Isian setiap tahap PDSA. */
export type IsianTahapPdsa = {
  plan: PlanPdsa;
  do: { pelaksanaan: string };
  study: { hasil: string };
  act: { keputusan: KeputusanPdsa; penjelasan: string };
};

function periksaPlan(isian: PlanPdsa) {
  const data = {
    judul: wajibTeks(isian.judul, "Judul", MAKS_JUDUL),
    masalah: wajibTeks(isian.masalah, "Masalah", MAKS_ANALISIS),
    tujuan: wajibTeks(isian.tujuan, "Tujuan", MAKS_ANALISIS),
    prediksi: wajibTeks(isian.prediksi, "Prediksi", MAKS_ANALISIS),
    rencana: wajibTeks(isian.rencana, "Rencana perubahan", MAKS_ANALISIS),
  };
  wajibBulan(isian.bulanMulai, "Bulan mulai uji coba tidak valid.");
  wajibBulan(isian.bulanAkhir, "Bulan akhir uji coba tidak valid.");
  if (isian.bulanAkhir < isian.bulanMulai) {
    throw new ServiceError(400, "Bulan akhir uji coba tidak boleh sebelum bulan mulai.");
  }
  return { ...data, bulanMulai: keTanggal(isian.bulanMulai), bulanAkhir: keTanggal(isian.bulanAkhir) };
}

/** Isian wajib satu tahap, dirapikan; nilai dari form bisa diutak-atik. */
function periksaTahap<T extends TahapIsianPdsa>(tahap: T, isian: IsianTahapPdsa[T]) {
  const i = isian as IsianTahapPdsa[TahapIsianPdsa];
  switch (tahap) {
    case "plan":
      return periksaPlan(i as PlanPdsa);
    case "do":
      return { pelaksanaan: wajibTeks((i as IsianTahapPdsa["do"]).pelaksanaan, "Pelaksanaan", MAKS_ANALISIS) };
    case "study":
      return { hasil: wajibTeks((i as IsianTahapPdsa["study"]).hasil, "Hasil", MAKS_ANALISIS) };
    default: {
      const { keputusan, penjelasan } = i as IsianTahapPdsa["act"];
      if (!KEPUTUSAN_PDSA.includes(keputusan)) {
        throw new ServiceError(400, "Pilih keputusan Act: Adopsi, Adaptasi, atau Tinggalkan.");
      }
      return { keputusan, penjelasan: wajibTeks(penjelasan, "Penjelasan", MAKS_ANALISIS) };
    }
  }
}

/**
 * Memulai PDSA: judul dan Plan tersimpan, tahap aktif langsung Do. Indikator harus aktif; Lingkup Unit = Unit aktif
 * yang menjadi Unit Pelapor pada bulan mulai; IMP-Unit tidak punya Lingkup RS. Dengan `sebelumnyaId` = siklus berikutnya
 * dari PDSA yang sudah Selesai: Indikator, Lingkup, dan judul disalin dari siklus itu (isian lain diabaikan), siklus + 1.
 */
export async function buatPdsa(
  aktor: Pengguna | null,
  isian: { indikatorId: string; unitId: Lingkup; sebelumnyaId?: string } & PlanPdsa,
) {
  wajibPengguna(aktor);
  return db.transaction(async (tx) => {
    let baru = { indikatorId: isian.indikatorId, unitId: isian.unitId, judul: isian.judul, siklus: 1, sebelumnyaId: null as string | null };
    if (isian.sebelumnyaId !== undefined) {
      const [s] = apakahUuid(isian.sebelumnyaId)
        ? await tx
            .select({ id: pdsa.id, indikatorId: pdsa.indikatorId, unitId: pdsa.unitId, judul: pdsa.judul, siklus: pdsa.siklus, tahap: pdsa.tahap })
            .from(pdsa)
            .where(eq(pdsa.id, isian.sebelumnyaId))
            .for("update")
        : [];
      if (!s) throw new ServiceError(404, "PDSA sebelumnya tidak ditemukan.");
      wajibTulis(aktor, s.unitId);
      if (s.tahap !== "selesai") {
        throw new ServiceError(409, "Siklus berikutnya hanya bisa dimulai dari PDSA yang sudah Selesai.");
      }
      baru = { indikatorId: s.indikatorId, unitId: s.unitId, judul: s.judul, siklus: s.siklus + 1, sebelumnyaId: s.id };
    } else {
      wajibTulis(aktor, isian.unitId);
    }
    const data = periksaPlan({ ...isian, judul: baru.judul });
    const l = await ambilLingkup(tx, baru.indikatorId, baru.unitId);
    if (!l.indikator.aktif) throw new ServiceError(400, `Indikator ${l.indikator.kode} nonaktif, jadi tidak bisa dibuat PDSA-nya.`);
    if (l.unit) {
      if (!l.unit.aktif) throw new ServiceError(400, `Unit ${l.unit.nama} nonaktif, jadi tidak bisa dibuat PDSA-nya.`);
      await wajibUnitPelapor(tx, l, isian.bulanMulai);
    }
    try {
      const [dibuat] = await tx
        .insert(pdsa)
        .values({
          ...data,
          indikatorId: l.indikator.id,
          unitId: l.unit?.id ?? null,
          siklus: baru.siklus,
          sebelumnyaId: baru.sebelumnyaId,
          tahap: "do",
          diubahOlehId: aktor.id,
        })
        .returning({ id: pdsa.id });
      return { id: dibuat.id };
    } catch (error) {
      if (kodePg(error) === "23505") throw new ServiceError(409, "Siklus berikutnya dari PDSA ini sudah dimulai.");
      throw error;
    }
  });
}

/**
 * Menyimpan isian satu tahap PDSA yang sudah dicapai (tahap yang sudah lewat tetap bisa diperbaiki). `lanjut` hanya
 * untuk tahap aktif: setelah isian wajibnya tersimpan, tahap aktif maju satu (Act → Selesai). Baris dikunci dulu.
 */
export async function simpanTahapPdsa<T extends TahapIsianPdsa>(
  aktor: Pengguna | null,
  id: string,
  tahap: T,
  isian: IsianTahapPdsa[T],
  lanjut: boolean,
) {
  wajibPengguna(aktor);
  if (!TAHAP_PDSA.includes(tahap) || tahap === ("selesai" as TahapIsianPdsa)) {
    throw new ServiceError(400, "Tahap PDSA tidak dikenal.");
  }
  await db.transaction(async (tx) => {
    const [p] = apakahUuid(id)
      ? await tx.select({ id: pdsa.id, unitId: pdsa.unitId, tahap: pdsa.tahap }).from(pdsa).where(eq(pdsa.id, id)).for("update")
      : [];
    if (!p) throw new ServiceError(404, "PDSA tidak ditemukan.");
    wajibTulis(aktor, p.unitId);
    if (!sudahDicapai(tahap, p.tahap)) {
      throw new ServiceError(409, `Tahap ${LABEL_TAHAP_PDSA[tahap]} belum dicapai; isi tahap ${LABEL_TAHAP_PDSA[p.tahap]} dulu.`);
    }
    if (lanjut && tahap !== p.tahap) {
      throw new ServiceError(409, `Hanya tahap aktif (${LABEL_TAHAP_PDSA[p.tahap]}) yang bisa dilanjutkan.`);
    }
    await tx
      .update(pdsa)
      .set({
        ...periksaTahap(tahap, isian),
        ...(lanjut ? { tahap: tahapBerikutnya(tahap) } : {}),
        diubahOlehId: aktor.id,
        diubahPada: new Date(),
      })
      .where(eq(pdsa.id, p.id));
  });
}

/** PDSA beserta Indikator, Unit (null = RS), dan pengubah terakhirnya. */
const pilihPdsa = () =>
  db
    .select({
      id: pdsa.id,
      judul: pdsa.judul,
      siklus: pdsa.siklus,
      sebelumnyaId: pdsa.sebelumnyaId,
      tahap: pdsa.tahap,
      bulanMulai: pdsa.bulanMulai,
      bulanAkhir: pdsa.bulanAkhir,
      masalah: pdsa.masalah,
      tujuan: pdsa.tujuan,
      prediksi: pdsa.prediksi,
      rencana: pdsa.rencana,
      pelaksanaan: pdsa.pelaksanaan,
      hasil: pdsa.hasil,
      keputusan: pdsa.keputusan,
      penjelasan: pdsa.penjelasan,
      diubahOleh: pengguna.nama,
      diubahPada: pdsa.diubahPada,
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama, kelompok: indikator.kelompok, satuan: indikator.satuan },
      unit: { id: unit.id, nama: unit.nama, aktif: unit.aktif },
    })
    .from(pdsa)
    .innerJoin(indikator, eq(indikator.id, pdsa.indikatorId))
    .leftJoin(unit, eq(unit.id, pdsa.unitId))
    .innerJoin(pengguna, eq(pengguna.id, pdsa.diubahOlehId));

/** Kolom bulan (tanggal 1) dikembalikan sebagai "YYYY-MM". */
const denganBulan = <T extends { bulanMulai: string; bulanAkhir: string }>(p: T) => ({
  ...p,
  bulanMulai: dariTanggal(p.bulanMulai),
  bulanAkhir: dariTanggal(p.bulanAkhir),
});

/**
 * Detail PDSA: semua tahap, siklus sebelum/sesudahnya, dan deret Capaian untuk Study dari modul Capaian (12 bulan
 * sampai bulan akhir uji coba, atau bulan berjalan bila uji coba belum berakhir; deret RS atau Unit Lingkup itu, kosong
 * bila Unit itu bukan Unit Pelapor dalam rentang tersebut).
 */
export async function ambilPdsa(aktor: Pengguna | null, id: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  const [baris] = apakahUuid(id) ? await pilihPdsa().where(eq(pdsa.id, id)) : [];
  if (!baris) throw new ServiceError(404, "PDSA tidak ditemukan.");
  const p = denganBulan(baris);
  const unitId = p.unit?.id ?? null;
  wajibBaca(aktor, unitId);
  const siklus = { id: pdsa.id, siklus: pdsa.siklus };
  const [[sebelumnya], [berikutnya], tren] = await Promise.all([
    p.sebelumnyaId ? db.select(siklus).from(pdsa).where(eq(pdsa.id, p.sebelumnyaId)) : [],
    db.select(siklus).from(pdsa).where(eq(pdsa.sebelumnyaId, p.id)),
    trenCapaian(aktor, p.indikator.id, [p.bulanAkhir, bulanBerjalan(sekarang)].sort()[0], sekarang),
  ]);
  const study = deretLingkup(tren, unitId) ?? [];
  return {
    ...p,
    sebelumnya: sebelumnya ?? null,
    berikutnya: berikutnya ?? null,
    study,
    bolehTulis: bolehTulisLingkup(aktor, unitId),
  };
}

/**
 * Daftar PDSA yang boleh dilihat aktor, urut kode Indikator lalu waktu dibuat. Bawaan hanya yang belum Selesai
 * (`semua` = termasuk yang Selesai). Saringan Indikator, Lingkup (tanpa = semua Lingkup yang boleh dilihat), dan
 * `periode` (bulan "YYYY-MM", keduanya termasuk) = periode uji coba bersinggungan dengan periode itu.
 */
export async function daftarPdsa(
  aktor: Pengguna | null,
  saringan: { semua?: boolean; indikatorId?: string; lingkup?: Lingkup; periode?: { mulai: string; akhir: string } } = {},
) {
  wajibPengguna(aktor);
  const { lingkup, indikatorId, periode } = saringan;
  if (periode) [periode.mulai, periode.akhir].forEach((b) => wajibBulan(b));
  if (lingkup !== undefined) wajibBaca(aktor, lingkup);
  if ((lingkup && !apakahUuid(lingkup)) || (indikatorId !== undefined && !apakahUuid(indikatorId))) return [];
  const baris = await db
    .select({
      id: pdsa.id,
      judul: pdsa.judul,
      siklus: pdsa.siklus,
      tahap: pdsa.tahap,
      bulanMulai: pdsa.bulanMulai,
      bulanAkhir: pdsa.bulanAkhir,
      hasil: pdsa.hasil,
      keputusan: pdsa.keputusan,
      penjelasan: pdsa.penjelasan,
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama },
      unit: { id: unit.id, nama: unit.nama },
    })
    .from(pdsa)
    .innerJoin(indikator, eq(indikator.id, pdsa.indikatorId))
    .leftJoin(unit, eq(unit.id, pdsa.unitId))
    .where(
      and(
        saringan.semua ? undefined : ne(pdsa.tahap, "selesai"),
        indikatorId === undefined ? undefined : eq(pdsa.indikatorId, indikatorId),
        lingkup === undefined ? saringLingkup(aktor, pdsa.unitId) : lingkupSama(pdsa.unitId, lingkup),
        periode ? and(lte(pdsa.bulanMulai, keTanggal(periode.akhir)), gte(pdsa.bulanAkhir, keTanggal(periode.mulai))) : undefined,
      ),
    )
    .orderBy(asc(indikator.kode), asc(pdsa.createdAt));
  return baris.map(denganBulan);
}

/**
 * Analisis yang diharapkan pada bulan "YYYY-MM" tetapi belum ditulis (Dashboard): untuk setiap Indikator aktif yang
 * dinilai bulan itu, Lingkup RS bagi INM, IMP-RS, dan SPM, dan Lingkup Unit Pelapor bagi IMP-Unit (Unit yang kini nonaktif
 * tetap terhitung). Petugas Input Data dan Kepala Unit hanya melihat IMP-Unit Unit-nya. Urut kode Indikator lalu nama
 * Unit. Tanpa bulan = bulan lalu; bulan setelah bulan berjalan ditolak.
 */
export async function belumDianalisis(aktor: Pengguna | null, bulan?: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  bulan ||= bulanLalu(sekarang);
  wajibBulanBerjalan(bulan, sekarang);
  const [pelapor, ada] = await Promise.all([
    db
      .select({
        indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama, kelompok: indikator.kelompok, frekuensi: indikator.frekuensi },
        unit: { id: unit.id, nama: unit.nama },
      })
      .from(unitPelapor)
      .innerJoin(indikator, eq(indikator.id, unitPelapor.indikatorId))
      .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
      .where(and(eq(indikator.aktif, true), bersinggungan(bulan, bulan), saringLingkup(aktor, unitPelapor.unitId)))
      .orderBy(asc(indikator.kode), asc(unit.nama)),
    db.select({ indikatorId: analisis.indikatorId, unitId: analisis.unitId }).from(analisis).where(eq(analisis.bulan, keTanggal(bulan))),
  ]);
  const sudah = new Set(ada.map((a) => `${a.indikatorId}|${a.unitId}`));
  const harapan = new Map<string, { indikator: (typeof pelapor)[number]["indikator"]; unit: (typeof pelapor)[number]["unit"] | null }>();
  for (const p of pelapor) {
    if (!diukurPadaBulan(p.indikator.frekuensi, bulan)) continue;
    const perUnit = !punyaLingkupRs(p.indikator.kelompok);
    // Lingkup RS hanya untuk yang melihat Capaian RS.
    if (!perUnit && !melihatCapaianRs(aktor)) continue;
    const unitId = perUnit ? p.unit.id : null;
    const k = `${p.indikator.id}|${unitId}`;
    if (!sudah.has(k)) harapan.set(k, { indikator: p.indikator, unit: perUnit ? p.unit : null });
  }
  return { bulan, daftar: [...harapan.values()] };
}
