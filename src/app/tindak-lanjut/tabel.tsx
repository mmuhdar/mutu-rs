import { labelTanggal } from "@/lib/bulan";
import type { StatusTindakLanjut } from "@/lib/perbaikan";

import { LabelTindakLanjut } from "../pengukuran/status";
import { TautanIkon } from "../ui";

type BarisTindakLanjut = {
  id: string;
  tindakan: string;
  pic: string;
  tenggat: string;
  status: StatusTindakLanjut;
  catatan: string;
  lewatTenggat: boolean;
  mendekatiTenggat: boolean;
};

/**
 * Tenggat dalam teks; yang lewat ditulis amber (penyimpangan yang harus ditindaklanjuti) dengan kata "lewat", yang
 * mendekati tenggat (≤ 7 hari) dengan kata "mendekati" dalam amber (satu tanda tenggat per baris).
 */
function Tenggat({ t }: { t: BarisTindakLanjut }) {
  return (
    <span className={t.lewatTenggat ? "font-medium text-signal" : undefined}>
      {labelTanggal(t.tenggat)}
      {t.lewatTenggat && ", lewat"}
      {t.mendekatiTenggat && <span className="text-signal">, mendekati</span>}
    </span>
  );
}

/**
 * Tindak Lanjut sebagai buku (ledger): kepala tabel bergaris rambut tanpa latar, garis baris tipis, status sebagai label
 * pucat, dan tombol ikon ke Analisis-nya. Tata letak mengikuti lebar tabel (container query), bukan lebar layar: bila
 * tabel lebih sempit dari 42rem (HP atau kolom samping) setiap baris menjadi dua baris teks (tindakan + status, lalu PIC
 * dan tenggat + tombol). `atas` = keterangan kecil di atas tindakan, `href` = tautan ke Analisis-nya (kolom Aksi),
 * `bawah` = isi selebar tabel di bawah baris (mis. form ubah).
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
    <div role="table" aria-label="Tindak Lanjut" className="@container px-2 pb-2 sm:px-3">
      <div role="row" className={`hidden border-b border-rule-2 px-3 pb-2.5 text-[13px] font-medium text-ink-3 @2xl:grid ${kolom}`}>
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
          <div role="row" className={`grid gap-2 px-3 py-4 ${kolom}`}>
            <span role="cell" className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0">
                {atas && <span className="mb-1 block text-[13px] text-ink-3">{atas(t)}</span>}
                <span className="block text-[15px] leading-6 font-medium whitespace-pre-line">{t.tindakan}</span>
                {t.catatan && (
                  <span className="mt-1 block text-[14px] leading-5 whitespace-pre-line text-ink-2">
                    {t.status === "dibatalkan" ? "Alasan" : "Catatan"}: {t.catatan}
                  </span>
                )}
              </span>
              <span className="@2xl:hidden">
                <LabelTindakLanjut status={t.status} />
              </span>
            </span>
            <span
              role="cell"
              className="flex items-center justify-between gap-3 text-[14px] text-ink-2 @2xl:block @2xl:text-[15px] @2xl:text-ink"
            >
              <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5">
                <span>
                  <span className="text-ink-3 @2xl:hidden">PIC </span>
                  {t.pic}
                </span>
                <span className="@2xl:hidden">
                  <span className="text-ink-3">Tenggat </span>
                  <Tenggat t={t} />
                </span>
              </span>
              {href && <span className="@2xl:hidden">{aksi(t)}</span>}
            </span>
            <span role="cell" className="hidden text-[15px] whitespace-nowrap @2xl:block">
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
          {bawah && <div className="px-3 pb-4">{bawah(t)}</div>}
        </div>
      ))}
    </div>
  );
}
