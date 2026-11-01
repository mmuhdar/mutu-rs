import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";

import { config } from "@/lib/config";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { getSessionUser } from "@/server/sesi";

import { NavSamping, TandaMutu, type ItemMenu, type KelompokMenu } from "./nav-samping";

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

/** Menu utama per kelompok, warna per area, disaring per peran. Hanya tampilan: hak akses tetap diperiksa di service. */
const MENU: { judul: string; item: (ItemMenu & { peran: readonly Peran[] })[] }[] = [
  {
    judul: "Data",
    item: [
      { href: "/", label: "Dashboard", ikon: "dashboard", area: "brand", peran: PERAN },
      { href: "/pengukuran", label: "Isi Pengukuran", ikon: "isi", area: "ukur", peran: ["petugasInputData", "kepalaUnit"] },
      { href: "/pengukuran/verifikasi", label: "Verifikasi", ikon: "verifikasi", area: "ukur", peran: ["kepalaUnit"] },
      { href: "/pengukuran/pantau", label: "Status Pengukuran", ikon: "pantau", area: "ukur", peran: ["komiteMutu", "adminSistem"] },
      { href: "/monitoring", label: "Monitoring", ikon: "monitoring", area: "pantau", peran: PERAN },
    ],
  },
  {
    judul: "Perbaikan",
    item: [
      { href: "/tindak-lanjut", label: "Tindak Lanjut", ikon: "tindakLanjut", area: "tindak", peran: PERAN },
      { href: "/pdsa", label: "PDSA", ikon: "pdsa", area: "pdsa", peran: PERAN },
    ],
  },
  {
    judul: "Pengaturan",
    item: [
      { href: "/indikator", label: "Indikator", ikon: "indikator", area: "atur", peran: PERAN },
      { href: "/unit", label: "Unit", ikon: "unit", area: "atur", peran: ["adminSistem"] },
      { href: "/pengguna", label: "Pengguna", ikon: "pengguna", area: "atur", peran: ["adminSistem"] },
    ],
  },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  const isi = <div className="mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>;
  return (
    <html lang="id" className={`${jakarta.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-[15px] leading-6 text-foreground">
        {pengguna ? (
          <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
            <NavSamping
              kelompok={
                MENU.map((k) => ({
                  judul: k.judul,
                  item: k.item
                    .filter((m) => m.peran.includes(pengguna.peran))
                    .map(({ href, label, ikon, area }) => ({ href, label, ikon, area })),
                })).filter((k) => k.item.length > 0) satisfies KelompokMenu[]
              }
              namaRs={config.namaRs}
              pengguna={{ nama: pengguna.nama, peran: LABEL_PERAN[pengguna.peran] }}
            />
            <main className="min-w-0">{isi}</main>
          </div>
        ) : (
          <>
            {/*
              Tanpa sesi, merek bukan tautan: prefetch "/" dari halaman Masuk dialihkan proxy dan meninggalkan
              alamat `/masuk?_rsc=...` saat Back setelah keluar.
            */}
            <header className="mx-auto flex h-16 max-w-[1240px] items-center gap-2.5 px-4 sm:px-6 lg:px-8">
              <TandaMutu />
              <span className="text-[18px] font-bold tracking-[-0.02em]">MutuRS</span>
              <span className="truncate text-muted-foreground">· {config.namaRs}</span>
            </header>
            <main>{isi}</main>
          </>
        )}
      </body>
    </html>
  );
}
