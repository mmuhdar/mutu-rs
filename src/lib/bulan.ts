import { config } from "./config";

/** Bulan berjalan ("YYYY-MM") menurut zona waktu konfigurasi, bukan zona waktu server. */
export function bulanBerjalan(sekarang = new Date()): string {
  const bagian = new Intl.DateTimeFormat("en", { timeZone: config.zonaWaktu, year: "numeric", month: "2-digit" })
    .formatToParts(sekarang);
  const ambil = (jenis: string) => bagian.find((b) => b.type === jenis)!.value;
  return `${ambil("year")}-${ambil("month")}`;
}

/** Benar bila teks berbentuk bulan "YYYY-MM". */
export const bulanValid = (bulan: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan);

/** Kolom bulan di database = tanggal 1 bulan itu: "2026-10" ↔ "2026-10-01". */
export const keTanggal = (bulan: string) => `${bulan}-01`;
export const dariTanggal = (tanggal: string) => tanggal.slice(0, 7);
