"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import { aturAktifUnit, gantiNamaUnit, tambahUnit } from "@/modules/unit/service";
import { getSessionUser } from "@/server/sesi";

/** `nama` dikembalikan saat gagal supaya isian tidak hilang (React mengosongkan form setelah action selesai). */
export type StateUnit = { error?: string; nama?: string };

async function jalankan(simpan: Promise<unknown>, nama?: string): Promise<StateUnit> {
  const hasil = await hasilAtauError(simpan);
  if ("error" in hasil) return { error: hasil.error, nama };
  revalidatePath("/unit");
  return {};
}

export async function tambahUnitAction(_prev: StateUnit, formData: FormData) {
  const nama = teks(formData, "nama");
  return jalankan(tambahUnit(await getSessionUser(), { nama }), nama);
}

export async function gantiNamaUnitAction(_prev: StateUnit, formData: FormData) {
  const nama = teks(formData, "nama");
  return jalankan(gantiNamaUnit(await getSessionUser(), teks(formData, "id"), { nama }), nama);
}

export async function aturAktifUnitAction(_prev: StateUnit, formData: FormData) {
  return jalankan(aturAktifUnit(await getSessionUser(), teks(formData, "id"), formData.get("aktif") === "true"));
}
