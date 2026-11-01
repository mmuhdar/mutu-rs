import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

import { Gelembung, GarisArea, KerangkaGrafik, ruasDari } from "./monitoring/grafik";

/* Grafik Dashboard, dirender server tanpa pustaka. Angkanya selalu juga tertulis (label kolom, tabel, nilai). */

/**
 * Persentase Indikator Tercapai per bulan (Tercapai dibanding Indikator yang dinilai) sebagai garis bergradasi; bulan
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
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-surface ${i === terakhir ? "size-4 ring-4 ring-primary/20" : "size-3"}`}
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
        <details>
          <summary className="cursor-pointer text-[13px] font-semibold text-primary-ink pointer-coarse:py-2">Lihat angka</summary>
          <div className="relative mt-2 min-w-0 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border text-left text-[12px] text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2 font-normal">Bulan</th>
                  <th className="px-2 py-1.5 text-right font-normal">Dinilai</th>
                  <th className="px-2 py-1.5 text-right font-normal">Tercapai</th>
                  <th className="py-1.5 pl-2 text-right font-normal">Persen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.map((d) => (
                  <tr key={d.bulan}>
                    <td className="py-1.5 pr-2">{labelBulan(d.bulan, { pendek: true })}</td>
                    <td className="px-2 py-1.5 text-right">{d.dinilai}</td>
                    <td className="px-2 py-1.5 text-right">{d.tercapai}</td>
                    <td className="py-1.5 pl-2 text-right">
                      {d.dinilai ? `${formatAngka((d.tercapai / d.dinilai) * 100)}%` : <span className="text-muted-foreground">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figcaption>
    </figure>
  );
}

/**
 * Bar Capaian terhadap Target: panjang bar = Capaian pada skala bersama, garis tegak = Target. Skala persen 0–100; satuan
 * lain 0 sampai 1,25 × nilai terbesar. Merah bila Belum Tercapai, hijau bila Tercapai; belum ada Capaian = garis Target
 * saja.
 */
export function BarTarget(p: { capaian: number | null; target: number; satuan: string; arah: Arah; tercapai: boolean }) {
  const skala = p.satuan === "%" ? 100 : Math.max(p.target, p.capaian ?? 0) * 1.25 || 1;
  const persen = (v: number) => `${Math.min(v / skala, 1) * 100}%`;
  return (
    <span
      className="relative block h-2 rounded-full bg-active"
      title={`Capaian ${formatCapaian(p.capaian, p.satuan)}, Target ${TANDA_ARAH[p.arah]} ${formatCapaian(p.target, p.satuan)}`}
    >
      {p.capaian !== null && (
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${p.tercapai ? "bg-success" : "bg-danger"}`}
          style={{ width: persen(p.capaian) }}
        />
      )}
      <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-foreground/70" style={{ left: persen(p.target) }} />
    </span>
  );
}
