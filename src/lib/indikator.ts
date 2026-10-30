/** Kelompok Indikator. Nilainya sekaligus label (istilah glosarium). */
export const KELOMPOK = ["INM", "IMP-RS", "IMP-Unit"] as const;
export type Kelompok = (typeof KELOMPOK)[number];

/** Arah: sisi Target yang dianggap baik. */
export const ARAH = ["makinTinggi", "makinRendah"] as const;
export type Arah = (typeof ARAH)[number];
export const LABEL_ARAH: Record<Arah, string> = {
  makinTinggi: "Makin tinggi makin baik",
  makinRendah: "Makin rendah makin baik",
};

/** Frekuensi: Semesteran diisi pada bulan Juni dan Desember. */
export const FREKUENSI = ["bulanan", "semesteran"] as const;
export type Frekuensi = (typeof FREKUENSI)[number];
export const LABEL_FREKUENSI: Record<Frekuensi, string> = { bulanan: "Bulanan", semesteran: "Semesteran" };

/** Benar bila Indikator dengan Frekuensi ini diukur pada bulan "YYYY-MM" (Semesteran: hanya Juni dan Desember). */
export const diukurPadaBulan = (frekuensi: Frekuensi, bulan: string) =>
  frekuensi === "bulanan" || bulan.endsWith("-06") || bulan.endsWith("-12");
