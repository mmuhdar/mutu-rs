"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { bilanganBulat, ditolak, teks, type StateForm } from "@/lib/form";
import { hapusDokumenRisiko, hapusRisiko, simpanRisiko, tambahDokumenRisiko } from "@/modules/risiko/service";
import { getSessionUser } from "@/server/sesi";

/** Menambah Risiko, atau mengubah Risiko `id`; sukses diarahkan ke detailnya. */
export async function simpanRisikoAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const id = teks(formData, "id") || undefined;
  const hasil = await hasilAtauError(
    simpanRisiko(
      await getSessionUser(),
      {
        unitId: teks(formData, "unitId"),
        tahun: bilanganBulat(teks(formData, "tahun")),
        uraian: teks(formData, "uraian"),
        kategori: teks(formData, "kategori"),
        probabilitas: bilanganBulat(teks(formData, "probabilitas")),
        dampak: bilanganBulat(teks(formData, "dampak")),
        perlakuan: teks(formData, "perlakuan"),
        jadwal: teks(formData, "jadwal"),
        probabilitasPemantauan: bilanganBulat(teks(formData, "probabilitasPemantauan")),
        dampakPemantauan: bilanganBulat(teks(formData, "dampakPemantauan")),
        // "belum" = pilihan Belum dinilai.
        efektivitas: teks(formData, "efektivitas") === "belum" ? "" : teks(formData, "efektivitas"),
      },
      id,
    ),
  );
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/risiko", "layout");
  redirect(`/risiko/${hasil.hasil}`);
}

/** Menghapus Risiko yang salah dimasukkan; sukses kembali ke register Unit dan tahunnya. */
export async function hapusRisikoAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(hapusRisiko(await getSessionUser(), teks(formData, "id")));
  if ("error" in hasil) return { error: hasil.error };
  revalidatePath("/risiko", "layout");
  redirect(`/risiko?${new URLSearchParams({ unit: teks(formData, "unitId"), tahun: teks(formData, "tahun") })}`);
}

/** Mengunggah Dokumen Review (beberapa berkas sekaligus); pesan penolakan per berkas. */
export async function unggahDokumenRisikoAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const aktor = await getSessionUser();
  const risikoId = teks(formData, "risikoId");
  // Input berkas yang tidak diisi mengirim satu File kosong tanpa nama.
  const berkas = formData.getAll("berkas").filter((f): f is File => f instanceof File && (f.size > 0 || f.name !== ""));
  if (berkas.length === 0) return { error: "Pilih berkas Dokumen Review." };
  const ditolakBerkas: string[] = [];
  for (const f of berkas) {
    const hasil = await hasilAtauError(tambahDokumenRisiko(aktor, risikoId, { nama: f.name, isi: new Uint8Array(await f.arrayBuffer()) }));
    if ("error" in hasil) ditolakBerkas.push(hasil.error);
  }
  revalidatePath("/risiko", "layout");
  return ditolakBerkas.length > 0 ? { error: ditolakBerkas.join(" ") } : {};
}

/** Menghapus satu Dokumen Review. */
export async function hapusDokumenRisikoAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(hapusDokumenRisiko(await getSessionUser(), teks(formData, "dokumenId")));
  if ("error" in hasil) return { error: hasil.error };
  revalidatePath("/risiko", "layout");
  return {};
}
