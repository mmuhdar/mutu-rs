import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { bulanLalu, labelBulan, labelTanggal } from "@/lib/bulan";
import { jadwalSimar } from "@/lib/laporan";
import { config } from "@/lib/config";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { PELIHAT_RS } from "@/modules/capaian/service";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { getSessionUser } from "@/server/sesi";

import { Bingkai, type ItemMenu, type KelompokMenu } from "./nav-samping";

import "./globals.css";

/*
 * Tema Console (Hallmark): Host Grotesk 400 dan 500 untuk semua yang dibaca orang; Atkinson Hyperlegible Mono untuk
 * yang ditulis instrumen (kode Indikator, Capaian, N, D, waktu). Disimpan di aplikasi (lisensi OFL, `fonts/`), jadi tetap
 * tampil di server RS tanpa internet.
 */
const host = localFont({ src: "./fonts/host-grotesk-latin.woff2", weight: "400 500", variable: "--font-host", display: "swap" });
const atkinson = localFont({
  src: "./fonts/atkinson-hyperlegible-mono-latin.woff2",
  weight: "400 500",
  variable: "--font-atkinson",
  display: "swap",
});

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
      { href: "/insiden", label: "Insiden", ikon: "insiden", peran: PERAN },
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
    judul: "Laporan",
    item: [
      { href: "/laporan", label: "Laporan Triwulan", ikon: "laporan", peran: PELIHAT_RS },
      { href: "/simar", label: "Rekap SIMAR", ikon: "simar", peran: PELIHAT_RS },
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  const simar = jadwalSimar(bulanLalu());
  const kue = await cookies();
  // Mode gelap kecuali Pengguna memilih terang (cookie dari `TombolTema` di nav-samping).
  const terang = kue.get("tema")?.value === "terang";
  return (
    <html lang="id" data-theme={terang ? "light" : "dark"} className={`${host.variable} ${atkinson.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-base leading-6 text-foreground">
        {pengguna ? (
          <Bingkai
            kelompok={
              MENU.map((k) => ({
                judul: k.judul,
                item: k.item.filter((m) => m.peran.includes(pengguna.peran)).map(({ href, label, ikon }) => ({ href, label, ikon })),
              })).filter((k) => k.item.length > 0) satisfies KelompokMenu[]
            }
            namaRs={config.namaRs}
            pengguna={{ nama: pengguna.nama, peran: LABEL_PERAN[pengguna.peran] }}
            // Sidebar desktop terbuka kecuali Pengguna menutupnya (cookie dari shadcn `SidebarProvider`).
            bukaAwal={kue.get("sidebar_state")?.value !== "false"}
            terangAwal={terang}
            kartu={
              bolehKelolaIndikator(pengguna)
                ? {
                    judul: "Lapor SIMAR",
                    isi: `INM ${labelBulan(bulanLalu())} paling lambat ${labelTanggal(simar.tenggat)}${simar.lewatTenggat ? ", sudah lewat" : ""}.`,
                    tautan: { href: "/simar", label: "Rekap SIMAR" },
                  }
                : undefined
            }
          >
            {children}
          </Bingkai>
        ) : (
          // Tanpa sesi tidak ada tautan ke halaman terlindung: prefetch-nya dialihkan proxy dan meninggalkan alamat
          // `/masuk?_rsc=...` saat Back setelah keluar. Halaman Masuk menggambar mereknya sendiri.
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
