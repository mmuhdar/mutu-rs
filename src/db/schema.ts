// Skema database (Drizzle). Setelah mengubah file ini jalankan `npm run db:generate -- --name <slug>`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { JENIS_BUKTI, MAKS_UKURAN_BUKTI, type JenisBukti } from "../lib/bukti";
import { ARAH, FREKUENSI, KELOMPOK, type Arah, type Frekuensi, type Kelompok } from "../lib/indikator";
import {
  AKIBAT_INSIDEN,
  FAKTOR_KONTRIBUTOR,
  JENIS_INSIDEN,
  JENIS_KELAMIN,
  KATEGORI_PASIEN,
  ORANG_PERTAMA,
  PENANGGUNG_BIAYA,
  SPESIALISASI,
  STATUS_INSIDEN,
  TINDAKAN_OLEH,
  TIPE_INSIDEN,
  type AkibatInsiden,
  type FaktorKontributor,
  type JenisInsiden,
  type JenisKelamin,
  type KategoriPasien,
  type OrangPertama,
  type PenanggungBiaya,
  type Spesialisasi,
  type StatusInsiden,
  type TindakanOleh,
  type TipeInsiden,
} from "../lib/insiden";
import { ENTITAS_JEJAK, type EntitasJejak } from "../lib/jejak";
import { PEMICU_VALIDASI, PENYEBAB_TIDAK_VALID, type PemicuValidasi, type PenyebabTidakValid } from "../lib/validasi";
import { STATUS_PENGUKURAN, type StatusPengukuran } from "../lib/pengukuran";
import {
  JENIS_SUMBER_DAYA,
  KEPUTUSAN_PDSA,
  STATUS_TERBUKA,
  STATUS_TINDAK_LANJUT,
  TAHAP_PDSA,
  type JenisSumberDaya,
  type KeputusanPdsa,
  type StatusTindakLanjut,
  type TahapPdsa,
} from "../lib/perbaikan";
import { PERAN, type Peran } from "../lib/peran";
import {
  EFEKTIVITAS,
  JENIS_DOKUMEN_RISIKO,
  KATEGORI_RISIKO,
  type Efektivitas,
  type JenisDokumenRisiko,
  type KategoriRisiko,
} from "../lib/risiko";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
/** CHECK: nilai kolom harus salah satu dari daftar konstanta. */
const salahSatu = (kolom: AnyPgColumn, nilai: readonly string[]) =>
  sql`${kolom} in (${sql.raw(nilai.map((n) => `'${n}'`).join(", "))})`;

export const pengguna = pgTable(
  "pengguna",
  {
    id: id(),
    username: varchar("username", { length: 64 }).notNull(),
    nama: varchar("nama", { length: 120 }).notNull(),
    hashSandi: text("hash_sandi").notNull(),
    peran: varchar("peran", { length: 32 }).$type<Peran>().notNull(),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    // Username unik tanpa membedakan huruf besar/kecil.
    uniqueIndex("pengguna_username_unique").on(sql`lower(${t.username})`),
    check("pengguna_peran_check", sql`${t.peran} in (${sql.raw(PERAN.map((p) => `'${p}'`).join(", "))})`),
  ],
);

/** Daftar baku Unit. Tidak pernah dihapus, hanya dinonaktifkan, supaya riwayat datanya tetap ada. */
export const unit = pgTable(
  "unit",
  {
    id: id(),
    nama: varchar("nama", { length: 80 }).notNull(),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: createdAt(),
  },
  // Nama disimpan tanpa spasi di tepi (dirapikan di service), unik tanpa membedakan huruf besar/kecil.
  (t) => [uniqueIndex("unit_nama_unique").on(sql`lower(${t.nama})`)],
);

/** Unit milik Petugas Input Data dan Kepala Unit (peran lain tidak punya Unit). */
export const penggunaUnit = pgTable(
  "pengguna_unit",
  {
    penggunaId: uuid("pengguna_id")
      .notNull()
      .references(() => pengguna.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
  },
  (t) => [primaryKey({ columns: [t.penggunaId, t.unitId] })],
);

/** Sesi masuk: cookie berisi token acak, database hanya menyimpan hash SHA-256-nya. */
export const sesi = pgTable("sesi", {
  id: id(),
  penggunaId: uuid("pengguna_id")
    .notNull()
    .references(() => pengguna.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const indikator = pgTable(
  "indikator",
  {
    id: id(),
    kode: varchar("kode", { length: 32 }).notNull(),
    nama: varchar("nama", { length: 200 }).notNull(),
    kelompok: varchar("kelompok", { length: 16 }).$type<Kelompok>().notNull(),
    /** Termasuk kriteria eksklusi. */
    definisiOperasional: text("definisi_operasional").notNull(),
    definisiNumerator: text("definisi_numerator").notNull(),
    definisiDenominator: text("definisi_denominator").notNull(),
    sumberData: text("sumber_data").notNull(),
    /** Capaian = N/D × faktor (100 persen, 1 rata-rata, 25 indeks kepuasan, 1000 per seribu). */
    faktor: integer("faktor").notNull(),
    satuan: varchar("satuan", { length: 32 }).notNull(),
    arah: varchar("arah", { length: 16 }).$type<Arah>().notNull(),
    frekuensi: varchar("frekuensi", { length: 16 }).$type<Frekuensi>().notNull(),
    pic: varchar("pic", { length: 120 }).notNull().default(""),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    // Kode unik tanpa membedakan huruf besar/kecil.
    uniqueIndex("indikator_kode_unique").on(sql`lower(${t.kode})`),
    check("indikator_kelompok_check", salahSatu(t.kelompok, KELOMPOK)),
    check("indikator_arah_check", salahSatu(t.arah, ARAH)),
    check("indikator_frekuensi_check", salahSatu(t.frekuensi, FREKUENSI)),
    check("indikator_faktor_check", sql`${t.faktor} > 0`),
  ],
);

/** Riwayat Target sebuah Indikator; Target untuk bulan M = yang "berlaku mulai"-nya terbaru dan tidak lewat dari M. */
export const target = pgTable(
  "target",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    nilai: numeric("nilai", { mode: "number" }).notNull(),
    /** Bulan disimpan sebagai tanggal 1 bulan itu; service memakai "YYYY-MM". */
    berlakuMulai: date("berlaku_mulai", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("target_indikator_bulan_unique").on(t.indikatorId, t.berlakuMulai),
    check("target_berlaku_mulai_check", sql`extract(day from ${t.berlakuMulai}) = 1`),
    check("target_nilai_check", sql`${t.nilai} >= 0`),
  ],
);

/**
 * Unit Pelapor: Unit yang wajib mengukur sebuah Indikator dari bulan mulai sampai bulan berhenti (keduanya
 * termasuk; tanpa bulan berhenti = masih berlangsung). Aturan tumpang tindih diperiksa di service.
 */
export const unitPelapor = pgTable(
  "unit_pelapor",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    bulanMulai: date("bulan_mulai", { mode: "string" }).notNull(),
    bulanBerhenti: date("bulan_berhenti", { mode: "string" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("unit_pelapor_indikator_idx").on(t.indikatorId),
    check("unit_pelapor_bulan_mulai_check", sql`extract(day from ${t.bulanMulai}) = 1`),
    check("unit_pelapor_bulan_berhenti_check", sql`extract(day from ${t.bulanBerhenti}) = 1`),
    check("unit_pelapor_periode_check", sql`${t.bulanBerhenti} >= ${t.bulanMulai}`),
  ],
);

/**
 * Pengukuran: N dan D satu Indikator di satu Unit untuk satu bulan. Unik per Indikator + Unit + bulan, jadi mengisi
 * ulang mengubah baris yang sama. Aturan isian yang bergantung pada Indikator (N ≤ D untuk faktor 100, Frekuensi,
 * Unit Pelapor) diperiksa di service.
 */
export const pengukuran = pgTable(
  "pengukuran",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    bulan: date("bulan", { mode: "string" }).notNull(),
    n: integer("n").notNull(),
    d: integer("d").notNull(),
    catatan: text("catatan").notNull().default(""),
    status: varchar("status", { length: 16 }).$type<StatusPengukuran>().notNull(),
    /** Pengguna yang terakhir menyimpan N, D, dan Catatan; diambil dari sesi. */
    pengisiId: uuid("pengisi_id")
      .notNull()
      .references(() => pengguna.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pengukuran_indikator_unit_bulan_unique").on(t.indikatorId, t.unitId, t.bulan),
    check("pengukuran_bulan_check", sql`extract(day from ${t.bulan}) = 1`),
    check("pengukuran_status_check", salahSatu(t.status, STATUS_PENGUKURAN)),
    check("pengukuran_nd_check", sql`${t.n} >= 0 and ${t.d} >= 0 and (${t.d} > 0 or ${t.n} = 0)`),
  ],
);

/** Riwayat Status Pengukuran: setiap simpan pertama dan setiap perpindahan status. Status asal null = baru dibuat. */
export const riwayatStatusPengukuran = pgTable(
  "riwayat_status_pengukuran",
  {
    id: id(),
    pengukuranId: uuid("pengukuran_id")
      .notNull()
      .references(() => pengukuran.id),
    statusAsal: varchar("status_asal", { length: 16 }).$type<StatusPengukuran>(),
    statusTujuan: varchar("status_tujuan", { length: 16 }).$type<StatusPengukuran>().notNull(),
    olehId: uuid("oleh_id")
      .notNull()
      .references(() => pengguna.id),
    // clock_timestamp(), bukan now(): dua perpindahan dalam satu transaksi (simpan pertama + ajukan) tetap berurutan.
    waktu: timestamp("waktu", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
    alasan: text("alasan"),
  },
  (t) => [
    index("riwayat_status_pengukuran_idx").on(t.pengukuranId, t.waktu),
    check("riwayat_status_pengukuran_asal_check", salahSatu(t.statusAsal, STATUS_PENGUKURAN)),
    check("riwayat_status_pengukuran_tujuan_check", salahSatu(t.statusTujuan, STATUS_PENGUKURAN)),
  ],
);

/** Isi berkas biner (PostgreSQL `bytea`); driver pg mengembalikannya sebagai Buffer. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Bukti Pengukuran: PDF/JPG/PNG yang dilampirkan pengisi selama Draf. Isinya disimpan di database supaya ikut backup
 * harian; tidak pernah dihapus berantai karena Pengukuran tidak pernah dihapus.
 */
export const buktiPengukuran = pgTable(
  "bukti_pengukuran",
  {
    id: id(),
    pengukuranId: uuid("pengukuran_id")
      .notNull()
      .references(() => pengukuran.id),
    nama: varchar("nama", { length: 200 }).notNull(),
    jenis: varchar("jenis", { length: 32 }).$type<JenisBukti>().notNull(),
    ukuran: integer("ukuran").notNull(),
    isi: bytea("isi").notNull(),
    diunggahOlehId: uuid("diunggah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diunggahPada: timestamp("diunggah_pada", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index("bukti_pengukuran_pengukuran_idx").on(t.pengukuranId),
    check("bukti_pengukuran_jenis_check", salahSatu(t.jenis, JENIS_BUKTI)),
    check("bukti_pengukuran_ukuran_check", sql`${t.ukuran} = octet_length(${t.isi}) and ${t.ukuran} between 1 and ${sql.raw(String(MAKS_UKURAN_BUKTI))}`),
  ],
);

/**
 * Analisis: catatan tertulis tentang Capaian satu Indikator dalam satu Lingkup untuk satu bulan. Unit null = Lingkup
 * RS. Unik per Indikator + Lingkup + bulan (null dianggap sama), jadi menulis ulang mengubah baris yang sama. Aturan
 * bulan yang dinilai dan Lingkup diperiksa di service.
 */
export const analisis = pgTable(
  "analisis",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    unitId: uuid("unit_id").references(() => unit.id),
    bulan: date("bulan", { mode: "string" }).notNull(),
    teks: text("teks").notNull(),
    /** Pengguna yang terakhir menyimpan; diambil dari sesi. */
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("analisis_indikator_unit_bulan_unique").on(t.indikatorId, t.unitId, t.bulan).nullsNotDistinct(),
    check("analisis_bulan_check", sql`extract(day from ${t.bulan}) = 1`),
  ],
);

/**
 * Tindak Lanjut: satu tindakan perbaikan milik sebuah Analisis. Tidak pernah dihapus; yang batal berstatus Dibatalkan.
 * Catatan = hasil (Selesai) atau alasan (Dibatalkan), wajib untuk kedua status itu.
 */
export const tindakLanjut = pgTable(
  "tindak_lanjut",
  {
    id: id(),
    analisisId: uuid("analisis_id")
      .notNull()
      .references(() => analisis.id),
    tindakan: text("tindakan").notNull(),
    /** Nama atau jabatan, seperti PIC Indikator; bukan akun MutuRS. */
    pic: varchar("pic", { length: 120 }).notNull(),
    tenggat: date("tenggat", { mode: "string" }).notNull(),
    status: varchar("status", { length: 16 }).$type<StatusTindakLanjut>().notNull(),
    catatan: text("catatan").notNull().default(""),
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("tindak_lanjut_analisis_idx").on(t.analisisId),
    check("tindak_lanjut_status_check", salahSatu(t.status, STATUS_TINDAK_LANJUT)),
    check("tindak_lanjut_catatan_check", sql`${salahSatu(t.status, STATUS_TERBUKA)} or ${t.catatan} <> ''`),
  ],
);

/**
 * PDSA: siklus uji coba perbaikan untuk satu Indikator dalam satu Lingkup (unit null = RS). Isian Plan wajib sejak
 * dibuat; Do, Study, dan Act diisi berurutan (urutan dan isian wajib diperiksa di service). Siklus berikutnya menunjuk
 * siklus sebelumnya; satu siklus hanya punya satu siklus berikutnya.
 */
export const pdsa = pgTable(
  "pdsa",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    unitId: uuid("unit_id").references(() => unit.id),
    judul: varchar("judul", { length: 200 }).notNull(),
    siklus: integer("siklus").notNull(),
    sebelumnyaId: uuid("sebelumnya_id").references((): AnyPgColumn => pdsa.id),
    tahap: varchar("tahap", { length: 16 }).$type<TahapPdsa>().notNull(),
    /** Periode uji coba (keduanya termasuk), tanggal 1 bulan itu. */
    bulanMulai: date("bulan_mulai", { mode: "string" }).notNull(),
    bulanAkhir: date("bulan_akhir", { mode: "string" }).notNull(),
    masalah: text("masalah").notNull(),
    tujuan: text("tujuan").notNull(),
    prediksi: text("prediksi").notNull(),
    rencana: text("rencana").notNull(),
    pelaksanaan: text("pelaksanaan").notNull().default(""),
    hasil: text("hasil").notNull().default(""),
    keputusan: varchar("keputusan", { length: 16 }).$type<KeputusanPdsa>(),
    penjelasan: text("penjelasan").notNull().default(""),
    /** Kesimpulan Analisis Efisiensi (PMKP 4 g); kosong = belum dianalisis. Biaya per sumber daya di `efisiensi_pdsa`. */
    kesimpulanEfisiensi: text("kesimpulan_efisiensi").notNull().default(""),
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("pdsa_indikator_idx").on(t.indikatorId),
    uniqueIndex("pdsa_sebelumnya_unique").on(t.sebelumnyaId),
    check("pdsa_tahap_check", salahSatu(t.tahap, TAHAP_PDSA)),
    check("pdsa_keputusan_check", salahSatu(t.keputusan, KEPUTUSAN_PDSA)),
    check("pdsa_siklus_check", sql`${t.siklus} >= 1`),
    check("pdsa_bulan_mulai_check", sql`extract(day from ${t.bulanMulai}) = 1`),
    check("pdsa_bulan_akhir_check", sql`extract(day from ${t.bulanAkhir}) = 1`),
    check("pdsa_periode_check", sql`${t.bulanAkhir} >= ${t.bulanMulai}`),
  ],
);

/**
 * Analisis Efisiensi PDSA (KMK 1596/2024 PMKP 4 EP g): biaya satu jenis sumber daya sebelum dan sesudah perbaikan, dalam
 * Rupiah per periode yang sama (dijelaskan di kesimpulan). Satu baris per PDSA + jenis; disimpan ulang seluruhnya.
 */
export const efisiensiPdsa = pgTable(
  "efisiensi_pdsa",
  {
    pdsaId: uuid("pdsa_id")
      .notNull()
      .references(() => pdsa.id),
    jenis: varchar("jenis", { length: 16 }).$type<JenisSumberDaya>().notNull(),
    sebelum: integer("sebelum").notNull(),
    sesudah: integer("sesudah").notNull(),
    keterangan: text("keterangan").notNull().default(""),
  },
  (t) => [
    primaryKey({ columns: [t.pdsaId, t.jenis] }),
    check("efisiensi_pdsa_jenis_check", salahSatu(t.jenis, JENIS_SUMBER_DAYA)),
    check("efisiensi_pdsa_biaya_check", sql`${t.sebelum} >= 0 and ${t.sesudah} >= 0`),
  ],
);

/**
 * Rekomendasi Komite Mutu untuk satu Triwulan (bagian akhir Laporan Triwulan). Unik per tahun + Triwulan, jadi menulis
 * ulang mengubah baris yang sama; tidak pernah dihapus.
 */
export const rekomendasi = pgTable(
  "rekomendasi",
  {
    id: id(),
    tahun: integer("tahun").notNull(),
    triwulan: integer("triwulan").notNull(),
    teks: text("teks").notNull(),
    /** Pengguna yang terakhir menyimpan; diambil dari sesi. */
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("rekomendasi_tahun_triwulan_unique").on(t.tahun, t.triwulan),
    check("rekomendasi_triwulan_check", sql`${t.triwulan} between 1 and 4`),
  ],
);

/**
 * Umpan Balik Dewan Pengawas atas Laporan Triwulan (KMK 1596/2024 TKRS 1): umpan balik tertulis dari pertemuan
 * pembahasan laporan itu, dan tindak lanjutnya yang dievaluasi pada pertemuan berikutnya (Laporan Triwulan sesudahnya).
 * Unik per tahun + Triwulan; menulis ulang mengubah baris yang sama; tidak pernah dihapus.
 */
export const umpanBalikDewanPengawas = pgTable(
  "umpan_balik_dewan_pengawas",
  {
    id: id(),
    tahun: integer("tahun").notNull(),
    triwulan: integer("triwulan").notNull(),
    teks: text("teks").notNull(),
    diterimaPada: date("diterima_pada", { mode: "string" }).notNull(),
    /** Tindak lanjut yang dilakukan; kosong = belum dievaluasi. */
    tindakLanjut: text("tindak_lanjut").notNull().default(""),
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("umpan_balik_dewan_pengawas_tahun_triwulan_unique").on(t.tahun, t.triwulan),
    check("umpan_balik_dewan_pengawas_triwulan_check", sql`${t.triwulan} between 1 and 4`),
  ],
);

/** CHECK: tingkat dampak/probabilitas 1–5 (null = belum digrading). */
const tingkat = (kolom: AnyPgColumn) => sql`${kolom} between 1 and 5`;

/**
 * Insiden Keselamatan Pasien: satu laporan internal (isian Formulir 1 PMK 11/2017) beserta grading, investigasi, dan
 * statusnya. Data pasien wajib kecuali untuk KPC. Tidak pernah dihapus; laporan yang ternyata bukan insiden berstatus
 * Bukan Insiden. Aturan alur, hak akses, dan isian diperiksa di service.
 */
export const insiden = pgTable(
  "insiden",
  {
    id: id(),
    /** Unit tempat insiden dilaporkan; Kepala Unit-nya = atasan langsung yang menggrading. */
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    /** Unit/departemen terkait yang menyebabkan insiden (Formulir 1 butir 10), opsional. */
    unitPenyebabId: uuid("unit_penyebab_id").references(() => unit.id),
    waktuInsiden: timestamp("waktu_insiden", { withTimezone: true }).notNull(),
    /** Insiden singkat (Formulir 1 butir 2), mis. "Pasien jatuh dari tempat tidur". */
    judul: varchar("judul", { length: 200 }).notNull(),
    kronologi: text("kronologi").notNull(),
    jenis: varchar("jenis", { length: 16 }).$type<JenisInsiden>().notNull(),
    orangPertama: varchar("orang_pertama", { length: 16 }).$type<OrangPertama>().notNull(),
    tempat: varchar("tempat", { length: 120 }).notNull(),
    pasienInisial: varchar("pasien_inisial", { length: 20 }),
    pasienNoRm: varchar("pasien_no_rm", { length: 30 }),
    pasienRuangan: varchar("pasien_ruangan", { length: 80 }).notNull().default(""),
    pasienUmurBulan: integer("pasien_umur_bulan"),
    pasienJenisKelamin: varchar("pasien_jenis_kelamin", { length: 1 }).$type<JenisKelamin>(),
    penanggungBiaya: varchar("penanggung_biaya", { length: 16 }).$type<PenanggungBiaya>(),
    kategoriPasien: varchar("kategori_pasien", { length: 16 }).$type<KategoriPasien>(),
    spesialisasi: varchar("spesialisasi", { length: 24 }).$type<Spesialisasi>(),
    tanggalMasuk: timestamp("tanggal_masuk", { withTimezone: true }),
    akibat: varchar("akibat", { length: 16 }).$type<AkibatInsiden>().notNull(),
    tindakanSegera: text("tindakan_segera").notNull(),
    tindakanOleh: varchar("tindakan_oleh", { length: 16 }).$type<TindakanOleh>().notNull(),
    /** Kejadian yang sama pernah terjadi di unit kerja lain (Formulir 1 butir 14) + kapan dan langkahnya. */
    pernahTerjadi: boolean("pernah_terjadi").notNull(),
    pernahTerjadiKeterangan: text("pernah_terjadi_keterangan").notNull().default(""),
    /** Pembuat Laporan: Pengguna yang memasukkan laporan; diambil dari sesi. */
    dilaporkanOlehId: uuid("dilaporkan_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    dilaporkanPada: timestamp("dilaporkan_pada", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 16 }).$type<StatusInsiden>().notNull(),
    /** Grading terakhir (awal oleh Kepala Unit, akhir oleh Komite Mutu); riwayatnya di `riwayat_status_insiden`. */
    dampak: integer("dampak"),
    probabilitas: integer("probabilitas"),
    /** Tenggat investigasi, ditetapkan saat grading. */
    tenggat: date("tenggat", { mode: "string" }),
    tipeInsiden: varchar("tipe_insiden", { length: 24 }).$type<TipeInsiden>(),
    faktorKontributor: text("faktor_kontributor").array().$type<FaktorKontributor[]>().notNull().default(sql`'{}'`),
    penyebabLangsung: text("penyebab_langsung").notNull().default(""),
    akarMasalah: text("akar_masalah").notNull().default(""),
    rekomendasi: text("rekomendasi").notNull().default(""),
    /** Tanggal laporan dikirim ke e-report Kemenkes (KTD dan Kejadian Sentinel); dicatat Komite Mutu. */
    ereportPada: date("ereport_pada", { mode: "string" }),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("insiden_unit_idx").on(t.unitId),
    index("insiden_status_idx").on(t.status),
    index("insiden_waktu_idx").on(t.waktuInsiden),
    check("insiden_jenis_check", salahSatu(t.jenis, JENIS_INSIDEN)),
    check("insiden_status_check", salahSatu(t.status, STATUS_INSIDEN)),
    check("insiden_orang_pertama_check", salahSatu(t.orangPertama, ORANG_PERTAMA)),
    check("insiden_jenis_kelamin_check", salahSatu(t.pasienJenisKelamin, JENIS_KELAMIN)),
    check("insiden_penanggung_biaya_check", salahSatu(t.penanggungBiaya, PENANGGUNG_BIAYA)),
    check("insiden_kategori_pasien_check", salahSatu(t.kategoriPasien, KATEGORI_PASIEN)),
    check("insiden_spesialisasi_check", salahSatu(t.spesialisasi, SPESIALISASI)),
    check("insiden_akibat_check", salahSatu(t.akibat, AKIBAT_INSIDEN)),
    check("insiden_tindakan_oleh_check", salahSatu(t.tindakanOleh, TINDAKAN_OLEH)),
    check("insiden_tipe_check", salahSatu(t.tipeInsiden, TIPE_INSIDEN)),
    check(
      "insiden_faktor_check",
      sql`${t.faktorKontributor} <@ array[${sql.raw(FAKTOR_KONTRIBUTOR.map((f) => `'${f}'`).join(", "))}]::text[]`,
    ),
    check("insiden_umur_check", sql`${t.pasienUmurBulan} between 0 and 1800`),
    check(
      "insiden_pasien_check",
      sql`${t.jenis} = 'kpc' or (${t.pasienInisial} is not null and ${t.pasienNoRm} is not null and ${t.pasienUmurBulan} is not null and ${t.pasienJenisKelamin} is not null and ${t.penanggungBiaya} is not null and ${t.kategoriPasien} is not null and ${t.spesialisasi} is not null)`,
    ),
    check("insiden_dampak_check", tingkat(t.dampak)),
    check("insiden_probabilitas_check", tingkat(t.probabilitas)),
    check("insiden_grading_check", sql`(${t.dampak} is null) = (${t.probabilitas} is null)`),
  ],
);

/**
 * Riwayat Status Insiden: laporan dibuat (status asal null) dan setiap perpindahan status, beserta grading yang
 * ditetapkan pada perpindahan itu dan catatan (catatan tinjauan atau alasan Bukan Insiden).
 */
export const riwayatStatusInsiden = pgTable(
  "riwayat_status_insiden",
  {
    id: id(),
    insidenId: uuid("insiden_id")
      .notNull()
      .references(() => insiden.id),
    statusAsal: varchar("status_asal", { length: 16 }).$type<StatusInsiden>(),
    statusTujuan: varchar("status_tujuan", { length: 16 }).$type<StatusInsiden>().notNull(),
    olehId: uuid("oleh_id")
      .notNull()
      .references(() => pengguna.id),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
    dampak: integer("dampak"),
    probabilitas: integer("probabilitas"),
    catatan: text("catatan"),
  },
  (t) => [
    index("riwayat_status_insiden_idx").on(t.insidenId, t.waktu),
    check("riwayat_status_insiden_asal_check", salahSatu(t.statusAsal, STATUS_INSIDEN)),
    check("riwayat_status_insiden_tujuan_check", salahSatu(t.statusTujuan, STATUS_INSIDEN)),
    check("riwayat_status_insiden_dampak_check", tingkat(t.dampak)),
    check("riwayat_status_insiden_probabilitas_check", tingkat(t.probabilitas)),
  ],
);

/**
 * Jejak Audit: satu baris per perubahan data lewat service (siapa, kapan, apa), ditulis dalam transaksi yang sama
 * dengan perubahannya. Hanya ditambah, tidak pernah diubah atau dihapus. Pengguna null = percobaan masuk yang gagal.
 */
export const jejakAudit = pgTable(
  "jejak_audit",
  {
    id: id(),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
    penggunaId: uuid("pengguna_id").references(() => pengguna.id),
    entitas: varchar("entitas", { length: 16 }).$type<EntitasJejak>().notNull(),
    /** Id data yang berubah (mis. Pengukuran, Indikator); null bila tidak satu baris tertentu. */
    entitasId: uuid("entitas_id"),
    ringkasan: text("ringkasan").notNull(),
  },
  (t) => [
    index("jejak_audit_waktu_idx").on(t.waktu),
    index("jejak_audit_entitas_idx").on(t.entitas, t.entitasId),
    check("jejak_audit_entitas_check", salahSatu(t.entitas, ENTITAS_JEJAK)),
  ],
);

/**
 * Validasi Data (PMKP 5): pengukuran ulang sampel data satu Indikator di satu Unit Pelapor untuk satu bulan oleh orang
 * yang berbeda dari pengumpul data. Validasi ulang = baris baru untuk Indikator + Unit + bulan yang sama. Aturan Unit
 * Pelapor, sampel minimal, dan isian wajib diperiksa di service; tidak pernah dihapus.
 */
export const validasiData = pgTable(
  "validasi_data",
  {
    id: id(),
    indikatorId: uuid("indikator_id")
      .notNull()
      .references(() => indikator.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    /** Bulan data yang divalidasi (tanggal 1). */
    bulan: date("bulan", { mode: "string" }).notNull(),
    pemicu: varchar("pemicu", { length: 24 }).$type<PemicuValidasi>().notNull(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    /** Nama, bukan akun: pengumpul data dan validator belum tentu Pengguna MutuRS. */
    pengumpulData: varchar("pengumpul_data", { length: 120 }).notNull(),
    validator: varchar("validator", { length: 120 }).notNull(),
    populasi: integer("populasi").notNull(),
    sampel: integer("sampel").notNull(),
    sesuai: integer("sesuai").notNull(),
    penyebab: text("penyebab").array().$type<PenyebabTidakValid[]>().notNull().default(sql`'{}'`),
    perbaikan: text("perbaikan").notNull().default(""),
    catatan: text("catatan").notNull().default(""),
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("validasi_data_indikator_unit_bulan_idx").on(t.indikatorId, t.unitId, t.bulan),
    check("validasi_data_bulan_check", sql`extract(day from ${t.bulan}) = 1`),
    check("validasi_data_pemicu_check", salahSatu(t.pemicu, PEMICU_VALIDASI)),
    check(
      "validasi_data_penyebab_check",
      sql`${t.penyebab} <@ array[${sql.raw(PENYEBAB_TIDAK_VALID.map((f) => `'${f}'`).join(", "))}]::text[]`,
    ),
    check("validasi_data_sampel_check", sql`${t.populasi} >= 1 and ${t.sampel} between 1 and ${t.populasi} and ${t.sesuai} between 0 and ${t.sampel}`),
  ],
);

/**
 * Risiko: satu baris Register Risiko satu Unit untuk satu tahun. Bobot, Nilai Risiko, Tingkat Risiko, dan Prioritas
 * Risiko tidak disimpan; semuanya dihitung dari Probabilitas + Dampak (`nilaiRisiko`, `src/lib/risiko.ts`). Hasil
 * Pemantauan diisi kemudian (keduanya atau tidak sama sekali); Efektivitas hanya setelah dipantau. Boleh dihapus untuk
 * koreksi salah input (Dokumen Review ikut terhapus).
 */
export const risiko = pgTable(
  "risiko",
  {
    id: id(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => unit.id),
    tahun: integer("tahun").notNull(),
    uraian: text("uraian").notNull(),
    kategori: varchar("kategori", { length: 16 }).$type<KategoriRisiko>().notNull(),
    probabilitas: integer("probabilitas").notNull(),
    dampak: integer("dampak").notNull(),
    /** Satu langkah per baris. */
    perlakuan: text("perlakuan").notNull().default(""),
    jadwal: date("jadwal", { mode: "string" }),
    probabilitasPemantauan: integer("probabilitas_pemantauan"),
    dampakPemantauan: integer("dampak_pemantauan"),
    efektivitas: varchar("efektivitas", { length: 16 }).$type<Efektivitas>(),
    diubahOlehId: uuid("diubah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diubahPada: timestamp("diubah_pada", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("risiko_unit_tahun_idx").on(t.unitId, t.tahun),
    check("risiko_tahun_check", sql`${t.tahun} between 2000 and 2100`),
    check("risiko_kategori_check", salahSatu(t.kategori, KATEGORI_RISIKO)),
    check("risiko_skala_check", sql`${t.probabilitas} between 1 and 5 and ${t.dampak} between 1 and 5`),
    check(
      "risiko_pemantauan_check",
      sql`(${t.probabilitasPemantauan} is null and ${t.dampakPemantauan} is null and ${t.efektivitas} is null) or (${t.probabilitasPemantauan} between 1 and 5 and ${t.dampakPemantauan} between 1 and 5)`,
    ),
    check("risiko_efektivitas_check", salahSatu(t.efektivitas, EFEKTIVITAS)),
  ],
);

/** Dokumen Review: PDF/DOC/DOCX hasil review satu Risiko, disimpan di database seperti Bukti Pengukuran. */
export const dokumenRisiko = pgTable(
  "dokumen_risiko",
  {
    id: id(),
    risikoId: uuid("risiko_id")
      .notNull()
      .references(() => risiko.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 200 }).notNull(),
    jenis: varchar("jenis", { length: 80 }).$type<JenisDokumenRisiko>().notNull(),
    ukuran: integer("ukuran").notNull(),
    isi: bytea("isi").notNull(),
    diunggahOlehId: uuid("diunggah_oleh_id")
      .notNull()
      .references(() => pengguna.id),
    diunggahPada: timestamp("diunggah_pada", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index("dokumen_risiko_risiko_idx").on(t.risikoId),
    check("dokumen_risiko_jenis_check", salahSatu(t.jenis, JENIS_DOKUMEN_RISIKO)),
    check("dokumen_risiko_ukuran_check", sql`${t.ukuran} = octet_length(${t.isi}) and ${t.ukuran} between 1 and ${sql.raw(String(MAKS_UKURAN_BUKTI))}`),
  ],
);
