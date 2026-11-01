import { labelTanggal } from "@/lib/bulan";
import type { StatusTindakLanjut } from "@/lib/perbaikan";

import { LabelTindakLanjut } from "../pengukuran/status";
import { KotakIkon, TautanIkon } from "../ui";

type BarisTindakLanjut = {
  id: string;
  tindakan: string;
  pic: string;
  tenggat: string;
  status: StatusTindakLanjut;
  catatan: string;
  lewatTenggat: boolean;
};

/** Tenggat dalam teks; yang lewat ditulis merah dengan kata "lewat" (satu tanda status per baris). */
function Tenggat({ t }: { t: BarisTindakLanjut }) {
  return (
    <span className={t.lewatTenggat ? "font-semibold text-danger-ink" : undefined}>
      {labelTanggal(t.tenggat)}
      {t.lewatTenggat && " · lewat"}
    </span>
  );
}

/**
 * Tindak Lanjut sebagai tabel: kepala abu muda bersudut bulat, garis baris tipis, status sebagai label pucat, dan
 * tombol ikon ke Analisis-nya. Tata letak mengikuti lebar tabel (container query), bukan lebar layar: bila tabel lebih
 * sempit dari 42rem (HP atau kolom samping) setiap baris menjadi dua baris teks (tindakan + status, lalu PIC dan
 * tenggat + tombol). `atas` = keterangan kecil di atas tindakan, `href` = tautan ke Analisis-nya (kolom Aksi), `bawah` =
 * isi selebar tabel di bawah baris (mis. form ubah).
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
  const kolom = `@2xl:items-center @2xl:gap-4 ${
    href
      ? "@2xl:grid-cols-[minmax(0,1fr)_10rem_9.5rem_7.5rem_2.25rem]"
      : "@2xl:grid-cols-[minmax(0,1fr)_10rem_9.5rem_7.5rem]"
  }`;
  const aksi = (t: T) => href && <TautanIkon href={href(t)} ikon="lihat" label={`Buka Analisis: ${t.tindakan}`} />;
  return (
    <div role="table" aria-label="Tindak Lanjut" className="@container px-3 pb-2">
      <div
        role="row"
        className={`hidden rounded-xl bg-head px-4 py-3 text-[12px] font-semibold text-muted-foreground @2xl:grid ${kolom}`}
      >
        <span role="columnheader">Tindakan</span>
        <span role="columnheader">PIC</span>
        <span role="columnheader">Tenggat</span>
        <span role="columnheader">Status</span>
        {href && (
          <span role="columnheader" className="text-right">
            Aksi
          </span>
        )}
      </div>
      {daftar.map((t) => (
        <div key={t.id} role="rowgroup" className="border-b border-rule last:border-0">
          <div role="row" className={`grid gap-1.5 px-2 py-3.5 @2xl:px-4 ${kolom}`}>
            <span role="cell" className="flex min-w-0 items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="hidden @2xl:block">
                  <KotakIkon nada="tindak" ikon="tindakLanjut" kecil />
                </span>
                <span className="min-w-0">
                  {atas && <span className="block text-[12px] text-muted-foreground">{atas(t)}</span>}
                  <span className="block font-semibold whitespace-pre-line">{t.tindakan}</span>
                  {t.catatan && (
                    <span className="mt-0.5 block text-[13px] whitespace-pre-line text-muted-foreground">
                      {t.status === "dibatalkan" ? "Alasan" : "Catatan"}: {t.catatan}
                    </span>
                  )}
                </span>
              </span>
              <span className="@2xl:hidden">
                <LabelTindakLanjut status={t.status} />
              </span>
            </span>
            <span
              role="cell"
              className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground @2xl:block @2xl:text-[14px] @2xl:text-foreground"
            >
              <span className="min-w-0">
                <span className="@2xl:hidden">PIC </span>
                {t.pic}
                <span className="@2xl:hidden">
                  {" · "}
                  <Tenggat t={t} />
                </span>
              </span>
              {href && <span className="@2xl:hidden">{aksi(t)}</span>}
            </span>
            <span role="cell" className="hidden whitespace-nowrap @2xl:block">
              <Tenggat t={t} />
            </span>
            <span role="cell" className="hidden @2xl:block">
              <LabelTindakLanjut status={t.status} />
            </span>
            {href && (
              <span role="cell" className="hidden text-right @2xl:block">
                {aksi(t)}
              </span>
            )}
          </div>
          {bawah && <div className="px-2 pb-3.5 @2xl:pr-4 @2xl:pl-16">{bawah(t)}</div>}
        </div>
      ))}
    </div>
  );
}
