import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { pengguna, penggunaUnit, sesi, unit } from "@/db/schema";
import { kodePg, ServiceError } from "@/lib/errors";
import { LABEL_PERAN, PERAN, PERAN_BER_UNIT } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { hashSandiBaru, type Pengguna, wajibPeran } from "@/modules/auth/service";

const HANYA_ADMIN = "Hanya Admin Sistem yang boleh mengelola Pengguna.";

/** Isian yang bisa diubah Admin Sistem. `peran` berupa teks dari form, diperiksa di sini. */
type DataPengguna = { nama: string; peran: string; unitIds: string[] };

/** Memeriksa nama, peran, dan Unit, lalu mengembalikan nilai yang siap disimpan. */
async function periksa(input: DataPengguna) {
  const nama = input.nama.trim();
  if (!nama) throw new ServiceError(400, "Nama wajib diisi.");
  if (nama.length > 120) throw new ServiceError(400, "Nama maksimal 120 karakter.");
  const peran = PERAN.find((p) => p === input.peran);
  if (!peran) throw new ServiceError(400, "Pilih salah satu peran.");
  // Peran lain tidak punya Unit: Unit yang ikut terkirim (mis. sisa centang di form) dibuang.
  if (!PERAN_BER_UNIT.includes(peran)) return { nama, peran, unitIds: [] };

  const unitIds = [...new Set(input.unitIds)];
  if (unitIds.length === 0) throw new ServiceError(400, `${LABEL_PERAN[peran]} wajib terkait ke minimal satu Unit.`);
  const unitAktif = unitIds.every(apakahUuid)
    ? await db
        .select({ id: unit.id })
        .from(unit)
        .where(and(inArray(unit.id, unitIds), eq(unit.aktif, true)))
    : [];
  if (unitAktif.length !== unitIds.length) throw new ServiceError(400, "Pilih hanya Unit yang aktif.");
  return { nama, peran, unitIds };
}

/** Daftar kelola: semua Pengguna beserta status dan Unit-nya. */
export async function daftarPengguna(aktor: Pengguna | null) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const daftar = await db
    .select({
      id: pengguna.id,
      username: pengguna.username,
      nama: pengguna.nama,
      peran: pengguna.peran,
      aktif: pengguna.aktif,
    })
    .from(pengguna)
    .orderBy(asc(pengguna.nama), asc(pengguna.username));
  const terkait = await db
    .select({ penggunaId: penggunaUnit.penggunaId, id: unit.id, nama: unit.nama, aktif: unit.aktif })
    .from(penggunaUnit)
    .innerJoin(unit, eq(unit.id, penggunaUnit.unitId))
    .orderBy(asc(unit.nama));
  return daftar.map((p) => ({
    ...p,
    unit: terkait.filter((u) => u.penggunaId === p.id).map(({ id, nama, aktif }) => ({ id, nama, aktif })),
  }));
}

export async function tambahPengguna(
  aktor: Pengguna | null,
  input: DataPengguna & { username: string; sandi: string },
) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const username = input.username.trim();
  if (!/^\S{1,64}$/.test(username)) {
    throw new ServiceError(400, "Username wajib diisi, tanpa spasi, maksimal 64 karakter.");
  }
  const { unitIds, ...data } = await periksa(input);
  const hashSandi = await hashSandiBaru(input.sandi);
  try {
    return await db.transaction(async (tx) => {
      const [baru] = await tx
        .insert(pengguna)
        .values({ ...data, username, hashSandi })
        .returning({ id: pengguna.id });
      if (unitIds.length) await tx.insert(penggunaUnit).values(unitIds.map((unitId) => ({ penggunaId: baru.id, unitId })));
      return baru;
    });
  } catch (error) {
    // Indeks unik lower(username): "Sari" dan "sari" dianggap sama.
    if (kodePg(error) === "23505") throw new ServiceError(409, `Username "${username}" sudah dipakai.`);
    throw error;
  }
}

/**
 * Menyimpan perubahan satu Pengguna; `unitIds` (bila ada) menggantikan seluruh Unit-nya.
 * Admin Sistem aktif yang terakhir tidak boleh dinonaktifkan atau diganti perannya, supaya tidak ada yang terkunci di luar aplikasi.
 */
async function simpan(id: string, ubah: Partial<typeof pengguna.$inferInsert>, unitIds?: string[]) {
  if (!apakahUuid(id)) throw new ServiceError(404, "Pengguna tidak ditemukan.");
  await db.transaction(async (tx) => {
    if (ubah.aktif === false || (ubah.peran && ubah.peran !== "adminSistem")) {
      // FOR UPDATE: dua Admin yang saling menonaktifkan bersamaan diproses bergiliran, jadi yang kedua melihat hasil yang pertama.
      const adminAktif = await tx
        .select({ id: pengguna.id })
        .from(pengguna)
        .where(and(eq(pengguna.peran, "adminSistem"), eq(pengguna.aktif, true)))
        .for("update");
      if (adminAktif.length === 1 && adminAktif[0].id === id) {
        throw new ServiceError(
          409,
          "Admin Sistem aktif yang terakhir tidak bisa dinonaktifkan atau diganti perannya. Tambahkan Admin Sistem lain lebih dulu.",
        );
      }
    }
    const [hasil] = await tx.update(pengguna).set(ubah).where(eq(pengguna.id, id)).returning({ id: pengguna.id });
    if (!hasil) throw new ServiceError(404, "Pengguna tidak ditemukan.");
    if (!unitIds) return;
    await tx.delete(penggunaUnit).where(eq(penggunaUnit.penggunaId, id));
    if (unitIds.length) await tx.insert(penggunaUnit).values(unitIds.map((unitId) => ({ penggunaId: id, unitId })));
  });
}

/** Mengubah nama, peran, dan Unit. Username tidak bisa diubah. */
export async function ubahPengguna(aktor: Pengguna | null, id: string, input: DataPengguna) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  const { unitIds, ...data } = await periksa(input);
  await simpan(id, data, unitIds);
}

/**
 * Menonaktifkan (Pengguna tidak bisa masuk, sesinya ditolak pada permintaan berikutnya) atau mengaktifkan kembali.
 * Tidak ada hapus: jejak siapa yang mengisi dan memverifikasi Pengukuran tetap ada.
 */
export async function aturAktifPengguna(aktor: Pengguna | null, id: string, aktif: boolean) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  await simpan(id, { aktif });
}

/** Sandi sementara untuk Pengguna yang lupa sandi. Sesi Pengguna itu diakhiri (kecuali sesi Admin yang mereset). */
export async function resetSandi(aktor: Pengguna | null, id: string, sandi: string) {
  wajibPeran(aktor, ["adminSistem"], HANYA_ADMIN);
  await simpan(id, { hashSandi: await hashSandiBaru(sandi) });
  await db.delete(sesi).where(and(eq(sesi.penggunaId, id), ne(sesi.id, aktor.sesiId)));
}
