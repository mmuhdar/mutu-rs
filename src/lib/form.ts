import { ServiceError } from "./errors";

/** Isian teks dari form server action; field yang tidak ada = "". */
export const teks = (formData: FormData, nama: string) => String(formData.get(nama) ?? "");

/** Satu isian dari alamat halaman (`searchParams`, mis. form `method="get"`); tidak ada atau berulang = "". */
export const teksAlamat = (alamat: Record<string, string | string[] | undefined>, nama: string) => {
  const nilai = alamat[nama];
  return typeof nilai === "string" ? nilai : "";
};

/** State form `useActionState`: pesan penolakan service beserta isian yang dikirim (React mengosongkan form setelah action). */
export type StateForm = { error?: string; nilai?: Record<string, string> };

/** Penolakan service menjadi pesan form beserta isian yang dikirim, supaya form tidak kosong. */
export const ditolak = (formData: FormData, error: string): StateForm => ({
  error,
  nilai: Object.fromEntries(formData) as Record<string, string>,
});

/** Bilangan bulat dari isian form: hanya angka 0–9; kosong atau berformat lain ("1,5", "1.000", "-1") = NaN, ditolak service. */
export const bilanganBulat = (isian: string) => (/^\d+$/.test(isian.trim()) ? Number(isian.trim()) : Number.NaN);

/** Untuk service: teks wajib dari isian, dirapikan, tidak kosong, dan dibatasi panjangnya. */
export function wajibTeks(nilai: unknown, label: string, maks: number) {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  if (!teks) throw new ServiceError(400, `${label} wajib diisi.`);
  if (teks.length > maks) throw new ServiceError(400, `${label} maksimal ${maks} karakter.`);
  return teks;
}

/** Untuk service: teks opsional dari isian, dirapikan ("" bila kosong), dibatasi panjangnya. */
export function teksOpsional(nilai: unknown, label: string, maks: number) {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  if (teks.length > maks) throw new ServiceError(400, `${label} maksimal ${maks} karakter.`);
  return teks;
}

/** Untuk service: nilai dari isian harus salah satu dari `daftar` (nilai form bisa diutak-atik); selain itu ditolak dengan `pesan`. */
export function salahSatuDari<T extends string>(nilai: unknown, daftar: readonly T[], pesan: string): T {
  if (typeof nilai === "string" && (daftar as readonly string[]).includes(nilai)) return nilai as T;
  throw new ServiceError(400, pesan);
}
