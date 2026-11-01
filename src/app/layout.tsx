import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";

import { bulanBerjalan, bulanLalu, labelBulan } from "@/lib/bulan";
import { config } from "@/lib/config";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { getSessionUser } from "@/server/sesi";

import { Bingkai, type ItemMenu, type KelompokMenu } from "./nav-samping";

import "./globals.css";

/*
 * Plus Jakarta Sans (variabel 400–800, Tokotype Jakarta) untuk semua teks; IBM Plex Mono hanya untuk kode Indikator.
 * Disimpan di aplikasi (lisensi OFL, `fonts/`), jadi tetap tampil di server RS tanpa internet.
 */
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans-latin.woff2", weight: "400 800", variable: "--font-jakarta" });
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  return (
    <html lang="id" className={`${jakarta.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-[15px] leading-6 text-foreground">
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
            kartu={
              bolehKelolaIndikator(pengguna)
                ? {
                    judul: "Lapor SIMAR",
                    isi: `INM ${labelBulan(bulanLalu())} paling lambat 10 ${labelBulan(bulanBerjalan())}.`,
                    tautan: { href: "/pengukuran/pantau", label: "Status Pengukuran" },
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
