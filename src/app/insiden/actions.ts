"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasilAtauError } from "@/lib/errors";
import { ditolak, teks, type StateForm } from "@/lib/form";
import {
  catatEreport,
  gradingInsiden,
  laporkanInsiden,
  selesaikanRca,
  simpanInvestigasi,
  tandaiBukanInsiden,
  tinjauInsiden,
  ubahLaporan,
  type IsianInvestigasi,
  type IsianLaporan,
} from "@/modules/insiden/service";
import { getSessionUser } from "@/server/sesi";

/** Angka dari form; isian kosong = NaN (bukan 0), ditolak atau dianggap kosong oleh service. */
const angka = (formData: FormData, nama: string) => {
  const nilai = teks(formData, nama).trim();
  return nilai === "" ? Number.NaN : Number(nilai);
};

/** Pilihan Ya/Tidak dari form; selain itu null (ditolak service). */
const yaTidak = (nilai: string) => (nilai === "ya" ? true : nilai === "tidak" ? false : null);

const isianLaporan = (formData: FormData): IsianLaporan => ({
  unitId: teks(formData, "unitId"),
  unitPenyebabId: teks(formData, "unitPenyebabId"),
  waktuInsiden: teks(formData, "waktuInsiden"),
  judul: teks(formData, "judul"),
  kronologi: teks(formData, "kronologi"),
  jenis: teks(formData, "jenis"),
  orangPertama: teks(formData, "orangPertama"),
  tempat: teks(formData, "tempat"),
  pasienInisial: teks(formData, "pasienInisial"),
  pasienNoRm: teks(formData, "pasienNoRm"),
  pasienRuangan: teks(formData, "pasienRuangan"),
  umurTahun: angka(formData, "umurTahun"),
  umurBulan: angka(formData, "umurBulan"),
  jenisKelamin: teks(formData, "jenisKelamin"),
  penanggungBiaya: teks(formData, "penanggungBiaya"),
  kategoriPasien: teks(formData, "kategoriPasien"),
  spesialisasi: teks(formData, "spesialisasi"),
  tanggalMasuk: teks(formData, "tanggalMasuk"),
  akibat: teks(formData, "akibat"),
  tindakanSegera: teks(formData, "tindakanSegera"),
  tindakanOleh: teks(formData, "tindakanOleh"),
  pernahTerjadi: yaTidak(teks(formData, "pernahTerjadi")),
  pernahTerjadiKeterangan: teks(formData, "pernahTerjadiKeterangan"),
});

/** Sel matriks grading dari form ("dampak-probabilitas"); tidak dipilih = NaN, ditolak service. */
const grading = (formData: FormData) => {
  const [dampak, probabilitas] = teks(formData, "grading").split("-").map(Number);
  return { dampak: dampak ?? Number.NaN, probabilitas: probabilitas ?? Number.NaN };
};

const isianInvestigasi = (formData: FormData): IsianInvestigasi => ({
  tipeInsiden: teks(formData, "tipeInsiden"),
  faktorKontributor: formData.getAll("faktorKontributor").map(String),
  penyebabLangsung: teks(formData, "penyebabLangsung"),
  akarMasalah: teks(formData, "akarMasalah"),
  rekomendasi: teks(formData, "rekomendasi"),
});

/** Melaporkan Insiden baru; sukses diarahkan ke detailnya. */
export async function laporAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const hasil = await hasilAtauError(laporkanInsiden(await getSessionUser(), isianLaporan(formData)));
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  redirect(`/insiden/${hasil.hasil.id}`);
}

/** Mengubah laporan (Pembuat Laporan, selama Dilaporkan); sukses kembali ke detailnya. */
export async function ubahLaporanAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const id = teks(formData, "id");
  const hasil = await hasilAtauError(ubahLaporan(await getSessionUser(), id, isianLaporan(formData)));
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  redirect(`/insiden/${id}`);
}

/** Jalankan satu aksi penanganan; penolakan service menjadi pesan form. */
async function aksi(formData: FormData, janji: Promise<unknown>): Promise<StateForm> {
  const hasil = await hasilAtauError(janji);
  if ("error" in hasil) return ditolak(formData, hasil.error);
  revalidatePath("/", "layout");
  return {};
}

export async function gradingAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  return aksi(formData, gradingInsiden(await getSessionUser(), teks(formData, "id"), grading(formData)));
}

/** Investigasi Sederhana atau RCA: tombol `lanjut` = "kirim" (ke Ditinjau) atau "selesai" (RCA Selesai dengan grading akhir). */
export async function investigasiAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  const aktor = await getSessionUser();
  const id = teks(formData, "id");
  const lanjut = teks(formData, "lanjut");
  return aksi(
    formData,
    lanjut === "selesai"
      ? selesaikanRca(aktor, id, { ...isianInvestigasi(formData), ...grading(formData) })
      : simpanInvestigasi(aktor, id, isianInvestigasi(formData), lanjut === "kirim"),
  );
}

export async function tinjauAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  return aksi(
    formData,
    tinjauInsiden(await getSessionUser(), teks(formData, "id"), { ...grading(formData), catatan: teks(formData, "catatan") }),
  );
}

export async function bukanInsidenAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  return aksi(formData, tandaiBukanInsiden(await getSessionUser(), teks(formData, "id"), teks(formData, "alasan")));
}

export async function ereportAction(_prev: StateForm, formData: FormData): Promise<StateForm> {
  return aksi(formData, catatEreport(await getSessionUser(), teks(formData, "id"), teks(formData, "tanggal")));
}
