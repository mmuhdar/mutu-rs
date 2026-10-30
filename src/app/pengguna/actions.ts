"use server";

import { revalidatePath } from "next/cache";

import { hasilAtauError } from "@/lib/errors";
import { teks } from "@/lib/form";
import { aturAktifPengguna, resetSandi, tambahPengguna, ubahPengguna } from "@/modules/pengguna/service";
import { getSessionUser } from "@/server/sesi";

/** `isian` dikembalikan saat gagal supaya form tidak kosong (React mengosongkan form setelah action). Sandi tidak ikut. */
export type StatePengguna = { error?: string; berhasil?: string; isian?: Isian };
type Isian = { username: string; nama: string; peran: string; unitIds: string[] };

const isianDari = (formData: FormData): Isian => ({
  username: teks(formData, "username"),
  nama: teks(formData, "nama"),
  peran: teks(formData, "peran"),
  unitIds: formData.getAll("unitIds").map(String),
});

async function jalankan(simpan: Promise<unknown>, isian?: Isian, berhasil?: string): Promise<StatePengguna> {
  const hasil = await hasilAtauError(simpan);
  if ("error" in hasil) return { error: hasil.error, isian };
  revalidatePath("/pengguna");
  return { berhasil };
}

export async function tambahPenggunaAction(_prev: StatePengguna, formData: FormData) {
  const isian = isianDari(formData);
  return jalankan(tambahPengguna(await getSessionUser(), { ...isian, sandi: teks(formData, "sandi") }), isian);
}

export async function ubahPenggunaAction(_prev: StatePengguna, formData: FormData) {
  const isian = isianDari(formData);
  return jalankan(ubahPengguna(await getSessionUser(), teks(formData, "id"), isian), isian);
}

export async function resetSandiAction(_prev: StatePengguna, formData: FormData) {
  return jalankan(
    resetSandi(await getSessionUser(), teks(formData, "id"), teks(formData, "sandi")),
    undefined,
    "Sandi baru tersimpan dan sesi Pengguna ini diakhiri. Sampaikan sandi baru kepadanya.",
  );
}

export async function aturAktifPenggunaAction(_prev: StatePengguna, formData: FormData) {
  return jalankan(aturAktifPengguna(await getSessionUser(), teks(formData, "id"), formData.get("aktif") === "true"));
}
