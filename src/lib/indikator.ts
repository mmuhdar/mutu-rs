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
/** Sisi Target yang baik menurut Arah, untuk "Target ≥ 80 %". */
export const TANDA_ARAH: Record<Arah, string> = { makinTinggi: "≥", makinRendah: "≤" };

/** Frekuensi: Semesteran diisi pada bulan Juni dan Desember. */
export const FREKUENSI = ["bulanan", "semesteran"] as const;
export type Frekuensi = (typeof FREKUENSI)[number];
export const LABEL_FREKUENSI: Record<Frekuensi, string> = { bulanan: "Bulanan", semesteran: "Semesteran" };

/**
 * Field yang menentukan cara hitung (beserta labelnya untuk pesan). Terkunci setelah Indikator punya Pengukuran
 * dengan status apa pun, supaya tren tidak mencampur dua cara hitung.
 */
export const FIELD_CARA_HITUNG = {
  faktor: "faktor",
  satuan: "satuan",
  arah: "Arah",
  definisiNumerator: "definisi Numerator",
  definisiDenominator: "definisi Denominator",
  frekuensi: "Frekuensi",
} as const;

/** Benar bila Indikator dengan Frekuensi ini diukur pada bulan "YYYY-MM" (Semesteran: hanya Juni dan Desember). */
export const diukurPadaBulan = (frekuensi: Frekuensi, bulan: string) =>
  frekuensi === "bulanan" || bulan.endsWith("-06") || bulan.endsWith("-12");

/**
 * Target untuk bulan "YYYY-MM" dari riwayat Target sebuah Indikator (urutan bebas): yang berlaku mulai terbaru dan
 * tidak lewat dari bulan itu. Target pertama juga berlaku untuk semua bulan sebelumnya, supaya data lama dari arsip
 * tetap punya Target. Satu-satunya aturan Target berlaku; undefined hanya bila riwayatnya kosong.
 */
export function targetPadaBulan(riwayat: readonly { nilai: number; berlakuMulai: string }[], bulan: string) {
  const urut = riwayat.toSorted((a, b) => a.berlakuMulai.localeCompare(b.berlakuMulai));
  return (urut.findLast((t) => t.berlakuMulai <= bulan) ?? urut[0])?.nilai;
}
