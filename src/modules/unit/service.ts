import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { unit } from "@/db/schema";
import { ServiceError } from "@/lib/errors";
import { type Pengguna, wajibPengguna, wajibPeran } from "@/modules/auth/service";

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
    const pg = ((error as { cause?: unknown }).cause ?? error) as { code?: string };
    if (pg.code === "23505") throw new ServiceError(409, `Unit "${nama}" sudah ada.`);
    throw error;
  }
}

/** Mengubah satu Unit; id yang bukan uuid (mis. dari form yang diutak-atik) dianggap tidak ada, bukan error 500. */
async function ubahUnit(id: string, data: Partial<typeof unit.$inferInsert>) {
  const [hasil] = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
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
  return baru;
}

export async function gantiNamaUnit(aktor: Pengguna | null, id: string, input: { nama: string }) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const nama = rapikanNama(input.nama);
  return simpanNama(nama, () => ubahUnit(id, { nama }));
}

/** Menonaktifkan (aktif = false) atau mengaktifkan kembali Unit. Tidak ada hapus: riwayat datanya tetap ada. */
export async function aturAktifUnit(aktor: Pengguna | null, id: string, aktif: boolean) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  return ubahUnit(id, { aktif });
}
