import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/*
 * Bagian form bersama di atas shadcn/ui, untuk komponen client maupun server. Isian dan tombol memakai komponen shadcn
 * langsung (`Input`, `Textarea`, `Checkbox`, `Button` dari `@/components/ui`); pilihan dari daftar = `PilihCari` (select
 * dengan pencarian, `./pilih-cari`). Tombol utama (`Button size="lg"`) satu per layar; di HP tombol form dibuat selebar
 * penuh lewat kelas `w-full sm:w-auto`.
 */

export const kelasPetunjuk = "text-[13px] leading-5 text-muted-foreground";

/** Label pembungkus `Checkbox` berbentuk chip (pilihan banyak): bergaris, amber lembut saat tercentang. */
export const KELAS_CHIP_CENTANG =
  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill border border-rule-2 bg-paper-3 px-3 text-[14px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink has-data-[state=checked]:border-signal-rule has-data-[state=checked]:bg-signal-soft has-data-[state=checked]:text-ink has-focus-visible:ring-2 has-focus-visible:ring-ring";

/** Pesan penolakan service di bawah form (shadcn `Alert`); kosong = tidak tampil. */
export function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <Alert variant="destructive" role="alert" className="rounded-card border-danger-border bg-danger-soft">
      <AlertDescription className="text-[14px] text-ink">{pesan}</AlertDescription>
    </Alert>
  ) : null;
}

/** Label di atas isian, petunjuk di bawah label (dikaitkan lewat `aria-describedby` oleh pemanggil bila perlu). */
export function Kolom(p: { label: React.ReactNode; htmlFor: string; petunjuk?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={p.htmlFor} className="font-medium">
        {p.label}
      </Label>
      {p.petunjuk && <p className={kelasPetunjuk}>{p.petunjuk}</p>}
      {p.children}
    </div>
  );
}

/**
 * Pilihan yang sedikit sebagai tombol segmen (shadcn `RadioGroup`, terbaca pembaca layar, panah kiri/kanan untuk pindah,
 * nilainya ikut terkirim bersama form). Yang terpilih menjadi chip putih bertulisan ungu. Pemanggil memberi `key` = nilai
 * terpilih bila nilainya bisa berubah dari state form.
 */
export function Segmen(p: {
  nama: string;
  label: string;
  pilihan: readonly { nilai: string; label: string }[];
  nilai?: string | null;
  wajib?: boolean;
  disabled?: boolean;
  /** Label hanya untuk pembaca layar, bila judul baris di sampingnya sudah menamai pilihan ini. */
  labelTersembunyi?: boolean;
  /** Dipanggil saat pilihan berubah (mis. pratinjau langsung); nilainya tetap dikirim lewat form. */
  onChange?: (nilai: string) => void;
}) {
  const id = `segmen-${p.nama}`;
  return (
    <div className="grid min-w-0 gap-2">
      <Label id={id} className={p.labelTersembunyi ? "sr-only" : "font-medium"}>
        {p.label}
      </Label>
      <RadioGroup
        aria-labelledby={id}
        name={p.nama}
        defaultValue={p.nilai ?? undefined}
        onValueChange={p.onChange}
        required={p.wajib}
        disabled={p.disabled}
        className="flex flex-wrap gap-0.5 rounded-md border border-rule bg-paper-3 p-0.5"
      >
        {p.pilihan.map((o) => (
          <label
            key={o.nilai}
            className="flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-[4px] px-3 text-center text-sm font-medium whitespace-nowrap text-ink-3 transition-colors hover:text-ink has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-55 has-data-[state=checked]:bg-card has-data-[state=checked]:text-ink has-data-[state=checked]:shadow-[inset_0_-2px_0_var(--color-signal)]"
          >
            {/* `absolute` mengalahkan `relative` bawaan item (twMerge), supaya radio tak terlihat tidak memakan lebar. */}
            <RadioGroupItem value={o.nilai} className="sr-only absolute" />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
