/** Simbol di luar WinAnsi yang punya padanan ASCII. */
const PADANAN: Record<string, string> = { "≥": ">=", "≤": "<=", "≠": "!=", "→": "->", "←": "<-", "−": "-", "✓": "v", "\t": " " };
/** Karakter WinAnsi di luar Latin-1 (posisi 0x80 sampai 0x9F). */
const WIN_ANSI_EKSTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/**
 * Teks untuk font standar PDF (Helvetica, pengodean WinAnsi): simbol umum diganti padanannya, karakter lain di luar
 * WinAnsi (mis. emoji, aksara non-Latin) menjadi "?" supaya tidak tercetak sebagai huruf acak. Baris baru dipertahankan.
 */
export function teksPdf(teks: string) {
  let hasil = "";
  for (const c of teks.replaceAll("\r", "")) {
    const k = c.codePointAt(0)!;
    hasil += PADANAN[c] ?? (k === 10 || (k >= 0x20 && k <= 0x7e) || (k >= 0xa0 && k <= 0xff) || WIN_ANSI_EKSTRA.has(c) ? c : "?");
  }
  return hasil;
}
