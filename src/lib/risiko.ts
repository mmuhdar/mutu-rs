/*
 * Konstanta dan aturan murni Register Risiko (glosarium: Manajemen Risiko); service di `src/modules/risiko`. Matriks
 * Nilai Risiko dan Bobot disalin apa adanya dari Input Risiko aplikasi v1 (`InputRisiko.php`), supaya angka register
 * yang sudah dipakai RS tidak berubah.
 */

/** Daftar pilihan berlabel: kunci yang disimpan + label tampilan, urut seperti di formulir. */
const pilihan = <const K extends string>(label: Record<K, string>) => Object.keys(label) as K[];

export const LABEL_KATEGORI_RISIKO = {
  kebijakan: "Kebijakan",
  reputasi: "Reputasi",
  fraudKorupsi: "Fraud/Korupsi",
  legal: "Legal",
  kepatuhan: "Kepatuhan",
  operasional: "Operasional",
} as const;
export type KategoriRisiko = keyof typeof LABEL_KATEGORI_RISIKO;
export const KATEGORI_RISIKO = pilihan(LABEL_KATEGORI_RISIKO);

export const LABEL_EFEKTIVITAS = { efektif: "Efektif", tidakEfektif: "Tidak Efektif" } as const;
export type Efektivitas = keyof typeof LABEL_EFEKTIVITAS;
export const EFEKTIVITAS = pilihan(LABEL_EFEKTIVITAS);

/** Skala Probabilitas dan Dampak. */
export const SKALA_RISIKO = [1, 2, 3, 4, 5] as const;

/** Nilai Risiko 1–25 per [Probabilitas − 1][Dampak − 1]: peringkat sel matriks, bukan hasil kali. */
const NILAI = [
  [1, 3, 6, 12, 20],
  [2, 7, 11, 15, 21],
  [4, 9, 13, 18, 22],
  [5, 10, 16, 19, 24],
  [8, 14, 17, 23, 25],
];
/** Bobot per [Probabilitas − 1][Dampak − 1]. */
const BOBOT = [
  [1, 1.5, 2, 3, 4],
  [1, 1.8, 1.83, 1.9, 2.1],
  [1.17, 1.42, 1.43, 1.46, 1.47],
  [1.2, 1.19, 1.3, 1.16, 1.2],
  [1.5, 1.4, 1.13, 1.15, 1],
];

/** Tingkat Risiko, dari yang paling tinggi; Prioritas Risiko = urutan di sini (1 = Sangat Tinggi). */
export const LABEL_TINGKAT_RISIKO = {
  sangatTinggi: "Sangat Tinggi",
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
  sangatRendah: "Sangat Rendah",
} as const;
export type TingkatRisiko = keyof typeof LABEL_TINGKAT_RISIKO;
export const TINGKAT_RISIKO = pilihan(LABEL_TINGKAT_RISIKO);

/** Batas bawah Nilai Risiko tiap Tingkat Risiko, urut seperti `TINGKAT_RISIKO`. */
const BATAS_TINGKAT = [20, 15, 10, 5, 1];

const skalaValid = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;

/** Penilaian satu pasang Probabilitas + Dampak: Bobot, Nilai Risiko, Tingkat Risiko, Prioritas Risiko. */
export function nilaiRisiko(probabilitas: number, dampak: number) {
  if (!skalaValid(probabilitas) || !skalaValid(dampak)) throw new RangeError("Probabilitas dan Dampak harus 1 sampai 5.");
  const nilai = NILAI[probabilitas - 1][dampak - 1];
  const i = BATAS_TINGKAT.findIndex((b) => nilai >= b);
  return { probabilitas, dampak, bobot: BOBOT[probabilitas - 1][dampak - 1], nilai, tingkat: TINGKAT_RISIKO[i], prioritas: i + 1 };
}
export type PenilaianRisiko = ReturnType<typeof nilaiRisiko>;

/** Penilaian bila keduanya terisi 1–5; null bila belum (mis. Hasil Pemantauan yang belum diisi, atau pratinjau form). */
export const nilaiRisikoAtauNull = (probabilitas: number | null, dampak: number | null) =>
  skalaValid(probabilitas) && skalaValid(dampak) ? nilaiRisiko(probabilitas, dampak) : null;

/** Simpulan Tingkat Risiko: true = Tingkat Risiko Hasil Pemantauan lebih rendah dari Penilaian Awal; null = belum dipantau. */
export const tingkatTurun = (awal: PenilaianRisiko, pemantauan: PenilaianRisiko | null) =>
  pemantauan ? pemantauan.prioritas > awal.prioritas : null;

/** Bobot untuk tampilan: "1,83". */
export const formatBobot = (bobot: number) => bobot.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Perlakuan disimpan sebagai teks, satu langkah per baris; baris kosong diabaikan. */
export const daftarPerlakuan = (teks: string) =>
  teks
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

/** Jenis Dokumen Review yang diterima, ditentukan dari isi berkas. */
export const LABEL_JENIS_DOKUMEN_RISIKO = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
} as const;
export type JenisDokumenRisiko = keyof typeof LABEL_JENIS_DOKUMEN_RISIKO;
export const JENIS_DOKUMEN_RISIKO = Object.keys(LABEL_JENIS_DOKUMEN_RISIKO) as JenisDokumenRisiko[];
export const MAKS_DOKUMEN_RISIKO = 5;
/** Untuk `accept` input berkas; hanya petunjuk bagi browser, aturannya tetap `jenisDokumenRisiko`. */
export const ACCEPT_DOKUMEN_RISIKO = ".pdf,.doc,.docx";

const TANDA: [JenisDokumenRisiko, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ["application/msword", [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE (Word 97–2003)
  // ponytail: semua ZIP dianggap DOCX (juga XLSX/ZIP lain); berkas Word selain PDF selalu diunduh, tidak dibuka di browser.
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [0x50, 0x4b, 0x03, 0x04]],
];

/** Jenis Dokumen Review menurut tanda awal isinya; null bila bukan PDF, DOC, atau DOCX. */
export const jenisDokumenRisiko = (isi: Uint8Array): JenisDokumenRisiko | null =>
  TANDA.find(([, tanda]) => tanda.every((b, i) => isi[i] === b))?.[0] ?? null;
