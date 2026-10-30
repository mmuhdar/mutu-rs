import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { indikator, target } from "@/db/schema";
import { bulanValid, dariTanggal, keTanggal } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { ARAH, FREKUENSI, type Kelompok } from "@/lib/indikator";
import type { Peran } from "@/lib/peran";
import { wajibPengguna, wajibPeran, type Pengguna } from "@/modules/auth/service";

import { INM, TARGET_INM_BERLAKU_MULAI } from "./inm";

export type Indikator = typeof indikator.$inferSelect;
/** Field Indikator yang bisa diubah (kode dan kelompok tetap sejak dibuat). */
export type IsianIndikator = Pick<
  Indikator,
  | "nama"
  | "definisiOperasional"
  | "definisiNumerator"
  | "definisiDenominator"
  | "sumberData"
  | "faktor"
  | "satuan"
  | "arah"
  | "frekuensi"
  | "pic"
>;
/** IMP baru beserta Target awalnya (bulan "YYYY-MM"). INM hanya berasal dari data awal. */
export type IndikatorBaru = IsianIndikator & {
  kode: string;
  kelompok: Exclude<Kelompok, "INM">;
  target: { nilai: number; berlakuMulai: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tidakDitemukan = () => new ServiceError(404, "Indikator tidak ditemukan.");

/** Komite Mutu dan Admin Sistem mengelola Indikator; peran lain hanya melihat. */
const PENGELOLA: readonly Peran[] = ["komiteMutu", "adminSistem"];
const HANYA_PENGELOLA = "Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator.";
/** Untuk tampilan (tombol kelola); hak akses tetap diperiksa di setiap fungsi service. */
export const bolehKelolaIndikator = (aktor: Pengguna) => PENGELOLA.includes(aktor.peran);

function teks(nilai: unknown, label: string, maks = Infinity, wajib = true) {
  const hasil = typeof nilai === "string" ? nilai.trim() : "";
  if (wajib && !hasil) throw new ServiceError(400, `${label} wajib diisi.`);
  if (hasil.length > maks) throw new ServiceError(400, `${label} maksimal ${maks} karakter.`);
  return hasil;
}

/** Memeriksa dan merapikan isian dari form (spasi di tepi dibuang). */
function periksaIsian(isian: IsianIndikator): IsianIndikator {
  const hasil = {
    nama: teks(isian.nama, "Nama", 200),
    definisiOperasional: teks(isian.definisiOperasional, "Definisi operasional"),
    definisiNumerator: teks(isian.definisiNumerator, "Definisi Numerator"),
    definisiDenominator: teks(isian.definisiDenominator, "Definisi Denominator"),
    sumberData: teks(isian.sumberData, "Sumber Data"),
    faktor: isian.faktor,
    satuan: teks(isian.satuan, "Satuan", 32),
    arah: isian.arah,
    frekuensi: isian.frekuensi,
    pic: teks(isian.pic ?? "", "PIC", 120, false),
  };
  if (!Number.isInteger(hasil.faktor) || hasil.faktor < 1 || hasil.faktor > 2_147_483_647) {
    throw new ServiceError(400, "Faktor harus bilangan bulat positif, mis. 100 untuk persen.");
  }
  if (!ARAH.includes(hasil.arah)) throw new ServiceError(400, "Pilih Arah Indikator.");
  if (!FREKUENSI.includes(hasil.frekuensi)) throw new ServiceError(400, "Pilih Frekuensi Indikator.");
  return hasil;
}

/**
 * Data awal: 13 INM beserta Target awalnya. Hanya kode yang belum ada yang ditambahkan, jadi restart
 * tidak menimpa perubahan Komite Mutu dan tidak menggandakan Target.
 */
export async function buatInmAwal() {
  await db.transaction(async (tx) => {
    const baru = await tx
      .insert(indikator)
      .values(INM.map((data) => ({ ...data, kelompok: "INM" as const })))
      .onConflictDoNothing()
      .returning({ id: indikator.id, kode: indikator.kode });
    if (baru.length === 0) return;
    await tx.insert(target).values(
      baru.map(({ id, kode }) => ({
        indikatorId: id,
        nilai: INM.find((data) => data.kode === kode)!.target,
        berlakuMulai: keTanggal(TARGET_INM_BERLAKU_MULAI),
      })),
    );
  });
}

/** Semua Indikator, termasuk yang nonaktif. Semua peran boleh melihat. */
export async function daftarIndikator(aktor: Pengguna | null) {
  wajibPengguna(aktor);
  return db.select().from(indikator).orderBy(asc(indikator.kode));
}

/** Detail Indikator beserta riwayat Target-nya (urut bulan mulai berlaku). Semua peran boleh melihat. */
export async function ambilIndikator(aktor: Pengguna | null, id: string) {
  wajibPengguna(aktor);
  const [baris] = UUID.test(id) ? await db.select().from(indikator).where(eq(indikator.id, id)) : [];
  if (!baris) throw tidakDitemukan();
  const riwayat = await db
    .select({ nilai: target.nilai, berlakuMulai: target.berlakuMulai })
    .from(target)
    .where(eq(target.indikatorId, id))
    .orderBy(asc(target.berlakuMulai));
  return { ...baris, target: riwayat.map((t) => ({ ...t, berlakuMulai: dariTanggal(t.berlakuMulai) })) };
}

/** Mengubah field Indikator (kode dan kelompok tidak bisa diubah). Target diubah lewat riwayat Target. */
export async function ubahIndikator(aktor: Pengguna | null, id: string, isian: IsianIndikator) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const data = periksaIsian(isian);
  const [baris] = UUID.test(id)
    ? await db.update(indikator).set(data).where(eq(indikator.id, id)).returning({ id: indikator.id })
    : [];
  if (!baris) throw tidakDitemukan();
}

/** Menonaktifkan atau mengaktifkan kembali Indikator. Tidak ada hapus, supaya riwayatnya tetap ada. */
export async function aturAktifIndikator(aktor: Pengguna | null, id: string, aktif: boolean) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const [baris] = UUID.test(id)
    ? await db.update(indikator).set({ aktif }).where(eq(indikator.id, id)).returning({ id: indikator.id })
    : [];
  if (!baris) throw tidakDitemukan();
}

/** Menambah IMP-RS atau IMP-Unit beserta Target awalnya. Mengembalikan id Indikator baru. */
export async function tambahIndikator(aktor: Pengguna | null, baru: IndikatorBaru) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const kode = teks(baru.kode, "Kode", 32);
  if (baru.kelompok !== "IMP-RS" && baru.kelompok !== "IMP-Unit") {
    throw new ServiceError(400, "Pilih kelompok IMP-RS atau IMP-Unit. INM sudah tersedia sesuai PMK 30/2022.");
  }
  const data = periksaIsian(baru);
  const { nilai, berlakuMulai } = baru.target ?? {};
  if (typeof nilai !== "number" || !Number.isFinite(nilai) || nilai < 0) {
    throw new ServiceError(400, "Target harus berupa angka ≥ 0.");
  }
  if (typeof berlakuMulai !== "string" || !bulanValid(berlakuMulai)) {
    throw new ServiceError(400, "Pilih bulan mulai berlaku Target.");
  }
  try {
    return await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(indikator)
        .values({ ...data, kode, kelompok: baru.kelompok })
        .returning({ id: indikator.id });
      await tx.insert(target).values({ indikatorId: id, nilai, berlakuMulai: keTanggal(berlakuMulai) });
      return id;
    });
  } catch (error) {
    const pg = ((error as { cause?: unknown }).cause ?? error) as { code?: string };
    if (pg.code === "23505") throw new ServiceError(409, `Kode ${kode} sudah dipakai Indikator lain.`);
    throw error;
  }
}
