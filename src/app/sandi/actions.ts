"use server";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import { gantiSandi } from "@/modules/auth/service";
import { getSessionUser } from "@/server/sesi";

export type StateSandi = { error?: string; berhasil?: boolean };

export async function gantiSandiAction(_prev: StateSandi, formData: FormData): Promise<StateSandi> {
  const sandiBaru = teks(formData, "sandiBaru");
  // Hanya penjaga salah ketik di form; aturan sandi ada di service.
  if (sandiBaru !== formData.get("ulangiSandi")) return { error: "Ulangan sandi baru tidak sama." };
  const hasil = await hasilAtauError(
    gantiSandi(await getSessionUser(), { sandiLama: teks(formData, "sandiLama"), sandiBaru }),
  );
  return "error" in hasil ? { error: hasil.error } : { berhasil: true };
}
