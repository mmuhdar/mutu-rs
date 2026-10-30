import { labelBulan } from "@/lib/bulan";
import { formatCapaian, LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import type { TitikCapaian } from "@/modules/capaian/service";

/* Grafik tren Capaian vs Target: SVG biasa yang dirender di server, tanpa pustaka grafik dan tanpa JavaScript. */

const [LEBAR, TINGGI] = [360, 190];
const RUANG = { kiri: 34, kanan: 6, atas: 8, bawah: 32 };
const BULAN_SINGKAT = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });

/** Batas atas sumbu yang bulat: 1, 2, 5, atau 10 × 10^n terkecil yang ≥ nilai. */
function batasAtas(nilai: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(nilai, 1)));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= nilai)!;
}

const bulat = (v: number) => Math.round(v * 10) / 10;
const angka = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/**
 * Garis Capaian (terputus di bulan yang Capaiannya kosong) dan garis Target bertangga (Target bisa berganti setiap
 * bulan). Angka lengkap selalu ada di tabel di bawahnya; tooltip bawaan browser hanya pelengkap.
 */
export function GrafikCapaian({ titik, satuan, judul }: { titik: TitikCapaian[]; satuan: string; judul: string }) {
  const lebarPlot = LEBAR - RUANG.kiri - RUANG.kanan;
  const tinggiPlot = TINGGI - RUANG.atas - RUANG.bawah;
  const atas = batasAtas(Math.max(...titik.flatMap((t) => [t.capaian ?? 0, t.target])));
  const slot = lebarPlot / titik.length;
  const x = (i: number) => bulat(RUANG.kiri + slot * (i + 0.5));
  const y = (v: number) => bulat(RUANG.atas + tinggiPlot * (1 - v / atas));

  let garisCapaian = "";
  titik.forEach((t, i) => {
    if (t.capaian !== null) garisCapaian += `${i > 0 && titik[i - 1].capaian !== null ? "L" : "M"}${x(i)},${y(t.capaian)} `;
  });
  const garisTarget = titik
    .map((t, i) => `${i === 0 ? "M" : "L"}${bulat(RUANG.kiri + slot * i)},${y(t.target)} H${bulat(RUANG.kiri + slot * (i + 1))}`)
    .join(" ");

  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded bg-primary" />
          {judul}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded bg-chart-target" />
          Target
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        className="w-full max-w-[30rem] overflow-visible"
        role="img"
        aria-label={`Grafik ${judul} dan Target; angkanya ada di tabel.`}
      >
        {[0, atas / 2, atas].map((v) => (
          <g key={v}>
            <line
              x1={RUANG.kiri}
              x2={LEBAR - RUANG.kanan}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={RUANG.kiri - 5}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              className="fill-muted-foreground tabular-nums"
            >
              {angka(v)}
            </text>
          </g>
        ))}
        {titik.map((t, i) => (
          <text
            key={t.bulan}
            x={x(i)}
            y={TINGGI - RUANG.bawah + 13}
            textAnchor="middle"
            fontSize={10}
            className="fill-muted-foreground"
          >
            {BULAN_SINGKAT.format(new Date(`${t.bulan}-01T00:00:00Z`))}
            {(i === 0 || t.bulan.endsWith("-01")) && (
              <tspan x={x(i)} dy={12}>
                {t.bulan.slice(0, 4)}
              </tspan>
            )}
          </text>
        ))}
        <path
          d={garisTarget}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          className="stroke-chart-target"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={garisCapaian}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-primary"
          vectorEffect="non-scaling-stroke"
        />
        {titik.map(
          (t, i) =>
            t.capaian !== null && (
              <g key={t.bulan}>
                <title>
                  {`${labelBulan(t.bulan)}: ${formatCapaian(t.capaian, satuan)}, Target ${formatCapaian(t.target, satuan)}, ` +
                    LABEL_STATUS_CAPAIAN[t.status!]}
                </title>
                <circle cx={x(i)} cy={y(t.capaian)} r={12} fill="transparent" />
                <circle cx={x(i)} cy={y(t.capaian)} r={4} strokeWidth={2} className="fill-primary stroke-surface" />
              </g>
            ),
        )}
      </svg>
    </figure>
  );
}
