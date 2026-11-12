import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { indikator, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan } from "@/lib/bulan";
import { kodePg, ServiceError } from "@/lib/errors";
import { apakahUuid } from "@/lib/uuid";
import { type Pengguna, wajibPengguna, wajibPeran } from "@/modules/auth/service";
import { bersinggungan } from "@/modules/indikator/service";
import { catatJejak } from "@/modules/jejak/catat";

const HANYA_ADMIN = "Hanya Admin Sistem yang boleh mengelola Unit.";

const kolom = { id: unit.id, nama: unit.nama, aktif: unit.aktif };

function rapikanNama(nama: string) {
  const rapi = nama.trim();
  if (!rapi) throw new ServiceError(400, "Nama Unit wajib diisi.");
  if (rapi.length > 80) throw new ServiceError(400, "Nama Unit maksimal 80 karakter.");
  return rapi;
}

/** Menjalankan penyimpanan nama; pelanggaran indeks unik `lower(nama)` menjadi pesan duplikat. */
async function simpanNama<T>(nama: string, simpan: () => Promise<T>) {
  try {
    return await simpan();
  } catch (error) {
    if (kodePg(error) === "23505") throw new ServiceError(409, `Unit "${nama}" sudah ada.`);
    throw error;
  }
}

async function ubahUnit(id: string, data: Partial<typeof unit.$inferInsert>) {
  const [hasil] = apakahUuid(id)
    ? await db.update(unit).set(data).where(eq(unit.id, id)).returning(kolom)
    : [];
  if (!hasil) throw new ServiceError(404, "Unit tidak ditemukan.");
  return hasil;
}

/** Daftar kelola: semua Unit beserta statusnya. */
export async function daftarUnit(aktor: Pengguna | null) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  return db.select(kolom).from(unit).orderBy(asc(unit.nama));
}

/** Pilihan Unit di formulir lain: hanya Unit aktif, boleh dibaca semua Pengguna. */
export async function pilihanUnit(aktor: Pengguna | null) {
  wajibPengguna(aktor);
  return db.select({ id: unit.id, nama: unit.nama }).from(unit).where(eq(unit.aktif, true)).orderBy(asc(unit.nama));
}

export async function tambahUnit(aktor: Pengguna | null, input: { nama: string }) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const nama = rapikanNama(input.nama);
  const [baru] = await simpanNama(nama, () => db.insert(unit).values({ nama }).returning(kolom));
  await catatJejak(db, aktor, "unit", baru.id, `Menambah Unit ${nama}`);
  return baru;
}

export async function gantiNamaUnit(aktor: Pengguna | null, id: string, input: { nama: string }) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const nama = rapikanNama(input.nama);
  const hasil = await simpanNama(nama, () => ubahUnit(id, { nama }));
  await catatJejak(db, aktor, "unit", hasil.id, `Mengganti nama Unit menjadi ${nama}`);
  return hasil;
}

/**
 * Menonaktifkan (aktif = false) atau mengaktifkan kembali Unit. Tidak ada hapus: riwayat datanya tetap ada. Unit yang
 * masih menjadi Unit Pelapor pada bulan berjalan atau sesudahnya tidak bisa dinonaktifkan, karena isian dan pemantauan
 * mengabaikan Unit nonaktif sehingga Kelengkapan-nya tidak akan pernah lengkap. Baris Unit dikunci `for update`, jadi
 * penambahan Unit Pelapor (menguncinya `for share`) diperiksa bergiliran.
 */
export async function aturAktifUnit(aktor: Pengguna | null, id: string, aktif: boolean, sekarang = new Date()) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  return db.transaction(async (tx) => {
    const [u] = apakahUuid(id) ? await tx.select(kolom).from(unit).where(eq(unit.id, id)).for("update") : [];
    if (!u) throw new ServiceError(404, "Unit tidak ditemukan.");
    if (!aktif) {
      const masihMelapor = await tx
        .selectDistinct({ kode: indikator.kode })
        .from(unitPelapor)
        .innerJoin(indikator, eq(indikator.id, unitPelapor.indikatorId))
        .where(and(eq(unitPelapor.unitId, id), bersinggungan(bulanBerjalan(sekarang), null)))
        .orderBy(asc(indikator.kode));
      if (masihMelapor.length > 0) {
        throw new ServiceError(
          409,
          `Unit ${u.nama} masih menjadi Unit Pelapor ${masihMelapor.map((i) => i.kode).join(", ")} pada bulan berjalan atau sesudahnya. Akhiri dulu periode Unit Pelapor itu di halaman Indikator, lalu nonaktifkan Unit ini.`,
        );
      }
    }
    const [hasil] = await tx.update(unit).set({ aktif }).where(eq(unit.id, id)).returning(kolom);
    await catatJejak(tx, aktor, "unit", id, `${aktif ? "Mengaktifkan" : "Menonaktifkan"} Unit ${u.nama}`);
    return hasil;
  });
}
