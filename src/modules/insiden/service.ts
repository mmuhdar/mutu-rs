import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { insiden, pengguna, riwayatStatusInsiden, unit } from "@/db/schema";
import { bulanTriwulan, dariWaktuSetempat, geserBulan, hariIni, tambahHari, tanggalValid, wajibTriwulanSelesai } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { salahSatuDari, teksOpsional, wajibTeks } from "@/lib/form";
import {
  AKIBAT_INSIDEN,
  akibatSesuaiJenis,
  FAKTOR_KONTRIBUTOR,
  hariInvestigasi,
  JENIS_EREPORT,
  JENIS_INSIDEN,
  JENIS_KELAMIN,
  KATEGORI_PASIEN,
  LABEL_JENIS_INSIDEN,
  LABEL_STATUS_INSIDEN,
  lewatTenggatInsiden,
  mendekatiTenggatInsiden,
  perluEreport,
  ORANG_PERTAMA,
  PENANGGUNG_BIAYA,
  perluRca,
  SPESIALISASI,
  STATUS_INSIDEN,
  STATUS_INSIDEN_TERBUKA,
  terlambatDilaporkan,
  TINDAKAN_OLEH,
  tingkatValid,
  TIPE_INSIDEN,
  WARNA_GRADING,
  warnaGrading,
  type FaktorKontributor,
  type JenisInsiden,
  type StatusInsiden,
  type WarnaGrading,
} from "@/lib/insiden";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, wajibPeran, type Pengguna } from "@/modules/auth/service";

/*
 * Modul Insiden: laporan Insiden Keselamatan Pasien (Formulir 1 PMK 11/2017), grading, Investigasi Sederhana, RCA, dan
 * rekapnya (glosarium bagian Keselamatan Pasien). Komite Mutu = Tim Keselamatan Pasien. Aturan murni di
 * `src/lib/insiden.ts`.
 */

const MAKS_TEKS = 4000;
const MAKS_CATATAN = 1000;

/** Membaca semua Insiden: Komite Mutu dan Direktur (pimpinan yang menerima laporan, PP 28/2024 Pasal 889). */
const PEMBACA_SEMUA: readonly Peran[] = ["komiteMutu", "direktur"];
const KOMITE: readonly Peran[] = ["komiteMutu"];

/** Kepala Unit dari Unit tempat insiden: atasan langsung yang menggrading dan melakukan Investigasi Sederhana. */
const atasan = (aktor: Pengguna, unitId: string) => aktor.peran === "kepalaUnit" && aktor.unitIds.includes(unitId);
/** Menggrading dan mengisi Investigasi Sederhana: atasan langsung atau Komite Mutu. */
const bolehTangani = (aktor: Pengguna, unitId: string) => aktor.peran === "komiteMutu" || atasan(aktor, unitId);
/** Membaca laporan lengkap (termasuk investigasi yang belum Selesai): Komite Mutu, Direktur, atasan langsung. */
const pembacaPenuh = (aktor: Pengguna, unitId: string) => PEMBACA_SEMUA.includes(aktor.peran) || atasan(aktor, unitId);

/** Membaca satu Insiden: Pembuat Laporan, Kepala Unit dari Unit itu, Komite Mutu, dan Direktur. */
export const bolehBacaInsiden = (aktor: Pengguna, i: { unitId: string; dilaporkanOlehId: string }) =>
  i.dilaporkanOlehId === aktor.id || pembacaPenuh(aktor, i.unitId);

/** Membaca semua Insiden dan rekapnya (Komite Mutu, Direktur). Juga untuk tampilan. */
export const bacaSemuaInsiden = (aktor: Pengguna) => PEMBACA_SEMUA.includes(aktor.peran);

/** Untuk tampilan (Dashboard): peran yang ikut menangani Insiden. */
export const menanganiInsiden = (aktor: Pengguna) => aktor.peran === "komiteMutu" || aktor.peran === "kepalaUnit";

/** Saringan query: Insiden yang boleh dibaca aktor. */
function saringBaca(aktor: Pengguna) {
  if (PEMBACA_SEMUA.includes(aktor.peran)) return undefined;
  const sendiri = eq(insiden.dilaporkanOlehId, aktor.id);
  return aktor.peran === "kepalaUnit" ? or(sendiri, inArray(insiden.unitId, aktor.unitIds)) : sendiri;
}

/**
 * Isian laporan dari form (Formulir 1). Pilihan berupa teks karena nilai form bisa diutak-atik; diperiksa service.
 * Waktu = "YYYY-MM-DDTHH:mm" waktu setempat; umur tahun dan bulan NaN = kosong; Unit penyebab dan tanggal masuk "" = tanpa.
 */
export type IsianLaporan = {
  unitId: string;
  unitPenyebabId: string;
  waktuInsiden: string;
  judul: string;
  kronologi: string;
  jenis: string;
  orangPertama: string;
  tempat: string;
  pasienInisial: string;
  pasienNoRm: string;
  pasienRuangan: string;
  umurTahun: number;
  umurBulan: number;
  jenisKelamin: string;
  penanggungBiaya: string;
  kategoriPasien: string;
  spesialisasi: string;
  tanggalMasuk: string;
  akibat: string;
  tindakanSegera: string;
  tindakanOleh: string;
  pernahTerjadi: boolean | null;
  pernahTerjadiKeterangan: string;
};

/**
 * Unit aktif menurut id dari form; null bila kosong dan boleh kosong. Baris Unit dikunci `for share` sampai transaksi
 * selesai, jadi Unit tidak bisa dinonaktifkan (`aturAktifUnit` menguncinya `for update`) di antara pemeriksaan dan simpan.
 */
async function unitAktif(tx: Transaksi, id: string, label: string, wajib: boolean) {
  if (!id && !wajib) return null;
  const [u] = apakahUuid(id)
    ? await tx.select({ id: unit.id, aktif: unit.aktif }).from(unit).where(eq(unit.id, id)).for("share")
    : [];
  if (!u) throw new ServiceError(400, `Pilih ${label}.`);
  if (!u.aktif) throw new ServiceError(400, `${label} sudah nonaktif; pilih Unit aktif.`);
  return u.id;
}

/** Umur pasien dalam bulan dari isian tahun + bulan (salah satu boleh kosong); null bila keduanya kosong. */
function umurBulan(tahun: number, bulan: number) {
  if (Number.isNaN(tahun) && Number.isNaN(bulan)) return null;
  const [t, b] = [Number.isNaN(tahun) ? 0 : tahun, Number.isNaN(bulan) ? 0 : bulan];
  if (!Number.isInteger(t) || t < 0 || t > 150 || !Number.isInteger(b) || b < 0 || b > 11) {
    throw new ServiceError(400, "Umur pasien: tahun 0 sampai 150 dan bulan 0 sampai 11.");
  }
  return t * 12 + b;
}

/** Isian laporan yang sudah diperiksa, siap disimpan. Data pasien wajib kecuali untuk KPC (di KPC isian kosong = null). */
async function periksaLaporan(tx: Transaksi, isian: IsianLaporan, sekarang: Date) {
  const jenis = salahSatuDari(isian.jenis, JENIS_INSIDEN, "Pilih jenis insiden.");
  const kpc = jenis === "kpc";
  const waktuInsiden = dariWaktuSetempat(isian.waktuInsiden);
  if (!waktuInsiden) throw new ServiceError(400, "Waktu insiden harus tanggal dan jam yang valid.");
  if (waktuInsiden > sekarang) throw new ServiceError(400, "Waktu insiden tidak boleh di masa depan.");
  const akibat = salahSatuDari(isian.akibat, AKIBAT_INSIDEN, "Pilih akibat insiden terhadap pasien.");
  if (!akibatSesuaiJenis(jenis, akibat)) {
    throw new ServiceError(
      400,
      jenis === "ktd" || jenis === "sentinel"
        ? `${LABEL_JENIS_INSIDEN[jenis]} mengakibatkan cedera, jadi akibatnya tidak boleh "Tidak ada cedera".`
        : `${LABEL_JENIS_INSIDEN[jenis]} tidak menimbulkan cedera, jadi akibatnya "Tidak ada cedera". Bila pasien cedera, pilih KTD atau Kejadian Sentinel.`,
    );
  }
  if (typeof isian.pernahTerjadi !== "boolean") {
    throw new ServiceError(400, "Pilih apakah insiden serupa pernah terjadi di unit kerja lain.");
  }

  // Data pasien: wajib, kecuali KPC (belum ada insiden pada pasien) yang boleh kosong per isian.
  const teksPasien = (nilai: string, label: string, maks: number) =>
    kpc && !nilai.trim() ? null : wajibTeks(nilai, label, maks);
  const pilihPasien = <T extends string>(nilai: string, daftar: readonly T[], pesan: string) =>
    kpc && !nilai ? null : salahSatuDari(nilai, daftar, pesan);
  const umur = umurBulan(isian.umurTahun, isian.umurBulan);
  if (umur === null && !kpc) throw new ServiceError(400, "Umur pasien wajib diisi.");
  const tanggalMasuk = isian.tanggalMasuk ? dariWaktuSetempat(isian.tanggalMasuk) : null;
  if (isian.tanggalMasuk && !tanggalMasuk) throw new ServiceError(400, "Tanggal masuk harus tanggal dan jam yang valid.");
  if (tanggalMasuk && tanggalMasuk > waktuInsiden) throw new ServiceError(400, "Tanggal masuk tidak boleh setelah waktu insiden.");

  return {
    unitId: (await unitAktif(tx, isian.unitId, "Unit tempat insiden", true))!,
    unitPenyebabId: await unitAktif(tx, isian.unitPenyebabId, "Unit penyebab", false),
    waktuInsiden,
    judul: wajibTeks(isian.judul, "Insiden", 200),
    kronologi: wajibTeks(isian.kronologi, "Kronologi insiden", MAKS_TEKS),
    jenis,
    orangPertama: salahSatuDari(isian.orangPertama, ORANG_PERTAMA, "Pilih orang pertama yang melaporkan insiden."),
    tempat: wajibTeks(isian.tempat, "Tempat insiden", 120),
    pasienInisial: teksPasien(isian.pasienInisial, "Inisial pasien", 20),
    pasienNoRm: teksPasien(isian.pasienNoRm, "No. RM", 30),
    pasienRuangan: teksOpsional(isian.pasienRuangan, "Ruangan pasien", 80),
    pasienUmurBulan: umur,
    pasienJenisKelamin: pilihPasien(isian.jenisKelamin, JENIS_KELAMIN, "Pilih jenis kelamin pasien."),
    penanggungBiaya: pilihPasien(isian.penanggungBiaya, PENANGGUNG_BIAYA, "Pilih penanggung biaya pasien."),
    kategoriPasien: pilihPasien(isian.kategoriPasien, KATEGORI_PASIEN, "Pilih insiden menyangkut pasien rawat inap, rawat jalan, UGD, atau lainnya."),
    spesialisasi: pilihPasien(isian.spesialisasi, SPESIALISASI, "Pilih spesialisasi kasus pasien."),
    tanggalMasuk,
    akibat,
    tindakanSegera: wajibTeks(isian.tindakanSegera, "Tindakan segera dan hasilnya", MAKS_TEKS),
    tindakanOleh: salahSatuDari(isian.tindakanOleh, TINDAKAN_OLEH, "Pilih siapa yang melakukan tindakan segera."),
    pernahTerjadi: isian.pernahTerjadi,
    pernahTerjadiKeterangan: isian.pernahTerjadi
      ? wajibTeks(isian.pernahTerjadiKeterangan, "Kapan dan langkah yang diambil di unit kerja lain", MAKS_CATATAN)
      : "",
  };
}

/** Insiden baru berstatus Dilaporkan; Pembuat Laporan = aktor. Semua Pengguna boleh melapor. */
export async function laporkanInsiden(aktor: Pengguna | null, isian: IsianLaporan, sekarang = new Date()) {
  wajibPengguna(aktor);
  return db.transaction(async (tx) => {
    const data = await periksaLaporan(tx, isian, sekarang);
    const [baru] = await tx
      .insert(insiden)
      .values({ ...data, dilaporkanOlehId: aktor.id, dilaporkanPada: sekarang, status: "dilaporkan" })
      .returning({ id: insiden.id });
    // Waktu "laporan dibuat" di Riwayat Status = waktu laporan, bukan jam database.
    await tx.insert(riwayatStatusInsiden).values({ insidenId: baru.id, statusAsal: null, statusTujuan: "dilaporkan", olehId: aktor.id, waktu: sekarang });
    return { id: baru.id };
  });
}

type Transaksi = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Baris Insiden yang dikunci `for update` untuk satu perubahan; 404 bila tidak ada. */
async function kunci(tx: Transaksi, id: string) {
  const [i] = apakahUuid(id)
    ? await tx
        .select({
          id: insiden.id,
          unitId: insiden.unitId,
          dilaporkanOlehId: insiden.dilaporkanOlehId,
          dilaporkanPada: insiden.dilaporkanPada,
          jenis: insiden.jenis,
          status: insiden.status,
        })
        .from(insiden)
        .where(eq(insiden.id, id))
        .for("update")
    : [];
  if (!i) throw new ServiceError(404, "Insiden tidak ditemukan.");
  return i;
}

type InsidenTerkunci = Awaited<ReturnType<typeof kunci>>;

/** Satu perubahan Insiden dalam transaksi dengan barisnya terkunci. */
const ubahTerkunci = <T>(id: string, ubah: (tx: Transaksi, i: InsidenTerkunci) => Promise<T>) =>
  db.transaction(async (tx) => ubah(tx, await kunci(tx, id)));

/** Status asal harus salah satu dari `dari`; selain itu 409. */
function wajibStatus(i: InsidenTerkunci, dari: readonly StatusInsiden[], kata: string) {
  if (!dari.includes(i.status)) {
    throw new ServiceError(409, `Insiden berstatus ${LABEL_STATUS_INSIDEN[i.status]}, jadi tidak bisa ${kata}.`);
  }
}

function wajibTangani(aktor: Pengguna, i: InsidenTerkunci) {
  if (!bolehTangani(aktor, i.unitId)) {
    throw new ServiceError(403, "Grading dan Investigasi Sederhana hanya oleh Kepala Unit dari Unit tempat insiden atau Komite Mutu.");
  }
}

/**
 * Satu-satunya jalan perpindahan status: mengubah baris (status + `perubahan`) dan menulis satu baris Riwayat Status
 * beserta grading dan catatannya. Pemanggil sudah mengunci baris dan memeriksa status asal.
 */
async function pindah(
  tx: Transaksi,
  aktor: Pengguna,
  i: InsidenTerkunci,
  ke: StatusInsiden,
  { perubahan = {}, grading, catatan = null }: { perubahan?: Partial<typeof insiden.$inferInsert>; grading?: Grading; catatan?: string | null } = {},
) {
  const nilaiGrading = grading ? { dampak: grading.dampak, probabilitas: grading.probabilitas } : {};
  await tx
    .update(insiden)
    .set({ ...perubahan, ...nilaiGrading, status: ke, diubahPada: new Date() })
    .where(eq(insiden.id, i.id));
  await tx.insert(riwayatStatusInsiden).values({ insidenId: i.id, statusAsal: i.status, statusTujuan: ke, olehId: aktor.id, ...nilaiGrading, catatan });
}

/** Mengubah laporan: hanya Pembuat Laporan, selama masih Dilaporkan (belum digrading). Aturan isian sama dengan melapor. */
export async function ubahLaporan(aktor: Pengguna | null, id: string, isian: IsianLaporan, sekarang = new Date()) {
  wajibPengguna(aktor);
  await ubahTerkunci(id, async (tx, i) => {
    if (i.dilaporkanOlehId !== aktor.id) throw new ServiceError(403, "Laporan hanya bisa diubah Pembuat Laporan-nya.");
    wajibStatus(i, ["dilaporkan"], "diubah lagi karena sudah digrading");
    const data = await periksaLaporan(tx, isian, sekarang);
    await tx
      .update(insiden)
      .set({ ...data, diubahPada: new Date() })
      .where(eq(insiden.id, i.id));
  });
}

/** Grading: satu sel matriks (dampak dan probabilitas 1–5). */
export type Grading = { dampak: number; probabilitas: number };

function periksaGrading(g: Grading) {
  if (!tingkatValid(g.dampak) || !tingkatValid(g.probabilitas)) {
    throw new ServiceError(400, "Pilih satu sel matriks grading (dampak dan probabilitas).");
  }
  return { dampak: g.dampak, probabilitas: g.probabilitas, warna: warnaGrading(g.dampak, g.probabilitas) };
}

/**
 * Grading awal oleh atasan langsung atau Komite Mutu: Dilaporkan menjadi Investigasi Sederhana (biru/hijau) atau RCA
 * (kuning/merah/Kejadian Sentinel). Tenggat = tanggal laporan dibuat + `hariInvestigasi`.
 */
export async function gradingInsiden(aktor: Pengguna | null, id: string, grading: Grading) {
  wajibPengguna(aktor);
  const g = periksaGrading(grading);
  return ubahTerkunci(id, async (tx, i) => {
    wajibTangani(aktor, i);
    wajibStatus(i, ["dilaporkan"], "digrading");
    const ke = perluRca(i.jenis, g.warna) ? "rca" : "investigasi";
    const tenggat = tambahHari(hariIni(i.dilaporkanPada), hariInvestigasi(i.jenis, g.warna));
    await pindah(tx, aktor, i, ke, { perubahan: { tenggat }, grading: g });
    return { status: ke, warna: g.warna };
  });
}

/** Isian investigasi (sama untuk Investigasi Sederhana dan RCA). */
export type IsianInvestigasi = {
  tipeInsiden: string;
  faktorKontributor: string[];
  penyebabLangsung: string;
  akarMasalah: string;
  rekomendasi: string;
};

function periksaInvestigasi(isian: IsianInvestigasi) {
  const faktor = Array.isArray(isian.faktorKontributor) ? isian.faktorKontributor : [];
  if (faktor.length === 0) throw new ServiceError(400, "Pilih setidaknya satu faktor kontributor.");
  if (faktor.some((f) => !(FAKTOR_KONTRIBUTOR as readonly string[]).includes(f))) {
    throw new ServiceError(400, "Faktor kontributor tidak dikenal.");
  }
  return {
    tipeInsiden: salahSatuDari(isian.tipeInsiden, TIPE_INSIDEN, "Pilih tipe insiden."),
    // Urutan tetap seperti di formulir, tanpa duplikat.
    faktorKontributor: FAKTOR_KONTRIBUTOR.filter((f) => faktor.includes(f)) as FaktorKontributor[],
    penyebabLangsung: wajibTeks(isian.penyebabLangsung, "Penyebab langsung", MAKS_TEKS),
    akarMasalah: wajibTeks(isian.akarMasalah, "Akar masalah", MAKS_TEKS),
    rekomendasi: wajibTeks(isian.rekomendasi, "Rekomendasi", MAKS_TEKS),
  };
}

/**
 * Menyimpan isian investigasi: Investigasi Sederhana (atasan langsung atau Komite Mutu) atau RCA (Komite Mutu).
 * `kirim` hanya dari Investigasi Sederhana: Insiden menjadi Ditinjau, menunggu Komite Mutu. RCA ditutup lewat
 * `selesaikanRca`.
 */
export async function simpanInvestigasi(aktor: Pengguna | null, id: string, isian: IsianInvestigasi, kirim: boolean) {
  wajibPengguna(aktor);
  const data = periksaInvestigasi(isian);
  await ubahTerkunci(id, async (tx, i) => {
    wajibStatus(i, ["investigasi", "rca"], "diinvestigasi");
    if (i.status === "rca") {
      wajibPeran(aktor, KOMITE, "RCA hanya diisi Komite Mutu.");
      if (kirim) throw new ServiceError(409, "RCA ditutup dengan grading akhir lewat Selesaikan RCA.");
    } else {
      wajibTangani(aktor, i);
    }
    if (kirim) {
      await pindah(tx, aktor, i, "ditinjau", { perubahan: data });
    } else {
      await tx
        .update(insiden)
        .set({ ...data, diubahPada: new Date() })
        .where(eq(insiden.id, i.id));
    }
  });
}

/**
 * Tinjauan Komite Mutu atas hasil Investigasi Sederhana, dengan grading akhir: biru/hijau menjadi Selesai,
 * kuning/merah dialihkan ke RCA dengan tenggat 45 hari sejak hari ini. Catatan opsional (umpan balik).
 */
export async function tinjauInsiden(aktor: Pengguna | null, id: string, isian: Grading & { catatan: string }, sekarang = new Date()) {
  wajibPeran(aktor, KOMITE, "Tinjauan hanya oleh Komite Mutu.");
  const g = periksaGrading(isian);
  const catatan = teksOpsional(isian.catatan, "Catatan", MAKS_CATATAN);
  return ubahTerkunci(id, async (tx, i) => {
    wajibStatus(i, ["ditinjau"], "ditinjau");
    const rca = perluRca(i.jenis, g.warna);
    await pindah(tx, aktor, i, rca ? "rca" : "selesai", {
      perubahan: rca ? { tenggat: tambahHari(hariIni(sekarang), hariInvestigasi(i.jenis, g.warna)) } : {},
      grading: g,
      catatan: catatan || null,
    });
    return { status: rca ? ("rca" as const) : ("selesai" as const), warna: g.warna };
  });
}

/** Menyelesaikan RCA (Komite Mutu): isian investigasi dan grading akhir tersimpan, Insiden menjadi Selesai. */
export async function selesaikanRca(aktor: Pengguna | null, id: string, isian: IsianInvestigasi & Grading) {
  wajibPeran(aktor, KOMITE, "RCA hanya diselesaikan Komite Mutu.");
  const data = periksaInvestigasi(isian);
  const g = periksaGrading(isian);
  await ubahTerkunci(id, async (tx, i) => {
    wajibStatus(i, ["rca"], "diselesaikan sebagai RCA");
    await pindah(tx, aktor, i, "selesai", { perubahan: data, grading: g });
  });
}

/** Komite Mutu menutup laporan yang ternyata bukan Insiden Keselamatan Pasien (verifikasi PMK 11/2017 Pasal 18 ayat (2)); alasan wajib. */
export async function tandaiBukanInsiden(aktor: Pengguna | null, id: string, alasan: string) {
  wajibPeran(aktor, KOMITE, "Hanya Komite Mutu yang bisa menandai Bukan Insiden.");
  const catatan = wajibTeks(alasan, "Alasan", MAKS_CATATAN);
  await ubahTerkunci(id, async (tx, i) => {
    wajibStatus(i, STATUS_INSIDEN_TERBUKA, "ditandai Bukan Insiden");
    await pindah(tx, aktor, i, "bukanInsiden", { catatan });
  });
}

/**
 * Tanggal laporan KTD atau Kejadian Sentinel dikirim ke e-report Kemenkes ("YYYY-MM-DD", tidak di masa depan; "" =
 * hapus tanda). Hanya Komite Mutu; MutuRS tidak mengirim apa pun.
 */
export async function catatEreport(aktor: Pengguna | null, id: string, tanggal: string, sekarang = new Date()) {
  wajibPeran(aktor, KOMITE, "Tanggal e-report hanya dicatat Komite Mutu.");
  if (tanggal && !tanggalValid(tanggal)) throw new ServiceError(400, "Tanggal e-report harus tanggal yang valid.");
  if (tanggal > hariIni(sekarang)) throw new ServiceError(400, "Tanggal e-report tidak boleh di masa depan.");
  await ubahTerkunci(id, async (tx, i) => {
    if (!perluEreport(i)) {
      throw new ServiceError(i.status === "bukanInsiden" ? 409 : 400, "e-Report Kemenkes hanya untuk KTD dan Kejadian Sentinel yang bukan Bukan Insiden.");
    }
    await tx
      .update(insiden)
      .set({ ereportPada: tanggal || null, diubahPada: new Date() })
      .where(eq(insiden.id, i.id));
  });
}

const unitPenyebab = alias(unit, "unit_penyebab");

/** Kolom daftar Insiden beserta Unit tempat insiden. */
const kolomDaftar = {
  id: insiden.id,
  judul: insiden.judul,
  waktuInsiden: insiden.waktuInsiden,
  jenis: insiden.jenis,
  status: insiden.status,
  dampak: insiden.dampak,
  probabilitas: insiden.probabilitas,
  tenggat: insiden.tenggat,
  ereportPada: insiden.ereportPada,
  dilaporkanPada: insiden.dilaporkanPada,
  dilaporkanOlehId: insiden.dilaporkanOlehId,
  unit: { id: unit.id, nama: unit.nama },
};

type BarisDasar = {
  jenis: JenisInsiden;
  status: StatusInsiden;
  dampak: number | null;
  probabilitas: number | null;
  tenggat: string | null;
  waktuInsiden: Date;
  dilaporkanPada: Date;
};

/** Turunan untuk tampilan: warna grading (null = belum digrading), lewat/mendekati tenggat pada hari ini, terlambat dilaporkan. */
const denganTurunan =
  (hari: string) =>
  <T extends BarisDasar>(i: T) => ({
    ...i,
    warna: i.dampak && i.probabilitas ? warnaGrading(i.dampak, i.probabilitas) : null,
    lewatTenggat: lewatTenggatInsiden(i, hari),
    mendekatiTenggat: mendekatiTenggatInsiden(i, hari),
    terlambatDilaporkan: terlambatDilaporkan(i.waktuInsiden, i.dilaporkanPada),
  });

/** Saringan status daftar Insiden: satu status, "terbuka" (bawaan), atau "semua". */
export type SaringanStatusInsiden = StatusInsiden | "terbuka" | "semua";

/** Daftar Insiden yang boleh dibaca aktor, disaring status (bawaan terbuka). Yang lewat tenggat di atas, lalu yang terbaru. */
export async function daftarInsiden(aktor: Pengguna | null, saringan: { status?: SaringanStatusInsiden } = {}, sekarang = new Date()) {
  wajibPengguna(aktor);
  const status = saringan.status ?? "terbuka";
  if (status !== "terbuka" && status !== "semua" && !STATUS_INSIDEN.includes(status)) {
    throw new ServiceError(400, "Saringan status tidak dikenal.");
  }
  const baris = await db
    .select(kolomDaftar)
    .from(insiden)
    .innerJoin(unit, eq(unit.id, insiden.unitId))
    .where(
      and(
        status === "semua" ? undefined : inArray(insiden.status, status === "terbuka" ? [...STATUS_INSIDEN_TERBUKA] : [status]),
        saringBaca(aktor),
      ),
    )
    .orderBy(desc(insiden.dilaporkanPada));
  return baris.map(denganTurunan(hariIni(sekarang))).sort((a, b) => Number(b.lewatTenggat) - Number(a.lewatTenggat));
}

/**
 * Detail Insiden + Riwayat Status + hak tampilan per aksi (`boleh`). Pembuat Laporan yang bukan pembaca penuh baru
 * melihat hasil investigasi setelah Insiden Selesai (umpan balik).
 */
export async function ambilInsiden(aktor: Pengguna | null, id: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  const pembuat = alias(pengguna, "pembuat");
  const [baris] = apakahUuid(id)
    ? await db
        .select({
          ...kolomDaftar,
          unit: { id: unit.id, nama: unit.nama, aktif: unit.aktif },
          unitPenyebab: { id: unitPenyebab.id, nama: unitPenyebab.nama },
          kronologi: insiden.kronologi,
          orangPertama: insiden.orangPertama,
          tempat: insiden.tempat,
          pasienInisial: insiden.pasienInisial,
          pasienNoRm: insiden.pasienNoRm,
          pasienRuangan: insiden.pasienRuangan,
          pasienUmurBulan: insiden.pasienUmurBulan,
          pasienJenisKelamin: insiden.pasienJenisKelamin,
          penanggungBiaya: insiden.penanggungBiaya,
          kategoriPasien: insiden.kategoriPasien,
          spesialisasi: insiden.spesialisasi,
          tanggalMasuk: insiden.tanggalMasuk,
          akibat: insiden.akibat,
          tindakanSegera: insiden.tindakanSegera,
          tindakanOleh: insiden.tindakanOleh,
          pernahTerjadi: insiden.pernahTerjadi,
          pernahTerjadiKeterangan: insiden.pernahTerjadiKeterangan,
          tipeInsiden: insiden.tipeInsiden,
          faktorKontributor: insiden.faktorKontributor,
          penyebabLangsung: insiden.penyebabLangsung,
          akarMasalah: insiden.akarMasalah,
          rekomendasi: insiden.rekomendasi,
          diubahPada: insiden.diubahPada,
          pembuat: pembuat.nama,
        })
        .from(insiden)
        .innerJoin(unit, eq(unit.id, insiden.unitId))
        .leftJoin(unitPenyebab, eq(unitPenyebab.id, insiden.unitPenyebabId))
        .innerJoin(pembuat, eq(pembuat.id, insiden.dilaporkanOlehId))
        .where(eq(insiden.id, id))
    : [];
  if (!baris) throw new ServiceError(404, "Insiden tidak ditemukan.");
  const unitId = baris.unit.id;
  if (!bolehBacaInsiden(aktor, { unitId, dilaporkanOlehId: baris.dilaporkanOlehId })) {
    throw new ServiceError(403, "Insiden ini hanya bisa dibaca Pembuat Laporan, Kepala Unit dari Unit itu, Komite Mutu, dan Direktur.");
  }
  const riwayat = await db
    .select({
      statusAsal: riwayatStatusInsiden.statusAsal,
      statusTujuan: riwayatStatusInsiden.statusTujuan,
      oleh: pengguna.nama,
      waktu: riwayatStatusInsiden.waktu,
      dampak: riwayatStatusInsiden.dampak,
      probabilitas: riwayatStatusInsiden.probabilitas,
      catatan: riwayatStatusInsiden.catatan,
    })
    .from(riwayatStatusInsiden)
    .innerJoin(pengguna, eq(pengguna.id, riwayatStatusInsiden.olehId))
    .where(eq(riwayatStatusInsiden.insidenId, baris.id))
    .orderBy(asc(riwayatStatusInsiden.waktu));

  const { tipeInsiden, faktorKontributor, penyebabLangsung, akarMasalah, rekomendasi, ...laporan } = baris;
  const penuh = pembacaPenuh(aktor, unitId);
  // Pembuat Laporan tanpa hak baca lain: hasil investigasi dan catatan Komite Mutu baru terlihat setelah ditutup.
  const ditutup = baris.status === "selesai" || baris.status === "bukanInsiden";
  const komite = aktor.peran === "komiteMutu";
  const terbuka = STATUS_INSIDEN_TERBUKA.includes(baris.status);
  return {
    ...denganTurunan(hariIni(sekarang))(laporan),
    unitPenyebab: baris.unitPenyebab?.id ? baris.unitPenyebab : null,
    investigasi:
      tipeInsiden && (penuh || baris.status === "selesai") ? { tipeInsiden, faktorKontributor, penyebabLangsung, akarMasalah, rekomendasi } : null,
    riwayat: penuh || ditutup ? riwayat : riwayat.map((r) => ({ ...r, catatan: null })),
    boleh: {
      ubah: baris.dilaporkanOlehId === aktor.id && baris.status === "dilaporkan",
      grading: baris.status === "dilaporkan" && bolehTangani(aktor, unitId),
      investigasi: (baris.status === "investigasi" && bolehTangani(aktor, unitId)) || (baris.status === "rca" && komite),
      tinjau: baris.status === "ditinjau" && komite,
      bukanInsiden: terbuka && komite,
      ereport: komite && perluEreport(baris),
    },
  };
}

export type DetailInsiden = Awaited<ReturnType<typeof ambilInsiden>>;

/**
 * Angka Insiden untuk Dashboard, dari Insiden yang boleh dibaca aktor: `terbuka`, `lewatTenggat` (di antara yang
 * terbuka), `menunggu` (yang menunggu tindakan aktor: Kepala Unit = grading dan Investigasi Sederhana Unit-nya, Komite
 * Mutu = grading, tinjauan, dan RCA), `belumEreport` (Komite Mutu saja: KTD/Kejadian Sentinel tanpa tanggal e-report).
 * `lewatTenggat` Kepala Unit hanya Investigasi Sederhana Unit-nya.
 */
export async function ringkasanInsiden(aktor: Pengguna | null, sekarang = new Date()) {
  wajibPengguna(aktor);
  const komite = aktor.peran === "komiteMutu";
  const baris = await db
    .select({ unitId: insiden.unitId, status: insiden.status, tenggat: insiden.tenggat, ereportPada: insiden.ereportPada, jenis: insiden.jenis })
    .from(insiden)
    .where(
      and(
        or(
          inArray(insiden.status, [...STATUS_INSIDEN_TERBUKA]),
          komite ? and(inArray(insiden.jenis, [...JENIS_EREPORT]), isNull(insiden.ereportPada), ne(insiden.status, "bukanInsiden")) : undefined,
        ),
        saringBaca(aktor),
      ),
    );
  const hari = hariIni(sekarang);
  const terbuka = baris.filter((i) => STATUS_INSIDEN_TERBUKA.includes(i.status));
  const menungguSaya = (i: (typeof baris)[number]) =>
    komite ? ["dilaporkan", "ditinjau", "rca"].includes(i.status) : atasan(aktor, i.unitId) && ["dilaporkan", "investigasi"].includes(i.status);
  return {
    terbuka: terbuka.length,
    // Kepala Unit: hanya Investigasi Sederhana Unit-nya (RCA tanggungan Komite Mutu); peran lain: semua yang terbaca.
    lewatTenggat: terbuka.filter((i) => lewatTenggatInsiden(i, hari) && (aktor.peran !== "kepalaUnit" || menungguSaya(i))).length,
    menunggu: terbuka.filter(menungguSaya).length,
    belumEreport: komite ? baris.filter((i) => perluEreport(i) && !i.ereportPada).length : null,
  };
}

/** Hitungan per kunci, urut seperti `daftar`, hanya yang ada. */
const hitungPer = <K extends string>(daftar: readonly K[], nilai: (K | null)[]) =>
  daftar.map((k) => ({ kunci: k, jumlah: nilai.filter((n) => n === k).length })).filter((x) => x.jumlah > 0);

/**
 * Rekap Insiden satu Triwulan yang sudah selesai untuk Laporan Triwulan (Komite Mutu dan Direktur; Admin Sistem tidak
 * membaca Insiden), menurut waktu insiden, tanpa Bukan Insiden dan tanpa identitas pasien maupun Pembuat Laporan:
 * jumlah per jenis × warna grading terakhir (+ `semuaJenis`), per Unit, per tipe insiden, per akibat terhadap pasien,
 * penanganan (Selesai, berjalan, lewat tenggat), dan daftar Insiden yang pernah masuk RCA.
 */
export async function rekapInsiden(aktor: Pengguna | null, triwulan: string, sekarang = new Date()) {
  wajibPeran(aktor, PEMBACA_SEMUA, "Rekap Insiden hanya untuk Komite Mutu dan Direktur.");
  wajibTriwulanSelesai(triwulan, sekarang);
  const bulan = bulanTriwulan(triwulan);
  const baris = await db
    .select({
      id: insiden.id,
      judul: insiden.judul,
      waktuInsiden: insiden.waktuInsiden,
      dilaporkanPada: insiden.dilaporkanPada,
      jenis: insiden.jenis,
      status: insiden.status,
      dampak: insiden.dampak,
      probabilitas: insiden.probabilitas,
      tenggat: insiden.tenggat,
      akibat: insiden.akibat,
      tipeInsiden: insiden.tipeInsiden,
      akarMasalah: insiden.akarMasalah,
      rekomendasi: insiden.rekomendasi,
      unit: { id: unit.id, nama: unit.nama },
    })
    .from(insiden)
    .innerJoin(unit, eq(unit.id, insiden.unitId))
    .where(
      and(
        gte(insiden.waktuInsiden, dariWaktuSetempat(`${bulan[0]}-01T00:00`)!),
        lt(insiden.waktuInsiden, dariWaktuSetempat(`${geserBulan(bulan[2], 1)}-01T00:00`)!),
        ne(insiden.status, "bukanInsiden"),
      ),
    )
    .orderBy(asc(insiden.waktuInsiden));
  const daftar = baris.map(denganTurunan(hariIni(sekarang)));
  const pernahRca = new Set(
    daftar.length === 0
      ? []
      : (
          await db
            .select({ id: riwayatStatusInsiden.insidenId })
            .from(riwayatStatusInsiden)
            .where(and(eq(riwayatStatusInsiden.statusTujuan, "rca"), inArray(riwayatStatusInsiden.insidenId, daftar.map((i) => i.id))))
        ).map((r) => r.id),
  );
  const perUnit = [...Map.groupBy(daftar, (i) => i.unit.id).values()]
    .map((g) => ({ unit: g[0].unit, jumlah: g.length }))
    .sort((a, b) => b.jumlah - a.jumlah || a.unit.nama.localeCompare(b.unit.nama, "id"));
  const perWarna = (g: typeof daftar) => ({
    perWarna: Object.fromEntries(WARNA_GRADING.map((w) => [w, g.filter((i) => i.warna === w).length])) as Record<WarnaGrading, number>,
    belumDigrading: g.filter((i) => !i.warna).length,
    jumlah: g.length,
  });
  // Tipe insiden dihitung dari investigasi yang sudah dikirim atau ditutup, bukan dari isian yang baru disimpan.
  const diinvestigasi = daftar.filter((i) => i.tipeInsiden && (i.status === "ditinjau" || i.status === "selesai"));
  return {
    triwulan,
    jumlah: daftar.length,
    perJenis: JENIS_INSIDEN.map((jenis) => ({ jenis, ...perWarna(daftar.filter((i) => i.jenis === jenis)) })),
    semuaJenis: perWarna(daftar),
    perUnit,
    perTipe: hitungPer(TIPE_INSIDEN, diinvestigasi.map((i) => i.tipeInsiden)),
    belumDiinvestigasi: daftar.length - diinvestigasi.length,
    perAkibat: hitungPer(AKIBAT_INSIDEN, daftar.map((i) => i.akibat)),
    penanganan: {
      selesai: daftar.filter((i) => i.status === "selesai").length,
      berjalan: daftar.filter((i) => i.status !== "selesai").length,
      lewatTenggat: daftar.filter((i) => i.lewatTenggat).length,
    },
    // Hanya tanggal insiden (tanpa jam), dan akar masalah serta rekomendasi hanya dari RCA yang sudah Selesai.
    rca: daftar
      .filter((i) => pernahRca.has(i.id))
      .map(({ id, judul, waktuInsiden, jenis, status, warna, unit: u, tipeInsiden, akarMasalah, rekomendasi, lewatTenggat }) => {
        const selesai = status === "selesai";
        return {
          id,
          judul,
          tanggal: hariIni(waktuInsiden),
          jenis,
          status,
          warna,
          unit: u,
          tipeInsiden: selesai ? tipeInsiden : null,
          akarMasalah: selesai ? akarMasalah : null,
          rekomendasi: selesai ? rekomendasi : null,
          lewatTenggat,
        };
      }),
  };
}
