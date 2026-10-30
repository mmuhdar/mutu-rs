"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ServiceError } from "@/lib/errors";
import { masuk } from "@/modules/auth/service";
import { simpanCookieSesi } from "@/server/sesi";

export type StateMasuk = { error?: string; username?: string };

export async function masukAction(_prev: StateMasuk, formData: FormData): Promise<StateMasuk> {
  const username = String(formData.get("username") ?? "");
  const h = await headers();
  // IP klien = entri paling kanan X-Forwarded-For. Header ini bisa dipalsukan, karena itu
  // pembatasan per username saja tetap berlaku di service.
  const ip = h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || h.get("x-real-ip") || "tidak diketahui";
  try {
    const token = await masuk({ username, sandi: String(formData.get("sandi") ?? ""), ip });
    await simpanCookieSesi(token);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, username };
    throw error;
  }
  redirect("/");
}
