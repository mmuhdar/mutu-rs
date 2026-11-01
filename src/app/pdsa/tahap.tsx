import Link from "next/link";

import { LABEL_TAHAP_PDSA, TAHAP_ISIAN_PDSA, TAHAP_PDSA, type TahapIsianPdsa, type TahapPdsa } from "@/lib/perbaikan";

import { Pil } from "../ui";

/** Tahap aktif PDSA sebagai label (warna hanya pelengkap teks). */
export function LabelTahap({ tahap }: { tahap: TahapPdsa }) {
  return tahap === "selesai" ? <Pil nada="pos">Selesai</Pil> : <Pil nada="pdsa">Tahap {LABEL_TAHAP_PDSA[tahap]}</Pil>;
}

/** Keadaan satu tahap terhadap tahap aktif. */
const keadaan = (t: TahapIsianPdsa, aktif: TahapPdsa) => {
  const [i, iAktif] = [TAHAP_PDSA.indexOf(t), TAHAP_PDSA.indexOf(aktif)];
  return i < iAktif ? "selesai" : i === iAktif ? "sedang diisi" : "belum";
};

/** Jejak ringkas empat tahap untuk daftar: ruas penuh = selesai, ruas setengah = sedang diisi. */
export function JejakTahap({ aktif }: { aktif: TahapPdsa }) {
  return (
    <span className="grid grid-cols-4 gap-1" aria-label={aktif === "selesai" ? "Semua tahap selesai" : `Tahap ${LABEL_TAHAP_PDSA[aktif]} sedang diisi`}>
      {TAHAP_ISIAN_PDSA.map((t) => {
        const k = keadaan(t, aktif);
        return (
          <span key={t} className="grid gap-1">
            <span className={`h-1.5 rounded-full ${k === "selesai" ? "bg-pdsa" : k === "sedang diisi" ? "bg-pdsa/40" : "bg-active"}`} />
            <span className={`text-[11px] font-semibold ${k === "belum" ? "text-muted-foreground" : "text-pdsa-ink"}`}>{LABEL_TAHAP_PDSA[t]}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Tahap Plan · Do · Study · Act sebagai langkah yang bisa diketuk (`?tahap=`, tanpa JavaScript): yang selesai pucat,
 * yang sedang diisi penuh, yang belum abu-abu; keadaannya selalu ditulis, bukan warna saja. Tab yang dibuka bergaris.
 */
export function TabTahap({ id, aktif, dipilih }: { id: string; aktif: TahapPdsa; dipilih: TahapIsianPdsa }) {
  return (
    <nav aria-label="Tahap PDSA">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TAHAP_ISIAN_PDSA.map((t, i) => {
          const k = keadaan(t, aktif);
          const pilih = t === dipilih;
          return (
            <li key={t}>
              <Link
                href={`/pdsa/${id}?tahap=${t}`}
                aria-current={pilih ? "page" : undefined}
                className={`grid min-h-16 content-center gap-0.5 rounded-2xl px-4 py-2.5 hover:-translate-y-0.5 ${
                  k === "sedang diisi" ? "bg-pdsa text-white" : k === "selesai" ? "bg-pdsa-tint text-pdsa-ink" : "bg-active text-muted-foreground"
                } ${pilih ? "ring-2 ring-pdsa-ink ring-offset-2 ring-offset-background" : ""}`}
              >
                <span className="text-[12px] font-semibold opacity-80">Langkah {i + 1}</span>
                <span className="text-[17px] leading-6 font-bold">{LABEL_TAHAP_PDSA[t]}</span>
                <span className="text-[12px] font-medium">{k}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
