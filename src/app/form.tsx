/* Bagian form bersama untuk komponen client maupun server: kelas isian, tombol, dan pesan penolakan. */

export const kelasInput =
  "h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring sm:text-[14px]";
export const kelasArea =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-base leading-6 outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring sm:text-[14px]";
export const tombolUtama =
  "h-10 w-full rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover active:translate-y-px disabled:opacity-70 sm:w-auto sm:justify-self-start";
export const tombolGaris =
  "h-10 w-full rounded-md border border-input bg-surface px-4 font-medium hover:bg-background active:translate-y-px disabled:opacity-70 sm:w-auto sm:justify-self-start";

/** Pesan penolakan service di bawah form; kosong = tidak tampil. */
export function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
      {pesan}
    </p>
  ) : null;
}
