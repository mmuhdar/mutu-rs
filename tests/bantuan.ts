import { randomUUID } from "node:crypto";

import { config } from "@/lib/config";
import { PERAN_BER_UNIT, type Peran } from "@/lib/peran";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import {
  tambahIndikator,
  tambahUnitPelapor,
  type Indikator,
  type IndikatorBaru,
  type IsianIndikator,
} from "@/modules/indikator/service";
import { tambahPengguna } from "@/modules/pengguna/service";
import { ajukanPengukuran, verifikasiPengukuran } from "@/modules/pengukuran/service";
import { tambahUnit } from "@/modules/unit/service";

/*
 * Bantuan bersama tes service. Semua file tes memakai satu database, jadi nama Unit, kode Indikator, dan username
 * dibuat unik. Aktor selalu Pengguna sungguhan: dibuat lewat service Pengguna, lalu `masuk` + `penggunaDariToken`,
 * sama seperti sesi di aplikasi.
 */

/** Teks unik untuk nama Unit, kode Indikator, dan username: "ICU-1a2b3c4d". */
export const unik = (awalan: string) => `${awalan}-${randomUUID().slice(0, 8)}`;

/** Sandi awal Pengguna buatan tes. */
export const SANDI = "sandi-awal-1";

/** Masuk lalu memuat Pengguna dari token sesinya, seperti `getSessionUser()` di aplikasi. */
async function sesi(username: string, sandi: string) {
  const pengguna = await penggunaDariToken(await masuk({ username, sandi, ip: "10.9.9.9" }));
  if (!pengguna) throw new Error(`Sesi ${username} tidak termuat.`);
  return pengguna;
}

let admin: Promise<Pengguna> | undefined;
/** Admin Sistem awal (`config.adminAwal`, dibuat `bootstrapDatabase()`), satu sesi per file tes. */
export const adminSistem = () => (admin ??= sesi(config.adminAwal.username, config.adminAwal.sandi));

/** Unit aktif baru dengan nama unik. */
export const unitBaru = async (awalan = "Unit") => tambahUnit(await adminSistem(), { nama: unik(awalan) });

/**
 * Pengguna baru berperan `peran` yang sudah masuk. Petugas Input Data dan Kepala Unit wajib punya Unit, jadi tanpa
 * `unitIds` dibuatkan satu Unit baru.
 */
export async function sebagai(peran: Peran, unitIds: string[] = []): Promise<Pengguna> {
  if (PERAN_BER_UNIT.includes(peran) && unitIds.length === 0) unitIds = [(await unitBaru()).id];
  const username = unik(peran);
  await tambahPengguna(await adminSistem(), { username, nama: `Nama ${username}`, sandi: SANDI, peran, unitIds });
  return sesi(username, SANDI);
}

let komite: Promise<Pengguna> | undefined;
/** Satu Komite Mutu bersama per file tes, untuk menyiapkan Indikator, Target, dan Unit Pelapor. */
export const komiteMutu = () => (komite ??= sebagai("komiteMutu"));

/** Isian IMP-RS baru: kode unik, persen, makin tinggi, Bulanan, Target 80 mulai Januari 2026. */
export const impBaru = (ubahan: Partial<IndikatorBaru> = {}): IndikatorBaru => ({
  kode: unik("IMP"),
  kelompok: "IMP-RS",
  nama: "Kepatuhan identifikasi pasien sebelum tindakan",
  definisiOperasional: "Identifikasi dengan dua penanda sebelum setiap tindakan.",
  definisiNumerator: "Jumlah tindakan dengan identifikasi benar",
  definisiDenominator: "Jumlah tindakan yang diobservasi",
  sumberData: "Lembar observasi",
  faktor: 100,
  satuan: "%",
  arah: "makinTinggi",
  frekuensi: "bulanan",
  pic: "",
  target: { nilai: 80, berlakuMulai: "2026-01" },
  ...ubahan,
});

/** IMP baru (`impBaru`) yang ditambahkan Komite Mutu; mengembalikan id-nya. */
export const indikatorBaru = async (ubahan: Partial<IndikatorBaru> = {}) =>
  tambahIndikator(await komiteMutu(), impBaru(ubahan));

/** Field Indikator yang bisa diubah, diambil dari Indikator yang ada. */
export const isianDari = (i: Indikator): IsianIndikator => ({
  nama: i.nama,
  definisiOperasional: i.definisiOperasional,
  definisiNumerator: i.definisiNumerator,
  definisiDenominator: i.definisiDenominator,
  sumberData: i.sumberData,
  faktor: i.faktor,
  satuan: i.satuan,
  arah: i.arah,
  frekuensi: i.frekuensi,
  pic: i.pic,
});

/** Unit baru yang menjadi Unit Pelapor Indikator mulai bulan tertentu (ditambahkan Komite Mutu). */
export async function unitPelapor(indikatorId: string, awalan = "Unit", bulanMulai = "2026-01") {
  const unit = await unitBaru(awalan);
  await tambahUnitPelapor(await komiteMutu(), indikatorId, { unitId: unit.id, bulanMulai });
  return unit;
}

/** Isi, ajukan, lalu verifikasi Pengukuran sebagai Kepala Unit baru dari Unit itu; mengembalikan id Pengukuran. */
export async function terverifikasi(indikatorId: string, unitId: string, bulan: string, n: number, d: number) {
  const kepala = await sebagai("kepalaUnit", [unitId]);
  const { id } = await ajukanPengukuran(kepala, { indikatorId, unitId, bulan, n, d });
  await verifikasiPengukuran(kepala, id);
  return id;
}
