import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { hariIni, labelBulan, labelTanggal } from "@/lib/bulan";
import { LABEL_PEMICU_VALIDASI, LABEL_PENYEBAB_TIDAK_VALID } from "@/lib/validasi";
import { ambilValidasi } from "@/modules/validasi/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../../ikon";
import { formatWaktu, Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { FormValidasi } from "../form-validasi";
import { Kesesuaian, LabelHasilValidasi } from "../label";

export const metadata: Metadata = { title: "Detail Validasi" };

/** Detail satu Validasi Data: isian, hasil, riwayat validasi Indikator + Unit + bulan yang sama, perbaikan catatan, validasi ulang. */
export default async function HalamanDetailValidasi({ params }: PageProps<"/validasi/[id]">) {
  const pengguna = await requireUser();
  const v = await pesanAtau(ambilValidasi(pengguna, (await params).id));
  if (typeof v === "string") return <Pesan>{v}</Pesan>;
  const ulang = `/validasi/baru?${new URLSearchParams({ indikator: v.indikator.id, unit: v.unit.id, bulan: v.bulan, pemicu: v.pemicu, pengumpul: v.pengumpulData })}`;
  const baris: [string, React.ReactNode][] = [
    ["Pemicu", LABEL_PEMICU_VALIDASI[v.pemicu]],
    ["Tanggal validasi", labelTanggal(v.tanggal)],
    ["Pengumpul data", v.pengumpulData],
    ["Validator", v.validator],
    ["Populasi", <span key="p" className="terukur">{v.populasi}</span>],
    ["Kesesuaian", <Kesesuaian key="k" persen={v.kesesuaian} sesuai={v.sesuai} sampel={v.sampel} />],
    ...(v.penyebab.length > 0 ? ([["Penyebab", v.penyebab.map((p) => LABEL_PENYEBAB_TIDAK_VALID[p]).join(", ")]] as [string, string][]) : []),
    ...(v.perbaikan ? ([["Perbaikan", v.perbaikan]] as [string, string][]) : []),
    ...(v.catatan ? ([["Catatan", v.catatan]] as [string, string][]) : []),
  ];
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Validasi ${v.indikator.kode} Unit ${v.unit.nama}`}
        kembali={[{ href: "/validasi", label: "Validasi Data" }]}
        meta={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <LabelHasilValidasi valid={v.valid} belumValid={v.belumValid} />
            <span>
              {v.indikator.nama}, data {labelBulan(v.bulan)}
            </span>
          </span>
        }
        sub={
          <>
            Dicatat oleh <span className="text-signal">{v.diubahOleh}</span>,{" "}
            <span className="terukur text-[14px] text-cool">{formatWaktu(v.diubahPada)}</span>.
          </>
        }
        aksi={
          v.belumValid &&
          v.bolehTulis && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={ulang}>
                <Ikon nama="tambah" className="size-[18px]" />
                Validasi ulang
              </Link>
            </Button>
          )
        }
      />
      {v.belumValid && (
        <Pesan>Data belum valid. Setelah perbaikan, kumpulkan ulang data dengan sampel baru lalu catat validasi ulang.</Pesan>
      )}
      <Kartu judul="Hasil validasi">
        <dl className="grid border-t border-rule">
          {baris.map(([label, isi]) => (
            <div key={label} className="grid min-w-0 gap-1 border-b border-rule px-5 py-3 last:border-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[14px] text-ink-3">{label}</dt>
              <dd className="max-w-[72ch] text-[15px] leading-6 whitespace-pre-line">{isi}</dd>
            </div>
          ))}
        </dl>
        {v.bolehTulis && (
          <Collapsible className="group/perbaiki grid gap-4 border-t border-rule px-5 py-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-self-start sm:w-auto">
                <Ikon nama="isi" className="size-4" />
                Perbaiki catatan
                <Ikon nama="bawah" className="size-4 text-ink-3 group-data-[state=open]/perbaiki:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FormValidasi
                key={v.diubahPada.toISOString()}
                id={v.id}
                indikator={[]}
                unit={[]}
                maksTanggal={hariIni()}
                awal={{
                  pemicu: v.pemicu,
                  tanggal: v.tanggal,
                  pengumpulData: v.pengumpulData,
                  validator: v.validator,
                  populasi: String(v.populasi),
                  sampel: String(v.sampel),
                  sesuai: String(v.sesuai),
                  penyebab: v.penyebab.join(","),
                  perbaikan: v.perbaikan,
                  catatan: v.catatan,
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </Kartu>
      {v.riwayat.length > 1 && (
        <Kartu judul="Riwayat validasi" sub={`Semua validasi ${v.indikator.kode} Unit ${v.unit.nama} untuk data ${labelBulan(v.bulan)}.`}>
          <ol className="mx-5 mb-5 grid border-l border-rule-2">
            {v.riwayat.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 pl-4">
                <Link href={`/validasi/${r.id}`} aria-current={r.id === v.id ? "page" : undefined} className="text-primary-ink text-[14px] aria-[current=page]:no-underline aria-[current=page]:font-medium">
                  {labelTanggal(r.tanggal)}
                </Link>
                <Kesesuaian persen={r.kesesuaian} sesuai={r.sesuai} sampel={r.sampel} />
                <LabelHasilValidasi valid={r.valid} belumValid={r.belumValid} />
                <span className="text-[13px] text-ink-3">validator {r.validator}</span>
              </li>
            ))}
          </ol>
        </Kartu>
      )}
    </Halaman>
  );
}
