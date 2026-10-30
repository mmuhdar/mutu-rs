"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ServiceError } from "@/lib/errors";
import { ajukanPengukuran, simpanPengukuran } from "@/modules/pengukuran/service";
import { getSessionUser } from "@/server/sesi";

export type StatePengukuran = { error?: string };

/**
 * N dan D dari form: hanya angka 0–9. Isian kosong atau berformat lain ("1,5", "1.000", "-1") menjadi NaN, bukan
 * angka yang dibaca diam-diam berbeda, sehingga ditolak service.
 */
const bilanganBulat = (teks: string) => (/^\d+$/.test(teks.trim()) ? Number(teks.trim()) : Number.NaN);

/** Simpan Draf atau Ajukan (tombol `aksi`); sukses kembali ke daftar isian Unit dan bulan itu. */
export async function simpanPengukuranAction(_prev: StatePengukuran, formData: FormData): Promise<StatePengukuran> {
  const teks = (nama: string) => String(formData.get(nama) ?? "");
  const isian = {
    indikatorId: teks("indikatorId"),
    unitId: teks("unitId"),
    bulan: teks("bulan"),
    n: bilanganBulat(teks("n")),
    d: bilanganBulat(teks("d")),
    catatan: teks("catatan"),
  };
  const jalankan = formData.get("aksi") === "ajukan" ? ajukanPengukuran : simpanPengukuran;
  try {
    await jalankan(await getSessionUser(), isian);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
  revalidatePath("/pengukuran", "layout");
  redirect(`/pengukuran?${new URLSearchParams({ unit: isian.unitId, bulan: isian.bulan })}`);
}
