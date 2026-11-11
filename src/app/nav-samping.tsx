"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

/** Tanda MutuRS: palang rumah sakit berisi centang mutu, tinta di atas grafit (tanpa gradasi). */
export function TandaMutu({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <rect width="24" height="24" rx="6" className="fill-ink" />
      <path d="M9.6 4.5h4.8v5.1h5.1v4.8h-5.1v5.1H9.6v-5.1H4.5V9.6h5.1z" className="fill-paper" />
      <path d="m9.2 12.1 2 2 3.6-3.7" fill="none" className="stroke-ink" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Merek di kepala sidebar dan halaman Masuk: tanda, nama, dan alur singkatnya. */
export function Merek() {
  return (
    <span className="flex items-center gap-3">
      <TandaMutu />
      <span className="leading-tight">
        <span className="block font-display text-[19px] font-medium tracking-[-0.03em] text-ink">MutuRS</span>
        <span className="block text-[13px] text-sidebar-muted">Ukur. Pantau. Perbaiki.</span>
      </span>
    </span>
  );
}

/** Dua huruf pertama nama: "Ns. Komite Mutu" menjadi "NK". */
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
        <Link href="/" onClick={tutup} aria-label="MutuRS, ke Dashboard" className="rounded-md px-2 py-1">
          <Merek />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {p.kelompok.map((k, i) => (
          <div key={k.judul}>
            {i > 0 && <SidebarSeparator className="mx-2" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[13px] font-medium text-sidebar-muted">{k.judul}</SidebarGroupLabel>
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
          <div className="rounded-card border border-sidebar-border bg-sidebar-accent p-4">
            <p className="font-medium text-ink">{p.kartu.judul}</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-2">{p.kartu.isi}</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={p.kartu.tautan.href} onClick={tutup}>
                {p.kartu.tautan.label}
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
          <Button variant="ghost" className="h-auto gap-3 rounded-md py-1.5 pr-2 pl-1.5 hover:bg-card">
            <Avatar className="size-9">
              <AvatarFallback className="border border-rule-2 bg-paper-2 text-[13px] font-medium text-ink">
                {inisial(pengguna.nama)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-44 truncate text-[14px] font-medium">{pengguna.nama}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{pengguna.peran}</span>
            </span>
            <Ikon nama="bawah" className="size-4 text-muted-foreground" />
            <span className="sr-only">Menu akun</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-[14px] font-medium">{pengguna.nama}</span>
            <span className="block text-[13px] text-muted-foreground">{pengguna.peran}</span>
            <span className="block text-[13px] text-muted-foreground">{namaRs}</span>
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
        <header className="sticky top-0 z-20 border-b border-rule bg-background">
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
                className="pl-10"
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
