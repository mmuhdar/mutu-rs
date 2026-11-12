import { tambahHari } from "./bulan";
import type { Kelompok } from "./indikator";

/* Konstanta dan aturan murni modul Perbaikan (Analisis, Tindak Lanjut, PDSA); service di `src/modules/perbaikan`. */

/** IMP-Unit hanya punya Lingkup Unit Pelapor-nya; INM, IMP-RS, dan SPM juga punya Lingkup RS. */
export const punyaLingkupRs = (kelompok: Kelompok) => kelompok !== "IMP-Unit";

/** Nama Lingkup untuk tampilan: "Lingkup RS", atau "Unit ICU" (+ "(nonaktif)" bila Unit itu kini nonaktif). */
export const labelLingkup = (unit: { nama: string; aktif?: boolean } | null) =>
  unit ? `Unit ${unit.nama}${unit.aktif === false ? " (nonaktif)" : ""}` : "Lingkup RS";

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

/** Berapa hari sebelum tenggat Tindak Lanjut ditandai mendekati tenggat. */
export const HARI_MENDEKATI_TENGGAT = 7;

/** Tenggat ("YYYY-MM-DD") jatuh hari ini sampai `HARI_MENDEKATI_TENGGAT` hari lagi; juga dipakai tenggat investigasi Insiden. */
export const dalamJendelaTenggat = (tenggat: string, hariIni: string) =>
  tenggat >= hariIni && tenggat <= tambahHari(hariIni, HARI_MENDEKATI_TENGGAT);

/** Mendekati tenggat: status masih terbuka dan tenggat hari ini sampai 7 hari lagi ("YYYY-MM-DD"). Dihitung, bukan status. */
export const mendekatiTenggat = (tl: { status: StatusTindakLanjut; tenggat: string }, hariIni: string) =>
  STATUS_TERBUKA.includes(tl.status) && dalamJendelaTenggat(tl.tenggat, hariIni);

/** Tahap aktif PDSA, berurutan; PDSA yang baru dibuat (Plan sudah diisi) langsung berada di tahap Do. */
export const TAHAP_PDSA = ["plan", "do", "study", "act", "selesai"] as const;
export type TahapPdsa = (typeof TAHAP_PDSA)[number];
/** Tahap yang punya isian (semua kecuali Selesai). */
export type TahapIsianPdsa = Exclude<TahapPdsa, "selesai">;
export const TAHAP_ISIAN_PDSA = TAHAP_PDSA.filter((t): t is TahapIsianPdsa => t !== "selesai");
export const LABEL_TAHAP_PDSA: Record<TahapPdsa, string> = {
  plan: "Plan",
  do: "Do",
  study: "Study",
  act: "Act",
  selesai: "Selesai",
};
/** Tahap sesudah `tahap` (Act → Selesai). */
export const tahapBerikutnya = (tahap: TahapIsianPdsa): TahapPdsa => TAHAP_PDSA[TAHAP_PDSA.indexOf(tahap) + 1];
/** Benar bila `tahap` sudah dicapai PDSA yang tahap aktifnya `aktif`, jadi isiannya boleh diisi atau diperbaiki. */
export const sudahDicapai = (tahap: TahapPdsa, aktif: TahapPdsa) => TAHAP_PDSA.indexOf(tahap) <= TAHAP_PDSA.indexOf(aktif);

/** Keputusan tahap Act. */
export const KEPUTUSAN_PDSA = ["adopsi", "adaptasi", "tinggalkan"] as const;
export type KeputusanPdsa = (typeof KEPUTUSAN_PDSA)[number];
export const LABEL_KEPUTUSAN_PDSA: Record<KeputusanPdsa, string> = {
  adopsi: "Adopsi",
  adaptasi: "Adaptasi",
  tinggalkan: "Tinggalkan",
};

/** Jenis sumber daya Analisis Efisiensi PDSA (KMK 1596/2024 PMKP 4 EP g: biaya dan jenis sumber daya sebelum dan sesudah perbaikan). */
export const JENIS_SUMBER_DAYA = ["tenaga", "bahan", "alat", "waktu", "lainnya"] as const;
export type JenisSumberDaya = (typeof JENIS_SUMBER_DAYA)[number];
export const LABEL_SUMBER_DAYA: Record<JenisSumberDaya, string> = {
  tenaga: "Tenaga (SDM)",
  bahan: "Obat, BMHP, dan bahan",
  alat: "Alat dan sarana",
  waktu: "Waktu pelayanan atau lama rawat",
  lainnya: "Lain-lain",
};

/** Total biaya sebelum dan sesudah perbaikan (Rupiah), penghematan (negatif = lebih mahal), dan persennya dari biaya sebelum. */
export function ringkasEfisiensi(baris: readonly { sebelum: number; sesudah: number }[]) {
  const sebelum = baris.reduce((n, b) => n + b.sebelum, 0);
  const sesudah = baris.reduce((n, b) => n + b.sesudah, 0);
  return { sebelum, sesudah, hemat: sebelum - sesudah, persen: sebelum > 0 ? ((sebelum - sesudah) / sebelum) * 100 : null };
}

/** Rupiah untuk tampilan: "Rp 1.250.000". */
export const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
