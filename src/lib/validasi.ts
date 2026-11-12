/*
 * Aturan murni Validasi Data (KMK 1596/2024 PMKP 5; cara di PMK 30/2022 Lampiran BAB IV.B, metode kesesuaian hasil
 * pengukuran). Service di `src/modules/validasi`; riset `docs/research/validasi-data-pmkp5.md`.
 */

/** Pemicu validasi (PMKP 5 a–f; PMK 30/2022 BAB IV.B). Tidak ada validasi berkala tanpa pemicu. */
export const LABEL_PEMICU_VALIDASI = {
  indikatorBaru: "Indikator baru",
  publikasi: "Data akan dipublikasikan",
  perubahanPengukuran: "Perubahan pengukuran (profil, instrumen, agregasi, pengumpul data, atau validator)",
  perubahanHasil: "Hasil berubah tanpa diketahui sebabnya",
  perubahanSumber: "Sumber data berubah",
  perubahanSubjek: "Subjek data berubah",
} as const;
export type PemicuValidasi = keyof typeof LABEL_PEMICU_VALIDASI;
export const PEMICU_VALIDASI = Object.keys(LABEL_PEMICU_VALIDASI) as PemicuValidasi[];

/** Faktor penyebab data tidak valid (PMK 30/2022 BAB IV.B). */
export const LABEL_PENYEBAB_TIDAK_VALID = {
  pemahaman: "Pemahaman pengumpul data atau validator belum memadai",
  kamus: "Kamus indikator tidak jelas",
  definisi: "Perbedaan pemahaman definisi operasional",
  waktu: "Keterbatasan waktu pengumpulan data",
  input: "Kesalahan penginputan data",
  sumber: "Sumber data berbeda",
  kelalaian: "Kelalaian",
  formulir: "Formulir pengumpulan data belum terdesain baik",
} as const;
export type PenyebabTidakValid = keyof typeof LABEL_PENYEBAB_TIDAK_VALID;
export const PENYEBAB_TIDAK_VALID = Object.keys(LABEL_PENYEBAB_TIDAK_VALID) as PenyebabTidakValid[];

/** Data valid bila kesesuaian mencapai 90%. */
export const AMBANG_VALID = 90;

/**
 * Sampel minimal validator menurut populasi (PMK 30/2022 Tabel 3 kolom validator): 1–16 = seluruh populasi, 17–160 =
 * 16 ("minimal 16 atau 10%", dan 10% di rentang itu selalu ≤ 16), ≥ 161 = 48.
 */
export const sampelMinimalValidasi = (populasi: number) => (populasi <= 16 ? populasi : populasi <= 160 ? 16 : 48);

/** Kesesuaian (%) = jumlah data sesuai / jumlah sampel validator × 100. */
export const kesesuaian = (sesuai: number, sampel: number) => (sesuai / sampel) * 100;

/**
 * Kesesuaian untuk tampilan, satu desimal dipotong (bukan dibulatkan), supaya 89,96% tidak tampil "90%" di samping
 * "Tidak valid": "93,7%".
 */
export const formatPersen = (persen: number) =>
  `${(Math.floor(persen * 10) / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

/** Valid bila kesesuaian ≥ 90%; dihitung dengan perkalian supaya 9 dari 10 tidak meleset karena pembulatan. */
export const validData = (sesuai: number, sampel: number) => sesuai * 100 >= AMBANG_VALID * sampel;
