import { LABEL_TAHAP_PDSA, TAHAP_ISIAN_PDSA, TAHAP_PDSA, type TahapIsianPdsa, type TahapPdsa } from "@/lib/perbaikan";

import { Pil } from "../ui";

/*
 * Tampilan tahap PDSA (tema Console). Tahap yang sedang diisi = amber (langkah yang sedang berjalan), tahap selesai =
 * ok, yang belum = tanpa warna; keadaannya selalu juga ditulis.
 */

/** Tahap aktif PDSA sebagai label (warna hanya pelengkap teks). */
export function LabelTahap({ tahap }: { tahap: TahapPdsa }) {
  return tahap === "selesai" ? <Pil nada="pos">Selesai</Pil> : <Pil nada="pdsa">Tahap {LABEL_TAHAP_PDSA[tahap]}</Pil>;
}

export type KeadaanTahap = "selesai" | "sedang diisi" | "belum";

/** Keadaan satu tahap terhadap tahap aktif. */
export const keadaan = (t: TahapIsianPdsa, aktif: TahapPdsa): KeadaanTahap => {
  const [i, iAktif] = [TAHAP_PDSA.indexOf(t), TAHAP_PDSA.indexOf(aktif)];
  return i < iAktif ? "selesai" : i === iAktif ? "sedang diisi" : "belum";
};

/** Warna teks keadaan: ok = selesai, amber = sedang diisi, redup = belum. */
export const WARNA_KEADAAN: Record<KeadaanTahap, string> = { selesai: "text-ok", "sedang diisi": "text-signal", belum: "text-ink-3" };
const RUAS: Record<KeadaanTahap, string> = { selesai: "bg-ok", "sedang diisi": "bg-signal", belum: "bg-rule-2" };

/** Jejak ringkas empat tahap untuk daftar: ruas ok = selesai, amber = sedang diisi, garis redup = belum. */
export function JejakTahap({ aktif }: { aktif: TahapPdsa }) {
  return (
    <span
      role="img"
      aria-label={aktif === "selesai" ? "Semua tahap selesai" : `Tahap ${LABEL_TAHAP_PDSA[aktif]} sedang diisi`}
      className="grid min-w-40 grid-cols-4 gap-1"
    >
      {TAHAP_ISIAN_PDSA.map((t) => {
        const k = keadaan(t, aktif);
        return (
          <span key={t} className="grid gap-1.5">
            <span className={`h-0.5 ${RUAS[k]}`} />
            <span className={`text-[13px] leading-4 ${WARNA_KEADAAN[k]}`}>{LABEL_TAHAP_PDSA[t]}</span>
          </span>
        );
      })}
    </span>
  );
}
