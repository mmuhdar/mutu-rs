import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table } from "@/components/ui/table";

import { Ikon, type NamaIkon } from "./ikon";

export { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/*
 * Komponen tampilan MutuRS di atas shadcn/ui (`src/components/ui`), tema Console (Hallmark): panel bergaris rambut di atas
 * grafit, angka yang ditulis sistem dalam huruf ukur (`terukur`), dan dua makna warna: amber untuk orang dan aksi
 * (`signal`), cool untuk instrumen; ok/bad hanya untuk status. Halaman memakai komponen ini atau komponen shadcn langsung.
 */

/** Pembungkus isi halaman: jarak antarbagian yang sama di semua halaman. */
export function Halaman({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 pt-4">{children}</div>;
}

/**
 * Kepala halaman: judul (satu-satunya h1) dan kalimat penjelas di kiri, aksi di kanan. `kembali` = jejak ke halaman
 * induk (breadcrumb); `meta` = baris keterangan di bawah judul (kode, Lingkup, periode); `children` = saringan halaman,
 * di panel di bawah judul.
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
        <div className="min-w-0 max-w-3xl flex-[1_1_24rem]">
          {p.kembali && (
            <nav aria-label="Jejak halaman" className="mb-2">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-3">
                {p.kembali.map((k, i) => (
                  <li key={k.href} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden>/</span>}
                    <Link href={k.href} className="text-primary-ink pointer-coarse:py-1.5">
                      {k.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="max-w-[44ch] font-display text-[26px] leading-[1.1] font-medium tracking-[-0.03em] sm:text-[30px]">{p.judul}</h1>
          {p.meta && <p className="mt-2 text-[14px] text-ink-3">{p.meta}</p>}
          {p.sub && <p className="mt-2 max-w-[65ch] text-[15px] leading-6 text-ink-3">{p.sub}</p>}
        </div>
        {p.aksi && <div className="flex w-full flex-wrap items-end gap-2.5 sm:w-auto">{p.aksi}</div>}
      </div>
      {p.children && <Card className="px-4 py-4 sm:px-5">{p.children}</Card>}
    </header>
  );
}

/**
 * Panel berjudul (shadcn `Card`, garis rambut di atas grafit): judul dan keterangan di kiri, aksi di kanan. `children`
 * diberi jarak sendiri oleh pemanggil (mis. `px-5 pb-5`, atau `Tabel` yang sudah berjarak).
 */
export function Kartu(p: {
  judul?: React.ReactNode;
  sub?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`min-w-0 gap-0 py-0 ${p.className ?? ""}`}>
      {(p.judul || p.aksi) && (
        <CardHeader className="px-5 pt-5 pb-4">
          {p.judul && <CardTitle className="font-display text-[17px] font-medium tracking-[-0.01em]">{p.judul}</CardTitle>}
          {p.sub && <CardDescription className="text-[13px] text-ink-3">{p.sub}</CardDescription>}
          {p.aksi && <CardAction>{p.aksi}</CardAction>}
        </CardHeader>
      )}
      {p.children}
    </Card>
  );
}

/**
 * Nada sebuah label atau bar. Tema Console hanya punya dua makna warna ditambah status: nama lama `brand`, `ukur`,
 * `pantau`, `atur` = cool (instrumen, sistem); `tindak`, `pdsa`, `warn` = amber (orang, langkah yang sedang berjalan,
 * penyimpangan); `pos`/`neg` = ok/bad (Status Capaian, hasil); `netral` = tanpa warna; `redup` = tanpa warna, isi lebih
 * gelap (bagian yang sudah tidak berlaku, mis. Dibatalkan).
 */
export type Nada = "brand" | "ukur" | "pantau" | "tindak" | "pdsa" | "atur" | "pos" | "neg" | "warn" | "netral" | "redup";

const COOL = { pil: "border-cool-rule bg-cool-soft text-cool", isi: "bg-cool", teks: "text-cool" };
const SIGNAL = { pil: "border-signal-rule bg-signal-soft text-signal", isi: "bg-signal", teks: "text-signal" };
const NADA: Record<Nada, { pil: string; isi: string; teks: string }> = {
  brand: COOL,
  ukur: COOL,
  pantau: COOL,
  atur: COOL,
  tindak: SIGNAL,
  pdsa: SIGNAL,
  warn: SIGNAL,
  pos: { pil: "border-ok-rule bg-ok-soft text-ok", isi: "bg-ok", teks: "text-ok" },
  neg: { pil: "border-bad-rule bg-bad-soft text-bad", isi: "bg-bad", teks: "text-bad" },
  netral: { pil: "border-rule-2 bg-paper-3 text-ink-2", isi: "bg-ink-3", teks: "text-ink-3" },
  redup: { pil: "border-rule bg-paper-3 text-ink-3", isi: "bg-rule-2", teks: "text-ink-3" },
};

/** Kelas isi padat sebuah nada, mis. untuk bar. */
export const isiNada = (nada: Nada) => NADA[nada].isi;

/**
 * Ikon pembuka baris (dekoratif; artinya ditulis di sampingnya). Tema Console tidak memakai kotak ikon berwarna: ikon
 * garis polos dalam tinta redup, `nada` tidak lagi mewarnainya.
 */
export function KotakIkon({ ikon, kecil = false }: { nada?: Nada; ikon: NamaIkon; kecil?: boolean }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center text-ink-3 ${kecil ? "size-7" : "size-9"}`}>
      <Ikon nama={ikon} className={kecil ? "size-[18px]" : "size-5"} />
    </span>
  );
}

/**
 * Panel angka: label, angka yang ditulis sistem dalam huruf ukur dengan `lencana` di sampingnya, lalu rincian
 * (`children`, mis. `Rincian` atau `BarKemajuan`) atau `keterangan`. Tanpa kotak ikon. Dengan `href` seluruh panel
 * menjadi tautan. `nada` dan `ikon` dipertahankan untuk pemanggil lama dan tidak lagi digambar.
 */
export function Ubin(p: {
  nada?: Nada;
  ikon?: NamaIkon;
  label: string;
  nilai: React.ReactNode;
  lencana?: React.ReactNode;
  keterangan?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  const isi = (
    <>
      <span className="block text-[14px] leading-5 font-medium text-ink-2">{p.label}</span>
      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="terukur text-[30px] leading-9 tracking-[-0.04em] text-ink">{p.nilai}</span>
        {p.lencana}
      </span>
      {p.children}
      {p.keterangan && <span className="mt-2 block text-[13px] text-ink-3">{p.keterangan}</span>}
    </>
  );
  const kelas = "block min-w-0 gap-0 p-4 sm:p-5";
  return p.href ? (
    <Link href={p.href} className="group/ubin block min-w-0 rounded-card">
      <Card className={`${kelas} group-hover/ubin:border-rule-2 group-hover/ubin:bg-paper-3`}>{isi}</Card>
    </Link>
  ) : (
    <Card className={kelas}>{isi}</Card>
  );
}

/** Rincian di bawah angka: angka dan labelnya berjajar, tanpa titik warna. */
export function Rincian({ isi }: { isi: { nada?: Nada; nilai: React.ReactNode; label: string }[] }) {
  return (
    <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
      {isi.map((r) => (
        <span key={r.label}>
          <b className="terukur font-normal text-ink">{r.nilai}</b> {r.label}
        </span>
      ))}
    </span>
  );
}

/** Label status (shadcn `Badge`): teks dalam garis 1px bersudut 4px, berwarna pucat menurut makna; selalu bertulisan. */
export function Pil({ nada, children }: { nada: Nada; children: React.ReactNode }) {
  return <Badge className={`flex-none border ${NADA[nada].pil}`}>{children}</Badge>;
}

/** Bar kemajuan pada nadanya (shadcn `Progress`): rasio nilai/dari dari angka service. */
export function BarKemajuan({ nada, nilai, dari }: { nada: Nada; nilai: number; dari: number }) {
  if (dari <= 0) return null;
  return <Progress aria-hidden value={(nilai / dari) * 100} className="mt-3 h-1.5 bg-paper-3" indicatorClassName={NADA[nada].isi} />;
}

/** Kelas tabel `tumpuk` di HP (< 640px): kepala disembunyikan, setiap baris menjadi grid tiga kolom tanpa geser. */
const KELAS_TUMPUK =
  "max-sm:block max-sm:min-w-0 max-sm:[&_tbody]:block max-sm:[&_thead]:hidden max-sm:[&_tr>*:first-child]:static max-sm:[&_tbody_tr]:grid max-sm:[&_tbody_tr]:grid-cols-[auto_auto_minmax(0,1fr)] max-sm:[&_tbody_tr]:items-center max-sm:[&_tbody_tr]:gap-x-4 max-sm:[&_tbody_tr]:gap-y-2 max-sm:[&_tbody_tr]:border-b max-sm:[&_tbody_tr]:border-rule max-sm:[&_tbody_tr]:px-3 max-sm:[&_tbody_tr]:py-3.5 max-sm:[&_td]:border-0 max-sm:[&_td]:p-0 max-sm:[&_td]:text-left";

/**
 * Letak sel tabel `tumpuk` di HP: `penuh` = selebar baris, `dua` = dua kolom pertama, `ujung` = rata kanan di kolom
 * terakhir, `urut1`…`urut7` = urutan tampil (sel diurutkan ulang supaya nama, bacaan, lalu bar terbaca berurutan).
 */
export const TUMPUK = {
  penuh: "max-sm:col-span-3",
  dua: "max-sm:col-span-2",
  ujung: "max-sm:justify-self-end",
  urut1: "max-sm:order-1",
  urut2: "max-sm:order-2",
  urut3: "max-sm:order-3",
  urut4: "max-sm:order-4",
  urut5: "max-sm:order-5",
  urut6: "max-sm:order-6",
  urut7: "max-sm:order-7",
} as const;

/**
 * Tabel (shadcn `Table`) dengan jarak di dalam panel dan lebar minimum: lebih sempit dari itu, tabel digeser di dalam
 * wadahnya (bukan halaman) dan kolom pertama (nama baris) tetap terlihat. Dengan `tumpuk`, di HP setiap baris menjadi
 * blok bertumpuk (sel memilih letaknya dengan `TUMPUK`) supaya bacaan, Target, dan status tetap terlihat. Isi memakai
 * `TableHeader`/`TableRow`/`TableHead`/`TableBody`/`TableCell`; angka rata kanan dengan `text-right`.
 */
export function Tabel({
  label,
  lebarMin = "min-w-[40rem]",
  tumpuk = false,
  children,
}: {
  label: string;
  lebarMin?: string;
  tumpuk?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-2 pb-2">
      <Table
        aria-label={label}
        className={`${lebarMin} [&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-[1] [&_tr>*:first-child]:bg-card ${tumpuk ? KELAS_TUMPUK : ""}`}
      >
        {children}
      </Table>
    </div>
  );
}

/**
 * Angka ukur berukuran tampilan (bacaan utama): huruf ukur dengan koma desimal dirapatkan dan satuan lebih kecil di
 * sampingnya, supaya "89,33 %" terbaca satu angka. `teks` = hasil `formatCapaian`/`formatAngka`.
 */
export function AngkaBesar({ teks, satuan, className = "" }: { teks: string; satuan?: string; className?: string }) {
  const angka = satuan && teks.endsWith(` ${satuan}`) ? teks.slice(0, -satuan.length - 1) : teks;
  const [bulat, desimal] = angka.split(",");
  return (
    <span className={`terukur inline-flex items-baseline leading-none text-ink ${className}`}>
      <span>{bulat}</span>
      {desimal !== undefined && (
        <>
          <span className="-mx-[0.22em]">,</span>
          <span>{desimal}</span>
        </>
      )}
      {satuan && <span className="ml-[0.12em] text-[0.42em] tracking-normal text-ink-3">{satuan}</span>}
    </span>
  );
}

/** Tombol ikon bergaris di kolom Aksi tabel (shadcn `Button` sebagai tautan); `label` dibaca pembaca layar. */
export function TautanIkon({ href, ikon, label }: { href: string; ikon: NamaIkon; label: string }) {
  return (
    <Button asChild variant="outline" size="icon-sm" className="text-ink-3 hover:text-ink">
      <Link href={href} title={label}>
        <Ikon nama={ikon} className="size-4" />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}

/**
 * Komposisi: bagian dari satu keseluruhan sebagai satu bar bertumpuk (bukan donat), di bawahnya legenda (label, jumlah,
 * persen). Bagian bernilai 0 tetap di legenda. Persen dari jumlah total.
 */
export function Komposisi(p: { label: string; bagian: { label: string; nilai: number; nada: Nada }[] }) {
  const total = p.bagian.reduce((t, b) => t + b.nilai, 0);
  return (
    <figure className="grid gap-4">
      <div role="img" aria-label={p.label} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-[3px] bg-paper-3">
        {total > 0 &&
          p.bagian
            .filter((b) => b.nilai > 0)
            .map((b) => <span key={b.label} className={NADA[b.nada].isi} style={{ width: `${(b.nilai / total) * 100}%` }} />)}
      </div>
      <figcaption>
        <ul className="grid gap-2">
          {p.bagian.map((b) => (
            <li key={b.label} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-2.5 text-[14px]">
              <span aria-hidden className={`h-3 w-1.5 rounded-[2px] ${NADA[b.nada].isi}`} />
              <span className="min-w-0 text-ink-2">{b.label}</span>
              <span className="whitespace-nowrap text-ink-3">
                <b className="terukur font-normal text-ink">{b.nilai}</b>
                {total > 0 && ` (${Math.round((b.nilai / total) * 1000) / 10}%)`}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
