import { config } from "./config";
import { ServiceError } from "./errors";

/** Tanggal hari ini ("YYYY-MM-DD") menurut zona waktu konfigurasi, bukan zona waktu server. */
export function hariIni(sekarang = new Date()): string {
  const bagian = new Intl.DateTimeFormat("en", {
    timeZone: config.zonaWaktu,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(sekarang);
  const ambil = (jenis: string) => bagian.find((b) => b.type === jenis)!.value;
  return `${ambil("year")}-${ambil("month")}-${ambil("day")}`;
}

/** Salam menurut jam di zona waktu konfigurasi: pagi 04.00–10.59, siang 11.00–14.59, sore 15.00–17.59, lalu malam. */
export function salam(sekarang = new Date()) {
  const jam = Number(new Intl.DateTimeFormat("en-GB", { timeZone: config.zonaWaktu, hour: "2-digit", hourCycle: "h23" }).format(sekarang));
  return jam >= 4 && jam < 11 ? "Selamat pagi" : jam >= 11 && jam < 15 ? "Selamat siang" : jam >= 15 && jam < 18 ? "Selamat sore" : "Selamat malam";
}

/** Bulan berjalan ("YYYY-MM") menurut zona waktu konfigurasi, bukan zona waktu server. */
export const bulanBerjalan = (sekarang = new Date()) => hariIni(sekarang).slice(0, 7);

/** Benar bila teks adalah tanggal "YYYY-MM-DD" yang ada di kalender (2026-02-30 tidak). */
export function tanggalValid(tanggal: string) {
  const waktu = Date.parse(`${tanggal}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(tanggal) && !Number.isNaN(waktu) && new Date(waktu).toISOString().startsWith(tanggal);
}

/** Tanggal "YYYY-MM-DD" digeser sejumlah hari (negatif = mundur): tambahHari("2026-12-28", 7) = "2027-01-04". */
export const tambahHari = (tanggal: string, jumlah: number) =>
  new Date(Date.parse(`${tanggal}T00:00:00Z`) + jumlah * 86_400_000).toISOString().slice(0, 10);

/** Tanggal "YYYY-MM-DD" untuk tampilan: "5 Nov 2026". */
export const labelTanggal = (tanggal: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${tanggal}T00:00:00Z`),
  );

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

/** Penjaga di service: bulan dari isian harus berbentuk "YYYY-MM"; selain itu ditolak 400 dengan `pesan`. */
export function wajibBulan(bulan: unknown, pesan = "Bulan tidak valid."): asserts bulan is string {
  if (typeof bulan !== "string" || !bulanValid(bulan)) throw new ServiceError(400, pesan);
}

/** Penjaga di service: bulan "YYYY-MM" yang valid dan tidak setelah bulan berjalan; selain itu ditolak 400. */
export function wajibBulanBerjalan(bulan: unknown, sekarang: Date): asserts bulan is string {
  wajibBulan(bulan);
  if (bulan > bulanBerjalan(sekarang)) throw new ServiceError(400, `${labelBulan(bulan)} belum berjalan.`);
}

/**
 * Bulan dari alamat halaman (`?bulan=`) di halaman yang hanya menampilkan bulan yang sudah berjalan (Dashboard,
 * Monitoring, Status Pengukuran). Kosong = tanpa `bulan` (halaman memakai bulan bawaannya). Tidak valid atau setelah
 * bulan berjalan juga tanpa `bulan`, disertai pemberitahuan singkat untuk ditampilkan di halaman.
 */
export function bulanDariAlamat(
  nilai: string | string[] | undefined,
  sekarang = new Date(),
): { bulan?: string; pemberitahuan?: string } {
  if (!nilai) return {};
  if (typeof nilai !== "string" || !bulanValid(nilai)) {
    return { pemberitahuan: "Bulan pada alamat tidak valid, jadi yang ditampilkan bulan bawaan." };
  }
  if (nilai > bulanBerjalan(sekarang)) {
    return { pemberitahuan: `${labelBulan(nilai)} belum berjalan, jadi yang ditampilkan bulan bawaan.` };
  }
  return { bulan: nilai };
}

/**
 * Atribut `<input>` bulan. Browser tanpa pemilih bulan (mis. Firefox desktop) menampilkan kotak teks biasa, jadi diberi
 * contoh dan pola "YYYY-MM"; browser dengan pemilih bulan mengabaikannya.
 */
export const INPUT_BULAN = {
  type: "month",
  placeholder: "YYYY-MM",
  pattern: "\\d{4}-(0[1-9]|1[0-2])",
  title: "Bulan dengan format YYYY-MM, mis. 2026-10",
} as const;

/** Benar bila teks berbentuk Triwulan "YYYY-T" (T = 1–4): "2026-3" = Juli–September 2026. */
export const triwulanValid = (triwulan: string) => /^\d{4}-[1-4]$/.test(triwulan);

/** Tiga bulan "YYYY-MM" sebuah Triwulan: "2026-3" → ["2026-07", "2026-08", "2026-09"]. */
export function bulanTriwulan(triwulan: string) {
  const [tahun, t] = triwulan.split("-");
  return [0, 1, 2].map((i) => geserBulan(`${tahun}-01`, (Number(t) - 1) * 3 + i));
}

/** Triwulan sebuah bulan "YYYY-MM": "2026-08" → "2026-3". */
export const triwulanDari = (bulan: string) => `${bulan.slice(0, 4)}-${Math.ceil(Number(bulan.slice(5, 7)) / 3)}`;

/** Triwulan terakhir yang sudah selesai menurut zona waktu konfigurasi: bawaan Laporan Triwulan. */
export const triwulanLalu = (sekarang = new Date()) =>
  triwulanDari(geserBulan(bulanTriwulan(triwulanDari(bulanBerjalan(sekarang)))[0], -1));

/** Nama Triwulan untuk tampilan: "2026-3" → "Triwulan III 2026". */
export const labelTriwulan = (triwulan: string) =>
  `Triwulan ${["I", "II", "III", "IV"][Number(triwulan.slice(5)) - 1]} ${triwulan.slice(0, 4)}`;

/** Penjaga di service: Triwulan "YYYY-T" yang valid dan sudah selesai (bulan terakhirnya sebelum bulan berjalan). */
export function wajibTriwulanSelesai(triwulan: unknown, sekarang: Date): asserts triwulan is string {
  if (typeof triwulan !== "string" || !triwulanValid(triwulan)) throw new ServiceError(400, "Triwulan tidak valid.");
  if (bulanTriwulan(triwulan)[2] >= bulanBerjalan(sekarang)) {
    throw new ServiceError(400, `${labelTriwulan(triwulan)} belum selesai.`);
  }
}

/** Kolom bulan di database = tanggal 1 bulan itu: "2026-10" ↔ "2026-10-01". */
export const keTanggal = (bulan: string) => `${bulan}-01`;
export const dariTanggal = (tanggal: string) => tanggal.slice(0, 7);

/** Periode bulan (keduanya termasuk): "Maret 2026 – Juni 2026", atau "mulai Maret 2026" bila belum berhenti. */
export const labelPeriode = (mulai: string, berhenti: string | null) =>
  berhenti ? `${labelBulan(mulai)} – ${labelBulan(berhenti)}` : `mulai ${labelBulan(mulai)}`;

/**
 * Nama bulan "YYYY-MM" untuk tampilan: "2026-10" → "Oktober 2026"; `pendek` → "Okt 2026" (tabel dan grafik yang
 * sempit); `tahun: false` → tanpa tahun ("Okt", label sumbu grafik).
 */
export const labelBulan = (bulan: string, { pendek = false, tahun = true } = {}) =>
  new Intl.DateTimeFormat("id-ID", {
    month: pendek ? "short" : "long",
    year: tahun ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(`${keTanggal(bulan)}T00:00:00Z`));
