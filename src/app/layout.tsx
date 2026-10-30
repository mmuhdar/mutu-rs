import type { Metadata } from "next";
import { connection } from "next/server";

import { config } from "@/lib/config";
import { LABEL_PERAN } from "@/lib/peran";
import { getSessionUser } from "@/server/sesi";

import { keluarAction } from "./actions";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MutuRS", template: "%s · MutuRS" },
  description: "Aplikasi indikator mutu rumah sakit.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request: nama RS dibaca dari environment saat server berjalan, bukan saat build.
  await connection();
  const pengguna = await getSessionUser();
  return (
    <html lang="id">
      <body className="min-h-dvh bg-background text-sm text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-surface">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              MutuRS
            </span>
            <span className="truncate text-[15px] font-semibold">{config.namaRs}</span>
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
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
