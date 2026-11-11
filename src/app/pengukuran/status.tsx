import { LABEL_STATUS_CAPAIAN, type StatusCapaian } from "@/lib/capaian";
import { config } from "@/lib/config";
import { ServiceError } from "@/lib/errors";
import { LABEL_STATUS_PENGUKURAN, type StatusPengukuran } from "@/lib/pengukuran";
import { LABEL_STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "@/lib/perbaikan";

/* Bagian tampilan bersama halaman Pengukuran, Monitoring, Dashboard, dan Perbaikan (server component). */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Kartu, Pil, type Nada } from "../ui";

export const formatWaktu = (waktu: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: config.zonaWaktu }).format(waktu);

/** Penolakan service menjadi pesan di halaman, bukan halaman error. */
export const pesanAtau = <T,>(janji: Promise<T>) =>
  janji.catch((error) => {
    if (error instanceof ServiceError) return error.message;
    throw error;
  });

/** Pesan pengganti isi bagian (penolakan service, daftar kosong): satu kalimat dalam `Alert` bertepi putus-putus. */
export function Pesan({ children }: { children: React.ReactNode }) {
  return (
    <Alert role="alert" className="rounded-card border-rule-2 bg-paper-3 px-5 py-4">
      <AlertDescription className="text-[15px] text-ink-2">{children}</AlertDescription>
    </Alert>
  );
}

/** Pemberitahuan singkat di atas isi halaman, mis. bulan pada alamat yang diganti bulan bawaan. Kosong = tidak tampil. */
export function Pemberitahuan({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <Alert role="status" className="rounded-card border-warning-border bg-warning-soft">
      <AlertDescription className="text-[14px] text-ink">{children}</AlertDescription>
    </Alert>
  );
}

const NADA_PENGUKURAN: Record<StatusPengukuran | "belum" | "dikembalikan", Nada> = {
  belum: "warn",
  draf: "netral",
  dikembalikan: "warn",
  diajukan: "ukur",
  terverifikasi: "pos",
};

/**
 * Status Pengukuran sebagai teks (warna hanya pelengkap); null = belum diisi. `dikembalikan` = Draf yang dikembalikan
 * Kepala Unit dan belum diajukan lagi (statusnya tetap Draf).
 */
export function LabelStatus({ status, dikembalikan = false }: { status: StatusPengukuran | null; dikembalikan?: boolean }) {
  const kembali = dikembalikan && status === "draf";
  return (
    <Pil nada={NADA_PENGUKURAN[kembali ? "dikembalikan" : (status ?? "belum")]}>
      {status ? LABEL_STATUS_PENGUKURAN[status] : "Belum diisi"}
      {kembali && ", dikembalikan"}
    </Pil>
  );
}

type Riwayat = {
  statusAsal: StatusPengukuran | null;
  statusTujuan: StatusPengukuran;
  oleh: string;
  waktu: Date;
  alasan: string | null;
}[];

/** Alasan pengembalian, bila Pengukuran Draf ini terakhir dikembalikan Kepala Unit. */
export function AlasanPengembalian({ status, riwayat }: { status: StatusPengukuran; riwayat: Riwayat }) {
  const akhir = riwayat.at(-1);
  if (status !== "draf" || akhir?.statusAsal !== "diajukan") return null;
  return (
    <Alert role="status" className="rounded-card border-warning-border bg-warning-soft px-5 py-4">
      <AlertTitle className="font-medium text-warning">Dikembalikan untuk diperbaiki</AlertTitle>
      <AlertDescription className="text-foreground">
        <p className="whitespace-pre-line">{akhir.alasan}</p>
        <p className="text-[13px] text-ink-3">
          <span className="text-signal">{akhir.oleh}</span>, <span className="terukur text-cool">{formatWaktu(akhir.waktu)}</span>
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Riwayat Status Pengukuran sebagai jejak audit (tema Console): satu garis tulang rule-2, setiap entri perpindahan
 * status; orang dalam amber, waktu dalam cool (huruf ukur), alasan dalam tinta.
 */
export function RiwayatStatus({ riwayat }: { riwayat: Riwayat }) {
  if (riwayat.length === 0) return null;
  return (
    <Kartu judul="Riwayat Status">
      <ol className="mx-5 mb-5 grid border-l border-rule-2">
        {riwayat.map((r, i) => (
          <li key={i} className="grid gap-1 py-3 pl-4 first:pt-0 last:pb-0">
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
              <LabelStatus status={r.statusAsal} />
              menjadi
              <LabelStatus status={r.statusTujuan} />
            </span>
            <span className="text-[13px]">
              <span className="text-signal">{r.oleh}</span> <span className="terukur text-cool">{formatWaktu(r.waktu)}</span>
            </span>
            {r.alasan && <span className="block whitespace-pre-line">Alasan: {r.alasan}</span>}
          </li>
        ))}
      </ol>
    </Kartu>
  );
}

const NADA_CAPAIAN: Record<StatusCapaian, Nada> = { tercapai: "pos", belumTercapai: "neg" };

/** Status Capaian sebagai teks (warna hanya pelengkap); Capaian kosong tidak punya status. */
export function LabelCapaian({ status }: { status: StatusCapaian | null }) {
  if (!status) {
    return (
      <span className="text-[13px] text-ink-3">tanpa status</span>
    );
  }
  return (
    <Pil nada={NADA_CAPAIAN[status]}>{LABEL_STATUS_CAPAIAN[status]}</Pil>
  );
}

const NADA_TINDAK_LANJUT: Record<StatusTindakLanjut, Nada> = {
  direncanakan: "netral",
  berjalan: "tindak",
  selesai: "pos",
  dibatalkan: "netral",
};

/** Status Tindak Lanjut sebagai label pucat (teksnya tetap ditulis). */
export function LabelTindakLanjut({ status }: { status: StatusTindakLanjut }) {
  return <Pil nada={NADA_TINDAK_LANJUT[status]}>{LABEL_STATUS_TINDAK_LANJUT[status]}</Pil>;
}
