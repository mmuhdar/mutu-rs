/* Bagian form bersama untuk komponen client maupun server: kelas isian, tombol, label, segmen, dan pesan penolakan. */

export const kelasInput =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-[15px]";
export const kelasArea =
  "w-full min-w-0 rounded-xl border border-input bg-surface px-3.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-[15px]";
/** Tombol utama ungu (satu per layar). Selebar penuh di HP: atur lebarnya lewat pembungkus, bukan kelas `w-*` tambahan. */
export const tombolUtama =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-tombol hover:bg-primary-ink active:translate-y-px disabled:opacity-60 sm:w-auto sm:justify-self-start";
/** Tombol kedua: putih bertepi. */
export const tombolGaris =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 font-semibold text-foreground shadow-kartu hover:bg-active active:translate-y-px disabled:opacity-60 sm:w-auto sm:justify-self-start";
/** Tombol ikon bertepi (pembuka panel baris; `aria-expanded` = terbuka) dan tombol teks kecil bertepi di kolom Aksi tabel. */
export const tombolIkon =
  "inline-grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary-ink aria-expanded:border-primary aria-expanded:bg-primary-tint aria-expanded:text-primary-ink";
export const tombolBaris =
  "inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold whitespace-nowrap hover:bg-active disabled:opacity-60";
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
 * menjadi chip putih bertulisan ungu. Pemanggil memberi `key` = nilai terpilih bila nilainya bisa berubah dari state form.
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
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-center text-[14px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground has-checked:bg-surface has-checked:text-primary-ink has-checked:shadow-kartu has-focus-visible:ring-2 has-focus-visible:ring-primary has-disabled:cursor-not-allowed"
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
