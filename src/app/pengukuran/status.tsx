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
    <Alert role="alert" className="border-dashed border-input/60 px-5 py-4">
      <AlertDescription className="text-[15px]">{children}</AlertDescription>
    </Alert>
  );
}

/** Pemberitahuan singkat di atas isi halaman, mis. bulan pada alamat yang diganti bulan bawaan. Kosong = tidak tampil. */
export function Pemberitahuan({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <Alert role="status" className="border-warning-border bg-warning-soft">
      <AlertDescription className="text-[14px] text-warning">{children}</AlertDescription>
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
      {kembali && " · dikembalikan"}
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
    <Alert role="status" className="border-warning-border bg-warning-soft px-5 py-4">
      <AlertTitle className="font-bold text-warning">Dikembalikan untuk diperbaiki</AlertTitle>
      <AlertDescription className="text-foreground">
        <p className="whitespace-pre-line">{akhir.alasan}</p>
        <p className="text-[13px] text-muted-foreground">
          {akhir.oleh}, {formatWaktu(akhir.waktu)}
        </p>
      </AlertDescription>
    </Alert>
  );
}

/** Riwayat Status Pengukuran: siapa, kapan, dari status apa ke status apa, dan alasannya. */
export function RiwayatStatus({ riwayat }: { riwayat: Riwayat }) {
  if (riwayat.length === 0) return null;
  return (
    <Kartu judul="Riwayat Status">
      <ol className="grid gap-0 px-5 pb-5">
        {riwayat.map((r, i) => (
          <li key={i} className="relative border-l-2 border-ukur/25 pb-4 pl-5 last:pb-0">
            <span aria-hidden className="absolute top-1.5 -left-[7px] size-3 rounded-full border-2 border-card bg-ukur" />
            <span className="flex flex-wrap items-center gap-1.5">
              <LabelStatus status={r.statusAsal} />
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
              <span className="sr-only">menjadi</span>
              <LabelStatus status={r.statusTujuan} />
            </span>
            <span className="mt-1 block text-[13px] text-muted-foreground">
              {r.oleh}, {formatWaktu(r.waktu)}
            </span>
            {r.alasan && <span className="mt-1 block whitespace-pre-line">Alasan: {r.alasan}</span>}
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
      <span className="text-muted-foreground">
        <span aria-hidden>–</span>
        <span className="sr-only">Tanpa Status Capaian</span>
      </span>
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
