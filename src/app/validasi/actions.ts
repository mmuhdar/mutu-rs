"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { bilanganBulat, ditolak, teks, type StateForm } from "@/lib/form";
import { simpanValidasi } from "@/modules/validasi/service";
import { getSessionUser } from "@/server/sesi";

/** Mencatat validasi baru, atau memperbaiki catatan validasi (`id`); sukses diarahkan ke detailnya. */
export async function simpanValidasiAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const id = teks(formData, "id") || undefined;
  const penyebab = formData.getAll("penyebab").map(String);
  const hasil = await hasilAtauError(
    simpanValidasi(
      await getSessionUser(),
      {
        indikatorId: teks(formData, "indikatorId"),
        unitId: teks(formData, "unitId"),
        bulan: teks(formData, "bulan"),
        pemicu: teks(formData, "pemicu"),
        tanggal: teks(formData, "tanggal"),
        pengumpulData: teks(formData, "pengumpulData"),
        validator: teks(formData, "validator"),
        populasi: bilanganBulat(teks(formData, "populasi")),
        sampel: bilanganBulat(teks(formData, "sampel")),
        sesuai: bilanganBulat(teks(formData, "sesuai")),
        penyebab,
        perbaikan: teks(formData, "perbaikan"),
        catatan: teks(formData, "catatan"),
      },
      id,
    ),
  );
  // Penyebab bernilai banyak; `ditolak` hanya menyimpan yang terakhir, jadi semuanya dikirim ulang dipisah koma.
  if ("error" in hasil) {
    const state = ditolak(formData, hasil.error);
    return { ...state, nilai: { ...state.nilai, penyebab: penyebab.join(",") } };
  }
  revalidatePath("/", "layout");
  redirect(`/validasi/${hasil.hasil.id}`);
}
