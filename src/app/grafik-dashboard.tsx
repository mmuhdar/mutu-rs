import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

/* Grafik Dashboard: SVG yang dirender server tanpa pustaka. Angkanya selalu juga tertulis (label kolom, tabel, nilai). */

const [LEBAR, TINGGI] = [560, 190];
const RUANG = { kiri: 40, kanan: 4, atas: 22, bawah: 34 };
/** Huruf dalam satuan viewBox; di layar sempit grafik ±340 px (skala ±0,6), jadi dibesarkan supaya ≥ 11 px sesungguhnya. */
const kelasTeks = "fill-muted-foreground text-[11px] max-sm:text-[18px]";

/**
 * Kolom "Indikator Tercapai" per bulan: tinggi = Tercapai dibanding Indikator yang dinilai (persen), label di atas
 * kolom = "Tercapai/dinilai". Bulan terakhir (yang sedang ditampilkan) memakai warna data penuh, bulan lain warna
 * muda. Bulan tanpa Indikator yang dinilai tidak punya kolom.
 */
export function GrafikTercapai({ data }: { data: { bulan: string; dinilai: number; tercapai: number }[] }) {
  const tinggiPlot = TINGGI - RUANG.atas - RUANG.bawah;
  const slot = (LEBAR - RUANG.kiri - RUANG.kanan) / data.length;
  const y = (persen: number) => RUANG.atas + tinggiPlot * (1 - persen / 100);
  return (
    <figure className="grid gap-2">
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Grafik persentase Indikator Tercapai per bulan; angkanya ada di tabel di bawahnya."
      >
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line
              x1={RUANG.kiri}
              x2={LEBAR - RUANG.kanan}
              y1={y(v)}
              y2={y(v)}
              className={v === 0 ? "stroke-chart-target" : "stroke-grid"}
              vectorEffect="non-scaling-stroke"
            />
            <text x={RUANG.kiri - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className={kelasTeks}>
              {v}%
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = RUANG.kiri + slot * i;
          const persen = d.dinilai ? (d.tercapai / d.dinilai) * 100 : null;
          const terakhir = i === data.length - 1;
          return (
            <g key={d.bulan}>
              {persen !== null && (
                <>
                  <rect
                    x={x + slot * 0.22}
                    y={y(persen)}
                    width={slot * 0.56}
                    height={tinggiPlot * (persen / 100)}
                    className={terakhir ? "fill-accent" : "fill-accent/35"}
                  />
                  <text x={x + slot / 2} y={y(persen) - 5} textAnchor="middle" className={`${kelasTeks} fill-foreground`}>
                    {d.tercapai}/{d.dinilai}
                  </text>
                </>
              )}
              <text x={x + slot / 2} y={TINGGI - RUANG.bawah + 15} textAnchor="middle" className={kelasTeks}>
                {labelBulan(d.bulan, { pendek: true, tahun: false })}
                {(d.bulan.endsWith("-01") || (i === 0 && !data[1]?.bulan.endsWith("-01"))) && (
                  <tspan x={x + slot / 2} dy="1.15em">
                    {d.bulan.slice(0, 4)}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <details>
          <summary className="cursor-pointer text-[13px] text-accent pointer-coarse:py-2">Lihat angka</summary>
          <div className="mt-2 min-w-0 overflow-x-auto">
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
      className="relative block h-2 rounded-full bg-active"
      title={`Capaian ${formatCapaian(p.capaian, p.satuan)}, Target ${TANDA_ARAH[p.arah]} ${formatCapaian(p.target, p.satuan)}`}
    >
      {p.capaian !== null && (
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${p.tercapai ? "bg-accent" : "bg-danger"}`}
          style={{ width: persen(p.capaian) }}
        />
      )}
      <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: persen(p.target) }} />
    </span>
  );
}
