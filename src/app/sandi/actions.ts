"use server";

import { ServiceError } from "@/lib/errors";
import { gantiSandi } from "@/modules/auth/service";
import { getSessionUser } from "@/server/sesi";

export type StateSandi = { error?: string; berhasil?: boolean };

export async function gantiSandiAction(_prev: StateSandi, formData: FormData): Promise<StateSandi> {
  const sandiBaru = String(formData.get("sandiBaru") ?? "");
  // Hanya penjaga salah ketik di form; aturan sandi ada di service.
  if (sandiBaru !== formData.get("ulangiSandi")) return { error: "Ulangan sandi baru tidak sama." };
  try {
    await gantiSandi(await getSessionUser(), { sandiLama: String(formData.get("sandiLama") ?? ""), sandiBaru });
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
  return { berhasil: true };
}
