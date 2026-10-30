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
  { href: "/pengukuran", label: "Isi Pengukuran", peran: ["petugasInputData", "kepalaUnit"] },
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
  return (
    <html lang="id">
      <body className="min-h-dvh bg-background text-sm text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-surface">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                MutuRS
              </span>
              <span className="truncate text-[15px] font-semibold">{config.namaRs}</span>
            </Link>
            {pengguna && (
              <form action={keluarAction} className="ml-auto flex shrink-0 items-center gap-3">
                <span className="hidden text-right text-[13px] leading-tight sm:block">
                  {pengguna.nama}
                  <span className="block text-muted-foreground">{LABEL_PERAN[pengguna.peran]}</span>
                </span>
                <button
                  type="submit"
                  className="h-9 rounded-md border border-border px-3 font-medium hover:bg-background pointer-coarse:h-11"
                >
                  Keluar
                </button>
              </form>
            )}
          </div>
          {menu.length > 0 && (
            <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1">
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
