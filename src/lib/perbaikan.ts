/* Konstanta dan aturan murni modul Perbaikan (Analisis, Tindak Lanjut, PDSA); service di `src/modules/perbaikan`. */

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
