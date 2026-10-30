/** Status Pengukuran. Pengukuran yang belum pernah disimpan tidak punya status ("Belum diisi" di tampilan). */
export const STATUS_PENGUKURAN = ["draf", "diajukan", "terverifikasi"] as const;
export type StatusPengukuran = (typeof STATUS_PENGUKURAN)[number];
export const LABEL_STATUS_PENGUKURAN: Record<StatusPengukuran, string> = {
  draf: "Draf",
  diajukan: "Diajukan",
  terverifikasi: "Terverifikasi",
};

/** Capaian = N/D × faktor; kosong (null) bila D = 0. */
export const hitungCapaian = (n: number, d: number, faktor: number) => (d === 0 ? null : (n / d) * faktor);

/** "90,5 %"; null (D = 0) = "kosong". */
export const formatCapaian = (capaian: number | null, satuan: string) =>
  capaian === null ? "kosong" : `${capaian.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${satuan}`;
