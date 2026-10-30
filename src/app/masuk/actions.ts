"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import { masuk } from "@/modules/auth/service";
import { simpanCookieSesi } from "@/server/sesi";

export type StateMasuk = { error?: string; username?: string };

export async function masukAction(_prev: StateMasuk, formData: FormData): Promise<StateMasuk> {
  const username = teks(formData, "username");
  const h = await headers();
  // IP klien = entri paling kanan X-Forwarded-For. Header ini bisa dipalsukan, karena itu
  // pembatasan per username saja tetap berlaku di service.
  const ip = h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || h.get("x-real-ip") || "tidak diketahui";
  const token = await hasilAtauError(masuk({ username, sandi: teks(formData, "sandi"), ip }));
  if ("error" in token) return { error: token.error, username };
  await simpanCookieSesi(token.hasil);
  redirect("/");
}
