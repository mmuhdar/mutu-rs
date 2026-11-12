import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { buktiPengukuran, indikator, pengguna, pengukuran, riwayatStatusPengukuran, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan, dariTanggal, keTanggal, labelBulan, wajibBulan } from "@/lib/bulan";
import { jenisBukti, MAKS_BUKTI, MAKS_UKURAN_BUKTI, namaBerkas } from "@/lib/bukti";
import { hitungCapaian } from "@/lib/capaian";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan } from "@/lib/indikator";
import {
  aksiVerifikasi,
  LABEL_STATUS_PENGUKURAN,
  PERPINDAHAN,
  type AksiVerifikasi,
  type StatusPengukuran,
} from "@/lib/pengukuran";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPeran, type Pengguna } from "@/modules/auth/service";
import { bersinggungan } from "@/modules/indikator/service";

/** Satu isian: Indikator, Unit, dan bulan "YYYY-MM". */
export type KunciIsian = { indikatorId: string; unitId: string; bulan: string };
/** N dan D dari form (NaN = kosong, ditolak di sini); Catatan opsional. */
export type IsianPengukuran = KunciIsian & { n: number; d: number; catatan?: string };

/** Hanya Petugas Input Data dan Kepala Unit yang mengisi, dan hanya untuk Unit-nya sendiri. */
const PENGISI: readonly Peran[] = ["petugasInputData", "kepalaUnit"];
const HANYA_PENGISI = "Hanya Petugas Input Data dan Kepala Unit yang boleh mengisi dan mengajukan Pengukuran.";
/** Hanya Kepala Unit yang memverifikasi, dan hanya Pengukuran Unit-nya sendiri. */
const VERIFIKATOR: readonly Peran[] = ["kepalaUnit"];

/** Untuk tampilan (menu isian, tautan "Ubah isian"); hak akses tetap diperiksa di setiap fungsi service. */
export const bolehIsiPengukuran = (aktor: Pengguna) => PENGISI.includes(aktor.peran);
/** Untuk tampilan (antrean dan form Verifikasi); hak akses tetap diperiksa di setiap fungsi service. */
export const bolehVerifikasi = (aktor: Pengguna) => VERIFIKATOR.includes(aktor.peran);
/** Panjang maksimal Catatan dan alasan. */
const MAKS_TEKS = 1000;
const MAKS_INT = 2_147_483_647;

/** `db` atau transaksi yang sedang berjalan. */
type Kueri = Pick<typeof db, "select">;
type Transaksi = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Pengukuran milik Indikator + Unit (id atau kolom) + bulan "YYYY-MM". */
const pengukuranUntuk = (indikatorId: string | AnyPgColumn, unitId: string | AnyPgColumn, bulan: string) =>
  and(eq(pengukuran.indikatorId, indikatorId), eq(pengukuran.unitId, unitId), eq(pengukuran.bulan, keTanggal(bulan)));

/**
 * Alasan pengembalian bila Pengukuran Draf ini dikembalikan Kepala Unit dan belum diajukan lagi; selain itu null.
 * Riwayat Status terakhir sebuah Draf adalah simpan pertama (tanpa alasan) atau pengembalian (alasan wajib); menyimpan
 * ulang Draf tidak menulis Riwayat Status. Status tetap Draf (glosarium); ini hanya penanda untuk tampilan.
 */
const alasanPengembalian = sql<string | null>`(
  select ${riwayatStatusPengukuran.alasan} from ${riwayatStatusPengukuran}
  where ${riwayatStatusPengukuran.pengukuranId} = ${pengukuran.id} and ${pengukuran.status} = 'draf'
  order by ${riwayatStatusPengukuran.waktu} desc limit 1
)`;

function wajibPengisiUnit(aktor: Pengguna | null, unitId: string): asserts aktor is Pengguna {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  // unitIds berasal dari database, jadi id yang bukan uuid otomatis tidak cocok.
  if (!aktor.unitIds.includes(unitId)) {
    throw new ServiceError(403, "Anda hanya bisa mengisi Pengukuran untuk Unit Anda sendiri.");
  }
}

function periksaBulan(bulan: string, sekarang: Date) {
  wajibBulan(bulan, "Pilih bulan.");
  if (bulan > bulanBerjalan(sekarang)) {
    throw new ServiceError(400, `${labelBulan(bulan)} belum berjalan, jadi belum bisa diisi.`);
  }
}

async function ambilUnitAktif(q: Kueri, unitId: string) {
  const [u] = await q.select({ id: unit.id, nama: unit.nama, aktif: unit.aktif }).from(unit).where(eq(unit.id, unitId));
  if (!u) throw new ServiceError(404, "Unit tidak ditemukan.");
  if (!u.aktif) throw new ServiceError(400, `Unit ${u.nama} nonaktif, jadi tidak bisa mengisi Pengukuran.`);
  return { id: u.id, nama: u.nama };
}

/**
 * Aturan isian selain angka: peran + Unit aktor, bulan, Indikator aktif dan diukur pada bulan itu, Unit aktif dan
 * menjadi Unit Pelapor pada bulan itu. Baris Indikator dikunci `for share`, jadi penghapusan Unit Pelapor (yang
 * menguncinya `for update`) tidak bisa menyelip di antara pemeriksaan dan penyimpanan.
 */
async function periksaKonteks(q: Kueri, aktor: Pengguna | null, k: KunciIsian, sekarang: Date) {
  wajibPengisiUnit(aktor, k.unitId);
  periksaBulan(k.bulan, sekarang);
  const [ind] = apakahUuid(k.indikatorId)
    ? await q.select().from(indikator).where(eq(indikator.id, k.indikatorId)).for("share")
    : [];
  if (!ind) throw new ServiceError(404, "Indikator tidak ditemukan.");
  if (!ind.aktif) throw new ServiceError(400, `Indikator ${ind.kode} nonaktif, jadi tidak bisa diisi.`);
  if (!diukurPadaBulan(ind.frekuensi, k.bulan)) {
    throw new ServiceError(400, `Indikator ${ind.kode} Semesteran hanya diisi pada bulan Juni dan Desember.`);
  }
  const u = await ambilUnitAktif(q, k.unitId);
  const [pelapor] = await q
    .select({ id: unitPelapor.id })
    .from(unitPelapor)
    .where(and(eq(unitPelapor.indikatorId, ind.id), eq(unitPelapor.unitId, u.id), bersinggungan(k.bulan, k.bulan)))
    .limit(1);
  if (!pelapor) {
    throw new ServiceError(400, `Unit ${u.nama} bukan Unit Pelapor Indikator ${ind.kode} pada ${labelBulan(k.bulan)}.`);
  }
  return { indikator: ind, unit: u };
}

/**
 * Aturan N, D, dan Catatan: N dan D bilangan bulat ≥ 0, D = 0 hanya bila N = 0, N ≤ D untuk faktor 100; Catatan
 * dirapikan dan dibatasi panjangnya.
 */
function periksaAngkaDanCatatan(isian: IsianPengukuran, faktor: number) {
  const { n, d } = isian;
  if (![n, d].every((x) => Number.isInteger(x) && x >= 0)) {
    throw new ServiceError(400, "N dan D harus bilangan bulat ≥ 0.");
  }
  if (n > MAKS_INT || d > MAKS_INT) throw new ServiceError(400, "N atau D terlalu besar.");
  if (d === 0 && n > 0) throw new ServiceError(400, "D = 0 hanya boleh bila N = 0.");
  if (faktor === 100 && n > d) throw new ServiceError(400, "N tidak boleh lebih dari D pada Indikator persen.");
  const catatan = typeof isian.catatan === "string" ? isian.catatan.trim() : "";
  if (catatan.length > MAKS_TEKS) throw new ServiceError(400, `Catatan maksimal ${MAKS_TEKS} karakter.`);
  return { n, d, catatan };
}

/** Unit aktif milik Petugas Input Data / Kepala Unit, untuk memilih Unit yang sedang diisi. */
export async function unitPengisi(aktor: Pengguna | null) {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  if (aktor.unitIds.length === 0) return [];
  return db
    .select({ id: unit.id, nama: unit.nama })
    .from(unit)
    .where(and(inArray(unit.id, aktor.unitIds), eq(unit.aktif, true)))
    .orderBy(asc(unit.nama));
}

/**
 * Daftar isian Unit pada bulan "YYYY-MM": Indikator aktif yang Unit-nya menjadi Unit Pelapor bulan itu (Semesteran
 * hanya Juni dan Desember), urut kode, beserta status Pengukurannya (null = belum diisi) dan alasan pengembalian bila
 * Draf itu dikembalikan Kepala Unit.
 */
export async function daftarIsian(aktor: Pengguna | null, k: { unitId: string; bulan: string }, sekarang = new Date()) {
  wajibPengisiUnit(aktor, k.unitId);
  periksaBulan(k.bulan, sekarang);
  await ambilUnitAktif(db, k.unitId);
  const baris = await db
    .select({
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama, frekuensi: indikator.frekuensi },
      status: pengukuran.status,
      alasanPengembalian,
    })
    .from(indikator)
    .innerJoin(
      unitPelapor,
      and(eq(unitPelapor.indikatorId, indikator.id), eq(unitPelapor.unitId, k.unitId), bersinggungan(k.bulan, k.bulan)),
    )
    .leftJoin(pengukuran, pengukuranUntuk(indikator.id, k.unitId, k.bulan))
    .where(eq(indikator.aktif, true))
    .orderBy(asc(indikator.kode));
  return baris.filter((b) => diukurPadaBulan(b.indikator.frekuensi, k.bulan));
}

/** Riwayat Status satu Pengukuran, urut waktu: siapa, kapan, dari status apa ke status apa, dan alasannya. */
const riwayatStatus = (pengukuranId: string) =>
  db
    .select({
      statusAsal: riwayatStatusPengukuran.statusAsal,
      statusTujuan: riwayatStatusPengukuran.statusTujuan,
      oleh: pengguna.nama,
      waktu: riwayatStatusPengukuran.waktu,
      alasan: riwayatStatusPengukuran.alasan,
    })
    .from(riwayatStatusPengukuran)
    .innerJoin(pengguna, eq(pengguna.id, riwayatStatusPengukuran.olehId))
    .where(eq(riwayatStatusPengukuran.pengukuranId, pengukuranId))
    .orderBy(asc(riwayatStatusPengukuran.waktu));

/** Bukti satu Pengukuran tanpa isinya, urut waktu unggah. */
const daftarBukti = (pengukuranId: string) =>
  db
    .select({
      id: buktiPengukuran.id,
      nama: buktiPengukuran.nama,
      jenis: buktiPengukuran.jenis,
      ukuran: buktiPengukuran.ukuran,
      diunggahOleh: pengguna.nama,
      diunggahPada: buktiPengukuran.diunggahPada,
    })
    .from(buktiPengukuran)
    .innerJoin(pengguna, eq(pengguna.id, buktiPengukuran.diunggahOlehId))
    .where(eq(buktiPengukuran.pengukuranId, pengukuranId))
    .orderBy(asc(buktiPengukuran.diunggahPada));

/**
 * Bahan formulir isian: Indikator (definisi N, D, Sumber Data, faktor, satuan), Unit, Pengukuran yang sudah ada
 * (null = belum diisi), Riwayat Status-nya, dan Bukti-nya. Ditolak dengan aturan yang sama seperti menyimpan.
 */
export async function ambilIsian(aktor: Pengguna | null, k: KunciIsian, sekarang = new Date()) {
  const konteks = await periksaKonteks(db, aktor, k, sekarang);
  const [ada] = await db
    .select({
      id: pengukuran.id,
      n: pengukuran.n,
      d: pengukuran.d,
      catatan: pengukuran.catatan,
      status: pengukuran.status,
      pengisi: pengguna.nama,
      disimpan: pengukuran.updatedAt,
    })
    .from(pengukuran)
    .innerJoin(pengguna, eq(pengguna.id, pengukuran.pengisiId))
    .where(pengukuranUntuk(konteks.indikator.id, konteks.unit.id, k.bulan));
  const [riwayat, bukti] = ada ? await Promise.all([riwayatStatus(ada.id), daftarBukti(ada.id)]) : [[], []];
  return { ...konteks, bulan: k.bulan, pengukuran: ada ?? null, riwayat, bukti };
}

/**
 * Menyimpan isian sebagai Draf (membuat Pengukuran bila belum ada), lalu bila `ajukan` memindahkannya ke Diajukan.
 * Hanya Draf yang bisa diubah. Simpan pertama dan pengajuan dicatat di Riwayat Status; pengisi = aktor.
 */
async function simpan(aktor: Pengguna | null, isian: IsianPengukuran, ajukan: boolean, sekarang: Date) {
  return db.transaction(async (tx) => {
    const konteks = await periksaKonteks(tx, aktor, isian, sekarang);
    const { indikator: ind, unit: u } = konteks;
    const oleh = aktor!.id;
    const data = { ...periksaAngkaDanCatatan(isian, ind.faktor), pengisiId: oleh, updatedAt: new Date() };

    // Simpan pertama dua orang sekaligus: insert kedua menunggu yang pertama, lalu mengubah baris yang sama.
    const [baru] = await tx
      .insert(pengukuran)
      .values({ indikatorId: ind.id, unitId: u.id, bulan: keTanggal(isian.bulan), ...data, status: "draf" })
      .onConflictDoNothing()
      .returning({ id: pengukuran.id });
    let id: string;
    if (baru) {
      id = baru.id;
      await tx
        .insert(riwayatStatusPengukuran)
        .values({ pengukuranId: id, statusAsal: null, statusTujuan: "draf", olehId: oleh });
    } else {
      const [lama] = await tx
        .select({ id: pengukuran.id, status: pengukuran.status })
        .from(pengukuran)
        .where(pengukuranUntuk(ind.id, u.id, isian.bulan))
        .for("update");
      if (lama.status !== "draf") {
        throw new ServiceError(
          409,
          `Pengukuran ini sudah ${LABEL_STATUS_PENGUKURAN[lama.status]}; hanya Pengukuran Draf yang bisa diubah.`,
        );
      }
      id = lama.id;
      await tx.update(pengukuran).set(data).where(eq(pengukuran.id, id));
    }

    // Baris ini baru dibuat atau sudah dikunci di atas, dan statusnya Draf.
    const draf = { id, status: "draf" as StatusPengukuran };
    return ajukan ? pindahStatus(tx, draf, "ajukan", oleh) : draf;
  });
}

/** Menyimpan isian sebagai Draf. Mengisi ulang Indikator + Unit + bulan yang sama mengubah Pengukuran yang sama. */
export function simpanPengukuran(aktor: Pengguna | null, isian: IsianPengukuran, sekarang = new Date()) {
  return simpan(aktor, isian, false, sekarang);
}

/** Menyimpan isian lalu mengajukannya (Draf → Diajukan) untuk diverifikasi Kepala Unit. */
export function ajukanPengukuran(aktor: Pengguna | null, isian: IsianPengukuran, sekarang = new Date()) {
  return simpan(aktor, isian, true, sekarang);
}

const HANYA_KEPALA = "Hanya Kepala Unit yang boleh memverifikasi Pengukuran.";

/** Pengukuran beserta Indikator, Unit, dan pengisinya, untuk antrean, daftar status, dan detail Pengukuran. */
const pilihPengukuran = () =>
  db
    .select({
      id: pengukuran.id,
      bulan: pengukuran.bulan,
      n: pengukuran.n,
      d: pengukuran.d,
      catatan: pengukuran.catatan,
      status: pengukuran.status,
      pengisi: pengguna.nama,
      disimpan: pengukuran.updatedAt,
      indikator: {
        id: indikator.id,
        kode: indikator.kode,
        nama: indikator.nama,
        definisiNumerator: indikator.definisiNumerator,
        definisiDenominator: indikator.definisiDenominator,
        faktor: indikator.faktor,
        satuan: indikator.satuan,
      },
      unit: { id: unit.id, nama: unit.nama, aktif: unit.aktif },
    })
    .from(pengukuran)
    .innerJoin(indikator, eq(indikator.id, pengukuran.indikatorId))
    .innerJoin(unit, eq(unit.id, pengukuran.unitId))
    .innerJoin(pengguna, eq(pengguna.id, pengukuran.pengisiId));
/** Kolom bulan (tanggal 1) dikembalikan sebagai "YYYY-MM". */
const bulanDariTanggal = <T extends { bulan: string }>(p: T) => ({ ...p, bulan: dariTanggal(p.bulan) });
/** Baris `pilihPengukuran` untuk tampilan: bulan "YYYY-MM" dan Capaian-nya (N/D × faktor; null bila D = 0). */
const denganCapaian = <T extends { bulan: string; n: number; d: number; indikator: { faktor: number } }>(p: T) => ({
  ...bulanDariTanggal(p),
  capaian: hitungCapaian(p.n, p.d, p.indikator.faktor),
});

/**
 * Antrean Verifikasi: semua Pengukuran Diajukan dari Unit-Unit Kepala Unit, di bulan mana pun, terlama lebih dulu,
 * beserta Capaian-nya.
 */
export async function antreanVerifikasi(aktor: Pengguna | null) {
  wajibPeran(aktor, VERIFIKATOR, HANYA_KEPALA);
  if (aktor.unitIds.length === 0) return [];
  const baris = await pilihPengukuran()
    .where(and(eq(pengukuran.status, "diajukan"), inArray(pengukuran.unitId, aktor.unitIds)))
    .orderBy(asc(pengukuran.bulan), asc(unit.nama), asc(indikator.kode));
  return baris.map(denganCapaian);
}

/**
 * Pengukuran Draf dari Unit-Unit aktor yang dikembalikan Kepala Unit dan belum diajukan lagi, di bulan mana pun, beserta
 * alasannya; terlama lebih dulu. Untuk Dashboard Petugas Input Data dan Kepala Unit.
 */
export async function pengukuranDikembalikan(aktor: Pengguna | null) {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  if (aktor.unitIds.length === 0) return [];
  const baris = await db
    .select({
      id: pengukuran.id,
      bulan: pengukuran.bulan,
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama },
      unit: { id: unit.id, nama: unit.nama },
      alasan: sql<string>`${alasanPengembalian}`,
    })
    .from(pengukuran)
    .innerJoin(indikator, eq(indikator.id, pengukuran.indikatorId))
    .innerJoin(unit, eq(unit.id, pengukuran.unitId))
    .where(and(inArray(pengukuran.unitId, aktor.unitIds), isNotNull(alasanPengembalian)))
    .orderBy(asc(pengukuran.bulan), asc(unit.nama), asc(indikator.kode));
  return baris.map(bulanDariTanggal);
}

/** Yang melihat status Pengukuran semua Unit: Komite Mutu dan Admin Sistem. Petugas dan Kepala Unit hanya Unit-nya. */
const PEMANTAU: readonly Peran[] = ["komiteMutu", "adminSistem"];

/** Detail Pengukuran beserta Capaian, Riwayat Status, dan Bukti-nya, untuk Unit itu, Komite Mutu, dan Admin Sistem. */
export async function ambilPengukuran(aktor: Pengguna | null, id: string) {
  wajibPeran(aktor, [...PENGISI, ...PEMANTAU], "Anda tidak berhak melihat Pengukuran.");
  const [p] = apakahUuid(id) ? await pilihPengukuran().where(eq(pengukuran.id, id)) : [];
  if (!p) throw new ServiceError(404, "Pengukuran tidak ditemukan.");
  if (bolehIsiPengukuran(aktor) && !aktor.unitIds.includes(p.unit.id)) {
    throw new ServiceError(403, "Anda hanya bisa melihat Pengukuran Unit Anda sendiri.");
  }
  const [riwayat, bukti] = await Promise.all([riwayatStatus(p.id), daftarBukti(p.id)]);
  return { ...denganCapaian(p), riwayat, bukti };
}

/** Berkas yang diunggah sebagai Bukti: nama asli dan isinya. */
export type BerkasBukti = { nama: string; isi: Uint8Array };

/**
 * Pengukuran Draf yang Bukti-nya boleh diubah aktor: pengisi dengan Unit Pengukuran itu, aturan konteks sama dengan
 * menyimpan isian, dan status Draf. Urutan kunci sama dengan `simpan` (Indikator `for share` lewat `periksaKonteks`,
 * lalu Pengukuran `for update`), jadi pengajuan yang bersamaan menunggu dan Bukti tidak berubah setelah Diajukan.
 */
async function drafUntukBukti(tx: Transaksi, aktor: Pengguna | null, pengukuranId: string, sekarang: Date) {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  const [p] = apakahUuid(pengukuranId)
    ? await tx
        .select({ indikatorId: pengukuran.indikatorId, unitId: pengukuran.unitId, bulan: pengukuran.bulan })
        .from(pengukuran)
        .where(eq(pengukuran.id, pengukuranId))
    : [];
  if (!p) throw new ServiceError(404, "Pengukuran tidak ditemukan.");
  await periksaKonteks(tx, aktor, { ...p, bulan: dariTanggal(p.bulan) }, sekarang);
  const [{ status }] = await tx.select({ status: pengukuran.status }).from(pengukuran).where(eq(pengukuran.id, pengukuranId)).for("update");
  if (status !== "draf") {
    throw new ServiceError(409, `Pengukuran ini sudah ${LABEL_STATUS_PENGUKURAN[status]}; Bukti hanya bisa diubah selama Draf.`);
  }
}

/**
 * Melampirkan satu Bukti (PDF/JPG/PNG menurut isinya, maks 10 MB) ke Pengukuran Draf Unit aktor; paling banyak
 * `MAKS_BUKTI` per Pengukuran. Mengembalikan id Bukti.
 */
export async function tambahBukti(aktor: Pengguna | null, pengukuranId: string, berkas: BerkasBukti, sekarang = new Date()) {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  const nama = namaBerkas(berkas.nama);
  const isi = Buffer.from(berkas.isi.buffer, berkas.isi.byteOffset, berkas.isi.byteLength);
  if (isi.length === 0) throw new ServiceError(400, `Berkas ${nama} kosong.`);
  if (isi.length > MAKS_UKURAN_BUKTI) throw new ServiceError(400, `Berkas ${nama} lebih dari 10 MB.`);
  const jenis = jenisBukti(isi);
  if (!jenis) throw new ServiceError(400, `Berkas ${nama} bukan PDF, JPG, atau PNG.`);

  return db.transaction(async (tx) => {
    await drafUntukBukti(tx, aktor, pengukuranId, sekarang);
    const [{ jumlah }] = await tx
      .select({ jumlah: count() })
      .from(buktiPengukuran)
      .where(eq(buktiPengukuran.pengukuranId, pengukuranId));
    if (jumlah >= MAKS_BUKTI) throw new ServiceError(400, `Bukti paling banyak ${MAKS_BUKTI} berkas per Pengukuran.`);
    const [{ id }] = await tx
      .insert(buktiPengukuran)
      .values({ pengukuranId, nama, jenis, ukuran: isi.length, isi, diunggahOlehId: aktor!.id })
      .returning({ id: buktiPengukuran.id });
    return id;
  });
}

/** Menghapus satu Bukti dari Pengukuran Draf Unit aktor. */
export async function hapusBukti(aktor: Pengguna | null, buktiId: string, sekarang = new Date()) {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  await db.transaction(async (tx) => {
    const [b] = apakahUuid(buktiId)
      ? await tx.select({ pengukuranId: buktiPengukuran.pengukuranId }).from(buktiPengukuran).where(eq(buktiPengukuran.id, buktiId))
      : [];
    if (!b) throw new ServiceError(404, "Bukti tidak ditemukan.");
    await drafUntukBukti(tx, aktor, b.pengukuranId, sekarang);
    await tx.delete(buktiPengukuran).where(eq(buktiPengukuran.id, buktiId));
  });
}

/** Nama, jenis, dan isi satu Bukti untuk dibuka; hak baca sama dengan detail Pengukuran (`ambilPengukuran`). */
export async function ambilBerkasBukti(aktor: Pengguna | null, buktiId: string) {
  wajibPeran(aktor, [...PENGISI, ...PEMANTAU], "Anda tidak berhak melihat Pengukuran.");
  const [b] = apakahUuid(buktiId)
    ? await db
        .select({ nama: buktiPengukuran.nama, jenis: buktiPengukuran.jenis, isi: buktiPengukuran.isi, unitId: pengukuran.unitId })
        .from(buktiPengukuran)
        .innerJoin(pengukuran, eq(pengukuran.id, buktiPengukuran.pengukuranId))
        .where(eq(buktiPengukuran.id, buktiId))
    : [];
  if (!b) throw new ServiceError(404, "Bukti tidak ditemukan.");
  if (bolehIsiPengukuran(aktor) && !aktor.unitIds.includes(b.unitId)) {
    throw new ServiceError(403, "Anda hanya bisa melihat Pengukuran Unit Anda sendiri.");
  }
  return { nama: b.nama, jenis: b.jenis, isi: b.isi };
}

/**
 * Status semua Pengukuran pada bulan "YYYY-MM" di semua Unit, untuk memantau pengisian: setiap Pengukuran yang ada
 * (termasuk milik Indikator atau Unit yang kini nonaktif), ditambah baris tanpa Pengukuran (id dan status null) untuk
 * Unit Pelapor yang wajib mengisi tetapi belum, menurut aturan daftar isian. Urut nama Unit, lalu kode Indikator.
 */
export async function statusPengukuranBulan(aktor: Pengguna | null, bulan: string, sekarang = new Date()) {
  wajibPeran(aktor, PEMANTAU, "Hanya Komite Mutu dan Admin Sistem yang boleh melihat status Pengukuran semua Unit.");
  periksaBulan(bulan, sekarang);
  const ada = await pilihPengukuran().where(eq(pengukuran.bulan, keTanggal(bulan)));
  const belum = await db
    .select({
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama, frekuensi: indikator.frekuensi },
      unit: { id: unit.id, nama: unit.nama, aktif: unit.aktif },
    })
    .from(unitPelapor)
    .innerJoin(indikator, eq(indikator.id, unitPelapor.indikatorId))
    .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
    .leftJoin(pengukuran, pengukuranUntuk(indikator.id, unit.id, bulan))
    .where(and(bersinggungan(bulan, bulan), eq(indikator.aktif, true), eq(unit.aktif, true), isNull(pengukuran.id)));

  const wajib = belum.filter((b) => diukurPadaBulan(b.indikator.frekuensi, bulan)).map((b) => ({ ...b, id: null, status: null }));
  return [...ada, ...wajib]
    .map(({ id, status, indikator: i, unit }) => ({ id, status, unit, indikator: { id: i.id, kode: i.kode, nama: i.nama } }))
    .sort((a, b) => a.unit.nama.localeCompare(b.unit.nama, "id") || a.indikator.kode.localeCompare(b.indikator.kode, "id"));
}

/**
 * Satu perpindahan status (`PERPINDAHAN`, `src/lib/pengukuran.ts`) atas baris Pengukuran yang sudah dikunci di
 * transaksi ini: status asal diperiksa, status diubah, lalu satu baris Riwayat Status ditulis beserta alasannya.
 */
async function pindahStatus(
  tx: Transaksi,
  p: { id: string; status: StatusPengukuran },
  aksi: keyof typeof PERPINDAHAN,
  olehId: string,
  alasan: string | null = null,
) {
  const { dari, ke, kata } = PERPINDAHAN[aksi];
  if (p.status !== dari) {
    throw new ServiceError(
      409,
      `Pengukuran ini ${LABEL_STATUS_PENGUKURAN[p.status]}; hanya Pengukuran ${LABEL_STATUS_PENGUKURAN[dari]} yang bisa ${kata}.`,
    );
  }
  await tx.update(pengukuran).set({ status: ke }).where(eq(pengukuran.id, p.id));
  await tx.insert(riwayatStatusPengukuran).values({ pengukuranId: p.id, statusAsal: dari, statusTujuan: ke, olehId, alasan });
  return { id: p.id, status: ke as StatusPengukuran };
}

/**
 * Aksi Verifikasi oleh Kepala Unit dari Unit itu (`aksi` = kunci `PERPINDAHAN` selain `ajukan`, mis. dari tombol form
 * Verifikasi). Verifikasi tanpa alasan; mengembalikan dan membuka kembali wajib beralasan. Baris Pengukuran dikunci
 * sebelum Unit dan status asalnya diperiksa.
 */
export async function ubahStatusPengukuran(aktor: Pengguna | null, id: string, aksi: AksiVerifikasi, alasan?: unknown) {
  wajibPeran(aktor, VERIFIKATOR, HANYA_KEPALA);
  // Nilai dari form bisa diutak-atik.
  if (!aksiVerifikasi(aksi)) throw new ServiceError(400, "Aksi tidak dikenal.");
  let teks: string | null = null;
  if (aksi !== "verifikasi") {
    teks = typeof alasan === "string" ? alasan.trim() : "";
    if (!teks) throw new ServiceError(400, "Alasan wajib diisi.");
    if (teks.length > MAKS_TEKS) throw new ServiceError(400, `Alasan maksimal ${MAKS_TEKS} karakter.`);
  }
  return db.transaction(async (tx) => {
    const [p] = apakahUuid(id)
      ? await tx
          .select({ id: pengukuran.id, unitId: pengukuran.unitId, status: pengukuran.status })
          .from(pengukuran)
          .where(eq(pengukuran.id, id))
          .for("update")
      : [];
    if (!p) throw new ServiceError(404, "Pengukuran tidak ditemukan.");
    if (!aktor.unitIds.includes(p.unitId)) {
      throw new ServiceError(403, "Anda hanya bisa memverifikasi Pengukuran Unit Anda sendiri.");
    }
    return pindahStatus(tx, p, aksi, aktor.id, teks);
  });
}

/** Diajukan → Terverifikasi: angkanya ikut dihitung dalam Capaian. */
export const verifikasiPengukuran = (aktor: Pengguna | null, id: string) => ubahStatusPengukuran(aktor, id, "verifikasi");

/** Diajukan → Draf dengan alasan, supaya Petugas tahu apa yang harus diperbaiki. */
export const kembalikanPengukuran = (aktor: Pengguna | null, id: string, alasan: string) =>
  ubahStatusPengukuran(aktor, id, "kembalikan", alasan);

/** Terverifikasi → Diajukan dengan alasan, untuk mengoreksi kesalahan yang ketahuan belakangan. */
export const bukaKembaliPengukuran = (aktor: Pengguna | null, id: string, alasan: string) =>
  ubahStatusPengukuran(aktor, id, "bukaKembali", alasan);
