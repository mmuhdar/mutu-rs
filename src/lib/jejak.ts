/* Konstanta Jejak Audit: jenis data yang perubahannya dicatat (service di `src/modules/jejak`). */

export const LABEL_ENTITAS_JEJAK = {
  sesi: "Sesi",
  pengguna: "Pengguna",
  unit: "Unit",
  indikator: "Indikator",
  pengukuran: "Pengukuran",
  perbaikan: "Analisis, Tindak Lanjut, PDSA",
  laporan: "Laporan Triwulan",
  validasi: "Validasi Data",
  insiden: "Insiden",
  risiko: "Register Risiko",
} as const;
export type EntitasJejak = keyof typeof LABEL_ENTITAS_JEJAK;
export const ENTITAS_JEJAK = Object.keys(LABEL_ENTITAS_JEJAK) as EntitasJejak[];
