import { LABEL_STATUS_PENGUKURAN, type StatusPengukuran } from "@/lib/pengukuran";

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
