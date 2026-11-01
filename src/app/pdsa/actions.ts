"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { ditolak, teks, type StateForm } from "@/lib/form";
import type { KeputusanPdsa, TahapIsianPdsa } from "@/lib/perbaikan";
import { buatPdsa, simpanTahapPdsa, type IsianTahapPdsa } from "@/modules/perbaikan/service";
import { getSessionUser } from "@/server/sesi";

const isianPlan = (formData: FormData) => ({
  judul: teks(formData, "judul"),
  masalah: teks(formData, "masalah"),
  tujuan: teks(formData, "tujuan"),
  prediksi: teks(formData, "prediksi"),
  rencana: teks(formData, "rencana"),
  bulanMulai: teks(formData, "bulanMulai"),
  bulanAkhir: teks(formData, "bulanAkhir"),
});

/** Memulai PDSA (atau siklus berikutnya bila ada `sebelumnyaId`); sukses diarahkan ke detail PDSA. */
export async function buatPdsaAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(
    buatPdsa(await getSessionUser(), {
      indikatorId: teks(formData, "indikatorId"),
      // "" = Lingkup RS.
      unitId: teks(formData, "unitId") || null,
      sebelumnyaId: teks(formData, "sebelumnyaId") || undefined,
      ...isianPlan(formData),
    }),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  redirect(`/pdsa/${hasil.hasil.id}`);
}

/** Menyimpan isian satu tahap (`tahap`), lalu maju ke tahap berikutnya bila tombol `lanjut` = "ya" (dan membuka tabnya). */
export async function simpanTahapPdsaAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  // Tahap di luar daftar ditolak service.
  const tahap = teks(formData, "tahap") as TahapIsianPdsa;
  const isian: IsianTahapPdsa = {
    plan: isianPlan(formData),
    do: { pelaksanaan: teks(formData, "pelaksanaan") },
    study: { hasil: teks(formData, "hasil") },
    act: { keputusan: teks(formData, "keputusan") as KeputusanPdsa, penjelasan: teks(formData, "penjelasan") },
  };
  const id = teks(formData, "id");
  const lanjut = formData.get("lanjut") === "ya";
  const hasil = await hasilAtauError(simpanTahapPdsa(await getSessionUser(), id, tahap, isian[tahap], lanjut));
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  // Setelah lanjut, buka tab tahap aktif yang baru (alamat tanpa `?tahap=`).
  if (lanjut) redirect(`/pdsa/${id}`);
  return {};
}
