import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

import { KerangkaGrafik } from "./monitoring/grafik";

/* Grafik Dashboard, dirender server tanpa pustaka. Angkanya selalu juga tertulis (label kolom, tabel, nilai). */

/**
 * Kolom "Indikator Tercapai" per bulan: tinggi = Tercapai dibanding Indikator yang dinilai (persen), label di atas
 * kolom = "Tercapai/dinilai" (di grafik sempit hanya kolom terakhir, angka lengkapnya di tabel). Bulan terakhir (yang
 * sedang ditampilkan) memakai warna data penuh, bulan lain warna muda. Bulan tanpa Indikator yang dinilai tidak punya
 * kolom.
 */
export function GrafikTercapai({ data }: { data: { bulan: string; dinilai: number; tercapai: number }[] }) {
  return (
    <figure className="grid gap-3">
      <KerangkaGrafik
        label="Grafik persentase Indikator Tercapai per bulan; angkanya ada di tabel di bawahnya."
        bulan={data.map((d) => d.bulan)}
        sumbu={[0, 50, 100].map((v) => ({ nilai: v, teks: `${v}%`, dasar: v === 0 }))}
        y={(v) => 100 - v}
      >
        <div className="absolute inset-0 flex">
          {data.map((d, i) => {
            const terakhir = i === data.length - 1;
            return (
              <div key={d.bulan} className="relative flex-1">
                {d.dinilai > 0 && (
                  <div
                    className={`absolute inset-x-[20%] bottom-0 rounded-t-md ${terakhir ? "bg-area" : "bg-area/30"}`}
                    style={{ height: `calc(${d.tercapai} / ${d.dinilai} * 100%)` }}
                  >
                    <span
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 pb-1 whitespace-nowrap text-foreground ${terakhir ? "font-semibold" : "@max-lg:hidden"}`}
                    >
                      {d.tercapai}/{d.dinilai}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </KerangkaGrafik>
      <figcaption>
        <details>
          <summary className="cursor-pointer text-[13px] font-semibold text-area-ink pointer-coarse:py-2">Lihat angka</summary>
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
 * Bar Capaian terhadap Target (bullet): panjang bar = Capaian pada skala bersama, garis tegak 2px = Target. Skala persen
 * 0–100; satuan lain 0 sampai 1,25 × nilai terbesar. Merah bila Belum Tercapai, teal bila Tercapai; belum ada Capaian
 * = garis Target saja.
 */
export function BarTarget(p: { capaian: number | null; target: number; satuan: string; arah: Arah; tercapai: boolean }) {
  const skala = p.satuan === "%" ? 100 : Math.max(p.target, p.capaian ?? 0) * 1.25 || 1;
  const persen = (v: number) => `${Math.min(v / skala, 1) * 100}%`;
  return (
    <span
      className="relative block h-2.5 rounded-full bg-active"
      title={`Capaian ${formatCapaian(p.capaian, p.satuan)}, Target ${TANDA_ARAH[p.arah]} ${formatCapaian(p.target, p.satuan)}`}
    >
      {p.capaian !== null && (
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${p.tercapai ? "bg-success" : "bg-danger"}`}
          style={{ width: persen(p.capaian) }}
        />
      )}
      <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: persen(p.target) }} />
    </span>
  );
}
