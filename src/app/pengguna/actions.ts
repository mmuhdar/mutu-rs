"use server";

import { revalidatePath } from "next/cache";

import { ServiceError } from "@/lib/errors";
import { aturAktifPengguna, resetSandi, tambahPengguna, ubahPengguna } from "@/modules/pengguna/service";
import { getSessionUser } from "@/server/sesi";

/** `isian` dikembalikan saat gagal supaya form tidak kosong (React mengosongkan form setelah action). Sandi tidak ikut. */
export type StatePengguna = { error?: string; berhasil?: string; isian?: Isian };
type Isian = { username: string; nama: string; peran: string; unitIds: string[] };

const isianDari = (formData: FormData): Isian => ({
  username: String(formData.get("username") ?? ""),
  nama: String(formData.get("nama") ?? ""),
  peran: String(formData.get("peran") ?? ""),
  unitIds: formData.getAll("unitIds").map(String),
});
const idDari = (formData: FormData) => String(formData.get("id") ?? "");

async function jalankan(simpan: () => Promise<unknown>, isian?: Isian, berhasil?: string): Promise<StatePengguna> {
  try {
    await simpan();
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, isian };
    throw error;
  }
  revalidatePath("/pengguna");
  return { berhasil };
}

export async function tambahPenggunaAction(_prev: StatePengguna, formData: FormData) {
  const isian = isianDari(formData);
  const sandi = String(formData.get("sandi") ?? "");
  return jalankan(async () => tambahPengguna(await getSessionUser(), { ...isian, sandi }), isian);
}

export async function ubahPenggunaAction(_prev: StatePengguna, formData: FormData) {
  const isian = isianDari(formData);
  return jalankan(async () => ubahPengguna(await getSessionUser(), idDari(formData), isian), isian);
}

export async function resetSandiAction(_prev: StatePengguna, formData: FormData) {
  const sandi = String(formData.get("sandi") ?? "");
  return jalankan(
    async () => resetSandi(await getSessionUser(), idDari(formData), sandi),
    undefined,
    "Sandi baru tersimpan dan sesi Pengguna ini diakhiri. Sampaikan sandi baru kepadanya.",
  );
}

export async function aturAktifPenggunaAction(_prev: StatePengguna, formData: FormData) {
  const aktif = formData.get("aktif") === "true";
  return jalankan(async () => aturAktifPengguna(await getSessionUser(), idDari(formData), aktif));
}
