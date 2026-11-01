"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { keluarAction } from "./actions";
import { Ikon, type NamaIkon } from "./ikon";

export type ItemMenu = { href: string; label: string; ikon: NamaIkon };
export type KelompokMenu = { judul: string; item: ItemMenu[] };
/** Kartu di kaki sidebar, mis. batas lapor SIMAR untuk pengelola Indikator. */
export type KartuSamping = { judul: string; isi: string; tautan: { href: string; label: string } };

/** Menu yang sedang dibuka: href terpanjang yang menjadi awalan alamat ("/" hanya Dashboard itu sendiri). */
const menuAktif = (menu: ItemMenu[], alamat: string) =>
  menu
    .filter((m) => (m.href === "/" ? alamat === "/" : alamat === m.href || alamat.startsWith(`${m.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

/** Tanda MutuRS: palang rumah sakit berisi centang mutu, di kotak bergradasi merah muda ke ungu. */
export function TandaMutu({ className = "size-10" }: { className?: string }) {
  // Id unik per tanda: rujukan ke gradasi di sidebar desktop yang tersembunyi (display: none) tidak tergambar di laci HP.
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--aktif-dari)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${id})`} />
      <path d="M9.6 4.5h4.8v5.1h5.1v4.8h-5.1v5.1H9.6v-5.1H4.5V9.6h5.1z" className="fill-white" />
      <path d="m9.2 12.1 2 2 3.6-3.7" fill="none" className="stroke-primary" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Merek di kepala sidebar dan halaman Masuk: tanda, nama, dan alur singkatnya. */
export function Merek() {
  return (
    <span className="flex items-center gap-3">
      <TandaMutu />
      <span className="leading-tight">
        <span className="block text-[20px] font-bold tracking-[-0.02em] text-white">MutuRS</span>
        <span className="block text-[12px] text-sidebar-ink">Ukur. Pantau. Perbaiki.</span>
      </span>
    </span>
  );
}

/** Dua huruf pertama nama: "Ns. Komite Mutu" → "NK". */
export const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

function Sidebar(p: { kelompok: KelompokMenu[]; aktif?: string; kartu?: KartuSamping; pilih: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-sidebar px-4 py-6">
      <Link href="/" onClick={p.pilih} className="px-2">
        <Merek />
      </Link>
      <nav aria-label="Menu utama" className="flex-1">
        {p.kelompok.map((k, i) => (
          <div key={k.judul} className={i ? "mt-4 border-t border-white/[0.08] pt-4" : undefined}>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">{k.judul}</p>
            <ul className="grid gap-1">
              {k.item.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={p.pilih}
                    aria-current={m.href === p.aktif ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14px] pointer-coarse:min-h-12 ${
                      m.href === p.aktif
                        ? "bg-linear-to-r from-aktif-dari to-aktif-ke font-semibold text-white shadow-aktif"
                        : "font-medium text-sidebar-ink hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Ikon nama={m.ikon} className="size-[18px]" />
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {p.kartu && (
        <div className="rounded-2xl bg-linear-to-br from-primary-ink to-brand p-4">
          <p className="font-bold text-white">{p.kartu.judul}</p>
          <p className="mt-1 text-[13px] leading-5 text-white/80">{p.kartu.isi}</p>
          <Link
            href={p.kartu.tautan.href}
            onClick={p.pilih}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-linear-to-r from-aktif-dari to-aktif-ke px-3 text-[13px] font-semibold text-white"
          >
            {p.kartu.tautan.label} →
          </Link>
        </div>
      )}
    </div>
  );
}

/** Menu akun di bar atas: nama, peran, dan RS; berisi Ganti sandi dan Keluar. */
function MenuAkun({ pengguna, namaRs }: { pengguna: { nama: string; peran: string }; namaRs: string }) {
  const [buka, setBuka] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setBuka(!buka)}
        aria-expanded={buka}
        aria-controls="menu-akun"
        className="flex items-center gap-3 rounded-xl py-1.5 pr-2 pl-1.5 hover:bg-surface"
      >
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-linear-to-br from-aktif-dari to-primary text-[13px] font-bold text-white">
          {inisial(pengguna.nama)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-44 truncate text-[14px] font-semibold">{pengguna.nama}</span>
          <span className="block text-[12px] text-muted-foreground">{pengguna.peran}</span>
        </span>
        <Ikon nama="bawah" className="size-4 text-muted-foreground" />
        <span className="sr-only">Menu akun</span>
      </button>
      {buka && (
        <>
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setBuka(false)} className="fixed inset-0 z-30 cursor-default" />
          <div id="menu-akun" className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
            <p className="px-3 pt-2 pb-2.5 text-[13px] leading-5 text-muted-foreground">
              <b className="block text-[14px] font-semibold text-foreground">{pengguna.nama}</b>
              {pengguna.peran} · {namaRs}
            </p>
            <Link href="/sandi" onClick={() => setBuka(false)} className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium hover:bg-active">
              <Ikon nama="sandi" className="size-4 text-muted-foreground" />
              Ganti sandi
            </Link>
            <form action={keluarAction}>
              <button type="submit" className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium text-danger-ink hover:bg-danger-soft">
                <Ikon nama="keluar" className="size-4" />
                Keluar
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Bingkai aplikasi untuk Pengguna yang masuk: sidebar navy di kiri (laci di HP dan tablet), bar atas berisi pencarian
 * Indikator dan menu akun, lalu isi halaman. Menu sudah disaring per peran oleh layout (hanya tampilan).
 */
export function Bingkai(p: {
  kelompok: KelompokMenu[];
  namaRs: string;
  pengguna: { nama: string; peran: string };
  kartu?: KartuSamping;
  children: React.ReactNode;
}) {
  const aktif = menuAktif(
    p.kelompok.flatMap((k) => k.item),
    usePathname(),
  );
  const [laci, setLaci] = useState(false);
  const tutup = () => setLaci(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Kolom navy setinggi halaman; sidebar di dalamnya menempel saat halaman digulir. */}
      <aside className="hidden bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh">
          <Sidebar kelompok={p.kelompok} aktif={aktif?.href} kartu={p.kartu} pilih={tutup} />
        </div>
      </aside>
      {laci && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" onClick={tutup} className="absolute inset-0 bg-sidebar/60">
            <span className="sr-only">Tutup menu</span>
          </button>
          <div id="menu-hp" className="absolute inset-y-0 left-0 w-[min(288px,85vw)]">
            <Sidebar kelompok={p.kelompok} aktif={aktif?.href} kartu={p.kartu} pilih={tutup} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setLaci(true)}
              aria-expanded={laci}
              aria-controls="menu-hp"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface shadow-kartu lg:hidden"
            >
              <Ikon nama="menu" className="size-5" />
              <span className="sr-only">Buka menu</span>
            </button>
            <p className="min-w-0 flex-1 truncate text-[16px] font-bold sm:hidden">{aktif?.label ?? "MutuRS"}</p>
            <form action="/indikator" role="search" className="hidden max-w-md flex-1 sm:block">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 shadow-kartu focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                <Ikon nama="cari" className="size-[18px] text-muted-foreground" />
                <input
                  type="search"
                  name="q"
                  aria-label="Cari Indikator"
                  placeholder="Cari Indikator (kode atau nama)…"
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                />
              </label>
            </form>
            <div className="ml-auto">
              <MenuAkun pengguna={p.pengguna} namaRs={p.namaRs} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pt-2 pb-10 sm:px-6 lg:px-8">{p.children}</main>
      </div>
    </div>
  );
}
