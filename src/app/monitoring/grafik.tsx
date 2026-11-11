import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian, LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import type { TitikCapaian } from "@/modules/capaian/service";

import { LabelCapaian } from "../pengukuran/status";
import { Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TUMPUK } from "../ui";

/*
 * Grafik tren Capaian vs Target (run chart), dirender di server tanpa pustaka grafik dan tanpa JavaScript. Garis
 * Capaian (cool, instrumen) dengan bidang datar tipis di bawahnya, dan garis Target bertangga (tinta redup) = SVG yang
 * meregang mengikuti lebar (garisnya tidak ikut diskalakan); label sumbu, garis bantu, sorotan, dan titik bulanan = HTML
 * berposisi persen, jadi hurufnya selalu 12 px sungguhan di HP maupun layar lebar. Titik berwarna menurut Status Capaian
 * (ok Tercapai, bad Belum Tercapai). Angka lengkap selalu ada di tabel di bawahnya.
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
  /** Tinggi bidang plot (kelas Tailwind); bawaan = grafik Dashboard. */
  tinggi?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="img" aria-label={p.label} className="@container grid grid-cols-[2.5rem_minmax(0,1fr)] text-[12px] leading-4 text-ink-3">
      <div className="relative">
        {p.sumbu.map((s) => (
          <span key={s.nilai} className="absolute right-2.5 -translate-y-1/2" style={{ top: `${p.y(s.nilai)}%` }}>
            {s.teks}
          </span>
        ))}
      </div>
      <div className={`relative ${p.tinggi ?? "h-52 sm:h-60"}`}>
        {p.sumbu.map((s) => (
          <span
            key={s.nilai}
            className={`absolute inset-x-0 border-t ${s.dasar ? "border-chart-target/50" : "border-grid"}`}
            style={{ top: `${p.y(s.nilai)}%` }}
          />
        ))}
        {p.children}
      </div>
      {/*
        Di grafik sempit (< 28rem) label bulan berselang satu, dihitung dari bulan terakhir supaya bulan terakhir selalu
        berlabel; label tahun tetap terlihat.
      */}
      <div className="col-start-2 mt-2 flex">
        {p.bulan.map((b, i) => (
          <span
            key={b}
            className={`min-w-0 flex-1 text-center whitespace-nowrap ${(p.bulan.length - 1 - i) % 2 === 1 ? "@max-md:invisible" : ""}`}
          >
            {labelBulan(b, { pendek: true, tahun: false })}
            {(b.endsWith("-01") || (i === 0 && !p.bulan[1]?.endsWith("-01"))) && <span className="block @max-md:visible">{b.slice(0, 4)}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ruas garis yang bersambung: titik [x, y] dalam persen bidang plot. Bulan tanpa nilai memutus garis. */
export const ruasDari = <T,>(daftar: T[], nilai: (t: T) => number | null, x: (i: number) => number, y: (v: number) => number) =>
  daftar.reduce<[number, number][][]>((semua, t, i) => {
    const v = nilai(t);
    if (v === null) return semua;
    const titik: [number, number] = [x(i), y(v)];
    if (i > 0 && nilai(daftar[i - 1]) !== null) return [...semua.slice(0, -1), [...semua.at(-1)!, titik]];
    return [...semua, [titik]];
  }, []);

/** Garis nilai ukur (cool) dengan bidang datar tipis di bawahnya (tanpa gradasi), meregang mengikuti bidang plot (garisnya tidak ikut diskalakan). */
export function GarisArea({ ruas }: { ruas: [number, number][][] }) {
  const garis = (r: [number, number][]) => r.map(([x, y], k) => `${k ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
      {ruas.map((r) => (
        <path key={r[0][0]} d={`${garis(r)} L${r.at(-1)![0]},100 L${r[0][0]},100 Z`} className="fill-cool/4" />
      ))}
      {ruas.map((r) => (
        <path
          key={r[0][0]}
          d={garis(r)}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-cool"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/** Gelembung keterangan di atas sebuah titik (di bawahnya bila titik dekat tepi atas); menempel ke kiri di sisi kanan. */
export function Gelembung({ x, y, judul, nilai }: { x: number; y: number; judul: string; nilai: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 rounded-md border border-rule-2 bg-paper-3 px-2.5 py-1.5 whitespace-nowrap @max-md:hidden ${
        x > 65 ? "-translate-x-[calc(100%-1rem)]" : "-translate-x-1/2"
      } ${y < 30 ? "translate-y-3.5" : "-translate-y-[calc(100%+0.875rem)]"}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="block text-[12px] leading-4 text-ink-3">{judul}</span>
      <span className="terukur block text-[14px] leading-5 text-ink">{nilai}</span>
    </span>
  );
}

export function GrafikCapaian({ titik, satuan, judul, sorot }: { titik: TitikCapaian[]; satuan: string; judul: string; sorot?: Sorot }) {
  const atas = batasAtas(Math.max(...titik.flatMap((t) => [t.capaian ?? 0, t.target])) * 1.05);
  // Koordinat dalam persen bidang plot: x di tengah kolom bulan, y dari atas.
  const x = (i: number) => ((i + 0.5) / titik.length) * 100;
  const y = (v: number) => (1 - v / atas) * 100;

  const ruas = ruasDari(titik, (t) => t.capaian, x, y);
  const terakhir = titik.findLastIndex((t) => t.capaian !== null);
  const garisTarget = titik
    .map((t, i) => `${i ? "L" : "M"}${(i / titik.length) * 100},${y(t.target)} H${((i + 1) / titik.length) * 100}`)
    .join(" ");
  const disorot = sorot ? titik.flatMap((t, i) => (dalamSorot(t.bulan, sorot) ? [i] : [])) : [];

  return (
    <figure className="grid gap-4">
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-3">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 bg-cool" />
          {judul}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-ok" />
          Tercapai
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-bad" />
          Belum Tercapai
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 bg-chart-target" />
          Target
        </span>
        {disorot.length > 0 && (
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-5 rounded-[2px] bg-signal-soft" />
            Periode uji coba
          </span>
        )}
      </figcaption>
      <KerangkaGrafik
        label={`Grafik ${judul} dan Target; angkanya ada di tabel.`}
        bulan={titik.map((t) => t.bulan)}
        sumbu={[0, atas / 2, atas].map((v) => ({ nilai: v, teks: formatAngka(v), dasar: v === 0 }))}
        y={y}
        tinggi="h-60 sm:h-80"
      >
        {disorot.length > 0 && (
          <span
            className="absolute inset-y-0 rounded-[4px] bg-signal-soft"
            style={{ left: `${(disorot[0] / titik.length) * 100}%`, width: `${(disorot.length / titik.length) * 100}%` }}
          />
        )}
        <GarisArea ruas={ruas} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
          <path
            d={garisTarget}
            fill="none"
            strokeWidth={1.5}
            className="stroke-chart-target"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {titik.map(
          (t, i) =>
            t.capaian !== null && (
              <span
                key={t.bulan}
                title={`${labelBulan(t.bulan)}: ${formatCapaian(t.capaian, satuan)}, Target ${formatCapaian(t.target, satuan)}, ${LABEL_STATUS_CAPAIAN[t.status!]}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper-2 ${t.status === "tercapai" ? "bg-ok" : "bg-bad"} ${
                  i === terakhir ? "size-3.5" : "size-2.5"
                }`}
                style={{ left: `${x(i)}%`, top: `${y(t.capaian)}%` }}
              />
            ),
        )}
        {terakhir >= 0 && (
          <Gelembung
            x={x(terakhir)}
            y={y(titik[terakhir].capaian!)}
            judul={labelBulan(titik[terakhir].bulan)}
            nilai={formatCapaian(titik[terakhir].capaian, satuan)}
          />
        )}
      </KerangkaGrafik>
    </figure>
  );
}

/** Selisih Capaian terhadap Target dengan tanda: "+2", "−26,36", "0". */
export const formatSelisih = (s: number | null) => (s === null ? "tidak ada" : `${s > 0 ? "+" : s < 0 ? "−" : ""}${formatAngka(Math.abs(s))}`);

/** Keterangan Capaian RS: Kelengkapan yang belum penuh. */
export const keteranganRs = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "tidak ada Unit Pelapor" : k.terverifikasi < k.wajib ? `belum lengkap (${k.terverifikasi}/${k.wajib} Unit)` : null;
/** Keterangan Capaian Unit: bukan Unit Pelapor, atau Pengukurannya belum Terverifikasi. */
export const keteranganUnit = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "bukan Unit Pelapor" : k.terverifikasi === 0 ? "belum Terverifikasi" : null;

/**
 * Satu deret Capaian (Capaian RS atau Capaian satu Unit) sebagai satu permukaan dibagi garis rambut: judul, `children`
 * (sel bacaan berlatar paper-2 dari pemanggil, mis. bacaan bulan terakhir di Monitoring), run chart selebar permukaan,
 * lalu tabel bulanan (terbaru di atas). `analisis` = kolom tautan Analisis (Monitoring); `sorot` = periode uji coba
 * PDSA; `polos` = tanpa bingkai luar, bila sudah berada di dalam permukaan lain.
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
  children?: React.ReactNode;
}) {
  const disorot = (t: TitikCapaian) => p.sorot !== undefined && dalamSorot(t.bulan, p.sorot);
  return (
    <div className={`grid min-w-0 gap-px bg-rule ${p.polos ? "" : "overflow-hidden rounded-card border border-rule"}`}>
      <div className="bg-paper-2 px-5 pt-5 pb-4 sm:px-6">
        <h2 className="font-display text-[18px] leading-6 font-medium tracking-[-0.02em]">{p.judul}</h2>
        <p className="mt-1 text-[14px] text-ink-3">{p.keterangan}</p>
      </div>
      {p.children}
      <div className="min-w-0 bg-paper-2 px-4 pt-5 pb-6 sm:px-6">
        <GrafikCapaian titik={p.titik} satuan={p.satuan} judul={p.judul} sorot={p.sorot} />
      </div>
      <div className="min-w-0 bg-paper-2 pt-2">
        <Tabel label={`Tabel ${p.judul}`} lebarMin={p.analisis ? "min-w-[40rem]" : "min-w-[34rem]"} tumpuk>
          <TableHeader>
            <TableRow>
              <TableHead>Bulan</TableHead>
              <TableHead className="text-right">Capaian</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Status</TableHead>
              {p.analisis && <TableHead className="text-right">Analisis</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.titik.toReversed().map((t) => {
              const catatan = p.catatan(t);
              // Sorotan dengan `!` supaya kolom pertama yang dipaku (berlatar kartu) ikut tersorot.
              const kelas = `py-3 ${disorot(t) ? "bg-signal-soft!" : ""}`;
              return (
                <TableRow key={t.bulan}>
                  <TableCell className={`${kelas} ${TUMPUK.dua} ${TUMPUK.urut1}`}>
                    <span className="font-medium whitespace-nowrap">{labelBulan(t.bulan, { pendek: true })}</span>
                    {disorot(t) && <span className="ml-2 text-[13px] text-signal">uji coba</span>}
                  </TableCell>
                  <TableCell className={`${kelas} text-right ${TUMPUK.urut3}`}>
                    {/* "kosong" hanya untuk ΣD = 0 dari Pengukuran Terverifikasi; tanpa Pengukuran Terverifikasi = "belum ada". */}
                    {t.kelengkapan.terverifikasi === 0 ? (
                      <span className="text-[13px] text-ink-3">belum ada</span>
                    ) : (
                      <span className="terukur text-[15px] whitespace-nowrap text-ink">{formatCapaian(t.capaian, p.satuan)}</span>
                    )}
                    {/* Kelengkapan yang belum penuh = penyimpangan yang perlu ditindaklanjuti (amber); keterangan lain redup. */}
                    {catatan && (
                      <span className={`block text-[13px] whitespace-nowrap ${t.kelengkapan.wajib > 0 ? "text-signal" : "text-ink-3"}`}>{catatan}</span>
                    )}
                  </TableCell>
                  <TableCell className={`${kelas} text-right whitespace-nowrap text-ink-2 ${TUMPUK.urut4}`}>{formatCapaian(t.target, p.satuan)}</TableCell>
                  <TableCell className={`${kelas} text-right whitespace-nowrap ${TUMPUK.ujung} ${TUMPUK.urut5}`}>
                    <span className={t.selisih === null ? "text-[13px] text-ink-3" : "terukur text-ink-2"}>{formatSelisih(t.selisih)}</span>
                  </TableCell>
                  <TableCell className={`${kelas} ${TUMPUK.ujung} ${TUMPUK.urut2}`}>
                    <LabelCapaian status={t.status} />
                  </TableCell>
                  {p.analisis && <TableCell className={`${kelas} text-right ${TUMPUK.penuh} ${TUMPUK.urut6}`}>{p.analisis(t)}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Tabel>
      </div>
    </div>
  );
}
