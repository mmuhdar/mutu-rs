"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import type { StatusTindakLanjut } from "@/lib/perbaikan";
import { simpanAnalisis, tambahTindakLanjut, ubahTindakLanjut } from "@/modules/perbaikan/service";
import { getSessionUser } from "@/server/sesi";

/** `nilai` = isian yang dikirim, dikembalikan saat ditolak supaya form tidak kosong; `tersimpan` = konfirmasi. */
export type StateAnalisis = { error?: string; nilai?: Record<string, string>; tersimpan?: boolean };

/** Penolakan service menjadi pesan form beserta isian yang dikirim. */
const ditolak = (formData: FormData, error: string): StateAnalisis => ({
  error,
  nilai: Object.fromEntries(formData) as Record<string, string>,
});

/** Perubahan di halaman Analisis: penolakan menjadi pesan form, sukses memuat ulang halaman. */
async function ubah(formData: FormData, janji: Promise<unknown>): Promise<StateAnalisis> {
  const hasil = await hasilAtauError(janji);
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  return { tersimpan: true };
}

/** Lingkup dari form: `unitId` kosong = Lingkup RS. */
const lingkup = (formData: FormData) => teks(formData, "unitId") || null;

export async function simpanAnalisisAction(_prev: StateAnalisis, formData: FormData) {
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

export async function tambahTindakLanjutAction(_prev: StateAnalisis, formData: FormData) {
  return ubah(formData, tambahTindakLanjut(await getSessionUser(), teks(formData, "analisisId"), isianTindakLanjut(formData)));
}

export async function ubahTindakLanjutAction(_prev: StateAnalisis, formData: FormData) {
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
