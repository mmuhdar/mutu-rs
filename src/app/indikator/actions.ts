"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ServiceError } from "@/lib/errors";
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
function angka(teks: string) {
  const rapi = teks.trim().replace(",", ".");
  return rapi === "" ? Number.NaN : Number(rapi);
}

function isianDariForm(formData: FormData): IsianIndikator {
  const teks = (nama: string) => String(formData.get(nama) ?? "");
  return {
    nama: teks("nama"),
    definisiOperasional: teks("definisiOperasional"),
    definisiNumerator: teks("definisiNumerator"),
    definisiDenominator: teks("definisiDenominator"),
    sumberData: teks("sumberData"),
    faktor: angka(teks("faktor")),
    satuan: teks("satuan"),
    // Nilai di luar daftar ditolak service.
    arah: teks("arah") as Arah,
    frekuensi: teks("frekuensi") as Frekuensi,
    pic: teks("pic"),
  };
}

/** Menjalankan service; penolakan menjadi pesan form, sukses diarahkan ke detail Indikator. */
async function simpan(formData: FormData, jalankan: () => Promise<string>): Promise<StateIndikator> {
  let id: string;
  try {
    id = await jalankan();
  } catch (error) {
    if (error instanceof ServiceError) {
      return { error: error.message, nilai: Object.fromEntries(formData) as Record<string, string> };
    }
    throw error;
  }
  revalidatePath("/indikator", "layout");
  redirect(`/indikator/${id}`);
}

export async function tambahIndikatorAction(_prev: StateIndikator, formData: FormData) {
  return simpan(formData, async () =>
    tambahIndikator(await getSessionUser(), {
      ...isianDariForm(formData),
      kode: String(formData.get("kode") ?? ""),
      kelompok: String(formData.get("kelompok") ?? "") as IndikatorBaru["kelompok"],
      target: {
        nilai: angka(String(formData.get("targetNilai") ?? "")),
        berlakuMulai: String(formData.get("targetBerlakuMulai") ?? ""),
      },
    }),
  );
}

export async function ubahIndikatorAction(_prev: StateIndikator, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  return simpan(formData, async () => {
    await ubahIndikator(await getSessionUser(), id, isianDariForm(formData));
    return id;
  });
}

/** Perubahan di halaman detail Indikator: penolakan menjadi pesan form, sukses memuat ulang halaman. */
async function ubahDiDetail(formData: FormData, jalankan: () => Promise<unknown>): Promise<StateIndikator> {
  try {
    await jalankan();
  } catch (error) {
    if (error instanceof ServiceError) {
      return { error: error.message, nilai: Object.fromEntries(formData) as Record<string, string> };
    }
    throw error;
  }
  revalidatePath("/indikator", "layout");
  return {};
}

const isian = (formData: FormData, nama: string) => String(formData.get(nama) ?? "");

export async function aturAktifIndikatorAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, async () =>
    aturAktifIndikator(await getSessionUser(), isian(formData, "id"), formData.get("aktif") === "true"),
  );
}

export async function tetapkanTargetAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, async () =>
    tetapkanTarget(await getSessionUser(), isian(formData, "indikatorId"), {
      nilai: angka(isian(formData, "targetNilai")),
      berlakuMulai: isian(formData, "targetBerlakuMulai"),
    }),
  );
}

export async function tambahUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, async () =>
    tambahUnitPelapor(await getSessionUser(), isian(formData, "indikatorId"), {
      unitId: isian(formData, "unitId"),
      bulanMulai: isian(formData, "bulanMulai"),
      bulanBerhenti: isian(formData, "bulanBerhenti"),
    }),
  );
}

export async function akhiriUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, async () =>
    akhiriUnitPelapor(await getSessionUser(), isian(formData, "id"), isian(formData, "bulanBerhenti")),
  );
}

export async function hapusUnitPelaporAction(_prev: StateIndikator, formData: FormData) {
  return ubahDiDetail(formData, async () => hapusUnitPelapor(await getSessionUser(), isian(formData, "id")));
}
