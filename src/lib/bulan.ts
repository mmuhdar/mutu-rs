import { config } from "./config";

/** Bulan berjalan ("YYYY-MM") menurut zona waktu konfigurasi, bukan zona waktu server. */
export function bulanBerjalan(sekarang = new Date()): string {
  const bagian = new Intl.DateTimeFormat("en", { timeZone: config.zonaWaktu, year: "numeric", month: "2-digit" })
    .formatToParts(sekarang);
  const ambil = (jenis: string) => bagian.find((b) => b.type === jenis)!.value;
  return `${ambil("year")}-${ambil("month")}`;
}
