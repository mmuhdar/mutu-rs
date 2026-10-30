/** Status Pengukuran. Pengukuran yang belum pernah disimpan tidak punya status ("Belum diisi" di tampilan). */
export const STATUS_PENGUKURAN = ["draf", "diajukan", "terverifikasi"] as const;
export type StatusPengukuran = (typeof STATUS_PENGUKURAN)[number];
export const LABEL_STATUS_PENGUKURAN: Record<StatusPengukuran, string> = {
  draf: "Draf",
  diajukan: "Diajukan",
  terverifikasi: "Terverifikasi",
};
