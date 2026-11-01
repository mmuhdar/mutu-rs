import { labelBulan } from "@/lib/bulan";
import { formatAngka, formatCapaian, LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import type { TitikCapaian } from "@/modules/capaian/service";

import { LabelCapaian } from "../pengukuran/status";
import { kelasKartu, kelasTd, kelasTh, Tabel } from "../ui";

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
    <div
      role="img"
      aria-label={p.label}
      className="@container grid grid-cols-[2.5rem_minmax(0,1fr)] text-[12px] leading-4 text-muted-foreground"
    >
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

/** Ruas garis yang bersambung: titik [x, y] dalam persen bidang plot. Bulan tanpa nilai memutus garis. */
export const ruasDari = <T,>(daftar: T[], nilai: (t: T) => number | null, x: (i: number) => number, y: (v: number) => number) =>
  daftar.reduce<[number, number][][]>((semua, t, i) => {
    const v = nilai(t);
    if (v === null) return semua;
    const titik: [number, number] = [x(i), y(v)];
    if (i > 0 && nilai(daftar[i - 1]) !== null) return [...semua.slice(0, -1), [...semua.at(-1)!, titik]];
    return [...semua, [titik]];
  }, []);

/** Garis ungu dengan bidang bergradasi di bawahnya, meregang mengikuti bidang plot (garisnya tidak ikut diskalakan). */
export function GarisArea({ ruas }: { ruas: [number, number][][] }) {
  const garis = (r: [number, number][]) => r.map(([x, y], k) => `${k ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
      <defs>
        {/* Definisi yang sama di setiap grafik, jadi id ganda di satu halaman tetap menghasilkan gradasi yang sama. */}
        <linearGradient id="isi-garis" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity={0.28} />
          <stop offset="1" stopColor="var(--primary)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {ruas.map((r) => (
        <path key={r[0][0]} d={`${garis(r)} L${r.at(-1)![0]},100 L${r[0][0]},100 Z`} fill="url(#isi-garis)" />
      ))}
      {ruas.map((r) => (
        <path
          key={r[0][0]}
          d={garis(r)}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-primary"
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
      className={`pointer-events-none absolute z-10 rounded-lg border border-border bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-kartu ${
        x > 65 ? "-translate-x-[calc(100%-1rem)]" : "-translate-x-1/2"
      } ${y < 30 ? "translate-y-3.5" : "-translate-y-[calc(100%+0.875rem)]"}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="block text-[11px] leading-4 text-muted-foreground">{judul}</span>
      <span className="block text-[13px] leading-5 font-bold text-foreground">{nilai}</span>
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
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-1 w-5 rounded-full bg-primary" />
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
            <span aria-hidden className="h-3 w-5 rounded-sm bg-primary/15" />
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
            className="absolute inset-y-0 rounded-lg bg-primary/10"
            style={{ left: `${(disorot[0] / titik.length) * 100}%`, width: `${(disorot.length / titik.length) * 100}%` }}
          />
        )}
        <GarisArea ruas={ruas} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
          <path
            d={garisTarget}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="5 4"
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
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${t.status === "tercapai" ? "bg-success" : "bg-danger"} ${
                  i === terakhir ? "size-4 ring-4 ring-primary/20" : "size-3"
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
export const formatSelisih = (s: number | null) => (s === null ? "–" : `${s > 0 ? "+" : s < 0 ? "−" : ""}${formatAngka(Math.abs(s))}`);

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
  const disorot = (t: TitikCapaian) => p.sorot !== undefined && dalamSorot(t.bulan, p.sorot);
  return (
    <section className={p.polos ? "min-w-0" : `${kelasKartu} min-w-0`}>
      <div className={p.polos ? "pb-4" : "px-5 pt-5 pb-4"}>
        <h2 className="text-[16px] leading-6 font-bold">{p.judul}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{p.keterangan}</p>
      </div>
      <div className={p.polos ? "grid gap-6" : "grid gap-6 pb-3"}>
        <div className={p.polos ? undefined : "px-5"}>
          <GrafikCapaian titik={p.titik} satuan={p.satuan} judul={p.judul} sorot={p.sorot} />
        </div>
        <Tabel label={`Tabel ${p.judul}`} lebarMin="min-w-[34rem]">
          <thead>
            <tr>
              <th className={kelasTh}>Bulan</th>
              <th className={`${kelasTh} text-right`}>Capaian</th>
              <th className={`${kelasTh} text-right`}>Target</th>
              <th className={`${kelasTh} text-right`}>Selisih</th>
              <th className={kelasTh}>Status</th>
            </tr>
          </thead>
          <tbody>
            {p.titik.toReversed().map((t) => {
              const catatan = p.catatan(t);
              const kelas = `${kelasTd} py-3 ${disorot(t) ? "bg-primary-tint/50" : ""}`;
              return (
                <tr key={t.bulan}>
                  <td className={kelas}>
                    <span className="font-semibold whitespace-nowrap">{labelBulan(t.bulan, { pendek: true })}</span>
                    {disorot(t) && <span className="ml-2 text-[12px] font-semibold text-primary-ink">uji coba</span>}
                    {p.analisis?.(t)}
                  </td>
                  <td className={`${kelas} text-right`}>
                    <span className="font-bold whitespace-nowrap">
                      {/* "kosong" hanya untuk ΣD = 0 dari Pengukuran Terverifikasi; tanpa Pengukuran Terverifikasi = "–". */}
                      {t.kelengkapan.terverifikasi === 0 ? (
                        <span className="text-muted-foreground">–</span>
                      ) : (
                        formatCapaian(t.capaian, p.satuan)
                      )}
                    </span>
                    {catatan && <span className="block text-[12px] text-warning">{catatan}</span>}
                  </td>
                  <td className={`${kelas} text-right whitespace-nowrap text-muted-foreground`}>{formatCapaian(t.target, p.satuan)}</td>
                  <td className={`${kelas} text-right whitespace-nowrap`}>{formatSelisih(t.selisih)}</td>
                  <td className={kelas}>
                    <LabelCapaian status={t.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabel>
      </div>
    </section>
  );
}
