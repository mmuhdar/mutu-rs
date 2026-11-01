import type { Kelompok } from "./indikator";

/* Konstanta dan aturan murni modul Perbaikan (Analisis, Tindak Lanjut, PDSA); service di `src/modules/perbaikan`. */

/** IMP-Unit hanya punya Lingkup Unit Pelapor-nya; INM dan IMP-RS juga punya Lingkup RS. */
export const punyaLingkupRs = (kelompok: Kelompok) => kelompok !== "IMP-Unit";

/** Nama Lingkup untuk tampilan: "Lingkup RS", atau "Unit ICU" (+ "(nonaktif)" bila Unit itu kini nonaktif). */
export const labelLingkup = (unit: { nama: string; aktif?: boolean } | null) =>
  unit ? `Unit ${unit.nama}${unit.aktif === false ? " (nonaktif)" : ""}` : "Lingkup RS";

/** Status Tindak Lanjut. */
export const STATUS_TINDAK_LANJUT = ["direncanakan", "berjalan", "selesai", "dibatalkan"] as const;
export type StatusTindakLanjut = (typeof STATUS_TINDAK_LANJUT)[number];
export const LABEL_STATUS_TINDAK_LANJUT: Record<StatusTindakLanjut, string> = {
  direncanakan: "Direncanakan",
  berjalan: "Berjalan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};
/** Status Tindak Lanjut yang masih terbuka (bawaan daftar Tindak Lanjut). */
export const STATUS_TERBUKA: readonly StatusTindakLanjut[] = ["direncanakan", "berjalan"];

/** Lewat tenggat: tenggat ("YYYY-MM-DD") sebelum hari ini dan status masih terbuka. Dihitung, bukan status. */
export const lewatTenggat = (tl: { status: StatusTindakLanjut; tenggat: string }, hariIni: string) =>
  STATUS_TERBUKA.includes(tl.status) && tl.tenggat < hariIni;

/** Tahap aktif PDSA, berurutan; PDSA yang baru dibuat (Plan sudah diisi) langsung berada di tahap Do. */
export const TAHAP_PDSA = ["plan", "do", "study", "act", "selesai"] as const;
export type TahapPdsa = (typeof TAHAP_PDSA)[number];
/** Tahap yang punya isian (semua kecuali Selesai). */
export type TahapIsianPdsa = Exclude<TahapPdsa, "selesai">;
export const LABEL_TAHAP_PDSA: Record<TahapPdsa, string> = {
  plan: "Plan",
  do: "Do",
  study: "Study",
  act: "Act",
  selesai: "Selesai",
};
/** Tahap sesudah `tahap` (Act → Selesai). */
export const tahapBerikutnya = (tahap: TahapIsianPdsa): TahapPdsa => TAHAP_PDSA[TAHAP_PDSA.indexOf(tahap) + 1];
/** Benar bila `tahap` sudah dicapai PDSA yang tahap aktifnya `aktif`, jadi isiannya boleh diisi atau diperbaiki. */
export const sudahDicapai = (tahap: TahapPdsa, aktif: TahapPdsa) => TAHAP_PDSA.indexOf(tahap) <= TAHAP_PDSA.indexOf(aktif);

/** Keputusan tahap Act. */
export const KEPUTUSAN_PDSA = ["adopsi", "adaptasi", "tinggalkan"] as const;
export type KeputusanPdsa = (typeof KEPUTUSAN_PDSA)[number];
export const LABEL_KEPUTUSAN_PDSA: Record<KeputusanPdsa, string> = {
  adopsi: "Adopsi",
  adaptasi: "Adaptasi",
  tinggalkan: "Tinggalkan",
};
