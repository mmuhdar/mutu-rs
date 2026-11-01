import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian, LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import type { TitikCapaian } from "@/modules/capaian/service";

import { LabelCapaian } from "../pengukuran/status";
import { kelasKartu } from "../ui";

/*
 * Grafik tren Capaian vs Target, dirender di server tanpa pustaka grafik dan tanpa JavaScript. Garis dan bidang
 * Capaian (warna area halaman) serta garis Target putus-putus = SVG yang meregang mengikuti lebar (garisnya tidak ikut
 * diskalakan); label sumbu, garis bantu, sorotan, dan titik bulanan = HTML berposisi persen, jadi hurufnya selalu
 * 12 px sungguhan di HP maupun layar lebar. Titik berwarna menurut Status Capaian (hijau Tercapai, merah Belum
 * Tercapai). Angka lengkap selalu ada di tabel di bawahnya.
 */

/** Rentang bulan "YYYY-MM" yang disorot (keduanya termasuk), mis. periode uji coba PDSA. */
type Sorot = { mulai: string; akhir: string };
const dalamSorot = (bulan: string, s: Sorot) => bulan >= s.mulai && bulan <= s.akhir;

/** Batas atas sumbu yang bulat: 1, 2, 5, atau 10 × 10^n terkecil yang ≥ nilai. */
function batasAtas(nilai: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(nilai, 1)));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= nilai)!;
}

/**
 * Kerangka grafik bersama (juga grafik Dashboard): kolom sumbu kiri, bidang plot setinggi tetap, dan label bulan di
 * bawahnya; tahun ditulis di bawah Januari dan di bawah bulan pertama (kecuali bila bulan berikutnya Januari).
 */
export function KerangkaGrafik(p: {
  label: string;
  bulan: string[];
  sumbu: { nilai: number; teks: string; dasar?: boolean }[];
  /** Posisi nilai sumbu dari atas bidang plot, dalam persen. */
  y: (v: number) => number;
  children: React.ReactNode;
}) {
  return (
    <div role="img" aria-label={p.label} className="@container grid grid-cols-[2.5rem_minmax(0,1fr)] text-[12px] leading-4 text-muted-foreground">
      <div className="relative">
        {p.sumbu.map((s) => (
          <span key={s.nilai} className="absolute right-2.5 -translate-y-1/2" style={{ top: `${p.y(s.nilai)}%` }}>
            {s.teks}
          </span>
        ))}
      </div>
      <div className="relative h-52 sm:h-60">
        {p.sumbu.map((s) => (
          <span
            key={s.nilai}
            className={`absolute inset-x-0 border-t ${s.dasar ? "border-chart-target/50" : "border-grid"}`}
            style={{ top: `${p.y(s.nilai)}%` }}
          />
        ))}
        {p.children}
      </div>
      {/* Di grafik sempit 12 label bulan hampir bersentuhan: huruf 11 px, batas terkecil yang masih terbaca. */}
      <div className="col-start-2 mt-2 flex @max-md:text-[11px]">
        {p.bulan.map((b, i) => (
          <span key={b} className="min-w-0 flex-1 text-center whitespace-nowrap">
            {labelBulan(b, { pendek: true, tahun: false })}
            {(b.endsWith("-01") || (i === 0 && !p.bulan[1]?.endsWith("-01"))) && <span className="block">{b.slice(0, 4)}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GrafikCapaian({ titik, satuan, judul, sorot }: { titik: TitikCapaian[]; satuan: string; judul: string; sorot?: Sorot }) {
  const atas = batasAtas(Math.max(...titik.flatMap((t) => [t.capaian ?? 0, t.target])) * 1.05);
  // Koordinat dalam persen bidang plot: x di tengah kolom bulan, y dari atas.
  const x = (i: number) => ((i + 0.5) / titik.length) * 100;
  const y = (v: number) => (1 - v / atas) * 100;

  // Ruas-ruas garis Capaian: terputus di bulan yang Capaiannya kosong; setiap ruas punya bidang lembut di bawahnya.
  const ruas = titik.reduce<number[][]>((semua, t, i) => {
    if (t.capaian === null) return semua;
    if (i > 0 && titik[i - 1].capaian !== null) return [...semua.slice(0, -1), [...semua.at(-1)!, i]];
    return [...semua, [i]];
  }, []);
  const garis = (r: number[]) => r.map((i, k) => `${k ? "L" : "M"}${x(i)},${y(titik[i].capaian!)}`).join(" ");
  const bidang = (r: number[]) => `${garis(r)} L${x(r.at(-1)!)},100 L${x(r[0])},100 Z`;
  const garisTarget = titik
    .map((t, i) => `${i ? "L" : "M"}${(i / titik.length) * 100},${y(t.target)} H${((i + 1) / titik.length) * 100}`)
    .join(" ");
  const disorot = sorot ? titik.flatMap((t, i) => (dalamSorot(t.bulan, sorot) ? [i] : [])) : [];

  return (
    <figure className="grid gap-4">
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-1 w-5 rounded-full bg-area" />
          {judul}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-success" />
          Tercapai
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-danger" />
          Belum Tercapai
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-5 border-t-2 border-dashed border-chart-target" />
          Target
        </span>
        {disorot.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-5 rounded-sm bg-area/15" />
            Periode uji coba
          </span>
        )}
      </figcaption>
      <KerangkaGrafik
        label={`Grafik ${judul} dan Target; angkanya ada di tabel.`}
        bulan={titik.map((t) => t.bulan)}
        sumbu={[0, atas / 2, atas].map((v) => ({ nilai: v, teks: formatAngka(v), dasar: v === 0 }))}
        y={y}
      >
        {disorot.length > 0 && (
          <span
            className="absolute inset-y-0 rounded-lg bg-area/10"
            style={{ left: `${(disorot[0] / titik.length) * 100}%`, width: `${(disorot.length / titik.length) * 100}%` }}
          />
        )}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
          {ruas.map((r) => (
            <path key={r[0]} d={bidang(r)} className="fill-area/12" />
          ))}
          <path
            d={garisTarget}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="stroke-chart-target"
            vectorEffect="non-scaling-stroke"
          />
          {ruas.map((r) => (
            <path
              key={r[0]}
              d={garis(r)}
              fill="none"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-area"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {titik.map(
          (t, i) =>
            t.capaian !== null && (
              <span
                key={t.bulan}
                title={`${labelBulan(t.bulan)}: ${formatCapaian(t.capaian, satuan)}, Target ${formatCapaian(t.target, satuan)}, ${LABEL_STATUS_CAPAIAN[t.status!]}`}
                className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${t.status === "tercapai" ? "bg-success" : "bg-danger"}`}
                style={{ left: `${x(i)}%`, top: `${y(t.capaian)}%` }}
              />
            ),
        )}
      </KerangkaGrafik>
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
 * Grafik dan tabel satu deret Capaian (Capaian RS atau Capaian satu Unit): grafik selebar kartu, tabel bulanan (terbaru
 * di atas) di bawahnya. `analisis` = tautan Analisis di samping nama bulan (Monitoring); `sorot` = periode uji coba
 * PDSA; `polos` = tanpa bingkai kartu sendiri, bila sudah berada di dalam kartu lain.
 */
export function Tren(p: {
  judul: string;
  keterangan: string;
  titik: TitikCapaian[];
  satuan: string;
  catatan: (t: TitikCapaian) => string | null;
  analisis?: (t: TitikCapaian) => React.ReactNode;
  sorot?: Sorot;
  polos?: boolean;
}) {
  return (
    <section className={p.polos ? "min-w-0" : `${kelasKartu} min-w-0`}>
      <div className={p.polos ? "pb-3" : "px-5 pt-4 pb-2"}>
        <h2 className="text-[16px] leading-6 font-semibold">{p.judul}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{p.keterangan}</p>
      </div>
      <div className={p.polos ? "grid gap-5" : "grid gap-5 px-5 pb-5"}>
        <GrafikCapaian titik={p.titik} satuan={p.satuan} judul={p.judul} sorot={p.sorot} />
        {/* relative: teks sr-only (posisi absolut) di sel tabel tetap di dalam area geser, tidak melebarkan halaman. */}
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Bulan</th>
                <th className="px-3 py-2 text-right font-semibold">Capaian</th>
                <th className="px-3 py-2 text-right font-semibold">Target</th>
                <th className="px-3 py-2 text-right font-semibold">Selisih</th>
                <th className="py-2 pl-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {p.titik.toReversed().map((t) => {
                const catatan = p.catatan(t);
                return (
                  <tr key={t.bulan} className={p.sorot && dalamSorot(t.bulan, p.sorot) ? "bg-area/5" : undefined}>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium whitespace-nowrap">{labelBulan(t.bulan, { pendek: true })}</span>
                      {p.sorot && dalamSorot(t.bulan, p.sorot) && (
                        <span className="ml-2 text-[12px] font-semibold text-area-ink">uji coba</span>
                      )}
                      {p.analisis?.(t)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-semibold whitespace-nowrap">
                        {/* "kosong" hanya untuk ΣD = 0 dari Pengukuran Terverifikasi; tanpa Pengukuran Terverifikasi = "–". */}
                        {t.kelengkapan.terverifikasi === 0 ? (
                          <span className="text-muted-foreground">–</span>
                        ) : (
                          formatCapaian(t.capaian, p.satuan)
                        )}
                      </span>
                      {catatan && <span className="block text-[12px] text-warning">{catatan}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted-foreground">{formatCapaian(t.target, p.satuan)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatSelisih(t.selisih)}</td>
                    <td className="py-2.5 pl-3">
                      <LabelCapaian status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
