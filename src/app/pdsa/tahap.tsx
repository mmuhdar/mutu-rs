import Link from "next/link";

import { LABEL_TAHAP_PDSA, TAHAP_ISIAN_PDSA, TAHAP_PDSA, type TahapIsianPdsa, type TahapPdsa } from "@/lib/perbaikan";

/** Tahap aktif PDSA sebagai label pucat (warna hanya pelengkap teks). */
export function LabelTahap({ tahap }: { tahap: TahapPdsa }) {
  const selesai = tahap === "selesai";
  return (
    <span
      className={`inline-flex h-5 flex-none items-center rounded-full px-2 text-[12px] font-medium whitespace-nowrap ${selesai ? "bg-success-soft text-success-ink" : "bg-accent/10 text-accent"}`}
    >
      {selesai ? "Selesai" : `Tahap ${LABEL_TAHAP_PDSA[tahap]}`}
    </span>
  );
}

/**
 * Tab tahap Plan · Do · Study · Act bergaris bawah di atas garis 1px selebar lembar. Setiap tab adalah tautan `?tahap=`
 * (tanpa JavaScript) dan menuliskan keadaannya (selesai, sedang diisi, belum), bukan warna saja.
 */
export function TabTahap({ id, aktif, dipilih }: { id: string; aktif: TahapPdsa; dipilih: TahapIsianPdsa }) {
  const iAktif = TAHAP_PDSA.indexOf(aktif);
  return (
    <nav aria-label="Tahap PDSA" className="-mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-6">
        {TAHAP_ISIAN_PDSA.map((t, i) => {
          const keadaan = i < iAktif ? "selesai" : i === iAktif ? "sedang diisi" : "belum";
          const pilih = t === dipilih;
          return (
            <li key={t}>
              <Link
                href={`/pdsa/${id}?tahap=${t}`}
                aria-current={pilih ? "page" : undefined}
                className={`-mb-px flex min-h-11 items-baseline gap-1.5 border-b-2 pt-2 pb-2.5 whitespace-nowrap ${
                  pilih ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {LABEL_TAHAP_PDSA[t]}
                <span className={`text-[12px] font-normal ${keadaan === "sedang diisi" ? "text-accent" : "text-muted-foreground"}`}>
                  {keadaan}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
