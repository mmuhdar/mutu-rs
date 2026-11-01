"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { keluarAction } from "./actions";
import { Ikon, type NamaIkon } from "./ikon";

export type ItemMenu = { href: string; label: string; ikon: NamaIkon };
export type KelompokMenu = { judul: string; item: ItemMenu[] };

/** Menu yang sedang dibuka: href terpanjang yang menjadi awalan alamat ("/" hanya Dashboard itu sendiri). */
const menuAktif = (menu: ItemMenu[], alamat: string) =>
  menu
    .filter((m) => (m.href === "/" ? alamat === "/" : alamat === m.href || alamat.startsWith(`${m.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

/** Tanda MutuRS: palang rumah sakit berisi centang mutu, digambar untuk produk ini. */
export function TandaMutu({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" className="fill-accent" />
      <path d="m8.6 12.2 2.3 2.3 4.5-4.6" fill="none" stroke="white" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DaftarMenu({ kelompok, aktif, pilih }: { kelompok: KelompokMenu[]; aktif?: string; pilih: () => void }) {
  return (
    <div className="grid gap-5">
      {kelompok.map((k) => (
        <div key={k.judul}>
          <p className="px-3 pb-1.5 text-[12px] text-muted-foreground">{k.judul}</p>
          <ul className="grid gap-0.5">
            {k.item.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onClick={pilih}
                  aria-current={m.href === aktif ? "page" : undefined}
                  className={`flex min-h-9 items-center gap-2.5 rounded-md px-3 text-[14px] pointer-coarse:min-h-11 ${
                    m.href === aktif ? "bg-active font-medium" : "text-foreground hover:bg-active/60"
                  }`}
                >
                  <Ikon nama={m.ikon} className={`size-4 ${m.href === aktif ? "text-foreground" : "text-muted-foreground"}`} />
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

/**
 * Navigasi gaya "framed sheet": di layar lebar sidebar 228px pada bingkai (tanpa garis ke bar atas); di HP dan tablet
 * bingkai hilang, tersisa bar 48px berisi tombol menu dan nama layar, dan menu dibuka sebagai lembar penuh. Menu sudah
 * disaring per peran oleh layout (hanya tampilan).
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
  const merek = (
    <Link href="/" onClick={tutup} className="flex items-center gap-2.5 rounded-md px-3 py-1">
      <TandaMutu />
      <span className="text-[16px] font-semibold tracking-[-0.01em]">MutuRS</span>
    </Link>
  );

  return (
    <>
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-2 lg:pt-3 lg:pb-4">
        {merek}
        <nav aria-label="Menu utama">
          <DaftarMenu kelompok={kelompok} aktif={aktif?.href} pilih={tutup} />
        </nav>
      </aside>

      <div className="sticky top-0 z-20 bg-background lg:hidden">
        <div className="flex h-12 items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => setBuka(!buka)}
            aria-expanded={buka}
            aria-controls="menu-hp"
            className="grid size-11 place-items-center rounded-md hover:bg-active"
          >
            <Ikon nama={buka ? "tutup" : "menu"} className="size-5" />
            <span className="sr-only">{buka ? "Tutup menu" : "Buka menu"}</span>
          </button>
          <TandaMutu className="size-5" />
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{aktif?.label ?? "MutuRS"}</p>
        </div>
        {buka && (
          <nav
            id="menu-hp"
            aria-label="Menu utama"
            className="fixed inset-x-0 top-12 bottom-0 overflow-y-auto bg-background px-2 pt-2 pb-6"
          >
            <div className="mb-4 rounded-lg border border-border bg-surface px-3 py-3">
              <p className="font-medium">{pengguna.nama}</p>
              <p className="text-[13px] text-muted-foreground">
                {pengguna.peran} · {namaRs}
              </p>
            </div>
            <DaftarMenu kelompok={kelompok} aktif={aktif?.href} pilih={tutup} />
            <div className="mt-5 grid gap-0.5 border-t border-border pt-3">
              <Link href="/sandi" onClick={tutup} className="flex min-h-11 items-center gap-2.5 rounded-md px-3 hover:bg-active/60">
                <Ikon nama="sandi" className="size-4 text-muted-foreground" />
                Ganti sandi
              </Link>
              <form action={keluarAction}>
                <button type="submit" className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 hover:bg-active/60">
                  <Ikon nama="keluar" className="size-4 text-muted-foreground" />
                  Keluar
                </button>
              </form>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
