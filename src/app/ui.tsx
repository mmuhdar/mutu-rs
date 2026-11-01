import Link from "next/link";

/*
 * Komponen tampilan bersama (server maupun client): pembungkus halaman berwarna area, kepala halaman, kartu, ubin
 * angka, dan label. Warna area dipilih per halaman lewat `Halaman area=…`; semua di dalamnya memakai `area-*`.
 */

export type Area = "brand" | "ukur" | "pantau" | "tindak" | "pdsa" | "atur";

/** Pembungkus isi halaman: menetapkan warna area untuk semua komponen di dalamnya. */
export function Halaman({ area, children }: { area: Area; children: React.ReactNode }) {
  return (
    <div data-area={area} className="grid gap-5">
      {children}
    </div>
  );
}

/**
 * Kepala halaman: bidang pucat berwarna area dengan judul (satu-satunya h1), kalimat temuan, dan aksi. `kembali` =
 * tautan kecil ke halaman induk; `meta` = baris keterangan di bawah judul (kode, Lingkup, periode).
 */
export function KepalaHalaman(p: {
  judul: React.ReactNode;
  sub?: React.ReactNode;
  meta?: React.ReactNode;
  kembali?: { href: string; label: string }[];
  aksi?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="rounded-3xl bg-area-tint px-5 py-5 sm:px-7 sm:py-6">
      {p.kembali && (
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {p.kembali.map((k) => (
            <Link key={k.href} href={k.href} className="text-[13px] font-semibold text-area-ink hover:underline pointer-coarse:py-1.5">
              ← {k.label}
            </Link>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[24px] leading-8 font-bold tracking-[-0.02em] text-area-ink sm:text-[28px] sm:leading-9">{p.judul}</h1>
          {p.meta && <p className="mt-1.5 text-[14px] text-area-ink/80">{p.meta}</p>}
          {p.sub && <p className="mt-1.5 text-[15px] leading-6 text-foreground">{p.sub}</p>}
        </div>
        {p.aksi && <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">{p.aksi}</div>}
      </div>
      {p.children}
    </header>
  );
}

/** Kartu putih bersudut lembut, tanpa bayangan. */
export const kelasKartu = "rounded-2xl border border-border bg-surface";

/** Kartu berjudul: judul 16px tebal di kiri, aksi tenang di kanan. `area` = warna area lain dari halamannya. */
export function Kartu(p: {
  area?: Area;
  judul?: React.ReactNode;
  sub?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-area={p.area} className={`${kelasKartu} min-w-0 ${p.className ?? ""}`}>
      {(p.judul || p.aksi) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {p.judul && <h2 className="text-[16px] leading-6 font-semibold">{p.judul}</h2>}
            {p.sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{p.sub}</p>}
          </div>
          {p.aksi}
        </header>
      )}
      {p.children}
    </section>
  );
}

export type Nada = Area | "pos" | "neg" | "warn" | "netral";

const NADA: Record<Nada, { ubin: string; ink: string; pil: string; isi: string }> = {
  brand: { ubin: "bg-brand-tint", ink: "text-brand-ink", pil: "bg-brand-tint text-brand-ink", isi: "bg-brand" },
  ukur: { ubin: "bg-ukur-tint", ink: "text-ukur-ink", pil: "bg-ukur-tint text-ukur-ink", isi: "bg-ukur" },
  pantau: { ubin: "bg-pantau-tint", ink: "text-pantau-ink", pil: "bg-pantau-tint text-pantau-ink", isi: "bg-pantau" },
  tindak: { ubin: "bg-tindak-tint", ink: "text-tindak-ink", pil: "bg-tindak-tint text-tindak-ink", isi: "bg-tindak" },
  pdsa: { ubin: "bg-pdsa-tint", ink: "text-pdsa-ink", pil: "bg-pdsa-tint text-pdsa-ink", isi: "bg-pdsa" },
  atur: { ubin: "bg-atur-tint", ink: "text-atur-ink", pil: "bg-atur-tint text-atur-ink", isi: "bg-atur" },
  pos: { ubin: "bg-success-soft", ink: "text-success-ink", pil: "bg-success-soft text-success-ink", isi: "bg-success" },
  neg: { ubin: "bg-danger-soft", ink: "text-danger-ink", pil: "bg-danger-soft text-danger-ink", isi: "bg-danger" },
  warn: { ubin: "bg-warning-soft", ink: "text-warning", pil: "bg-warning-soft text-warning", isi: "bg-warning" },
  netral: { ubin: "bg-active", ink: "text-foreground", pil: "bg-active text-foreground", isi: "bg-muted-foreground" },
};

/**
 * Ubin angka pastel: label di atas angka besar, keterangan kecil di bawahnya. Nada = makna angka (Tercapai hijau,
 * Belum Tercapai merah), bukan hiasan. Dengan `href` seluruh ubin menjadi tautan.
 */
export function Ubin(p: {
  nada: Nada;
  label: string;
  nilai: React.ReactNode;
  keterangan?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  const n = NADA[p.nada];
  const isi = (
    <>
      <span className={`block text-[13px] font-semibold ${n.ink}`}>{p.label}</span>
      <span className={`mt-2 block text-[32px] leading-9 font-bold tracking-[-0.02em] ${n.ink}`}>{p.nilai}</span>
      {p.children}
      {p.keterangan && <span className="mt-1.5 block text-[13px] text-foreground/75">{p.keterangan}</span>}
    </>
  );
  const kelas = `block min-w-0 rounded-2xl px-5 py-4 ${n.ubin}`;
  return p.href ? (
    <Link href={p.href} className={`${kelas} hover:-translate-y-0.5 active:translate-y-0`}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

/** Label status pucat bernada sama; tidak pernah terjepit. */
export function Pil({ nada, children }: { nada: Nada; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-6 flex-none items-center rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap ${NADA[nada].pil}`}>
      {children}
    </span>
  );
}

/** Bar kemajuan pada nadanya: lebar = rasio sesungguhnya (CSS `calc`, bukan hitungan halaman). */
export function BarKemajuan({ nada, nilai, dari }: { nada: Nada; nilai: number; dari: number }) {
  if (dari <= 0) return null;
  return (
    <span aria-hidden className="mt-3 block h-2 overflow-hidden rounded-full bg-surface/70">
      <span className={`block h-full rounded-full ${NADA[nada].isi}`} style={{ width: `calc(${nilai} / ${dari} * 100%)` }} />
    </span>
  );
}
