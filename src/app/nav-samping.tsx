"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { keluarAction } from "./actions";
import { Ikon, type NamaIkon } from "./ikon";
import type { Area } from "./ui";

export type ItemMenu = { href: string; label: string; ikon: NamaIkon; area: Area };
export type KelompokMenu = { judul: string; item: ItemMenu[] };

/** Warna ikon dan baris aktif setiap area (nama kelas utuh supaya terbaca Tailwind). */
const WARNA: Record<Area, { ikon: string; aktif: string }> = {
  brand: { ikon: "text-brand", aktif: "bg-brand-tint text-brand-ink" },
  ukur: { ikon: "text-ukur", aktif: "bg-ukur-tint text-ukur-ink" },
  pantau: { ikon: "text-pantau", aktif: "bg-pantau-tint text-pantau-ink" },
  tindak: { ikon: "text-tindak", aktif: "bg-tindak-tint text-tindak-ink" },
  pdsa: { ikon: "text-pdsa", aktif: "bg-pdsa-tint text-pdsa-ink" },
  atur: { ikon: "text-atur", aktif: "bg-atur-tint text-atur-ink" },
};

/** Menu yang sedang dibuka: href terpanjang yang menjadi awalan alamat ("/" hanya Dashboard itu sendiri). */
const menuAktif = (menu: ItemMenu[], alamat: string) =>
  menu
    .filter((m) => (m.href === "/" ? alamat === "/" : alamat === m.href || alamat.startsWith(`${m.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

/** Tanda MutuRS: palang rumah sakit berisi centang mutu, digambar untuk produk ini. */
export function TandaMutu({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <rect width="24" height="24" rx="7" className="fill-brand" />
      <path d="M9.6 4.5h4.8v5.1h5.1v4.8h-5.1v5.1H9.6v-5.1H4.5V9.6h5.1z" className="fill-white" />
      <path d="m9.2 12.1 2 2 3.6-3.7" fill="none" className="stroke-brand" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Dua huruf pertama nama: "Ns. Komite Mutu" → "NK". */
const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

function DaftarMenu({ kelompok, aktif, pilih }: { kelompok: KelompokMenu[]; aktif?: string; pilih: () => void }) {
  return (
    <div className="grid gap-5">
      {kelompok.map((k) => (
        <div key={k.judul}>
          <p className="px-3 pb-1.5 text-[12px] font-semibold text-muted-foreground">{k.judul}</p>
          <ul className="grid gap-0.5">
            {k.item.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onClick={pilih}
                  aria-current={m.href === aktif ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14px] pointer-coarse:min-h-12 ${
                    m.href === aktif ? `${WARNA[m.area].aktif} font-semibold` : "font-medium hover:bg-active"
                  }`}
                >
                  <Ikon nama={m.ikon} className={`size-[18px] ${WARNA[m.area].ikon}`} />
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Akun({ pengguna, namaRs, pilih }: { pengguna: { nama: string; peran: string }; namaRs: string; pilih: () => void }) {
  return (
    <div className="rounded-2xl bg-background p-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint text-[12px] font-bold text-brand-ink">
          {inisial(pengguna.nama)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-semibold">{pengguna.nama}</span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {pengguna.peran} · {namaRs}
          </span>
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        <Link href="/sandi" onClick={pilih} className="flex-1 rounded-lg px-2 py-2 text-center text-[13px] font-medium hover:bg-active">
          Ganti sandi
        </Link>
        <form action={keluarAction} className="flex-1">
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium hover:bg-active">
            <Ikon nama="keluar" className="size-4" />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Navigasi: di layar lebar panel putih melayang di kiri (merek, menu berwarna per area, akun di bawah); di HP dan tablet
 * bar putih di atas dengan nama layar dan tombol menu yang membuka lembar penuh. Menu sudah disaring per peran oleh
 * layout (hanya tampilan).
 */
export function NavSamping({
  kelompok,
  namaRs,
  pengguna,
}: {
  kelompok: KelompokMenu[];
  namaRs: string;
  pengguna: { nama: string; peran: string };
}) {
  const aktif = menuAktif(
    kelompok.flatMap((k) => k.item),
    usePathname(),
  );
  const [buka, setBuka] = useState(false);
  const tutup = () => setBuka(false);

  return (
    <>
      <aside className="hidden lg:sticky lg:top-3 lg:m-3 lg:mr-0 lg:flex lg:h-[calc(100dvh-1.5rem)] lg:flex-col lg:gap-6 lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-3">
        <Link href="/" className="flex items-center gap-2.5 px-2 pt-1">
          <TandaMutu />
          <span className="text-[18px] font-bold tracking-[-0.02em]">MutuRS</span>
        </Link>
        <nav aria-label="Menu utama" className="flex-1">
          <DaftarMenu kelompok={kelompok} aktif={aktif?.href} pilih={tutup} />
        </nav>
        <Akun pengguna={pengguna} namaRs={namaRs} pilih={tutup} />
      </aside>

      <div className="sticky top-0 z-20 border-b border-border bg-surface lg:hidden">
        <div className="flex h-14 items-center gap-2.5 px-3">
          <Link href="/" onClick={tutup} aria-label="Dashboard">
            <TandaMutu />
          </Link>
          <p className="min-w-0 flex-1 truncate text-[16px] font-bold">{aktif?.label ?? "MutuRS"}</p>
          <button
            type="button"
            onClick={() => setBuka(!buka)}
            aria-expanded={buka}
            aria-controls="menu-hp"
            className="grid size-11 place-items-center rounded-xl hover:bg-active"
          >
            <Ikon nama={buka ? "tutup" : "menu"} className="size-6" />
            <span className="sr-only">{buka ? "Tutup menu" : "Buka menu"}</span>
          </button>
        </div>
        {buka && (
          <nav
            id="menu-hp"
            aria-label="Menu utama"
            className="fixed inset-x-0 top-14 bottom-0 grid content-start gap-5 overflow-y-auto bg-surface px-3 pt-3 pb-8"
          >
            <DaftarMenu kelompok={kelompok} aktif={aktif?.href} pilih={tutup} />
            <Akun pengguna={pengguna} namaRs={namaRs} pilih={tutup} />
          </nav>
        )}
      </div>
    </>
  );
}
