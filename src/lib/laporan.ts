import { geserBulan, labelTanggal } from "./bulan";
import type { Kelengkapan } from "./capaian";
import type { StatusTindakLanjut } from "./perbaikan";

/*
 * Aturan murni Rekap SIMAR (isian INM bulanan di SIMAR Kemenkes, Juknis SIMAR Ver.07.2024 hal. 17–21). Service di
 * `src/modules/laporan/service.ts`.
 */

/** Batas teks "Analisa Capaian" dan "Rencana Tindak Lanjut" (angka 1000 di bawah kotak teks form SIMAR). */
export const BATAS_TEKS_SIMAR = 1000;

/** Denominator minimal yang diminta SIMAR per kode INM (kebersihan tangan ≥ 200 peluang per bulan). */
export const MIN_D_SIMAR: Readonly<Record<string, number>> = { "INM-01": 200 };

/** Tenggat lapor SIMAR untuk data bulan "YYYY-MM": tanggal 10 bulan berikutnya ("YYYY-MM-DD"). */
export const tenggatSimar = (bulan: string) => `${geserBulan(bulan, 1)}-10`;

/**
 * "Rencana Tindak Lanjut" SIMAR dari Tindak Lanjut sebuah Analisis: satu baris bernomor per Tindak Lanjut (urut dibuat),
 * yang Dibatalkan tidak ikut. Kosong bila tidak ada.
 */
export const teksRencanaTindakLanjut = (
  tindakLanjut: readonly { tindakan: string; pic: string; tenggat: string; status: StatusTindakLanjut }[],
) =>
  tindakLanjut
    .filter((t) => t.status !== "dibatalkan")
    .map((t, i) => `${i + 1}. ${t.tindakan} (PIC: ${t.pic}, tenggat ${labelTanggal(t.tenggat)})`)
    .join("\n");

/** Alasan sebuah INM belum siap dilaporkan ke SIMAR; INM tanpa tanda = siap. */
export type TandaSimar =
  | "tanpaUnitPelapor"
  | "belumLengkap"
  | "dNol"
  | "dKurang"
  | "belumDianalisis"
  | "tanpaTindakLanjut"
  | "terlaluPanjang";

/**
 * Tanda kesiapan satu INM pada Rekap SIMAR, urut seperti `TandaSimar`, masing-masing dengan pesan untuk tampilan.
 * `analisa` null = belum ada Analisis Lingkup RS; `rencana` = `teksRencanaTindakLanjut` (kosong = tanpa Tindak Lanjut).
 * Tanpa Unit Pelapor hanya diberi tanda itu. D = 0 dengan Kelengkapan penuh dan tanpa Analisis diberi tanda `dNol`
 * (SIMAR: N dan D diisi 0 dengan keterangan di Analisa Capaian) sebagai ganti `belumDianalisis`.
 */
export function tandaSimar(b: {
  kode: string;
  d: number;
  kelengkapan: Kelengkapan;
  analisa: string | null;
  rencana: string;
}): { kode: TandaSimar; pesan: string }[] {
  const { terverifikasi, wajib } = b.kelengkapan;
  if (wajib === 0) return [{ kode: "tanpaUnitPelapor", pesan: "Belum ada Unit Pelapor bulan ini." }];
  const lengkap = terverifikasi === wajib;
  const minimal = MIN_D_SIMAR[b.kode];
  const tanda: { kode: TandaSimar; pesan: string }[] = [];
  if (!lengkap) tanda.push({ kode: "belumLengkap", pesan: `Kelengkapan ${terverifikasi}/${wajib} Unit: N dan D belum final.` });
  if (lengkap && b.d === 0 && b.analisa === null) {
    tanda.push({ kode: "dNol", pesan: "D = 0: tulis keterangan tidak ada layanan atau kasus di Analisis." });
  }
  if (lengkap && minimal && b.d > 0 && b.d < minimal) {
    tanda.push({ kode: "dKurang", pesan: `D ${b.d} di bawah minimal SIMAR (${minimal}).` });
  }
  if (b.analisa === null && !tanda.some((t) => t.kode === "dNol")) tanda.push({ kode: "belumDianalisis", pesan: "Belum ada Analisis Lingkup RS." });
  if (b.analisa !== null && !b.rencana) tanda.push({ kode: "tanpaTindakLanjut", pesan: "Analisis belum punya Tindak Lanjut." });
  for (const [label, teks] of [
    ["Analisa Capaian", b.analisa ?? ""],
    ["Rencana Tindak Lanjut", b.rencana],
  ]) {
    if (teks.length > BATAS_TEKS_SIMAR) {
      tanda.push({ kode: "terlaluPanjang", pesan: `${label} ${teks.length} karakter, melebihi ${BATAS_TEKS_SIMAR}.` });
    }
  }
  return tanda;
}
