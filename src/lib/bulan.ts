import { config } from "./config";

/** Bulan berjalan ("YYYY-MM") menurut zona waktu konfigurasi, bukan zona waktu server. */
export function bulanBerjalan(sekarang = new Date()): string {
  const bagian = new Intl.DateTimeFormat("en", { timeZone: config.zonaWaktu, year: "numeric", month: "2-digit" })
    .formatToParts(sekarang);
  const ambil = (jenis: string) => bagian.find((b) => b.type === jenis)!.value;
  return `${ambil("year")}-${ambil("month")}`;
}

/** Bulan sebelum bulan berjalan ("YYYY-MM"): bulan bawaan daftar isian dan Dashboard. */
export const bulanLalu = (sekarang = new Date()) => geserBulan(bulanBerjalan(sekarang), -1);

/** Bulan "YYYY-MM" digeser sejumlah bulan (negatif = mundur): geserBulan("2026-01", -1) = "2025-12". */
export function geserBulan(bulan: string, jumlah: number) {
  const [tahun, b] = bulan.split("-").map(Number);
  const urutan = tahun * 12 + b - 1 + jumlah;
  return `${Math.floor(urutan / 12)}-${String((urutan % 12) + 1).padStart(2, "0")}`;
}

/** Benar bila teks berbentuk bulan "YYYY-MM". */
export const bulanValid = (bulan: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan);

/** Kolom bulan di database = tanggal 1 bulan itu: "2026-10" ↔ "2026-10-01". */
export const keTanggal = (bulan: string) => `${bulan}-01`;
export const dariTanggal = (tanggal: string) => tanggal.slice(0, 7);

/** Periode bulan (keduanya termasuk): "Maret 2026 – Juni 2026", atau "mulai Maret 2026" bila belum berhenti. */
export const labelPeriode = (mulai: string, berhenti: string | null) =>
  berhenti ? `${labelBulan(mulai)} – ${labelBulan(berhenti)}` : `mulai ${labelBulan(mulai)}`;

/** "2026-10" → "Oktober 2026". */
export const labelBulan = (bulan: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${keTanggal(bulan)}T00:00:00Z`),
  );

/** "2026-10" → "Okt 2026", untuk tabel dan grafik yang sempit. */
export const labelBulanPendek = (bulan: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${keTanggal(bulan)}T00:00:00Z`),
  );
