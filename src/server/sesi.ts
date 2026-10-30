// Penghubung cookie sesi dengan service auth. `cookies()` hanya bisa dipanggil di dalam request,
// jadi logika masuk/sesi tetap di `src/modules/auth/service.ts` (yang dites) dan file ini hanya mengurus cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { penggunaDariToken } from "@/modules/auth/service";

/** Nama cookie sesi; `src/proxy.ts` memakai nama yang sama. */
export const COOKIE_SESI = "mutu_sesi";

/** Pengguna yang sedang masuk, dibaca sekali per request. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_SESI)?.value;
  return token ? penggunaDariToken(token) : null;
});

/** Untuk halaman: tanpa sesi yang berlaku, arahkan ke halaman Masuk. */
export async function requireUser() {
  const pengguna = await getSessionUser();
  if (!pengguna) redirect("/masuk");
  return pengguna;
}

/** Hanya di server action / route handler. */
export async function simpanCookieSesi(token: string) {
  (await cookies()).set(COOKIE_SESI, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Tanpa maxAge: cookie hilang saat browser ditutup (aman untuk komputer bersama).
  });
}

/** Hanya di server action / route handler. */
export async function hapusCookieSesi() {
  (await cookies()).delete(COOKIE_SESI);
}
