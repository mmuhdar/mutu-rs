/** Jenis berkas Bukti yang diterima, ditentukan dari isi berkas (bukan nama atau tipe kiriman browser). */
export const JENIS_BUKTI = ["application/pdf", "image/jpeg", "image/png"] as const;
export type JenisBukti = (typeof JENIS_BUKTI)[number];
export const LABEL_JENIS_BUKTI: Record<JenisBukti, string> = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

/** Paling banyak 5 berkas Bukti per Pengukuran, masing-masing paling besar 10 MB. */
export const MAKS_BUKTI = 5;
export const MAKS_UKURAN_BUKTI = 10 * 1024 * 1024;
/** Untuk `accept` input berkas; hanya petunjuk bagi browser, aturannya tetap `jenisBukti`. */
export const ACCEPT_BUKTI = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const TANDA: [JenisBukti, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];

/** Jenis Bukti menurut tanda awal isinya; null bila bukan PDF, JPG, atau PNG. */
export const jenisBukti = (isi: Uint8Array): JenisBukti | null =>
  TANDA.find(([, tanda]) => tanda.every((b, i) => isi[i] === b))?.[0] ?? null;

/** Nama berkas untuk disimpan dan ditampilkan: tanpa folder dan karakter kendali, spasi dirapikan, maks 200 karakter. */
export function namaBerkas(nama: string) {
  const dasar = (nama.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return dasar.slice(0, 200) || "bukti";
}

/** Ukuran berkas untuk tampilan: "820 KB", "2,4 MB". */
export function labelUkuran(bita: number) {
  if (bita < 1024 * 1024) return `${Math.max(1, Math.round(bita / 1024))} KB`;
  return `${(bita / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}
