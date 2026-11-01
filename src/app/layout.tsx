import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { config } from "@/lib/config";
import { LABEL_PERAN, PERAN, type Peran } from "@/lib/peran";
import { getSessionUser } from "@/server/sesi";

import { keluarAction } from "./actions";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MutuRS", template: "%s · MutuRS" },
  description: "Aplikasi indikator mutu rumah sakit.",
  robots: { index: false, follow: false },
};

/** Menu utama, disaring per peran. Hanya tampilan: hak akses tetap diperiksa di service. */
const MENU: { href: string; label: string; peran: readonly Peran[] }[] = [
  { href: "/", label: "Dashboard", peran: PERAN },
  { href: "/pengukuran", label: "Isi Pengukuran", peran: ["petugasInputData", "kepalaUnit"] },
  { href: "/pengukuran/verifikasi", label: "Verifikasi", peran: ["kepalaUnit"] },
  { href: "/pengukuran/pantau", label: "Status Pengukuran", peran: ["komiteMutu", "adminSistem"] },
  { href: "/monitoring", label: "Monitoring", peran: PERAN },
  { href: "/tindak-lanjut", label: "Tindak Lanjut", peran: PERAN },
  { href: "/indikator", label: "Indikator", peran: PERAN },
  { href: "/unit", label: "Unit", peran: ["adminSistem"] },
  { href: "/pengguna", label: "Pengguna", peran: ["adminSistem"] },
  { href: "/sandi", label: "Ganti sandi", peran: PERAN },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  const menu = pengguna ? MENU.filter((m) => m.peran.includes(pengguna.peran)) : [];
  const merek = (
    <>
      <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">MutuRS</span>
      <span className="truncate text-[15px] font-semibold">{config.namaRs}</span>
    </>
  );
  return (
    <html lang="id">
      <body className="min-h-dvh bg-background text-sm text-foreground">
        {/* Di HP header tidak menempel di atas: menu bisa membungkus beberapa baris. */}
        <header className="border-b border-border bg-surface sm:sticky sm:top-0 sm:z-10">
          <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            {/*
              Tanpa sesi, merek bukan tautan: prefetch "/" dari halaman Masuk dialihkan proxy dan meninggalkan
              alamat `/masuk?_rsc=...` saat Back setelah keluar.
            */}
            {pengguna ? (
              <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
                {merek}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">{merek}</div>
            )}
            {pengguna && (
              <>
                {/* HP: nama · peran satu baris penuh di bawah merek; layar lebar: dua baris di samping Keluar. */}
                <p className="order-last flex w-full min-w-0 gap-1.5 text-[13px] leading-tight sm:order-none sm:block sm:w-auto sm:text-right">
                  <span className="truncate sm:block">{pengguna.nama}</span>
                  <span aria-hidden className="text-muted-foreground sm:hidden">
                    ·
                  </span>
                  <span className="shrink-0 text-muted-foreground sm:block">{LABEL_PERAN[pengguna.peran]}</span>
                </p>
                <form action={keluarAction}>
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-md border border-border px-3 font-medium hover:bg-background pointer-coarse:h-11"
                  >
                    Keluar
                  </button>
                </form>
              </>
            )}
          </div>
          {menu.length > 0 && (
            <nav className="mx-auto flex max-w-6xl flex-wrap gap-x-1 px-2 pb-1">
              {menu.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-md px-2 py-1.5 font-medium whitespace-nowrap hover:bg-background pointer-coarse:py-2.5"
                >
                  {m.label}
                </Link>
              ))}
            </nav>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
