import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, gt, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { pengguna, sesi } from "@/db/schema";
import { ServiceError } from "@/lib/errors";
import type { Peran } from "@/lib/peran";

/** Pengguna yang sedang bertindak; diteruskan ke setiap fungsi service. */
export type Pengguna = { id: string; username: string; nama: string; peran: Peran; sesiId: string };

/** Sesi berlaku 12 jam dan diperpanjang otomatis selama masih dipakai. */
const SESI_MS = 12 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const hashSandi = (sandi: string) => bcrypt.hash(sandi, 10);

/**
 * Data awal: Admin Sistem dari konfigurasi, hanya bila username itu belum ada.
 * Restart tidak pernah menimpa sandi yang sudah diganti.
 */
export async function buatAdminAwal(admin: { username: string; sandi: string }) {
  await db
    .insert(pengguna)
    .values({
      username: admin.username.trim(),
      nama: "Admin Sistem",
      peran: "adminSistem",
      hashSandi: await hashSandi(admin.sandi),
    })
    .onConflictDoNothing();
}

/*
 * Pembatasan percobaan masuk (pola sistem-radiologi-digital), di memori proses.
 * Dua lapis: per (IP + username) dan per username saja, supaya mengganti header IP
 * tidak bisa dipakai untuk menebak sandi satu akun tanpa batas.
 */
const JENDELA_MS = 10 * 60 * 1000;
const BATAS = { ipUsername: 8, username: 20 } as const;
// ponytail: per proses dan hilang saat restart; pindah ke tabel bila aplikasi dijalankan lebih dari satu instance.
const percobaanGagal = new Map<string, { jumlah: number; pertama: number }>();

function jumlahGagal(kunci: string, sekarang: number) {
  const catatan = percobaanGagal.get(kunci);
  if (!catatan || sekarang - catatan.pertama > JENDELA_MS) return 0;
  return catatan.jumlah;
}

function catatGagal(kunci: string, sekarang: number) {
  const catatan = percobaanGagal.get(kunci);
  if (!catatan || sekarang - catatan.pertama > JENDELA_MS) percobaanGagal.set(kunci, { jumlah: 1, pertama: sekarang });
  else catatan.jumlah += 1;
  if (percobaanGagal.size > 5000) {
    for (const [k, v] of percobaanGagal) if (sekarang - v.pertama > JENDELA_MS) percobaanGagal.delete(k);
  }
}

// Hash tiruan: username yang tidak ada tetap menjalankan bcrypt, sehingga waktu respons tidak membocorkannya.
let hashTiruan: Promise<string> | undefined;

/** Memeriksa username dan sandi lalu membuat sesi. Mengembalikan token untuk cookie sesi. */
export async function masuk(input: { username: string; sandi: string; ip: string }, sekarang = new Date()) {
  const username = input.username.trim().toLowerCase();
  if (!username || !input.sandi) throw new ServiceError(400, "Username dan sandi wajib diisi.");
  const kunci = [`ip:${input.ip}|${username}`, `username:${username}`];
  const waktu = sekarang.getTime();
  if (jumlahGagal(kunci[0], waktu) >= BATAS.ipUsername || jumlahGagal(kunci[1], waktu) >= BATAS.username) {
    throw new ServiceError(429, "Terlalu banyak percobaan masuk yang gagal. Coba lagi dalam 10 menit.");
  }

  const [akun] = await db
    .select({ id: pengguna.id, hashSandi: pengguna.hashSandi, aktif: pengguna.aktif })
    .from(pengguna)
    .where(eq(sql`lower(${pengguna.username})`, username))
    .limit(1);
  const sandiBenar = await bcrypt.compare(input.sandi, akun?.hashSandi ?? (await (hashTiruan ??= hashSandi("tiruan"))));
  if (!akun || !sandiBenar) {
    kunci.forEach((k) => catatGagal(k, waktu));
    // Pesan sama untuk username yang tidak ada dan sandi salah.
    throw new ServiceError(401, "Username atau sandi salah.");
  }
  // Hanya diberitahukan setelah sandi terbukti benar.
  if (!akun.aktif) throw new ServiceError(403, "Akun Anda nonaktif. Hubungi Admin Sistem.");
  kunci.forEach((k) => percobaanGagal.delete(k));

  const token = randomBytes(32).toString("base64url");
  await db.insert(sesi).values({
    penggunaId: akun.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(waktu + SESI_MS),
  });
  // Bersihkan sesi kedaluwarsa milik Pengguna ini sambil lalu.
  await db.delete(sesi).where(and(eq(sesi.penggunaId, akun.id), lt(sesi.expiresAt, sekarang)));
  return token;
}

/**
 * Pengguna aktif pemilik token sesi yang masih berlaku, atau null. Peran dibaca ulang setiap kali,
 * jadi perubahan peran atau nonaktif langsung berlaku pada permintaan berikutnya.
 */
export async function penggunaDariToken(token: string, sekarang = new Date()): Promise<Pengguna | null> {
  const [baris] = await db
    .select({
      id: pengguna.id,
      username: pengguna.username,
      nama: pengguna.nama,
      peran: pengguna.peran,
      sesiId: sesi.id,
      expiresAt: sesi.expiresAt,
    })
    .from(sesi)
    .innerJoin(pengguna, eq(pengguna.id, sesi.penggunaId))
    .where(and(eq(sesi.tokenHash, hashToken(token)), gt(sesi.expiresAt, sekarang), eq(pengguna.aktif, true)))
    .limit(1);
  if (!baris) return null;

  const { expiresAt, ...penggunaAktif } = baris;
  // Perpanjang sesi yang masih dipakai bila sisa masa berlakunya kurang dari separuh.
  if (expiresAt.getTime() - sekarang.getTime() < SESI_MS / 2) {
    await db
      .update(sesi)
      .set({ expiresAt: new Date(sekarang.getTime() + SESI_MS) })
      .where(eq(sesi.id, baris.sesiId));
  }
  return penggunaAktif;
}

/** Penjaga di awal setiap fungsi service: pemanggilan tanpa Pengguna ditolak. */
export function wajibPengguna(aktor: Pengguna | null | undefined): asserts aktor is Pengguna {
  if (!aktor) throw new ServiceError(401, "Sesi Anda telah berakhir. Silakan masuk kembali.");
}

/** Keluar: mengakhiri sesi yang sedang dipakai Pengguna. */
export async function keluar(aktor: Pengguna | null) {
  wajibPengguna(aktor);
  await db.delete(sesi).where(eq(sesi.id, aktor.sesiId));
}
