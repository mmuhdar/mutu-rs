import Link from "next/link";

import { labelTanggal } from "@/lib/bulan";
import type { StatusTindakLanjut } from "@/lib/perbaikan";

import { LabelTindakLanjut } from "../pengukuran/status";

type BarisTindakLanjut = {
  id: string;
  tindakan: string;
  pic: string;
  tenggat: string;
  status: StatusTindakLanjut;
  catatan: string;
  lewatTenggat: boolean;
};

// Tata letak mengikuti lebar tabel (container query), bukan lebar layar: di kolom samping tetap bertumpuk.
const kolom = "@2xl:grid-cols-[minmax(0,1fr)_11rem_8.5rem_7rem] @2xl:items-baseline @2xl:gap-4";

/** Tenggat dalam teks; yang lewat ditulis merah dengan kata "lewat" (satu tanda status per baris). */
function Tenggat({ t }: { t: BarisTindakLanjut }) {
  return (
    <span className={t.lewatTenggat ? "font-medium text-danger" : undefined}>
      {labelTanggal(t.tenggat)}
      {t.lewatTenggat && " · lewat"}
    </span>
  );
}

/**
 * Tindak Lanjut sebagai tabel: Tindakan, PIC, Tenggat, Status, dipisah garis baris tanpa pita header. Bila tabel lebih
 * sempit dari 42rem (HP atau kolom samping) setiap baris menjadi dua baris teks (tindakan + status, lalu PIC dan
 * tenggat). `atas` = keterangan kecil di atas tindakan, `href` = baris menjadi tautan, `bawah` = isi selebar tabel di
 * bawah baris (mis. form ubah).
 */
export function TabelTindakLanjut<T extends BarisTindakLanjut>({
  daftar,
  atas,
  href,
  bawah,
}: {
  daftar: T[];
  atas?: (t: T) => React.ReactNode;
  href?: (t: T) => string;
  bawah?: (t: T) => React.ReactNode;
}) {
  return (
    <div role="table" aria-label="Tindak Lanjut" className="@container">
      <div role="row" className={`hidden border-b border-border px-4 pb-2 text-[12px] font-semibold text-muted-foreground @2xl:grid ${kolom}`}>
        <span role="columnheader">Tindakan</span>
        <span role="columnheader">PIC</span>
        <span role="columnheader">Tenggat</span>
        <span role="columnheader">Status</span>
      </div>
      <div className="divide-y divide-rule">
        {daftar.map((t) => {
          const sel = (
            <>
              <span role="cell" className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0">
                  {atas && <span className="block text-[12px] text-muted-foreground">{atas(t)}</span>}
                  <span className="block font-medium whitespace-pre-line">{t.tindakan}</span>
                  {t.catatan && (
                    <span className="mt-0.5 block text-[13px] whitespace-pre-line text-muted-foreground">
                      {t.status === "dibatalkan" ? "Alasan" : "Catatan"}: {t.catatan}
                    </span>
                  )}
                </span>
                <span className="@2xl:hidden">
                  <LabelTindakLanjut status={t.status} />
                </span>
              </span>
              <span role="cell" className="text-[13px] text-muted-foreground @2xl:text-[14px] @2xl:text-foreground">
                <span className="@2xl:hidden">PIC </span>
                {t.pic}
                <span className="@2xl:hidden">
                  {" · "}
                  <Tenggat t={t} />
                </span>
              </span>
              <span role="cell" className="hidden @2xl:block">
                <Tenggat t={t} />
              </span>
              <span role="cell" className="hidden @2xl:block">
                <LabelTindakLanjut status={t.status} />
              </span>
            </>
          );
          const kelas = `grid gap-1 px-4 py-3 ${kolom}`;
          return (
            <div key={t.id} role="rowgroup">
              {href ? (
                <Link role="row" href={href(t)} className={`${kelas} hover:bg-area-tint/60`}>
                  {sel}
                </Link>
              ) : (
                <div role="row" className={kelas}>
                  {sel}
                </div>
              )}
              {bawah && <div className="px-4 pb-3">{bawah(t)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
