import { formatBobot, LABEL_TINGKAT_RISIKO, type PenilaianRisiko, type TingkatRisiko } from "@/lib/risiko";

import { Pil, type Nada } from "../ui";

/*
 * Label Register Risiko (tema Console): Tingkat Risiko selalu ditulis, warnanya hanya pelengkap dan memakai token
 * terdekat dengan warna v1 (merah, jingga, kuning, hijau, biru).
 */

const NADA_TINGKAT: Record<TingkatRisiko, Nada> = {
  sangatTinggi: "neg",
  tinggi: "neg",
  sedang: "warn",
  rendah: "pos",
  sangatRendah: "ukur",
};

export function LabelTingkat({ tingkat }: { tingkat: TingkatRisiko }) {
  return <Pil nada={NADA_TINGKAT[tingkat]}>{LABEL_TINGKAT_RISIKO[tingkat]}</Pil>;
}

/** Satu penilaian dalam satu baris: Nilai Risiko, Tingkat, lalu Probabilitas × Dampak dan Bobot sebagai keterangan. */
export function Penilaian({ n }: { n: PenilaianRisiko | null }) {
  if (!n) return <span className="text-[13px] whitespace-nowrap text-ink-3">belum dipantau</span>;
  return (
    <span className="grid justify-items-start gap-1">
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="terukur text-[15px] text-cool">{n.nilai}</span>
        <LabelTingkat tingkat={n.tingkat} />
      </span>
      <span className="terukur text-[12px] whitespace-nowrap text-ink-3">
        P{n.probabilitas} × D{n.dampak}, bobot {formatBobot(n.bobot)}
      </span>
    </span>
  );
}

/** Simpulan Tingkat Risiko: turun / tidak turun; null = belum dipantau. */
export function LabelTurun({ turun }: { turun: boolean | null }) {
  if (turun === null) return <span className="text-[13px] whitespace-nowrap text-ink-3">belum dipantau</span>;
  return <Pil nada={turun ? "pos" : "neg"}>{turun ? "Ada penurunan" : "Tidak ada penurunan"}</Pil>;
}
