import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/*
 * Bagian form bersama di atas shadcn/ui, untuk komponen client maupun server. Isian dan tombol memakai komponen shadcn
 * langsung (`Input`, `Textarea`, `NativeSelect`, `Checkbox`, `Button` dari `@/components/ui`). Tombol utama
 * (`Button size="lg"`) satu per layar; di HP tombol form dibuat selebar penuh lewat kelas `w-full sm:w-auto`.
 */

export const kelasPetunjuk = "text-[13px] leading-5 text-muted-foreground";

/** Pesan penolakan service di bawah form (shadcn `Alert`); kosong = tidak tampil. */
export function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <Alert variant="destructive" role="alert" className="border-danger-border bg-danger-soft">
      <AlertDescription className="text-[14px] text-danger-ink">{pesan}</AlertDescription>
    </Alert>
  ) : null;
}

/** Label di atas isian, petunjuk di bawah label (dikaitkan lewat `aria-describedby` oleh pemanggil bila perlu). */
export function Kolom(p: { label: React.ReactNode; htmlFor: string; petunjuk?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={p.htmlFor} className="font-semibold">
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
}) {
  const id = `segmen-${p.nama}`;
  return (
    <div className="grid min-w-0 gap-2">
      <Label id={id} className="font-semibold">
        {p.label}
      </Label>
      <RadioGroup
        aria-labelledby={id}
        name={p.nama}
        defaultValue={p.nilai ?? undefined}
        required={p.wajib}
        disabled={p.disabled}
        className="flex flex-wrap gap-1 rounded-xl bg-muted p-1"
      >
        {p.pilihan.map((o) => (
          <label
            key={o.nilai}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-center text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-data-[state=checked]:bg-card has-data-[state=checked]:text-primary-ink has-data-[state=checked]:shadow-kartu"
          >
            <RadioGroupItem value={o.nilai} className="sr-only" />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
