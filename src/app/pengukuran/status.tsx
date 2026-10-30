import { config } from "@/lib/config";
import { ServiceError } from "@/lib/errors";
import { LABEL_STATUS_PENGUKURAN, type StatusPengukuran } from "@/lib/pengukuran";

/* Bagian tampilan bersama halaman Pengukuran (server component). */

export const kelasKartu = "rounded-lg border border-border bg-surface shadow-xs";
export const kelasInput =
  "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring";

export const formatWaktu = (waktu: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: config.zonaWaktu }).format(waktu);

/** Penolakan service menjadi pesan di halaman, bukan halaman error. */
export const pesanAtau = <T,>(janji: Promise<T>) =>
  janji.catch((error) => {
    if (error instanceof ServiceError) return error.message;
    throw error;
  });

export function Pesan({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className={`${kelasKartu} p-4`}>
      {children}
    </p>
  );
}

const WARNA: Record<StatusPengukuran | "belum", string> = {
  belum: "bg-warning-soft text-warning",
  draf: "border border-border bg-background",
  diajukan: "bg-primary/10 text-primary",
  terverifikasi: "bg-success-soft text-success",
};

/** Status Pengukuran sebagai teks (warna hanya pelengkap); null = belum diisi. */
export function LabelStatus({ status }: { status: StatusPengukuran | null }) {
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${WARNA[status ?? "belum"]}`}>
      {status ? LABEL_STATUS_PENGUKURAN[status] : "Belum diisi"}
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
