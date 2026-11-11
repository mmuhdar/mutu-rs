"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { ditolak, teks, type StateForm } from "@/lib/form";
import { simpanRekomendasi } from "@/modules/laporan/service";
import { getSessionUser } from "@/server/sesi";

export async function simpanRekomendasiAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(
    simpanRekomendasi(await getSessionUser(), { triwulan: teks(formData, "triwulan"), teks: teks(formData, "teks") }),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/laporan");
  return {};
}
