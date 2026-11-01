import Link from "next/link";

import { LABEL_TAHAP_PDSA, TAHAP_ISIAN_PDSA, TAHAP_PDSA, type TahapIsianPdsa, type TahapPdsa } from "@/lib/perbaikan";

import { Ikon } from "../ikon";
import { kelasKartu, Pil } from "../ui";

/*
 * Tampilan tahap PDSA. Warna = keadaan: tahap yang sedang diisi merah muda (warna PDSA), tahap selesai hijau, yang belum
 * abu-abu; keadaannya selalu juga ditulis. Ungu hanya untuk pilihan (tab yang sedang dibuka).
 */

/** Tahap aktif PDSA sebagai label (warna hanya pelengkap teks). */
export function LabelTahap({ tahap }: { tahap: TahapPdsa }) {
  return tahap === "selesai" ? <Pil nada="pos">Selesai</Pil> : <Pil nada="pdsa">Tahap {LABEL_TAHAP_PDSA[tahap]}</Pil>;
}

/** Keadaan satu tahap terhadap tahap aktif. */
const keadaan = (t: TahapIsianPdsa, aktif: TahapPdsa) => {
  const [i, iAktif] = [TAHAP_PDSA.indexOf(t), TAHAP_PDSA.indexOf(aktif)];
  return i < iAktif ? "selesai" : i === iAktif ? "sedang diisi" : "belum";
};

/** Jejak ringkas empat tahap untuk daftar, seperti bar kemajuan: ruas hijau = selesai, merah muda = sedang diisi. */
export function JejakTahap({ aktif }: { aktif: TahapPdsa }) {
  return (
    <span
      role="img"
      aria-label={aktif === "selesai" ? "Semua tahap selesai" : `Tahap ${LABEL_TAHAP_PDSA[aktif]} sedang diisi`}
      className="grid min-w-36 grid-cols-4 gap-1"
    >
      {TAHAP_ISIAN_PDSA.map((t) => {
        const k = keadaan(t, aktif);
        return (
          <span key={t} className="grid gap-1">
            <span className={`h-2 rounded-full ${k === "selesai" ? "bg-success" : k === "sedang diisi" ? "bg-pdsa" : "bg-active"}`} />
            <span
              className={`text-[11px] leading-4 font-semibold ${k === "selesai" ? "text-success-ink" : k === "sedang diisi" ? "text-pdsa-ink" : "text-muted-foreground"}`}
            >
              {LABEL_TAHAP_PDSA[t]}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const LINGKARAN = {
  selesai: "bg-success text-white",
  "sedang diisi": "bg-pdsa text-white ring-4 ring-pdsa-tint",
  belum: "border-2 border-border bg-surface text-muted-foreground",
} as const;
const KETERANGAN = { selesai: "text-success-ink", "sedang diisi": "text-pdsa-ink", belum: "text-muted-foreground" } as const;

/**
 * Tahap Plan · Do · Study · Act sebagai stepper yang bisa diketuk (`?tahap=`, tanpa JavaScript): lingkaran bernomor
 * (centang bila selesai) dihubungkan garis yang hijau sampai tahap aktif. Tab yang dibuka berlatar ungu pucat.
 */
export function TabTahap({ id, aktif, dipilih }: { id: string; aktif: TahapPdsa; dipilih: TahapIsianPdsa }) {
  return (
    <nav aria-label="Tahap PDSA" className={`${kelasKartu} p-2 sm:p-3`}>
      <ol className="grid grid-cols-4">
        {TAHAP_ISIAN_PDSA.map((t, i) => {
          const k = keadaan(t, aktif);
          return (
            <li
              key={t}
              // Garis penghubung: separuh kiri menuju tahap ini, separuh kanan menuju tahap berikutnya.
              className={`relative min-w-0 before:absolute before:top-[30px] before:right-1/2 before:left-0 before:h-0.5 after:absolute after:top-[30px] after:right-0 after:left-1/2 after:h-0.5 first:before:hidden last:after:hidden sm:before:top-[34px] sm:after:top-[34px] ${
                k === "belum" ? "before:bg-border" : "before:bg-success"
              } ${k === "selesai" ? "after:bg-success" : "after:bg-border"}`}
            >
              <Link
                href={`/pdsa/${id}?tahap=${t}`}
                aria-current={t === dipilih ? "page" : undefined}
                className="group grid justify-items-center gap-1 rounded-xl px-1 py-3 text-center hover:bg-active aria-[current=page]:bg-primary-tint sm:py-4"
              >
                <span
                  aria-hidden
                  className={`relative z-10 grid size-9 place-items-center rounded-full text-[14px] font-bold ${LINGKARAN[k]}`}
                >
                  {k === "selesai" ? <Ikon nama="cek" className="size-4" /> : i + 1}
                </span>
                <span className="mt-1 text-[15px] leading-5 font-bold group-aria-[current=page]:text-primary-ink">
                  {LABEL_TAHAP_PDSA[t]}
                </span>
                <span className={`text-[12px] leading-4 font-semibold ${KETERANGAN[k]}`}>{k}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
