/**
 * Konfigurasi instalasi, dibaca dari environment saat server berjalan (penjelasan di `.env.example`).
 * Halaman yang menampilkannya harus dirender per request (`await connection()`), supaya nilainya
 * tidak terbekukan saat `next build`.
 */
export const config = {
  namaRs: process.env.NAMA_RS?.trim() || "Rumah Sakit",
  zonaWaktu: process.env.APP_TIMEZONE?.trim() || "Asia/Makassar",
  /** Admin Sistem awal, dibuat saat start hanya bila username-nya belum ada. */
  adminAwal: { username: process.env.ADMIN_USERNAME?.trim() || "admin", sandi: process.env.ADMIN_PASSWORD ?? "" },
};
