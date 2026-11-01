import { LABEL_STATUS_CAPAIAN, type StatusCapaian } from "@/lib/capaian";
import { config } from "@/lib/config";
import { ServiceError } from "@/lib/errors";
import { LABEL_STATUS_PENGUKURAN, type StatusPengukuran } from "@/lib/pengukuran";
import { LABEL_STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "@/lib/perbaikan";

/* Bagian tampilan bersama halaman Pengukuran, Monitoring, Dashboard, dan Perbaikan (server component). */

export const kelasKartu = "rounded-lg border border-border bg-surface";
export { kelasInput } from "../form";

export const formatWaktu = (waktu: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: config.zonaWaktu }).format(waktu);

/** Penolakan service menjadi pesan di halaman, bukan halaman error. */
export const pesanAtau = <T,>(janji: Promise<T>) =>
  janji.catch((error) => {
    if (error instanceof ServiceError) return error.message;
    throw error;
  });

/** Pesan pengganti isi bagian (penolakan service, daftar kosong): satu kalimat di dalam bingkai bagian itu. */
export function Pesan({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-dashed border-border px-4 py-3 text-muted-foreground">
      {children}
    </p>
  );
}

/** Pemberitahuan singkat di atas isi halaman, mis. bulan pada alamat yang diganti bulan bawaan. Kosong = tidak tampil. */
export function Pemberitahuan({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[13px] text-warning">
      {children}
    </p>
  );
}

/** Label status: pasangan pucat bernada sama (teks gelap di atas warna muda), tidak pernah terjepit. */
const kelasPil = "inline-flex h-5 flex-none items-center rounded-full px-2 text-[12px] font-medium whitespace-nowrap";

const WARNA: Record<StatusPengukuran | "belum" | "dikembalikan", string> = {
  belum: "bg-warning-soft text-warning",
  draf: "bg-active text-foreground",
  dikembalikan: "bg-warning-soft text-warning",
  diajukan: "bg-accent/10 text-accent",
  terverifikasi: "bg-success-soft text-success-ink",
};

/**
 * Status Pengukuran sebagai teks (warna hanya pelengkap); null = belum diisi. `dikembalikan` = Draf yang dikembalikan
 * Kepala Unit dan belum diajukan lagi (statusnya tetap Draf).
 */
export function LabelStatus({ status, dikembalikan = false }: { status: StatusPengukuran | null; dikembalikan?: boolean }) {
  const kembali = dikembalikan && status === "draf";
  return (
    <span className={`${kelasPil} ${WARNA[kembali ? "dikembalikan" : (status ?? "belum")]}`}>
      {status ? LABEL_STATUS_PENGUKURAN[status] : "Belum diisi"}
      {kembali && " · dikembalikan"}
    </span>
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
    <div role="status" className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
      <p className="font-semibold text-warning">Dikembalikan untuk diperbaiki</p>
      <p className="mt-1 whitespace-pre-line">{akhir.alasan}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {akhir.oleh}, {formatWaktu(akhir.waktu)}
      </p>
    </div>
  );
}

/** Riwayat Status Pengukuran: siapa, kapan, dari status apa ke status apa, dan alasannya. */
export function RiwayatStatus({ riwayat }: { riwayat: Riwayat }) {
  if (riwayat.length === 0) return null;
  return (
    <div className={kelasKartu}>
      <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">Riwayat Status</h2>
      <ol className="divide-y divide-border">
        {riwayat.map((r, i) => (
          <li key={i} className="px-4 py-3">
            <span className="font-medium">
              {r.statusAsal ? LABEL_STATUS_PENGUKURAN[r.statusAsal] : "Belum diisi"} →{" "}
              {LABEL_STATUS_PENGUKURAN[r.statusTujuan]}
            </span>
            <span className="block text-[13px] text-muted-foreground">
              {r.oleh}, {formatWaktu(r.waktu)}
            </span>
            {r.alasan && <span className="mt-1 block whitespace-pre-line">Alasan: {r.alasan}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

const WARNA_STATUS_CAPAIAN: Record<StatusCapaian, string> = {
  tercapai: "bg-success-soft text-success-ink",
  belumTercapai: "bg-danger-soft text-danger-ink",
};

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
    <span className={`${kelasPil} ${WARNA_STATUS_CAPAIAN[status]}`}>
      {LABEL_STATUS_CAPAIAN[status]}
    </span>
  );
}

const WARNA_TINDAK_LANJUT: Record<StatusTindakLanjut, string> = {
  direncanakan: "bg-active text-foreground",
  berjalan: "bg-accent/10 text-accent",
  selesai: "bg-success-soft text-success-ink",
  dibatalkan: "bg-active text-muted-foreground",
};

/** Status Tindak Lanjut sebagai label pucat (teksnya tetap ditulis). */
export function LabelTindakLanjut({ status }: { status: StatusTindakLanjut }) {
  return <span className={`${kelasPil} ${WARNA_TINDAK_LANJUT[status]}`}>{LABEL_STATUS_TINDAK_LANJUT[status]}</span>;
}
