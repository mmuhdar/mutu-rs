import Link from "next/link";

import { Ikon, type NamaIkon } from "./ikon";

/*
 * Komponen tampilan bersama (server maupun client): pembungkus halaman, kepala halaman, kartu putih berbayang lembut,
 * kartu angka dengan kotak ikon berwarna, label status, bar kemajuan, tabel, dan donat.
 */

/** Pembungkus isi halaman: jarak antarbagian yang sama di semua halaman. */
export function Halaman({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6">{children}</div>;
}

/**
 * Kepala halaman: judul (satu-satunya h1) dan kalimat penjelas di kiri, tombol aksi di kanan. `kembali` = tautan kecil ke
 * halaman induk; `meta` = baris keterangan di bawah judul (kode, Lingkup, periode); `children` = saringan halaman, di
 * kartu putih di bawah judul.
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
    <header className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {p.kembali && (
            <p className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
              {p.kembali.map((k) => (
                <Link
                  key={k.href}
                  href={k.href}
                  className="text-[13px] font-semibold text-primary-ink hover:underline pointer-coarse:py-1.5"
                >
                  ← {k.label}
                </Link>
              ))}
            </p>
          )}
          <h1 className="text-[24px] leading-8 font-bold tracking-[-0.02em] sm:text-[28px] sm:leading-9">{p.judul}</h1>
          {p.meta && <p className="mt-1 text-[14px] text-muted-foreground">{p.meta}</p>}
          {p.sub && <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{p.sub}</p>}
        </div>
        {p.aksi && <div className="flex w-full flex-wrap items-end gap-2.5 sm:w-auto">{p.aksi}</div>}
      </div>
      {p.children && <div className={`${kelasKartu} p-4 sm:p-5`}>{p.children}</div>}
    </header>
  );
}

/** Kartu putih bersudut lembut dengan bayangan tipis. */
export const kelasKartu = "rounded-2xl border border-border/70 bg-surface shadow-kartu";

/** Kartu berjudul: judul 16px tebal di kiri, aksi (tautan, saringan) di kanan. */
export function Kartu(p: {
  judul?: React.ReactNode;
  sub?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${kelasKartu} min-w-0 ${p.className ?? ""}`}>
      {(p.judul || p.aksi) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            {p.judul && <h2 className="text-[16px] leading-6 font-bold">{p.judul}</h2>}
            {p.sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{p.sub}</p>}
          </div>
          {p.aksi}
        </header>
      )}
      {p.children}
    </section>
  );
}

/** Nada warna: warna bernama (kotak ikon, label kategori) atau makna status (`pos`, `neg`, `warn`, `netral`). */
export type Nada = "brand" | "ukur" | "pantau" | "tindak" | "pdsa" | "atur" | "pos" | "neg" | "warn" | "netral";

const NADA: Record<Nada, { pil: string; isi: string; teks: string }> = {
  brand: { pil: "bg-brand-tint text-brand-ink", isi: "bg-brand", teks: "text-brand-ink" },
  ukur: { pil: "bg-ukur-tint text-ukur-ink", isi: "bg-ukur", teks: "text-ukur-ink" },
  pantau: { pil: "bg-pantau-tint text-pantau-ink", isi: "bg-pantau", teks: "text-pantau-ink" },
  tindak: { pil: "bg-tindak-tint text-tindak-ink", isi: "bg-tindak", teks: "text-tindak-ink" },
  pdsa: { pil: "bg-pdsa-tint text-pdsa-ink", isi: "bg-pdsa", teks: "text-pdsa-ink" },
  atur: { pil: "bg-atur-tint text-atur-ink", isi: "bg-atur", teks: "text-atur-ink" },
  pos: { pil: "bg-success-soft text-success-ink", isi: "bg-success", teks: "text-success-ink" },
  neg: { pil: "bg-danger-soft text-danger-ink", isi: "bg-danger", teks: "text-danger-ink" },
  warn: { pil: "bg-warning-soft text-warning", isi: "bg-tindak", teks: "text-warning" },
  netral: { pil: "bg-active text-muted-foreground", isi: "bg-muted-foreground", teks: "text-muted-foreground" },
};

/** Kelas isi padat sebuah nada, mis. untuk titik legenda atau bar. */
export const isiNada = (nada: Nada) => NADA[nada].isi;

/** Kotak ikon berwarna padat dengan ikon putih (dekoratif; artinya ditulis di sampingnya). */
export function KotakIkon({ nada, ikon, kecil = false }: { nada: Nada; ikon: NamaIkon; kecil?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center text-white ${kecil ? "size-9 rounded-lg" : "size-12 rounded-xl"} ${NADA[nada].isi}`}
    >
      <Ikon nama={ikon} className={kecil ? "size-[18px]" : "size-6"} />
    </span>
  );
}

/**
 * Kartu angka: kotak ikon berwarna, label, angka besar dengan `lencana` di sampingnya, dan rincian di bawah
 * (`children`, mis. `Rincian`, atau `keterangan`). Dengan `href` seluruh kartu menjadi tautan.
 */
export function Ubin(p: {
  nada: Nada;
  ikon: NamaIkon;
  label: string;
  nilai: React.ReactNode;
  lencana?: React.ReactNode;
  keterangan?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  const isi = (
    <>
      {/* Kartu sempit (dua kolom di HP): ikon di atas teks. */}
      <span className="flex flex-col gap-3 @[13rem]:flex-row @[13rem]:items-start @[13rem]:gap-3.5">
        <KotakIkon nada={p.nada} ikon={p.ikon} />
        <span className="min-w-0">
          <span className="block text-[14px] leading-5 font-semibold text-foreground/80">{p.label}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[28px] leading-9 font-bold tracking-[-0.02em]">{p.nilai}</span>
            {p.lencana}
          </span>
        </span>
      </span>
      {p.children}
      {p.keterangan && <span className="mt-3 block text-[13px] text-muted-foreground">{p.keterangan}</span>}
    </>
  );
  const kelas = `@container block min-w-0 ${kelasKartu} p-4 sm:p-5`;
  return p.href ? (
    <Link href={p.href} className={`${kelas} hover:-translate-y-0.5 hover:border-primary/30`}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

/** Baris rincian di bawah angka: titik berwarna, angka tebal, dan labelnya. */
export function Rincian({ isi }: { isi: { nada: Nada; nilai: React.ReactNode; label: string }[] }) {
  return (
    <span className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
      {isi.map((r) => (
        <span key={r.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full ${NADA[r.nada].isi}`} />
          <b className="font-semibold text-foreground">{r.nilai}</b> {r.label}
        </span>
      ))}
    </span>
  );
}

/** Label status pucat bernada sama; tidak pernah terjepit. */
export function Pil({ nada, children }: { nada: Nada; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 flex-none items-center rounded-md px-2 text-[12px] font-semibold whitespace-nowrap ${NADA[nada].pil}`}
    >
      {children}
    </span>
  );
}

/** Bar kemajuan pada nadanya: lebar = rasio sesungguhnya (CSS `calc`, bukan hitungan halaman). */
export function BarKemajuan({ nada, nilai, dari }: { nada: Nada; nilai: number; dari: number }) {
  if (dari <= 0) return null;
  return (
    <span aria-hidden className="mt-4 block h-2 overflow-hidden rounded-full bg-active">
      <span className={`block h-full rounded-full ${NADA[nada].isi}`} style={{ width: `calc(${nilai} / ${dari} * 100%)` }} />
    </span>
  );
}

/*
 * Tabel: kepala berlatar abu muda bersudut bulat, garis baris tipis. Pemanggil memakai `<Tabel>` + `kelasTh`/`kelasTd`
 * (angka rata kanan: tambahkan `text-right`). Pembungkus geser `relative` supaya teks `sr-only` di sel tidak melebarkan
 * halaman.
 */
export const kelasTh =
  "bg-head px-4 py-3 text-left text-[12px] font-semibold whitespace-nowrap text-muted-foreground first:rounded-l-xl last:rounded-r-xl";
export const kelasTd = "border-b border-rule px-4 py-3.5 align-middle";

export function Tabel({ label, lebarMin = "min-w-[40rem]", children }: { label: string; lebarMin?: string; children: React.ReactNode }) {
  return (
    <div className="relative min-w-0 overflow-x-auto px-3 pb-2">
      <table
        aria-label={label}
        className={`w-full border-separate border-spacing-0 text-[14px] [&_tbody_tr:last-child_td]:border-0 ${lebarMin}`}
      >
        {children}
      </table>
    </div>
  );
}

/** Tombol ikon bertepi di kolom Aksi tabel; `label` dibaca pembaca layar. */
export function TautanIkon({ href, ikon, label }: { href: string; ikon: NamaIkon; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="inline-grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary-ink"
    >
      <Ikon nama={ikon} className="size-4" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

/**
 * Donat: cincin bagian-bagian dengan jumlah di tengah dan legenda (titik, label, jumlah, persen). Bagian bernilai 0 tetap
 * di legenda. Persen dari jumlah total.
 */
export function Donat(p: {
  label: string;
  tengah: { nilai: React.ReactNode; label: string };
  bagian: { label: string; nilai: number; nada: Nada }[];
}) {
  const total = p.bagian.reduce((t, b) => t + b.nilai, 0);
  const KELILING = 100;
  let awal = 0;
  return (
    <figure className="@container">
      <div className="grid items-center gap-5 @[26rem]:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-40">
          <svg viewBox="0 0 42 42" role="img" aria-label={p.label} className="size-full -rotate-90">
            <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="6" className="stroke-active" />
            {total > 0 &&
              p.bagian.map((b) => {
                const panjang = (b.nilai / total) * KELILING;
                const ruas = (
                  <circle
                    key={b.label}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="none"
                    strokeWidth="6"
                    strokeDasharray={`${panjang} ${KELILING - panjang}`}
                    strokeDashoffset={-awal}
                    className={STROKE[b.nada]}
                  />
                );
                awal += panjang;
                return ruas;
              })}
          </svg>
          <span className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[28px] leading-8 font-bold">{p.tengah.nilai}</span>
            <span className="max-w-24 text-[12px] leading-4 text-muted-foreground">{p.tengah.label}</span>
          </span>
        </div>
        <figcaption>
          <ul className="grid gap-2.5">
            {p.bagian.map((b) => (
              <li key={b.label} className="flex items-center gap-2.5 text-[14px]">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${NADA[b.nada].isi}`} />
                <span className="min-w-0 flex-1 font-medium">{b.label}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  <b className="font-semibold text-foreground">{b.nilai}</b>
                  {total > 0 && ` (${Math.round((b.nilai / total) * 1000) / 10}%)`}
                </span>
              </li>
            ))}
          </ul>
        </figcaption>
      </div>
    </figure>
  );
}

const STROKE: Record<Nada, string> = {
  brand: "stroke-brand",
  ukur: "stroke-ukur",
  pantau: "stroke-pantau",
  tindak: "stroke-tindak",
  pdsa: "stroke-pdsa",
  atur: "stroke-atur",
  pos: "stroke-success",
  neg: "stroke-danger",
  warn: "stroke-tindak",
  netral: "stroke-muted-foreground",
};
