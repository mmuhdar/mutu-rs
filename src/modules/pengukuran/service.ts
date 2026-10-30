import { and, asc, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { indikator, pengguna, pengukuran, riwayatStatusPengukuran, unit, unitPelapor } from "@/db/schema";
import { bulanBerjalan, bulanValid, keTanggal, labelBulan } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan } from "@/lib/indikator";
import { LABEL_STATUS_PENGUKURAN, type StatusPengukuran } from "@/lib/pengukuran";
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
const MAKS_CATATAN = 1000;
const MAKS_INT = 2_147_483_647;

/** `db` atau transaksi yang sedang berjalan. */
type Kueri = Pick<typeof db, "select">;

/** Pengukuran milik Indikator (id atau kolom) + Unit + bulan "YYYY-MM". */
const pengukuranUntuk = (indikatorId: string | AnyPgColumn, unitId: string, bulan: string) =>
  and(eq(pengukuran.indikatorId, indikatorId), eq(pengukuran.unitId, unitId), eq(pengukuran.bulan, keTanggal(bulan)));

function wajibPengisiUnit(aktor: Pengguna | null, unitId: string): asserts aktor is Pengguna {
  wajibPeran(aktor, PENGISI, HANYA_PENGISI);
  // unitIds berasal dari database, jadi id yang bukan uuid otomatis tidak cocok.
  if (!aktor.unitIds.includes(unitId)) {
    throw new ServiceError(403, "Anda hanya bisa mengisi Pengukuran untuk Unit Anda sendiri.");
  }
}

function periksaBulan(bulan: string, sekarang: Date) {
  if (typeof bulan !== "string" || !bulanValid(bulan)) throw new ServiceError(400, "Pilih bulan.");
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

/** Aturan angka: N dan D bilangan bulat ≥ 0, D = 0 hanya bila N = 0, N ≤ D untuk faktor 100. */
function periksaNilai(isian: IsianPengukuran, faktor: number) {
  const { n, d } = isian;
  if (![n, d].every((x) => Number.isInteger(x) && x >= 0)) {
    throw new ServiceError(400, "N dan D harus bilangan bulat ≥ 0.");
  }
  if (n > MAKS_INT || d > MAKS_INT) throw new ServiceError(400, "N atau D terlalu besar.");
  if (d === 0 && n > 0) throw new ServiceError(400, "D = 0 hanya boleh bila N = 0.");
  if (faktor === 100 && n > d) throw new ServiceError(400, "N tidak boleh lebih dari D pada Indikator persen.");
  const catatan = typeof isian.catatan === "string" ? isian.catatan.trim() : "";
  if (catatan.length > MAKS_CATATAN) throw new ServiceError(400, `Catatan maksimal ${MAKS_CATATAN} karakter.`);
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
 * hanya Juni dan Desember), urut kode, beserta status Pengukurannya (null = belum diisi).
 */
export async function daftarIsian(aktor: Pengguna | null, k: { unitId: string; bulan: string }, sekarang = new Date()) {
  wajibPengisiUnit(aktor, k.unitId);
  periksaBulan(k.bulan, sekarang);
  await ambilUnitAktif(db, k.unitId);
  const baris = await db
    .select({
      indikator: { id: indikator.id, kode: indikator.kode, nama: indikator.nama, frekuensi: indikator.frekuensi },
      status: pengukuran.status,
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

/**
 * Bahan formulir isian: Indikator (definisi N, D, Sumber Data, faktor, satuan), Unit, Pengukuran yang sudah ada
 * (null = belum diisi), dan Riwayat Status-nya. Ditolak dengan aturan yang sama seperti menyimpan.
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
  const riwayat = ada
    ? await db
        .select({
          statusAsal: riwayatStatusPengukuran.statusAsal,
          statusTujuan: riwayatStatusPengukuran.statusTujuan,
          oleh: pengguna.nama,
          waktu: riwayatStatusPengukuran.waktu,
          alasan: riwayatStatusPengukuran.alasan,
        })
        .from(riwayatStatusPengukuran)
        .innerJoin(pengguna, eq(pengguna.id, riwayatStatusPengukuran.olehId))
        .where(eq(riwayatStatusPengukuran.pengukuranId, ada.id))
        .orderBy(asc(riwayatStatusPengukuran.waktu))
    : [];
  return { ...konteks, bulan: k.bulan, pengukuran: ada ?? null, riwayat };
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
    const data = { ...periksaNilai(isian, ind.faktor), pengisiId: oleh, updatedAt: new Date() };
    const catat = (id: string, statusAsal: StatusPengukuran | null, statusTujuan: StatusPengukuran) =>
      tx.insert(riwayatStatusPengukuran).values({ pengukuranId: id, statusAsal, statusTujuan, olehId: oleh });

    // Simpan pertama dua orang sekaligus: insert kedua menunggu yang pertama, lalu mengubah baris yang sama.
    const [baru] = await tx
      .insert(pengukuran)
      .values({ indikatorId: ind.id, unitId: u.id, bulan: keTanggal(isian.bulan), ...data, status: "draf" })
      .onConflictDoNothing()
      .returning({ id: pengukuran.id });
    let id: string;
    if (baru) {
      id = baru.id;
      await catat(id, null, "draf");
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

    const status: StatusPengukuran = ajukan ? "diajukan" : "draf";
    if (ajukan) {
      await tx.update(pengukuran).set({ status }).where(eq(pengukuran.id, id));
      await catat(id, "draf", status);
    }
    return { id, status };
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
