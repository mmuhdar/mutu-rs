/* Bagian form bersama untuk komponen client maupun server: kelas isian, tombol, dan pesan penolakan. */

export const kelasInput =
  "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring";
export const kelasArea =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring";
export const tombolUtama =
  "h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70 sm:w-auto";
export const tombolGaris =
  "h-11 w-full rounded-md border border-border bg-surface px-4 font-semibold hover:bg-background disabled:opacity-70 sm:w-auto";

/** Pesan penolakan service di bawah form; kosong = tidak tampil. */
export function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
      {pesan}
    </p>
  ) : null;
}
