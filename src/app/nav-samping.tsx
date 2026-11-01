"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
  // Id unik per tanda: rujukan ke gradasi di elemen yang tersembunyi (display: none) tidak tergambar.
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
        <span className="block text-[12px] text-sidebar-foreground">Ukur. Pantau. Perbaiki.</span>
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

/** Isi sidebar (shadcn `Sidebar`; di HP menjadi `Sheet` yang tertutup setelah memilih menu). */
function MenuSamping(p: { kelompok: KelompokMenu[]; aktif?: string; kartu?: KartuSamping }) {
  const { setOpenMobile } = useSidebar();
  const tutup = () => setOpenMobile(false);
  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-6 pb-2">
        <Link href="/" onClick={tutup} className="rounded-xl px-2 py-1">
          <Merek />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {p.kelompok.map((k, i) => (
          <div key={k.judul}>
            {i > 0 && <SidebarSeparator className="mx-2" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">{k.judul}</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {k.item.map((m) => (
                  <SidebarMenuItem key={m.href}>
                    <SidebarMenuButton asChild isActive={m.href === p.aktif}>
                      <Link href={m.href} onClick={tutup} aria-current={m.href === p.aktif ? "page" : undefined}>
                        <Ikon nama={m.ikon} />
                        <span>{m.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>
      {p.kartu && (
        <SidebarFooter className="p-4">
          <div className="rounded-2xl bg-linear-to-br from-primary-ink to-brand p-4">
            <p className="font-bold text-white">{p.kartu.judul}</p>
            <p className="mt-1 text-[13px] leading-5 text-white/80">{p.kartu.isi}</p>
            <Button asChild size="sm" className="mt-3 bg-linear-to-r from-aktif-dari to-aktif-ke text-white shadow-aktif hover:opacity-90">
              <Link href={p.kartu.tautan.href} onClick={tutup}>
                {p.kartu.tautan.label} →
              </Link>
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

/** Menu akun di bar atas (shadcn `DropdownMenu`): nama, peran, dan RS; berisi Ganti sandi dan Keluar. */
function MenuAkun({ pengguna, namaRs }: { pengguna: { nama: string; peran: string }; namaRs: string }) {
  return (
    <>
      <form id="form-keluar" action={keluarAction} hidden />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-3 rounded-xl py-1.5 pr-2 pl-1.5 hover:bg-card">
            <Avatar className="size-10">
              <AvatarFallback className="bg-linear-to-br from-aktif-dari to-primary text-[13px] font-bold text-white">
                {inisial(pengguna.nama)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-44 truncate text-[14px] font-semibold">{pengguna.nama}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{pengguna.peran}</span>
            </span>
            <Ikon nama="bawah" className="size-4 text-muted-foreground" />
            <span className="sr-only">Menu akun</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-[14px] font-semibold">{pengguna.nama}</span>
            <span className="block text-[13px] text-muted-foreground">
              {pengguna.peran} · {namaRs}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/sandi">
              <Ikon nama="sandi" className="size-4" />
              Ganti sandi
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" form="form-keluar" className="w-full">
              <Ikon nama="keluar" className="size-4" />
              Keluar
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * Bingkai aplikasi untuk Pengguna yang masuk (shadcn `SidebarProvider`): sidebar navy di kiri (laci di HP, bisa
 * disembunyikan di desktop; keadaannya disimpan di cookie `sidebar_state`), bar atas berisi pencarian Indikator dan menu
 * akun, lalu isi halaman. Menu sudah disaring per peran oleh layout (hanya tampilan).
 */
export function Bingkai(p: {
  kelompok: KelompokMenu[];
  namaRs: string;
  pengguna: { nama: string; peran: string };
  kartu?: KartuSamping;
  bukaAwal: boolean;
  children: React.ReactNode;
}) {
  const aktif = menuAktif(
    p.kelompok.flatMap((k) => k.item),
    usePathname(),
  );
  return (
    <SidebarProvider defaultOpen={p.bukaAwal}>
      <MenuSamping kelompok={p.kelompok} aktif={aktif?.href} kartu={p.kartu} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <SidebarTrigger variant="outline" size="icon" className="shrink-0" />
            <p className="min-w-0 flex-1 truncate text-[16px] font-bold sm:hidden">{aktif?.label ?? "MutuRS"}</p>
            <form action="/indikator" role="search" className="relative hidden max-w-md flex-1 sm:block">
              <Ikon nama="cari" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                aria-label="Cari Indikator"
                placeholder="Cari Indikator (kode atau nama)…"
                className="border-border pl-10 shadow-kartu"
              />
            </form>
            <div className="ml-auto">
              <MenuAkun pengguna={p.pengguna} namaRs={p.namaRs} />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-2 pb-10 sm:px-6 lg:px-8">{p.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
