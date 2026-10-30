"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import type { Arah, Frekuensi } from "@/lib/indikator";
import {
  akhiriUnitPelapor,
  aturAktifIndikator,
  hapusUnitPelapor,
  tambahIndikator,
  tambahUnitPelapor,
  tetapkanTarget,
  ubahIndikator,
  type IndikatorBaru,
  type IsianIndikator,
} from "@/modules/indikator/service";
import { getSessionUser } from "@/server/sesi";

/** `nilai` = isian yang dikirim, dikembalikan saat gagal supaya form tidak kosong (React mengosongkan form setelah action). */
export type StateIndikator = { error?: string; nilai?: Record<string, string> };

/** Angka dari form: koma desimal diterima; isian kosong menjadi NaN (bukan 0) sehingga ditolak service. */
function angka(isian: string) {
  const rapi = isian.trim().replace(",", ".");
  return rapi === "" ? Number.NaN : Number(rapi);
}

function isianDariForm(formData: FormData): IsianIndikator {
  return {
    nama: teks(formData, "nama"),
    definisiOperasional: teks(formData, "definisiOperasional"),
    definisiNumerator: teks(formData, "definisiNumerator"),
    definisiDenominator: teks(formData, "definisiDenominator"),
    sumberData: teks(formData, "sumberData"),
    faktor: angka(teks(formData, "faktor")),
    satuan: teks(formData, "satuan"),
    // Nilai di luar daftar ditolak service.
    arah: teks(formData, "arah") as Arah,
    frekuensi: teks(formData, "frekuensi") as Frekuensi,
    pic: teks(formData, "pic"),
  };
}

/** Penolakan service menjadi pesan form beserta isian yang dikirim. */
const ditolak = (formData: FormData, error: string): StateIndikator => ({
  error,
  nilai: Object.fromEntries(formData) as Record<string, string>,
});

/** Menyimpan Indikator (`id` hasilnya); penolakan menjadi pesan form, sukses diarahkan ke detail Indikator. */
async function simpan(formData: FormData, id: Promise<string>): Promise<StateIndikator> {
  const hasil = await hasilAtauError(id);
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/indikator", "layout");
  redirect(`/indikator/${hasil.hasil}`);
}

export async function tambahIndikatorAction(_prev: StateIndikator, formData: FormData) {
  return simpan(
    formData,
    tambahIndikator(await getSessionUser(), {
      ...isianDariForm(formData),
      kode: teks(formData, "kode"),
      kelompok: teks(formData, "kelompok") as IndikatorBaru["kelompok"],
      target: { nilai: angka(teks(formData, "targetNilai")), berlakuMulai: teks(formData, "targetBerlakuMulai") },
    }),
  );
}

export async function ubahIndikatorAction(_prev: StateIndikator, formData: FormData) {
  const id = teks(formData, "id");
  return simpan(
    formData,
    ubahIndikator(await getSessionUser(), id, isianDariForm(formData)).then(() => id),
  );
}

/** Perubahan di halaman detail Indikator: penolakan menjadi pesan form, sukses memuat ulang halaman. */
async function ubahDiDetail(formData: FormData, ubah: Promise<unknown>): Promise<StateIndikator> {
  const hasil = await hasilAtauError(ubah);
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/indikator", "layout");
  return {};
}

export async function aturAktifIndikatorAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(
    formData,
    aturAktifIndikator(await getSessionUser(), teks(formData, "id"), formData.get("aktif") === "true"),
  );
}

export async function tetapkanTargetAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(
    formData,
    tetapkanTarget(await getSessionUser(), teks(formData, "indikatorId"), {
      nilai: angka(teks(formData, "targetNilai")),
      berlakuMulai: teks(formData, "targetBerlakuMulai"),
    }),
  );
}

export async function tambahUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(
    formData,
    tambahUnitPelapor(await getSessionUser(), teks(formData, "indikatorId"), {
      unitId: teks(formData, "unitId"),
      bulanMulai: teks(formData, "bulanMulai"),
      bulanBerhenti: teks(formData, "bulanBerhenti"),
    }),
  );
}

export async function akhiriUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(
    formData,
    akhiriUnitPelapor(await getSessionUser(), teks(formData, "id"), teks(formData, "bulanBerhenti")),
  );
}

export async function hapusUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, hapusUnitPelapor(await getSessionUser(), teks(formData, "id")));
}
