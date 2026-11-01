import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian, LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import type { TitikCapaian } from "@/modules/capaian/service";

import { kelasKartu, LabelCapaian } from "../pengukuran/status";

/* Grafik tren Capaian vs Target: SVG biasa yang dirender di server, tanpa pustaka grafik dan tanpa JavaScript. */

/** Rentang bulan "YYYY-MM" yang disorot (keduanya termasuk), mis. periode uji coba PDSA. */
type Sorot = { mulai: string; akhir: string };
const dalamSorot = (bulan: string, s: Sorot) => bulan >= s.mulai && bulan <= s.akhir;

const [LEBAR, TINGGI] = [360, 190];
const RUANG = { kiri: 34, kanan: 6, atas: 8, bawah: 32 };
/**
 * Ukuran huruf sumbu dalam satuan viewBox, jadi ikut mengecil bersama grafik. Di layar sempit (< 640 px) grafik selebar
 * ~300–340 px, jadi hurufnya dibesarkan supaya tetap terbaca (≥ 11 px sesungguhnya pada layar 390 px).
 */
const kelasSumbu = "fill-muted-foreground text-[10px] max-sm:text-[13px]";

/** Batas atas sumbu yang bulat: 1, 2, 5, atau 10 × 10^n terkecil yang ≥ nilai. */
function batasAtas(nilai: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(nilai, 1)));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= nilai)!;
}

const bulat = (v: number) => Math.round(v * 10) / 10;

/**
 * Garis Capaian (terputus di bulan yang Capaiannya kosong) dan garis Target bertangga (Target bisa berganti setiap
 * bulan). Angka lengkap selalu ada di tabel di bawahnya; tooltip bawaan browser hanya pelengkap.
 */
export function GrafikCapaian({
  titik,
  satuan,
  judul,
  sorot,
}: {
  titik: TitikCapaian[];
  satuan: string;
  judul: string;
  sorot?: Sorot;
}) {
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
  const disorot = sorot ? titik.flatMap((t, i) => (dalamSorot(t.bulan, sorot) ? [i] : [])) : [];
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
        {disorot.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-4 rounded-sm bg-primary/10" />
            Periode uji coba
          </span>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        className="w-full max-w-[30rem] overflow-visible"
        role="img"
        aria-label={`Grafik ${judul} dan Target; angkanya ada di tabel.`}
      >
        {disorot.length > 0 && (
          <rect
            x={bulat(RUANG.kiri + slot * disorot[0])}
            y={RUANG.atas}
            width={bulat(slot * disorot.length)}
            height={tinggiPlot}
            className="fill-primary/10"
          />
        )}
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
              className={`${kelasSumbu} tabular-nums`}
            >
              {formatAngka(v)}
            </text>
          </g>
        ))}
        {titik.map((t, i) => (
          <text
            key={t.bulan}
            x={x(i)}
            y={TINGGI - RUANG.bawah + 13}
            textAnchor="middle"
            className={kelasSumbu}
          >
            {labelBulan(t.bulan, { pendek: true, tahun: false })}
            {(i === 0 || t.bulan.endsWith("-01")) && (
              <tspan x={x(i)} dy="1.15em">
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

/** Selisih Capaian terhadap Target dengan tanda: "+2", "−26,36", "0". */
const formatSelisih = (s: number | null) => (s === null ? "–" : `${s > 0 ? "+" : s < 0 ? "−" : ""}${formatAngka(Math.abs(s))}`);

/** Keterangan Capaian RS: Kelengkapan yang belum penuh. */
export const keteranganRs = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "tidak ada Unit Pelapor" : k.terverifikasi < k.wajib ? `belum lengkap (${k.terverifikasi}/${k.wajib} Unit)` : null;
/** Keterangan Capaian Unit: bukan Unit Pelapor, atau Pengukurannya belum Terverifikasi. */
export const keteranganUnit = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "bukan Unit Pelapor" : k.terverifikasi === 0 ? "belum Terverifikasi" : null;

/**
 * Grafik dan tabel satu deret Capaian (Capaian RS atau Capaian satu Unit). `analisis` = tautan Analisis di bawah nama
 * bulan (Monitoring); `sorot` = periode uji coba PDSA yang ditandai di grafik dan tabel.
 */
export function Tren(p: {
  judul: string;
  keterangan: string;
  titik: TitikCapaian[];
  satuan: string;
  catatan: (t: TitikCapaian) => string | null;
  analisis?: (t: TitikCapaian) => React.ReactNode;
  sorot?: Sorot;
}) {
  return (
    <div className={kelasKartu}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold">{p.judul}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{p.keterangan}</p>
      </div>
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-2 lg:items-start">
        <GrafikCapaian titik={p.titik} satuan={p.satuan} judul={p.judul} sorot={p.sorot} />
        <div className="-mx-1.5 min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="px-1.5 py-2 font-semibold">Bulan</th>
                <th className="px-1.5 py-2 text-right font-semibold">Capaian</th>
                <th className="px-1.5 py-2 text-right font-semibold">Target</th>
                <th className="px-1.5 py-2 text-right font-semibold">Selisih</th>
                <th className="px-1.5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.titik.map((t) => {
                const catatan = p.catatan(t);
                return (
                  <tr key={t.bulan} className="align-top">
                    <td className="px-1.5 py-2">
                      <span className="whitespace-nowrap">{labelBulan(t.bulan, { pendek: true })}</span>
                      {p.sorot && dalamSorot(t.bulan, p.sorot) && <span className="block text-[12px] text-primary">uji coba</span>}
                      {p.analisis?.(t)}
                    </td>
                    <td className="px-1.5 py-2 text-right">
                      <span className="whitespace-nowrap">
                        {/* "kosong" hanya untuk ΣD = 0 dari Pengukuran Terverifikasi; tanpa Pengukuran Terverifikasi = "–". */}
                        {t.kelengkapan.terverifikasi === 0 ? "–" : formatCapaian(t.capaian, p.satuan)}
                      </span>
                      {catatan && <span className="block text-[12px] text-warning">{catatan}</span>}
                    </td>
                    <td className="px-1.5 py-2 text-right whitespace-nowrap">{formatCapaian(t.target, p.satuan)}</td>
                    <td className="px-1.5 py-2 text-right whitespace-nowrap">{formatSelisih(t.selisih)}</td>
                    <td className="px-1.5 py-2">
                      <LabelCapaian status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
