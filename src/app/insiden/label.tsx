import { LABEL_STATUS_INSIDEN, LABEL_WARNA_GRADING, type StatusInsiden, type WarnaGrading } from "@/lib/insiden";

import { Pil, type Nada } from "../ui";

/*
 * Label Insiden (tema Console): status dan warna grading selalu ditulis, warna hanya pelengkap. Warna grading memakai
 * token yang paling dekat: biru = cool, hijau = ok, kuning = amber, merah = bad.
 */

const NADA_STATUS: Record<StatusInsiden, Nada> = {
  dilaporkan: "warn",
  investigasi: "tindak",
  ditinjau: "netral",
  rca: "tindak",
  selesai: "pos",
  bukanInsiden: "redup",
};

export const NADA_WARNA: Record<WarnaGrading, Nada> = { biru: "ukur", hijau: "pos", kuning: "warn", merah: "neg" };

/** Kelas sel matriks per warna grading (latar lembut + teks), sama dengan `Pil` nada itu. */
export const SEL_WARNA: Record<WarnaGrading, string> = {
  biru: "bg-cool-soft text-cool",
  hijau: "bg-ok-soft text-ok",
  kuning: "bg-signal-soft text-signal",
  merah: "bg-bad-soft text-bad",
};

export function LabelStatusInsiden({ status }: { status: StatusInsiden }) {
  return <Pil nada={NADA_STATUS[status]}>{LABEL_STATUS_INSIDEN[status]}</Pil>;
}

/** Warna grading; null = belum digrading. */
export function LabelWarna({ warna }: { warna: WarnaGrading | null }) {
  if (!warna) return <span className="text-[13px] whitespace-nowrap text-ink-3">belum digrading</span>;
  return <Pil nada={NADA_WARNA[warna]}>{LABEL_WARNA_GRADING[warna]}</Pil>;
}
