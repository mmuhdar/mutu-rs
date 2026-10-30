import { and, asc, eq, gte, inArray, isNull, lte, max, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { indikator, pengukuran, target, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan, dariTanggal, keTanggal, labelBulan, labelPeriode, wajibBulan } from "@/lib/bulan";
import { kodePg, ServiceError } from "@/lib/errors";
import { ARAH, FIELD_CARA_HITUNG, FREKUENSI, targetPadaBulan, type Kelompok } from "@/lib/indikator";
import type { Peran } from "@/lib/peran";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, wajibPeran, type Pengguna } from "@/modules/auth/service";

import { INM, TARGET_INM_BERLAKU_MULAI } from "./inm";

export type Indikator = typeof indikator.$inferSelect;
/** Field Indikator yang bisa diubah (kode dan kelompok tetap sejak dibuat). */
export type IsianIndikator = Pick<
  Indikator,
  | "nama"
  | "definisiOperasional"
  | "definisiNumerator"
  | "definisiDenominator"
  | "sumberData"
  | "faktor"
  | "satuan"
  | "arah"
  | "frekuensi"
  | "pic"
>;
/** IMP baru beserta Target awalnya (bulan "YYYY-MM"). INM hanya berasal dari data awal. */
export type IndikatorBaru = IsianIndikator & {
  kode: string;
  kelompok: Exclude<Kelompok, "INM">;
  target: { nilai: number; berlakuMulai: string };
};

const tidakDitemukan = () => new ServiceError(404, "Indikator tidak ditemukan.");

/** Komite Mutu dan Admin Sistem mengelola Indikator; peran lain hanya melihat. */
const PENGELOLA: readonly Peran[] = ["komiteMutu", "adminSistem"];
const HANYA_PENGELOLA = "Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator.";
/** Untuk tampilan (tombol kelola); hak akses tetap diperiksa di setiap fungsi service. */
export const bolehKelolaIndikator = (aktor: Pengguna) => PENGELOLA.includes(aktor.peran);

function teks(nilai: unknown, label: string, maks = Infinity, wajib = true) {
  const hasil = typeof nilai === "string" ? nilai.trim() : "";
  if (wajib && !hasil) throw new ServiceError(400, `${label} wajib diisi.`);
  if (hasil.length > maks) throw new ServiceError(400, `${label} maksimal ${maks} karakter.`);
  return hasil;
}

/** Memeriksa dan merapikan isian dari form (spasi di tepi dibuang). */
function periksaIsian(isian: IsianIndikator): IsianIndikator {
  const hasil = {
    nama: teks(isian.nama, "Nama", 200),
    definisiOperasional: teks(isian.definisiOperasional, "Definisi operasional"),
    definisiNumerator: teks(isian.definisiNumerator, "Definisi Numerator"),
    definisiDenominator: teks(isian.definisiDenominator, "Definisi Denominator"),
    sumberData: teks(isian.sumberData, "Sumber Data"),
    faktor: isian.faktor,
    satuan: teks(isian.satuan, "Satuan", 32),
    arah: isian.arah,
    frekuensi: isian.frekuensi,
    pic: teks(isian.pic ?? "", "PIC", 120, false),
  };
  if (!Number.isInteger(hasil.faktor) || hasil.faktor < 1 || hasil.faktor > 2_147_483_647) {
    throw new ServiceError(400, "Faktor harus bilangan bulat positif, mis. 100 untuk persen.");
  }
  if (!ARAH.includes(hasil.arah)) throw new ServiceError(400, "Pilih Arah Indikator.");
  if (!FREKUENSI.includes(hasil.frekuensi)) throw new ServiceError(400, "Pilih Frekuensi Indikator.");
  return hasil;
}

/**
 * Data awal: 13 INM beserta Target awalnya. Hanya kode yang belum ada yang ditambahkan, jadi restart
 * tidak menimpa perubahan Komite Mutu dan tidak menggandakan Target.
 */
export async function buatInmAwal() {
  await db.transaction(async (tx) => {
    const baru = await tx
      .insert(indikator)
      .values(INM.map((data) => ({ ...data, kelompok: "INM" as const })))
      .onConflictDoNothing()
      .returning({ id: indikator.id, kode: indikator.kode });
    if (baru.length === 0) return;
    await tx.insert(target).values(
      baru.map(({ id, kode }) => ({
        indikatorId: id,
        nilai: INM.find((data) => data.kode === kode)!.target,
        berlakuMulai: keTanggal(TARGET_INM_BERLAKU_MULAI),
      })),
    );
  });
}

/** Semua Indikator, termasuk yang nonaktif. Semua peran boleh melihat. */
export async function daftarIndikator(aktor: Pengguna | null) {
  wajibPengguna(aktor);
  return db.select().from(indikator).orderBy(asc(indikator.kode));
}

/**
 * Detail Indikator beserta riwayat Target-nya (urut bulan mulai berlaku) dan semua periode Unit Pelapor-nya
 * (urut nama Unit lalu bulan mulai; bulan berhenti null = masih berlangsung). Semua peran boleh melihat.
 */
export async function ambilIndikator(aktor: Pengguna | null, id: string) {
  wajibPengguna(aktor);
  const [baris] = apakahUuid(id) ? await db.select().from(indikator).where(eq(indikator.id, id)) : [];
  if (!baris) throw tidakDitemukan();
  const periode = await db
    .select({
      id: unitPelapor.id,
      unitId: unit.id,
      namaUnit: unit.nama,
      unitAktif: unit.aktif,
      bulanMulai: unitPelapor.bulanMulai,
      bulanBerhenti: unitPelapor.bulanBerhenti,
    })
    .from(unitPelapor)
    .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
    .where(eq(unitPelapor.indikatorId, id))
    .orderBy(asc(unit.nama), asc(unitPelapor.bulanMulai));
  return {
    ...baris,
    terkunci: await punyaPengukuran(db, id),
    target: (await riwayatTarget([id])).map(({ nilai, berlakuMulai }) => ({ nilai, berlakuMulai })),
    unitPelapor: periode.map((p) => ({
      ...p,
      bulanMulai: dariTanggal(p.bulanMulai),
      bulanBerhenti: p.bulanBerhenti && dariTanggal(p.bulanBerhenti),
    })),
  };
}

/**
 * Riwayat Target beberapa Indikator (bulan mulai berlaku "YYYY-MM"), urut bulan mulai. Satu-satunya pembaca tabel
 * `target`; Target yang berlaku pada suatu bulan = `targetPadaBulan` (`src/lib/indikator.ts`) atas riwayat satu
 * Indikator. Tanpa pemeriksaan peran (semua peran boleh membaca Target): untuk service lain, mis. modul Capaian.
 */
export async function riwayatTarget(indikatorIds: string[]) {
  const riwayat = await db
    .select({ indikatorId: target.indikatorId, nilai: target.nilai, berlakuMulai: target.berlakuMulai })
    .from(target)
    .where(inArray(target.indikatorId, indikatorIds))
    .orderBy(asc(target.berlakuMulai));
  return riwayat.map((t) => ({ ...t, berlakuMulai: dariTanggal(t.berlakuMulai) }));
}

/** Benar bila Indikator sudah punya Pengukuran dengan status apa pun (cara hitungnya terkunci). */
async function punyaPengukuran(q: Pick<typeof db, "select">, id: string) {
  const [ada] = await q.select({ id: pengukuran.id }).from(pengukuran).where(eq(pengukuran.indikatorId, id)).limit(1);
  return Boolean(ada);
}

/**
 * Mengubah field Indikator (kode dan kelompok tidak bisa diubah). Target diubah lewat riwayat Target. Setelah ada
 * Pengukuran, field cara hitung (`FIELD_CARA_HITUNG`) tidak boleh berbeda dari nilai lamanya. Baris Indikator dikunci
 * `for update`, jadi Pengukuran pertama yang sedang disimpan (menguncinya `for share`) selesai lebih dulu dan terhitung.
 */
export async function ubahIndikator(aktor: Pengguna | null, id: string, isian: IsianIndikator) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const data = periksaIsian(isian);
  if (!apakahUuid(id)) throw tidakDitemukan();
  await db.transaction(async (tx) => {
    const [lama] = await tx.select().from(indikator).where(eq(indikator.id, id)).for("update");
    if (!lama) throw tidakDitemukan();
    const berubah = (Object.keys(FIELD_CARA_HITUNG) as (keyof typeof FIELD_CARA_HITUNG)[])
      .filter((field) => data[field] !== lama[field])
      .map((field) => FIELD_CARA_HITUNG[field])
      .join(", ");
    if (berubah && (await punyaPengukuran(tx, id))) {
      throw new ServiceError(
        409,
        `${berubah[0].toUpperCase()}${berubah.slice(1)} tidak bisa diubah karena Indikator ini sudah punya Pengukuran; tren tidak boleh mencampur dua cara hitung. Buat Indikator baru dengan cara hitung yang baru, lalu nonaktifkan Indikator ini.`,
      );
    }
    await tx.update(indikator).set(data).where(eq(indikator.id, id));
  });
}

/** Menonaktifkan atau mengaktifkan kembali Indikator. Tidak ada hapus, supaya riwayatnya tetap ada. */
export async function aturAktifIndikator(aktor: Pengguna | null, id: string, aktif: boolean) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const [baris] = apakahUuid(id)
    ? await db.update(indikator).set({ aktif }).where(eq(indikator.id, id)).returning({ id: indikator.id })
    : [];
  if (!baris) throw tidakDitemukan();
}

/** Menambah IMP-RS atau IMP-Unit beserta Target awalnya. Mengembalikan id Indikator baru. */
export async function tambahIndikator(aktor: Pengguna | null, baru: IndikatorBaru) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const kode = teks(baru.kode, "Kode", 32);
  if (baru.kelompok !== "IMP-RS" && baru.kelompok !== "IMP-Unit") {
    throw new ServiceError(400, "Pilih kelompok IMP-RS atau IMP-Unit. INM sudah tersedia sesuai PMK 30/2022.");
  }
  const data = periksaIsian(baru);
  const { nilai, berlakuMulai } = periksaTarget(baru.target);
  try {
    return await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(indikator)
        .values({ ...data, kode, kelompok: baru.kelompok })
        .returning({ id: indikator.id });
      await tx.insert(target).values({ indikatorId: id, nilai, berlakuMulai: keTanggal(berlakuMulai) });
      return id;
    });
  } catch (error) {
    if (kodePg(error) === "23505") throw new ServiceError(409, `Kode ${kode} sudah dipakai Indikator lain.`);
    throw error;
  }
}

/** Target dari form: nilai ≥ 0 dan bulan mulai berlaku "YYYY-MM". */
function periksaTarget(isian: IndikatorBaru["target"] | undefined) {
  const { nilai, berlakuMulai } = isian ?? {};
  if (typeof nilai !== "number" || !Number.isFinite(nilai) || nilai < 0) {
    throw new ServiceError(400, "Target harus berupa angka ≥ 0.");
  }
  wajibBulan(berlakuMulai, "Pilih bulan mulai berlaku Target.");
  return { nilai, berlakuMulai };
}

/**
 * Menetapkan Target yang berlaku mulai bulan tertentu; bulan sebelumnya tetap dinilai dengan Target lamanya. Bila
 * bulan mulai itu sudah punya Target, nilainya diganti (koreksi salah ketik).
 */
export async function tetapkanTarget(aktor: Pengguna | null, indikatorId: string, isian: IndikatorBaru["target"]) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const { nilai, berlakuMulai } = periksaTarget(isian);
  if (!apakahUuid(indikatorId)) throw tidakDitemukan();
  try {
    await db
      .insert(target)
      .values({ indikatorId, nilai, berlakuMulai: keTanggal(berlakuMulai) })
      .onConflictDoUpdate({ target: [target.indikatorId, target.berlakuMulai], set: { nilai } });
  } catch (error) {
    if (kodePg(error) === "23503") throw tidakDitemukan();
    throw error;
  }
}

/**
 * Target yang berlaku untuk Indikator pada bulan "YYYY-MM" (aturannya `targetPadaBulan` di `src/lib/indikator.ts`).
 * Semua peran boleh membaca.
 */
export async function targetBerlaku(aktor: Pengguna | null, indikatorId: string, bulan: string) {
  wajibPengguna(aktor);
  wajibBulan(bulan);
  const nilai = targetPadaBulan(apakahUuid(indikatorId) ? await riwayatTarget([indikatorId]) : [], bulan);
  // Setiap Indikator punya Target sejak dibuat, jadi riwayat kosong = Indikator tidak ada.
  if (nilai === undefined) throw tidakDitemukan();
  return nilai;
}

/** Periode Unit Pelapor baru; bulan "YYYY-MM", bulan berhenti kosong = masih berlangsung. */
export type IsianUnitPelapor = { unitId: string; bulanMulai: string; bulanBerhenti?: string | null };

/**
 * Periode Unit Pelapor yang bersinggungan dengan bulan `mulai` s.d. `berhenti` (keduanya termasuk; null = tanpa
 * akhir). Satu-satunya aturan periode: aktif pada bulan M = bersinggungan dengan M s.d. M. Diekspor untuk query yang
 * menggabungkan `unit_pelapor` dengan tabel lain (mis. daftar isian per Unit).
 */
export const bersinggungan = (mulai: string, berhenti: string | null) =>
  and(
    berhenti ? lte(unitPelapor.bulanMulai, keTanggal(berhenti)) : undefined,
    or(isNull(unitPelapor.bulanBerhenti), gte(unitPelapor.bulanBerhenti, keTanggal(mulai))),
  );

type Transaksi = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Menolak periode yang tumpang tindih dengan periode lain untuk Indikator dan Unit yang sama, atau dengan periode
 * Unit mana pun bila Indikatornya IMP-Unit (satu Unit Pelapor per bulan). Baris Indikator dikunci sampai transaksi
 * selesai, jadi dua penyimpanan bersamaan untuk Indikator yang sama diperiksa bergiliran.
 */
async function tolakTumpangTindih(
  tx: Transaksi,
  p: { indikatorId: string; unitId: string; mulai: string; berhenti: string | null; kecualiId?: string },
) {
  const [ind] = await tx
    .select({ kelompok: indikator.kelompok })
    .from(indikator)
    .where(eq(indikator.id, p.indikatorId))
    .for("update");
  if (!ind) throw tidakDitemukan();
  const [bentrok] = await tx
    .select({
      unitId: unit.id,
      nama: unit.nama,
      bulanMulai: unitPelapor.bulanMulai,
      bulanBerhenti: unitPelapor.bulanBerhenti,
    })
    .from(unitPelapor)
    .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
    .where(
      and(
        eq(unitPelapor.indikatorId, p.indikatorId),
        ind.kelompok === "IMP-Unit" ? undefined : eq(unitPelapor.unitId, p.unitId),
        p.kecualiId ? ne(unitPelapor.id, p.kecualiId) : undefined,
        bersinggungan(p.mulai, p.berhenti),
      ),
    )
    .limit(1);
  if (!bentrok) return;
  const periode = labelPeriode(dariTanggal(bentrok.bulanMulai), bentrok.bulanBerhenti && dariTanggal(bentrok.bulanBerhenti));
  throw new ServiceError(
    409,
    bentrok.unitId === p.unitId
      ? `Unit ${bentrok.nama} sudah menjadi Unit Pelapor Indikator ini pada periode yang tumpang tindih (${periode}).`
      : `IMP-Unit hanya boleh punya satu Unit Pelapor pada bulan yang sama; periode ini tumpang tindih dengan Unit ${bentrok.nama} (${periode}).`,
  );
}

/** Bulan berhenti yang sudah diperiksa (null = masih berlangsung). */
function periksaBulanBerhenti(mulai: string, berhenti: string | null | undefined) {
  if (!berhenti) return null;
  wajibBulan(berhenti, "Bulan berhenti tidak valid.");
  if (berhenti < mulai) throw new ServiceError(400, "Bulan berhenti tidak boleh lebih awal dari bulan mulai.");
  return berhenti;
}

/** Menetapkan Unit aktif sebagai Unit Pelapor Indikator mulai bulan tertentu. Mengembalikan id periode baru. */
export async function tambahUnitPelapor(aktor: Pengguna | null, indikatorId: string, isian: IsianUnitPelapor) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const mulai = isian.bulanMulai;
  wajibBulan(mulai, "Pilih bulan mulai.");
  const berhenti = periksaBulanBerhenti(mulai, isian.bulanBerhenti);
  if (!apakahUuid(indikatorId)) throw tidakDitemukan();

  return db.transaction(async (tx) => {
    // Dikunci `for share`: Unit yang sedang dinonaktifkan (menguncinya `for update`) selesai lebih dulu dan terperiksa.
    const [u] = apakahUuid(isian.unitId) ? await tx.select().from(unit).where(eq(unit.id, isian.unitId)).for("share") : [];
    if (!u) throw new ServiceError(400, "Pilih Unit.");
    if (!u.aktif) throw new ServiceError(400, `Unit ${u.nama} nonaktif, jadi tidak bisa menjadi Unit Pelapor.`);
    await tolakTumpangTindih(tx, { indikatorId, unitId: u.id, mulai, berhenti });
    const [{ id }] = await tx
      .insert(unitPelapor)
      .values({ indikatorId, unitId: u.id, bulanMulai: keTanggal(mulai), bulanBerhenti: berhenti && keTanggal(berhenti) })
      .returning({ id: unitPelapor.id });
    return id;
  });
}

/** Periode Unit Pelapor menurut id; id yang bukan uuid dianggap tidak ada. */
async function ambilPeriode(id: string) {
  const [periode] = apakahUuid(id) ? await db.select().from(unitPelapor).where(eq(unitPelapor.id, id)) : [];
  if (!periode) throw new ServiceError(404, "Unit Pelapor tidak ditemukan.");
  return periode;
}

/**
 * Bulan Pengukuran terakhir ("YYYY-MM", status apa pun) Indikator + Unit periode ini di dalam periodenya; null = belum
 * ada. Panggil setelah baris Indikator dikunci, supaya Pengukuran yang sedang disimpan (menguncinya `for share`) ikut.
 */
async function pengukuranTerakhir(tx: Transaksi, periode: typeof unitPelapor.$inferSelect) {
  const [{ bulan }] = await tx
    .select({ bulan: max(pengukuran.bulan) })
    .from(pengukuran)
    .where(
      and(
        eq(pengukuran.indikatorId, periode.indikatorId),
        eq(pengukuran.unitId, periode.unitId),
        gte(pengukuran.bulan, periode.bulanMulai),
        periode.bulanBerhenti ? lte(pengukuran.bulan, periode.bulanBerhenti) : undefined,
      ),
    );
  return bulan && dariTanggal(bulan);
}

/**
 * Mengakhiri (atau mengubah akhir) periode Unit Pelapor: Unit tidak lagi wajib melapor setelah bulan berhenti. Bulan
 * berhenti tidak boleh lebih awal dari Pengukuran terakhir dalam periode itu, supaya Pengukuran tidak tertinggal di
 * luar periode Unit Pelapor-nya. Untuk Unit nonaktif, bulan berhenti harus sebelum bulan berjalan (seperti syarat
 * menonaktifkan Unit), karena isian dan pemantauan mengabaikan Unit nonaktif sehingga Kelengkapan-nya tidak akan lengkap.
 */
export async function akhiriUnitPelapor(aktor: Pengguna | null, id: string, bulanBerhenti: string, sekarang = new Date()) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const periode = await ambilPeriode(id);
  const mulai = dariTanggal(periode.bulanMulai);
  const berhenti = periksaBulanBerhenti(mulai, bulanBerhenti);
  if (!berhenti) throw new ServiceError(400, "Pilih bulan berhenti.");
  await db.transaction(async (tx) => {
    // Dikunci `for share` (sebelum baris Indikator, seperti `tambahUnitPelapor`): Unit yang sedang dinonaktifkan
    // (menguncinya `for update`) selesai lebih dulu dan terperiksa.
    const [u] = await tx
      .select({ nama: unit.nama, aktif: unit.aktif })
      .from(unit)
      .where(eq(unit.id, periode.unitId))
      .for("share");
    const bulanIni = bulanBerjalan(sekarang);
    if (!u.aktif && berhenti >= bulanIni) {
      throw new ServiceError(
        409,
        `Unit ${u.nama} nonaktif, jadi bulan berhenti Unit Pelapor-nya harus sebelum ${labelBulan(bulanIni)}. Aktifkan kembali Unit itu lebih dulu bila masih wajib melapor.`,
      );
    }
    await tolakTumpangTindih(tx, { indikatorId: periode.indikatorId, unitId: periode.unitId, mulai, berhenti, kecualiId: id });
    const terakhir = await pengukuranTerakhir(tx, periode);
    if (terakhir && berhenti < terakhir) {
      throw new ServiceError(
        409,
        `Unit ${u.nama} sudah punya Pengukuran Indikator ini pada ${labelBulan(terakhir)}, jadi bulan berhenti tidak boleh lebih awal dari ${labelBulan(terakhir)}.`,
      );
    }
    await tx.update(unitPelapor).set({ bulanBerhenti: keTanggal(berhenti) }).where(eq(unitPelapor.id, id));
  });
}

/**
 * Menghapus periode Unit Pelapor yang salah dimasukkan. Unit yang berhenti melapor diakhiri, bukan dihapus.
 * Periode yang sudah punya Pengukuran tidak boleh dihapus. Baris Indikator dikunci `for update`, jadi Pengukuran yang
 * sedang disimpan (menguncinya `for share`) selesai lebih dulu dan ikut terperiksa.
 */
export async function hapusUnitPelapor(aktor: Pengguna | null, id: string) {
  wajibPeran(aktor, PENGELOLA, HANYA_PENGELOLA);
  const periode = await ambilPeriode(id);
  await db.transaction(async (tx) => {
    await tx.select({ id: indikator.id }).from(indikator).where(eq(indikator.id, periode.indikatorId)).for("update");
    if (await pengukuranTerakhir(tx, periode)) {
      throw new ServiceError(
        409,
        "Periode Unit Pelapor ini sudah punya Pengukuran, jadi tidak bisa dihapus. Akhiri periodenya bila Unit berhenti melapor.",
      );
    }
    await tx.delete(unitPelapor).where(eq(unitPelapor.id, id));
  });
}

/**
 * Unit Pelapor yang aktif untuk Indikator pada bulan "YYYY-MM", urut nama Unit. Unit yang sudah nonaktif tetap
 * terhitung selama periodenya berlangsung (`unitAktif` = false).
 */
export async function unitPelaporAktif(aktor: Pengguna | null, indikatorId: string, bulan: string) {
  wajibPengguna(aktor);
  wajibBulan(bulan);
  if (!apakahUuid(indikatorId)) throw tidakDitemukan();
  return db
    .select({ unitId: unit.id, nama: unit.nama, unitAktif: unit.aktif })
    .from(unitPelapor)
    .innerJoin(unit, eq(unit.id, unitPelapor.unitId))
    .where(and(eq(unitPelapor.indikatorId, indikatorId), bersinggungan(bulan, bulan)))
    .orderBy(asc(unit.nama));
}
