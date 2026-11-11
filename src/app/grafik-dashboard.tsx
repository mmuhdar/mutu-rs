import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Ikon } from "./ikon";
import { Gelembung, GarisArea, KerangkaGrafik, ruasDari } from "./monitoring/grafik";

/* Grafik Dashboard, dirender server tanpa pustaka. Angkanya selalu juga tertulis (label kolom, tabel, nilai). */

/**
 * Persentase Indikator Tercapai per bulan (Tercapai dibanding Indikator yang dinilai) sebagai garis nilai ukur; bulan
 * tanpa Indikator yang dinilai memutus garis. Gelembung di bulan terakhir yang dinilai menulis angkanya; semua angka ada
 * di tabel "Lihat angka".
 */
export function GrafikTercapai({ data }: { data: { bulan: string; dinilai: number; tercapai: number }[] }) {
  const x = (i: number) => ((i + 0.5) / data.length) * 100;
  const y = (persen: number) => 100 - persen;
  const persen = (d: { dinilai: number; tercapai: number }) => (d.dinilai ? (d.tercapai / d.dinilai) * 100 : null);
  const terakhir = data.findLastIndex((d) => d.dinilai > 0);
  return (
    <figure className="grid gap-3">
      <KerangkaGrafik
        label="Grafik persentase Indikator Tercapai per bulan; angkanya ada di tabel di bawahnya."
        bulan={data.map((d) => d.bulan)}
        sumbu={[0, 25, 50, 75, 100].map((v) => ({ nilai: v, teks: `${v}%`, dasar: v === 0 }))}
        y={y}
      >
        <GarisArea ruas={ruasDari(data, persen, x, y)} />
        {data.map(
          (d, i) =>
            d.dinilai > 0 && (
              <span
                key={d.bulan}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cool bg-paper-2 ${i === terakhir ? "size-3.5 bg-cool" : "size-2.5"}`}
                style={{ left: `${x(i)}%`, top: `${y(persen(d)!)}%` }}
              />
            ),
        )}
        {terakhir >= 0 && (
          <Gelembung
            x={x(terakhir)}
            y={y(persen(data[terakhir])!)}
            judul={labelBulan(data[terakhir].bulan)}
            nilai={`${data[terakhir].tercapai} dari ${data[terakhir].dinilai} Tercapai`}
          />
        )}
      </KerangkaGrafik>
      <figcaption>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="link" size="sm" className="group/lihat h-auto px-0 text-primary-ink">
              <Ikon nama="kanan" className="size-4 transition-transform group-data-[state=open]/lihat:rotate-90" />
              Lihat angka
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Table aria-label="Indikator Tercapai per bulan" className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3">Bulan</TableHead>
                  <TableHead className="h-9 px-3 text-right">Dinilai</TableHead>
                  <TableHead className="h-9 px-3 text-right">Tercapai</TableHead>
                  <TableHead className="h-9 px-3 text-right">Persen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.bulan}>
                    <TableCell className="px-3 py-2">{labelBulan(d.bulan, { pendek: true })}</TableCell>
                    <TableCell className="px-3 py-2 text-right">{d.dinilai}</TableCell>
                    <TableCell className="px-3 py-2 text-right">{d.tercapai}</TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {d.dinilai ? `${formatAngka((d.tercapai / d.dinilai) * 100)}%` : <span className="text-ink-3">tidak ada</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      </figcaption>
    </figure>
  );
}

/**
 * Bar Capaian terhadap Target: panjang bar = Capaian pada skala bersama, garis tegak = Target. Skala persen 0 sampai 100; satuan
 * lain 0 sampai 1,25 × nilai terbesar. Merah bila Belum Tercapai, hijau bila Tercapai; belum ada Capaian = garis Target
 * saja.
 */
export function BarTarget(p: { capaian: number | null; target: number; satuan: string; arah: Arah; tercapai: boolean }) {
  const skala = p.satuan === "%" ? 100 : Math.max(p.target, p.capaian ?? 0) * 1.25 || 1;
  const persen = (v: number) => `${Math.min(v / skala, 1) * 100}%`;
  return (
    <span
      className="relative block h-1.5 rounded-[2px] bg-paper-3"
      title={`Capaian ${formatCapaian(p.capaian, p.satuan)}, Target ${TANDA_ARAH[p.arah]} ${formatCapaian(p.target, p.satuan)}`}
    >
      {p.capaian !== null && (
        <span
          className={`absolute inset-y-0 left-0 rounded-[2px] ${p.tercapai ? "bg-success" : "bg-danger"}`}
          style={{ width: persen(p.capaian) }}
        />
      )}
      <span aria-hidden className="absolute -inset-y-1.5 w-0.5 bg-ink" style={{ left: persen(p.target) }} />
    </span>
  );
}
