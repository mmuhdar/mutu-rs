/** Lima peran tetap MutuRS (tanpa tabel atau editor peran). Satu Pengguna punya tepat satu peran. */
export const PERAN = ["petugasInputData", "kepalaUnit", "komiteMutu", "direktur", "adminSistem"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  petugasInputData: "Petugas Input Data",
  kepalaUnit: "Kepala Unit",
  komiteMutu: "Komite Mutu",
  direktur: "Direktur",
  adminSistem: "Admin Sistem",
};

/** Peran yang bekerja untuk Unit tertentu (satu atau lebih Unit aktif); peran lain tidak punya Unit. */
export const PERAN_BER_UNIT: readonly Peran[] = ["petugasInputData", "kepalaUnit"];
