"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { ditolak, teks, type StateForm } from "@/lib/form";
import type { StatusTindakLanjut } from "@/lib/perbaikan";
import { simpanAnalisis, tambahTindakLanjut, ubahTindakLanjut } from "@/modules/perbaikan/service";
import { getSessionUser } from "@/server/sesi";

/** Perubahan di halaman Analisis: penolakan menjadi pesan form, sukses memuat ulang halaman. */
async function ubah(formData: FormData, janji: Promise<unknown>): Promise<StateForm> {
  const hasil = await hasilAtauError(janji);
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  return {};
}

/** Lingkup dari form: `unitId` kosong = Lingkup RS. */
const lingkup = (formData: FormData) => teks(formData, "unitId") || null;

export async function simpanAnalisisAction(_prev: StateForm, formData: FormData) {
  return ubah(
    formData,
    simpanAnalisis(await getSessionUser(), {
      indikatorId: teks(formData, "indikatorId"),
      unitId: lingkup(formData),
      bulan: teks(formData, "bulan"),
      teks: teks(formData, "teks"),
    }),
  );
}

const isianTindakLanjut = (formData: FormData) => ({
  tindakan: teks(formData, "tindakan"),
  pic: teks(formData, "pic"),
  tenggat: teks(formData, "tenggat"),
});

export async function tambahTindakLanjutAction(_prev: StateForm, formData: FormData) {
  return ubah(formData, tambahTindakLanjut(await getSessionUser(), teks(formData, "analisisId"), isianTindakLanjut(formData)));
}

export async function ubahTindakLanjutAction(_prev: StateForm, formData: FormData) {
  return ubah(
    formData,
    ubahTindakLanjut(await getSessionUser(), teks(formData, "id"), {
      ...isianTindakLanjut(formData),
      // Status di luar daftar ditolak service.
      status: teks(formData, "status") as StatusTindakLanjut,
      catatan: teks(formData, "catatan"),
    }),
  );
}
