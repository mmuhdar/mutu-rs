import { config } from "@/lib/config";

export default function Beranda() {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-xs">
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Indikator Mutu {config.namaRs}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Pengukuran Indikator setiap bulan per Unit, Verifikasi oleh Kepala Unit, dan pemantauan Capaian terhadap Target.
      </p>
    </section>
  );
}
