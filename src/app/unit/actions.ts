"use server";

import { revalidatePath } from "next/cache";

import { ServiceError } from "@/lib/errors";
import { aturAktifUnit, gantiNamaUnit, tambahUnit } from "@/modules/unit/service";
import { getSessionUser } from "@/server/sesi";

/** `nama` dikembalikan saat gagal supaya isian tidak hilang (React mengosongkan form setelah action selesai). */
export type StateUnit = { error?: string; nama?: string };

async function jalankan(simpan: () => Promise<unknown>, nama?: string): Promise<StateUnit> {
  try {
    await simpan();
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, nama };
    throw error;
  }
  revalidatePath("/unit");
  return {};
}

export async function tambahUnitAction(_prev: StateUnit, formData: FormData) {
  const nama = String(formData.get("nama") ?? "");
  return jalankan(async () => tambahUnit(await getSessionUser(), { nama }), nama);
}

export async function gantiNamaUnitAction(_prev: StateUnit, formData: FormData) {
  const nama = String(formData.get("nama") ?? "");
  const id = String(formData.get("id") ?? "");
  return jalankan(async () => gantiNamaUnit(await getSessionUser(), id, { nama }), nama);
}

export async function aturAktifUnitAction(_prev: StateUnit, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  return jalankan(async () => aturAktifUnit(await getSessionUser(), id, formData.get("aktif") === "true"));
}
