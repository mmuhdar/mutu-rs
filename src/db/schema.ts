// Skema database (Drizzle). Setelah mengubah file ini jalankan `npm run db:generate -- --name <slug>`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

import { ARAH, FREKUENSI, KELOMPOK, type Arah, type Frekuensi, type Kelompok } from "../lib/indikator";
import { STATUS_PENGUKURAN, type StatusPengukuran } from "../lib/pengukuran";
import { STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "../lib/perbaikan";
import { PERAN, type Peran } from "../lib/peran";

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
    check("tindak_lanjut_catatan_check", sql`${t.status} in ('direncanakan', 'berjalan') or ${t.catatan} <> ''`),
  ],
);
