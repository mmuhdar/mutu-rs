import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { connection } from "next/server";

import { config } from "@/lib/config";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { getSessionUser } from "@/server/sesi";

import { keluarAction } from "./actions";
import { Ikon } from "./ikon";
import { NavSamping, TandaMutu, type ItemMenu, type KelompokMenu } from "./nav-samping";

import "./globals.css";

/* IBM Plex Sans (variabel 400–600) dan Plex Mono untuk kode Indikator, disimpan di aplikasi (lisensi OFL, `fonts/`). */
const plex = localFont({ src: "./fonts/ibm-plex-sans-latin.woff2", weight: "400 600", variable: "--font-plex" });
const plexMono = localFont({ src: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: { default: "MutuRS", template: "%s · MutuRS" },
  description: "Aplikasi indikator mutu rumah sakit.",
  robots: { index: false, follow: false },
};

/** Menu utama per kelompok, disaring per peran. Hanya tampilan: hak akses tetap diperiksa di service. */
const MENU: { judul: string; item: (ItemMenu & { peran: readonly Peran[] })[] }[] = [
  {
    judul: "Data",
    item: [
      { href: "/", label: "Dashboard", ikon: "dashboard", peran: PERAN },
      { href: "/pengukuran", label: "Isi Pengukuran", ikon: "isi", peran: ["petugasInputData", "kepalaUnit"] },
      { href: "/pengukuran/verifikasi", label: "Verifikasi", ikon: "verifikasi", peran: ["kepalaUnit"] },
      { href: "/pengukuran/pantau", label: "Status Pengukuran", ikon: "pantau", peran: ["komiteMutu", "adminSistem"] },
      { href: "/monitoring", label: "Monitoring", ikon: "monitoring", peran: PERAN },
    ],
  },
  {
    judul: "Perbaikan",
    item: [
      { href: "/tindak-lanjut", label: "Tindak Lanjut", ikon: "tindakLanjut", peran: PERAN },
      { href: "/pdsa", label: "PDSA", ikon: "pdsa", peran: PERAN },
    ],
  },
  {
    judul: "Pengaturan",
    item: [
      { href: "/indikator", label: "Indikator", ikon: "indikator", peran: PERAN },
      { href: "/unit", label: "Unit", ikon: "unit", peran: ["adminSistem"] },
      { href: "/pengguna", label: "Pengguna", ikon: "pengguna", peran: ["adminSistem"] },
    ],
  },
];

/** Dua huruf pertama nama untuk lingkaran akun: "Ns. Komite Mutu" → "NK". */
const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join("");

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  const isi = <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:py-6">{children}</div>;
  return (
    <html lang="id" className={`${plex.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-surface font-sans text-[14px] leading-5 text-foreground lg:bg-background">
        {pengguna ? (
          <div className="min-h-dvh lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
            <NavSamping
              kelompok={
                MENU.map((k) => ({
                  judul: k.judul,
                  item: k.item.filter((m) => m.peran.includes(pengguna.peran)).map(({ href, label, ikon }) => ({ href, label, ikon })),
                })).filter((k) => k.item.length > 0) satisfies KelompokMenu[]
              }
              namaRs={config.namaRs}
              pengguna={{ nama: pengguna.nama, peran: LABEL_PERAN[pengguna.peran] }}
            />
            {/* Bingkai L: bar atas 48px pada bingkai tanpa garis; halaman = lembar putih, 8px dari tepi kanan dan bawah. */}
            <div className="flex min-w-0 flex-col lg:pr-2 lg:pb-2">
              <header className="sticky top-0 z-10 hidden h-12 items-center gap-3 bg-background pr-2 pl-6 lg:flex">
                <p className="min-w-0 flex-1 truncate text-muted-foreground">{config.namaRs}</p>
                <Link href="/sandi" className="rounded-md px-2 py-1 text-muted-foreground hover:bg-active hover:text-foreground">
                  Ganti sandi
                </Link>
                <span className="flex items-center gap-2 pl-2">
                  <span
                    aria-hidden
                    className="grid size-7 place-items-center rounded-full bg-active text-[11px] font-semibold text-foreground"
                  >
                    {inisial(pengguna.nama)}
                  </span>
                  <span className="leading-tight">
                    <span className="block font-medium">{pengguna.nama}</span>
                    <span className="block text-[12px] text-muted-foreground">{LABEL_PERAN[pengguna.peran]}</span>
                  </span>
                </span>
                <form action={keluarAction}>
                  <button
                    type="submit"
                    className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-muted-foreground hover:bg-active hover:text-foreground"
                  >
                    <Ikon nama="keluar" className="size-4" />
                    Keluar
                  </button>
                </form>
              </header>
              <main className="flex-1 bg-surface lg:rounded-2xl lg:border lg:border-border">{isi}</main>
            </div>
          </div>
        ) : (
          <>
            {/*
              Tanpa sesi, merek bukan tautan: prefetch "/" dari halaman Masuk dialihkan proxy dan meninggalkan
              alamat `/masuk?_rsc=...` saat Back setelah keluar.
            */}
            <header className="mx-auto flex h-14 max-w-[1200px] items-center gap-2.5 px-4 sm:px-6">
              <TandaMutu />
              <span className="text-[16px] font-semibold">MutuRS</span>
              <span className="truncate text-muted-foreground">· {config.namaRs}</span>
            </header>
            <main>{isi}</main>
          </>
        )}
      </body>
    </html>
  );
}
