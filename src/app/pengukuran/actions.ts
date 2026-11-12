"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { bilanganBulat, teks } from "@/lib/form";
import type { AksiVerifikasi } from "@/lib/pengukuran";
import { ajukanPengukuran, hapusBukti, simpanPengukuran, tambahBukti, ubahStatusPengukuran } from "@/modules/pengukuran/service";
import { getSessionUser } from "@/server/sesi";

export type StatePengukuran = { error?: string };

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

/**
 * Unggah satu atau beberapa Bukti ke Pengukuran Draf. Setiap berkas diperiksa service sendiri-sendiri: yang lolos tetap
 * tersimpan, pesan menyebut yang ditolak.
 */
export async function unggahBuktiAction(_prev: StatePengukuran, formData: FormData): Promise<StatePengukuran> {
  const aktor = await getSessionUser();
  const pengukuranId = teks(formData, "pengukuranId");
  // Input berkas yang tidak diisi mengirim satu File kosong tanpa nama.
  const berkas = formData.getAll("berkas").filter((f): f is File => f instanceof File && (f.size > 0 || f.name !== ""));
  if (berkas.length === 0) return { error: "Pilih berkas Bukti." };
  const ditolak: string[] = [];
  for (const f of berkas) {
    const hasil = await hasilAtauError(tambahBukti(aktor, pengukuranId, { nama: f.name, isi: new Uint8Array(await f.arrayBuffer()) }));
    if ("error" in hasil) ditolak.push(hasil.error);
  }
  revalidatePath("/pengukuran", "layout");
  return ditolak.length > 0 ? { error: ditolak.join(" ") } : {};
}

/** Hapus satu Bukti dari Pengukuran Draf. */
export async function hapusBuktiAction(_prev: StatePengukuran, formData: FormData): Promise<StatePengukuran> {
  const hasil = await hasilAtauError(hapusBukti(await getSessionUser(), teks(formData, "buktiId")));
  if ("error" in hasil) return { error: hasil.error };
  revalidatePath("/pengukuran", "layout");
  return {};
}
