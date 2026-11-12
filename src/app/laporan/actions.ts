"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { ditolak, teks, type StateForm } from "@/lib/form";
import { simpanRekomendasi, simpanTindakLanjutUmpanBalik, simpanUmpanBalik } from "@/modules/laporan/service";
import { getSessionUser } from "@/server/sesi";

export async function simpanRekomendasiAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(
    simpanRekomendasi(await getSessionUser(), { triwulan: teks(formData, "triwulan"), teks: teks(formData, "teks") }),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/laporan");
  return {};
}

export async function simpanUmpanBalikAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(
    simpanUmpanBalik(await getSessionUser(), {
      triwulan: teks(formData, "triwulan"),
      teks: teks(formData, "teks"),
      diterimaPada: teks(formData, "diterimaPada"),
    }),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/laporan");
  return {};
}

export async function simpanTindakLanjutUmpanBalikAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(
    simpanTindakLanjutUmpanBalik(await getSessionUser(), { triwulan: teks(formData, "triwulan"), tindakLanjut: teks(formData, "tindakLanjut") }),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/laporan");
  return {};
}
