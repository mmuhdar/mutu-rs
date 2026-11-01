/* Bagian form bersama untuk komponen client maupun server: kelas isian, tombol, label, segmen, dan pesan penolakan. */

export const kelasInput =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-area focus-visible:ring-4 focus-visible:ring-area/15 sm:text-[15px]";
export const kelasArea =
  "w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-area focus-visible:ring-4 focus-visible:ring-area/15 sm:text-[15px]";
export const tombolUtama =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover active:translate-y-px disabled:opacity-60 sm:w-auto sm:justify-self-start";
export const tombolGaris =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-area/35 bg-surface px-5 font-semibold text-area-ink hover:bg-area-tint active:translate-y-px disabled:opacity-60 sm:w-auto sm:justify-self-start";
export const kelasLabel = "text-[13px] font-semibold";
export const kelasPetunjuk = "text-[13px] leading-5 text-muted-foreground";

/** Pesan penolakan service di bawah form; kosong = tidak tampil. */
export function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger-ink">
      {pesan}
    </p>
  ) : null;
}

/** Label di atas isian, petunjuk di bawah label (dikaitkan lewat `aria-describedby` oleh pemanggil bila perlu). */
export function Kolom(p: { label: React.ReactNode; htmlFor: string; petunjuk?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={p.htmlFor} className={kelasLabel}>
        {p.label}
      </label>
      {p.petunjuk && <p className={kelasPetunjuk}>{p.petunjuk}</p>}
      {p.children}
    </div>
  );
}

/**
 * Pilihan yang sedikit sebagai tombol segmen: radio asli (jalan tanpa JavaScript, terbaca pembaca layar), yang terpilih
 * berwarna area. Pemanggil memberi `key` = nilai terpilih bila nilainya bisa berubah dari state form.
 */
export function Segmen(p: {
  nama: string;
  label: string;
  pilihan: readonly { nilai: string; label: string }[];
  nilai?: string | null;
  wajib?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5" disabled={p.disabled}>
      <legend className={`${kelasLabel} mb-1.5`}>{p.label}</legend>
      <div className="flex flex-wrap gap-1 rounded-xl bg-active p-1">
        {p.pilihan.map((o) => (
          <label
            key={o.nilai}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-center text-[14px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground has-checked:bg-area has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-area has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name={p.nama}
              value={o.nilai}
              defaultChecked={p.nilai === o.nilai}
              required={p.wajib}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
