/** Status Pengukuran. Pengukuran yang belum pernah disimpan tidak punya status ("Belum diisi" di tampilan). */
export const STATUS_PENGUKURAN = ["draf", "diajukan", "terverifikasi"] as const;
export type StatusPengukuran = (typeof STATUS_PENGUKURAN)[number];
export const LABEL_STATUS_PENGUKURAN: Record<StatusPengukuran, string> = {
  draf: "Draf",
  diajukan: "Diajukan",
  terverifikasi: "Terverifikasi",
};

/**
 * Perpindahan status Pengukuran: status asal, tujuan, dan kata kerjanya untuk pesan penolakan. `ajukan` oleh pengisi;
 * kunci lainnya = aksi Verifikasi Kepala Unit (nilai tombol `aksi` di form Verifikasi).
 */
export const PERPINDAHAN = {
  ajukan: { dari: "draf", ke: "diajukan", kata: "diajukan" },
  verifikasi: { dari: "diajukan", ke: "terverifikasi", kata: "diverifikasi" },
  kembalikan: { dari: "diajukan", ke: "draf", kata: "dikembalikan" },
  bukaKembali: { dari: "terverifikasi", ke: "diajukan", kata: "dibuka kembali" },
} as const satisfies Record<string, { dari: StatusPengukuran; ke: StatusPengukuran; kata: string }>;

export type AksiVerifikasi = Exclude<keyof typeof PERPINDAHAN, "ajukan">;
/** Benar bila `aksi` (mis. dari form) adalah aksi Verifikasi Kepala Unit. */
export const aksiVerifikasi = (aksi: string): aksi is AksiVerifikasi => aksi !== "ajukan" && Object.hasOwn(PERPINDAHAN, aksi);
