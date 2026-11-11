/** Isi satu sel CSV: teks, angka, atau kosong (null). */
export type SelCsv = string | number | null;

const angka = (n: number) => n.toLocaleString("id-ID", { useGrouping: false, maximumFractionDigits: 2 });

function teks(s: string) {
  // Teks yang diawali = + - @ dibaca Excel sebagai rumus (CSV injection); awalan petik membuatnya tetap teks.
  const aman = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\r\n]/.test(aman) ? `"${aman.replaceAll('"', '""')}"` : aman;
}

/**
 * CSV yang langsung terbuka rapi di Excel berbahasa Indonesia: BOM UTF-8, pemisah titik koma, angka dengan koma desimal
 * tanpa pemisah ribuan (paling banyak dua desimal), baris CRLF.
 */
export const keCsv = (baris: readonly (readonly SelCsv[])[]) =>
  "﻿" +
  baris.map((b) => b.map((s) => (s === null ? "" : typeof s === "number" ? angka(s) : teks(s))).join(";") + "\r\n").join("");
