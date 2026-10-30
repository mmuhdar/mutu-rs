import { NextResponse, type NextRequest } from "next/server";

// Sama dengan COOKIE_SESI di src/server/sesi.ts (tidak diimpor supaya proxy tidak ikut memuat modul database).
const COOKIE_SESI = "mutu_sesi";

/**
 * Penyaring awal: tanpa cookie sesi, setiap halaman selain Masuk diarahkan ke halaman Masuk.
 * Sesi yang sesungguhnya tetap diperiksa di halaman (`requireUser()`) dan di service.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/masuk" || request.cookies.has(COOKIE_SESI)) return NextResponse.next();
  return NextResponse.redirect(new URL("/masuk", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
