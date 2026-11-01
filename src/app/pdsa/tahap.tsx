import { LABEL_TAHAP_PDSA, TAHAP_PDSA, type TahapPdsa } from "@/lib/perbaikan";

/** Tahap aktif PDSA sebagai teks (warna hanya pelengkap). */
export function LabelTahap({ tahap }: { tahap: TahapPdsa }) {
  const selesai = tahap === "selesai";
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${selesai ? "bg-success-soft text-success" : "bg-primary/10 text-primary"}`}
    >
      {selesai ? "Selesai" : `Tahap ${LABEL_TAHAP_PDSA[tahap]}`}
    </span>
  );
}

/** Urutan tahap Plan → Do → Study → Act dengan tanda sudah, sedang, atau belum (ditulis, bukan warna saja). */
export function UrutanTahap({ aktif }: { aktif: TahapPdsa }) {
  const iAktif = TAHAP_PDSA.indexOf(aktif);
  return (
    <ol className="flex flex-wrap gap-1.5 text-[13px]">
      {TAHAP_PDSA.slice(0, 4).map((t, i) => {
        const keadaan = i < iAktif ? "sudah" : i === iAktif ? "sedang" : "belum";
        return (
          <li
            key={t}
            aria-current={keadaan === "sedang" ? "step" : undefined}
            className={`rounded-md px-2.5 py-1 font-medium ${
              keadaan === "sudah"
                ? "bg-success-soft text-success"
                : keadaan === "sedang"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
            }`}
          >
            {LABEL_TAHAP_PDSA[t]}
            <span className="font-normal"> · {keadaan === "sudah" ? "selesai" : keadaan === "sedang" ? "sedang diisi" : "belum"}</span>
          </li>
        );
      })}
    </ol>
  );
}
