import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { indikator, pengguna, unit, unitPelapor, validasiData } from "@/db/schema";
import { dariTanggal, hariIni, keTanggal, labelBulan, tanggalValid, wajibBulanBerjalan } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { salahSatuDari, teksOpsional, wajibTeks } from "@/lib/form";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import {
  kesesuaian,
  PEMICU_VALIDASI,
  PENYEBAB_TIDAK_VALID,
  sampelMinimalValidasi,
  validData,
  type PenyebabTidakValid,
} from "@/lib/validasi";
import { wajibPengguna, type Pengguna } from "@/modules/auth/service";
import { melihatCapaianRs } from "@/modules/capaian/service";
import { bersinggungan } from "@/modules/indikator/service";
import { catatJejak } from "@/modules/jejak/catat";
import { bolehBacaLingkup, bolehTulisLingkup } from "@/modules/perbaikan/service";

/*
 * Modul Validasi Data (glosarium: Validasi Data). Satu validasi = pengukuran ulang sampel data satu Indikator di satu
 * Unit Pelapor untuk satu bulan oleh validator yang berbeda dari pengumpul data. Hak akses sama dengan Lingkup Unit di
 * modul Perbaikan: membaca = `bolehBacaLingkup`, mencatat = `bolehTulisLingkup` (Komite Mutu, Admin Sistem, Kepala Unit
 * Unit itu; validator boleh Kepala Unit bila tenaga terbatas, PMKP 1).
 */

const MAKS_NAMA = 120;
const MAKS_TEKS = 4000;
const MAKS_POPULASI = 1_000_000;

const PENCATAT_SEMUA: readonly Peran[] = ["komiteMutu", "adminSistem"];
/** Untuk tampilan (tombol "Catat Validasi"): aktor bisa mencatat validasi setidaknya untuk satu Unit. */
export const bolehCatatValidasi = (aktor: Pengguna) => PENCATAT_SEMUA.includes(aktor.peran) || aktor.peran === "kepalaUnit";

/** Isian satu validasi dari form; angka NaN = kosong (ditolak). */
export type IsianValidasi = {
  indikatorId: string;
  unitId: string;
  bulan: string;
  pemicu: string;
  tanggal: string;
  pengumpulData: string;
  validator: string;
  populasi: number;
  sampel: number;
  sesuai: number;
  penyebab: string[];
  perbaikan: string;
  catatan: string;
};

/** Bilangan bulat 0..maks; selain itu ditolak dengan `pesan`. */
function bulat(n: number, min: number, maks: number, pesan: string) {
  if (!Number.isInteger(n) || n < min || n > maks) throw new ServiceError(400, pesan);
  return n;
}

/** Isian yang sudah diperiksa (tanpa Indikator, Unit, dan bulan). */
function periksaIsian(isian: IsianValidasi, sekarang: Date) {
  const pengumpulData = wajibTeks(isian.pengumpulData, "Pengumpul data", MAKS_NAMA);
  const validator = wajibTeks(isian.validator, "Validator", MAKS_NAMA);
  if (pengumpulData.toLowerCase() === validator.toLowerCase()) {
    throw new ServiceError(400, "Validator harus orang yang berbeda dari pengumpul data (pengukuran ulang oleh orang lain).");
  }
  if (typeof isian.tanggal !== "string" || !tanggalValid(isian.tanggal)) throw new ServiceError(400, "Tanggal validasi harus tanggal yang valid.");
  if (isian.tanggal > hariIni(sekarang)) throw new ServiceError(400, "Tanggal validasi tidak boleh di masa depan.");
  if (isian.tanggal < keTanggal(isian.bulan)) throw new ServiceError(400, `Tanggal validasi tidak boleh sebelum ${labelBulan(isian.bulan)}.`);
  const populasi = bulat(isian.populasi, 1, MAKS_POPULASI, "Populasi harus bilangan bulat ≥ 1.");
  const sampel = bulat(isian.sampel, 1, populasi, "Sampel validator harus bilangan bulat 1 sampai sebesar populasi.");
  const minimal = sampelMinimalValidasi(populasi);
  if (sampel < minimal) {
    throw new ServiceError(400, `Sampel validator minimal ${minimal} untuk populasi ${populasi} (PMK 30/2022 Tabel 3).`);
  }
  const sesuai = bulat(isian.sesuai, 0, sampel, "Jumlah data sesuai harus bilangan bulat 0 sampai sebesar sampel.");
  const penyebab = Array.isArray(isian.penyebab) ? isian.penyebab : [];
  if (penyebab.some((p) => !(PENYEBAB_TIDAK_VALID as readonly string[]).includes(p))) throw new ServiceError(400, "Penyebab tidak dikenal.");
  const perbaikan = teksOpsional(isian.perbaikan, "Perbaikan", MAKS_TEKS);
  if (!validData(sesuai, sampel) && (penyebab.length === 0 || !perbaikan)) {
    throw new ServiceError(400, "Kesesuaian di bawah 90%: pilih penyebab dan tulis perbaikan yang dilakukan sebelum validasi ulang.");
  }
  return {
    pemicu: salahSatuDari(isian.pemicu, PEMICU_VALIDASI, "Pilih pemicu validasi."),
    tanggal: isian.tanggal,
    pengumpulData,
    validator,
    populasi,
    sampel,
    sesuai,
    // Urutan tetap seperti di Lampiran, tanpa duplikat.
    penyebab: PENYEBAB_TIDAK_VALID.filter((p) => penyebab.includes(p)) as PenyebabTidakValid[],
    perbaikan,
    catatan: teksOpsional(isian.catatan, "Catatan", MAKS_TEKS),
  };
}

type Transaksi = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Indikator dan Unit sebuah validasi; Unit harus Unit Pelapor Indikator itu pada bulan data. */
async function ambilKunci(tx: Transaksi, k: { indikatorId: string; unitId: string; bulan: string }) {
  const [x] =
    apakahUuid(k.indikatorId) && apakahUuid(k.unitId)
      ? await tx
          .select({ kode: indikator.kode, unit: unit.nama })
          .from(indikator)
          .innerJoin(unit, eq(unit.id, k.unitId))
          .where(eq(indikator.id, k.indikatorId))
      : [];
  if (!x) throw new ServiceError(404, "Indikator atau Unit tidak ditemukan.");
  const [pelapor] = await tx
    .select({ id: unitPelapor.id })
    .from(unitPelapor)
    .where(and(eq(unitPelapor.indikatorId, k.indikatorId), eq(unitPelapor.unitId, k.unitId), bersinggungan(k.bulan, k.bulan)))
    .limit(1);
  if (!pelapor) throw new ServiceError(400, `Unit ${x.unit} bukan Unit Pelapor ${x.kode} pada ${labelBulan(k.bulan)}.`);
  return x;
}

/**
 * Mencatat validasi baru, atau memperbaiki catatan validasi `id` (Indikator, Unit, dan bulannya tetap). Unit harus
 * Unit Pelapor Indikator pada bulan data yang sudah berjalan; aturan sampel dan isian di `periksaIsian`.
 */
export async function simpanValidasi(aktor: Pengguna | null, isian: IsianValidasi, id?: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  return db.transaction(async (tx) => {
    let kunci = { indikatorId: isian.indikatorId, unitId: isian.unitId, bulan: isian.bulan };
    if (id !== undefined) {
      const [lama] = apakahUuid(id)
        ? await tx
            .select({ indikatorId: validasiData.indikatorId, unitId: validasiData.unitId, bulan: validasiData.bulan })
            .from(validasiData)
            .where(eq(validasiData.id, id))
            .for("update")
        : [];
      if (!lama) throw new ServiceError(404, "Validasi tidak ditemukan.");
      kunci = { ...lama, bulan: dariTanggal(lama.bulan) };
    }
    if (!bolehTulisLingkup(aktor, kunci.unitId)) {
      throw new ServiceError(403, "Validasi Unit ini hanya dicatat Komite Mutu, Admin Sistem, dan Kepala Unit dari Unit itu.");
    }
    wajibBulanBerjalan(kunci.bulan, sekarang);
    const data = periksaIsian({ ...isian, bulan: kunci.bulan }, sekarang);
    const x = await ambilKunci(tx, kunci);
    const nilai = { ...data, diubahOlehId: aktor.id, diubahPada: new Date() };
    const [baris] = id
      ? await tx.update(validasiData).set(nilai).where(eq(validasiData.id, id)).returning({ id: validasiData.id })
      : await tx
          .insert(validasiData)
          .values({ indikatorId: kunci.indikatorId, unitId: kunci.unitId, bulan: keTanggal(kunci.bulan), ...nilai })
          .returning({ id: validasiData.id });
    const hasil = `${kesesuaian(data.sesuai, data.sampel).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%, ${validData(data.sesuai, data.sampel) ? "valid" : "tidak valid"}`;
    await catatJejak(tx, aktor, "validasi", baris.id, `${id ? "Memperbaiki catatan validasi" : "Mencatat validasi"} ${x.kode} Unit ${x.unit} ${labelBulan(kunci.bulan)}: ${hasil}`);
    return { id: baris.id };
  });
}

/** Validasi beserta Indikator, Unit, dan pencatat terakhirnya. */
const pilihValidasi = () =>
  db
    .select({
      id: validasiData.id,
      bulan: validasiData.bulan,
      pemicu: validasiData.pemicu,
      tanggal: validasiData.tanggal,
      pengumpulData: validasiData.pengumpulData,
      validator: validasiData.validator,
      populasi: validasiData.populasi,
      sampel: validasiData.sampel,
      sesuai: validasiData.sesuai,
      penyebab: validasiData.penyebab,
      perbaikan: validasiData.perbaikan,
      catatan: validasiData.catatan,
      createdAt: validasiData.createdAt,
      diubahOleh: pengguna.nama,
      diubahPada: validasiData.diubahPada,
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama },
      unit: { id: unit.id, nama: unit.nama },
    })
    .from(validasiData)
    .innerJoin(indikator, eq(indikator.id, validasiData.indikatorId))
    .innerJoin(unit, eq(unit.id, validasiData.unitId))
    .innerJoin(pengguna, eq(pengguna.id, validasiData.diubahOlehId));

type Baris = Awaited<ReturnType<typeof pilihValidasi>>[number];

/** Kunci validasi: Indikator + Unit + bulan data. */
const kunciDari = (v: { indikator: { id: string }; unit: { id: string }; bulan: string }) => `${v.indikator.id}|${v.unit.id}|${v.bulan}`;
/** Urutan validasi untuk satu kunci: menurut tanggal, lalu waktu dicatat. */
const urutan = (a: { tanggal: string; createdAt: Date }, b: { tanggal: string; createdAt: Date }) =>
  a.tanggal.localeCompare(b.tanggal) || a.createdAt.getTime() - b.createdAt.getTime();

/**
 * Turunan untuk tampilan: bulan "YYYY-MM", kesesuaian (%), valid, `diulang` (ada validasi sesudahnya untuk kunci yang
 * sama), dan `belumValid` (tidak valid dan belum ada validasi sesudahnya yang valid). `semua` = semua validasi kunci
 * yang sama yang ikut dibaca, untuk menentukan dua penanda terakhir.
 */
function denganHasil(v: Baris, semua: Baris[]) {
  const sesudah = semua.filter((x) => kunciDari(x) === kunciDari(v) && urutan(x, v) > 0);
  const valid = validData(v.sesuai, v.sampel);
  return {
    ...v,
    bulan: dariTanggal(v.bulan),
    kesesuaian: kesesuaian(v.sesuai, v.sampel),
    valid,
    diulang: sesudah.length > 0,
    belumValid: !valid && !sesudah.some((x) => validData(x.sesuai, x.sampel)),
  };
}

/** Saringan baca: semua Unit bagi yang melihat Capaian RS, selain itu Unit milik aktor. */
const saringBaca = (aktor: Pengguna) => (melihatCapaianRs(aktor) ? undefined : inArray(validasiData.unitId, aktor.unitIds));

/**
 * Validasi yang boleh dibaca aktor, terbaru di atas. Saringan: `belumValid` (hanya yang belum valid), `tanggal`
 * (tanggal validasi "YYYY-MM-DD", keduanya termasuk; untuk Laporan Triwulan).
 */
export async function daftarValidasi(
  aktor: Pengguna | null,
  saringan: { belumValid?: boolean; tanggal?: { mulai: string; akhir: string } } = {},
) {
  wajibPengguna(aktor);
  const { tanggal } = saringan;
  // Semua validasi yang terbaca dibaca sekaligus (jumlahnya kecil), supaya penanda diulang/belum valid lengkap.
  const semua = await pilihValidasi().where(saringBaca(aktor)).orderBy(asc(validasiData.tanggal), asc(validasiData.createdAt));
  return semua
    .filter((v) => !tanggal || (v.tanggal >= tanggal.mulai && v.tanggal <= tanggal.akhir))
    .map((v) => denganHasil(v, semua))
    .filter((v) => !saringan.belumValid || v.belumValid)
    .toReversed();
}

/** Satu validasi beserta validasi lain untuk Indikator + Unit + bulan yang sama, dan apakah aktor boleh memperbaikinya. */
export async function ambilValidasi(aktor: Pengguna | null, id: string) {
  wajibPengguna(aktor);
  const [v] = apakahUuid(id) ? await pilihValidasi().where(eq(validasiData.id, id)) : [];
  if (!v) throw new ServiceError(404, "Validasi tidak ditemukan.");
  if (!bolehBacaLingkup(aktor, v.unit.id)) throw new ServiceError(403, "Anda hanya bisa melihat validasi Unit Anda sendiri.");
  const sekunci = await pilihValidasi()
    .where(and(eq(validasiData.indikatorId, v.indikator.id), eq(validasiData.unitId, v.unit.id), eq(validasiData.bulan, v.bulan)))
    .orderBy(asc(validasiData.tanggal), asc(validasiData.createdAt));
  return {
    ...denganHasil(v, sekunci),
    riwayat: sekunci.map((x) => denganHasil(x, sekunci)),
    bolehTulis: bolehTulisLingkup(aktor, v.unit.id),
  };
}

/** Rentang tanggal untuk saringan `daftarValidasi` dari bulan "YYYY-MM" pertama dan terakhir (keduanya termasuk). */
export const rentangBulan = (mulai: string, akhir: string) => ({ mulai: keTanggal(mulai), akhir: `${akhir}-31` });
