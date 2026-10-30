"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import type { AksiVerifikasi } from "@/lib/pengukuran";
import { ajukanPengukuran, simpanPengukuran, ubahStatusPengukuran } from "@/modules/pengukuran/service";
import { getSessionUser } from "@/server/sesi";

export type StatePengukuran = { error?: string };

/**
 * N dan D dari form: hanya angka 0–9. Isian kosong atau berformat lain ("1,5", "1.000", "-1") menjadi NaN, bukan
 * angka yang dibaca diam-diam berbeda, sehingga ditolak service.
 */
const bilanganBulat = (isian: string) => (/^\d+$/.test(isian.trim()) ? Number(isian.trim()) : Number.NaN);

/** Simpan Draf atau Ajukan (tombol `aksi`); sukses kembali ke daftar isian Unit dan bulan itu. */
export async function simpanPengukuranAction(_prev: StatePengukuran, formData: FormData): Promise<StatePengukuran> {
  const isian = {
    indikatorId: teks(formData, "indikatorId"),
    unitId: teks(formData, "unitId"),
    bulan: teks(formData, "bulan"),
    n: bilanganBulat(teks(formData, "n")),
    d: bilanganBulat(teks(formData, "d")),
    catatan: teks(formData, "catatan"),
  };
  const jalankan = formData.get("aksi") === "ajukan" ? ajukanPengukuran : simpanPengukuran;
  const hasil = await hasilAtauError(jalankan(await getSessionUser(), isian));
  if ("error" in hasil) return { error: hasil.error };
  revalidatePath("/pengukuran", "layout");
  redirect(`/pengukuran?${new URLSearchParams({ unit: isian.unitId, bulan: isian.bulan })}`);
}

/** Verifikasi, kembalikan, atau buka kembali (tombol `aksi`); sukses kembali ke antrean Verifikasi. */
export async function ubahStatusPengukuranAction(_prev: StatePengukuran, formData: FormData): Promise<StatePengukuran> {
  const hasil = await hasilAtauError(
    ubahStatusPengukuran(
      await getSessionUser(),
      teks(formData, "id"),
      // Aksi yang tidak dikenal ditolak service.
      teks(formData, "aksi") as AksiVerifikasi,
      teks(formData, "alasan"),
    ),
  );
  if ("error" in hasil) return { error: hasil.error };
  revalidatePath("/pengukuran", "layout");
  redirect("/pengukuran/verifikasi");
}
