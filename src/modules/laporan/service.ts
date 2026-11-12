import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pengguna, rekomendasi, umpanBalikDewanPengawas } from "@/db/schema";
import {
  akhirBulan,
  bulanLalu,
  bulanTriwulan,
  geserBulan,
  hariIni,
  keTanggal,
  labelTriwulan,
  tanggalValid,
  triwulanDari,
  triwulanLalu,
  triwulanValid,
  uraiTriwulan,
  wajibBulanBerjalan,
  wajibTriwulanSelesai,
} from "@/lib/bulan";
import { ringkasStatus } from "@/lib/capaian";
import { ServiceError } from "@/lib/errors";
import { wajibTeks } from "@/lib/form";
import { diukurPadaBulan, urutKelompok } from "@/lib/indikator";
import { jadwalSimar, MAKS_REKOMENDASI, tandaSimar, teksRencanaTindakLanjut } from "@/lib/laporan";
import { punyaLingkupRs } from "@/lib/perbaikan";
import type { Peran } from "@/lib/peran";
import { wajibPeran, type Pengguna } from "@/modules/auth/service";
import { capaianTriwulan, PELIHAT_RS, ringkasanCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { catatJejak } from "@/modules/jejak/catat";
import { bacaSemuaInsiden, rekapInsiden } from "@/modules/insiden/service";
import { analisisPada, daftarPdsa } from "@/modules/perbaikan/service";
import { daftarValidasi } from "@/modules/validasi/service";

/*
 * Modul Laporan: Laporan Triwulan (Komite Mutu ke Direktur) dan Rekap SIMAR (isian INM bulanan ke Kemenkes). Angka
 * hanya dari modul Capaian; Analisis, Tindak Lanjut, dan PDSA hanya dari modul Perbaikan. Di sini penyusunannya dan
 * Rekomendasi. Keduanya hanya untuk yang melihat Capaian RS (Komite Mutu, Direktur, Admin Sistem).
 */

const PENULIS: readonly Peran[] = ["komiteMutu", "adminSistem"];
/** Menulis Rekomendasi: Komite Mutu dan Admin Sistem. Juga untuk tampilan. */
export const bolehTulisRekomendasi = (aktor: Pengguna) => PENULIS.includes(aktor.peran);

/** Mencatat Umpan Balik Dewan Pengawas dan tindak lanjutnya: penulis Rekomendasi ditambah Direktur, yang menerima umpan balik itu. */
const PENCATAT_UMPAN_BALIK: readonly Peran[] = [...PENULIS, "direktur"];
export const bolehCatatUmpanBalik = (aktor: Pengguna) => PENCATAT_UMPAN_BALIK.includes(aktor.peran);

/** Triwulan sebelum `triwulan` ("YYYY-T"): "2026-1" → "2025-4". */
const triwulanSebelum = (triwulan: string) => triwulanDari(geserBulan(bulanTriwulan(triwulan)[0], -3));

/** Umpan Balik Dewan Pengawas satu Triwulan beserta pencatat terakhirnya; null = belum dicatat. */
async function umpanBalikPada(triwulan: string) {
  const { tahun, nomor } = uraiTriwulan(triwulan);
  const [ub] = await db
    .select({
      teks: umpanBalikDewanPengawas.teks,
      diterimaPada: umpanBalikDewanPengawas.diterimaPada,
      tindakLanjut: umpanBalikDewanPengawas.tindakLanjut,
      diubahOleh: pengguna.nama,
      diubahPada: umpanBalikDewanPengawas.diubahPada,
    })
    .from(umpanBalikDewanPengawas)
    .innerJoin(pengguna, eq(pengguna.id, umpanBalikDewanPengawas.diubahOlehId))
    .where(and(eq(umpanBalikDewanPengawas.tahun, tahun), eq(umpanBalikDewanPengawas.triwulan, nomor)));
  return ub ? { triwulan, ...ub } : null;
}

/**
 * Laporan Triwulan ("YYYY-T"; tanpa = Triwulan lalu), hanya Triwulan yang sudah selesai dan hanya untuk yang melihat
 * Capaian RS. Selalu dari data terkini:
 * - `capaian`: Capaian Triwulan per Indikator (`capaianTriwulan`), urut kelompok lalu kode, dan `ringkasan`-nya;
 * - `analisis`: satu baris per Indikator + bulan yang dinilai + Lingkup yang diharapkan (INM/IMP-RS: Lingkup RS bila
 *   ada Unit Pelapor bulan itu; IMP-Unit: setiap Unit Pelapor-nya bulan itu), dengan Analisis beserta Tindak
 *   Lanjut-nya, atau null = Belum dianalisis;
 * - `pdsa`: PDSA semua Lingkup yang periode uji cobanya bersinggungan dengan Triwulan itu;
 * - `validasi`: Validasi Data yang dilakukan pada Triwulan itu, ditambah yang lebih lama tetapi masih belum valid (PMKP 1:
 *   laporan memuat validasi);
 * - `insiden`: rekap Insiden Keselamatan Pasien Triwulan itu tanpa identitas (`rekapInsiden`, modul Insiden); null
 *   untuk Admin Sistem;
 * - `rekomendasi` (null = belum ditulis) dan `bolehTulis` (Rekomendasi);
 * - `umpanBalik`: Umpan Balik Dewan Pengawas atas laporan ini, dan `umpanBalikSebelumnya`: atas laporan Triwulan
 *   sebelumnya beserta tindak lanjutnya, yang dievaluasi pada pertemuan laporan ini (TKRS 1); `bolehCatatUmpanBalik`.
 */
export async function laporanTriwulan(aktor: Pengguna | null, triwulan?: string, sekarang = new Date()) {
  wajibPeran(aktor, PELIHAT_RS, "Laporan Triwulan hanya untuk Komite Mutu, Direktur, dan Admin Sistem.");
  triwulan ||= triwulanLalu(sekarang);
  // Triwulan diperiksa modul Capaian. Urutan laporan: per kelompok, lalu kode.
  const capaian = (await capaianTriwulan(aktor, triwulan, sekarang)).sort((a, b) => urutKelompok(a.indikator, b.indikator));
  const bulan = bulanTriwulan(triwulan);
  const { tahun, nomor } = uraiTriwulan(triwulan);
  const [ada, pdsa, insiden, [rek], umpanBalik, umpanBalikSebelumnya, validasi] = await Promise.all([
    analisisPada(
      aktor,
      capaian.map((c) => c.indikator.id),
      bulan,
      sekarang,
    ),
    daftarPdsa(aktor, { semua: true, periode: { mulai: bulan[0], akhir: bulan[2] } }),
    // Admin Sistem tidak membaca Insiden, jadi Laporan Triwulan-nya tanpa bagian ini.
    bacaSemuaInsiden(aktor) ? rekapInsiden(aktor, triwulan, sekarang) : null,
    db
      .select({ teks: rekomendasi.teks, diubahOleh: pengguna.nama, diubahPada: rekomendasi.diubahPada })
      .from(rekomendasi)
      .innerJoin(pengguna, eq(pengguna.id, rekomendasi.diubahOlehId))
      .where(and(eq(rekomendasi.tahun, tahun), eq(rekomendasi.triwulan, nomor))),
    umpanBalikPada(triwulan),
    umpanBalikPada(triwulanSebelum(triwulan)),
    daftarValidasi(aktor),
  ]);

  const analisis = capaian.flatMap((c) =>
    c.bulan.flatMap((m) =>
      (punyaLingkupRs(c.indikator.kelompok) ? (m.kelengkapan.wajib > 0 ? [null] : []) : m.unit).map((u) => ({
        indikator: c.indikator,
        unit: u,
        bulan: m.bulan,
        analisis: ada.find((a) => a.indikatorId === c.indikator.id && a.bulan === m.bulan && a.unitId === (u?.id ?? null)) ?? null,
      })),
    ),
  );
  return {
    triwulan,
    bulan,
    ringkasan: ringkasStatus(capaian.map((c) => c.triwulan)),
    capaian,
    analisis,
    pdsa,
    // Validasi yang dilakukan pada Triwulan ini, ditambah yang dilakukan sebelumnya dan masih belum valid.
    validasi: validasi.filter((v) => v.tanggal <= akhirBulan(bulan[2]) && (v.tanggal >= keTanggal(bulan[0]) || v.belumValid)),
    insiden,
    rekomendasi: rek ?? null,
    bolehTulis: bolehTulisRekomendasi(aktor),
    umpanBalik,
    umpanBalikSebelumnya,
    bolehCatatUmpanBalik: bolehCatatUmpanBalik(aktor),
  };
}

export type LaporanTriwulan = Awaited<ReturnType<typeof laporanTriwulan>>;

/**
 * Menulis Rekomendasi satu Triwulan yang sudah selesai; menulis ulang mengubah yang sama. Komite Mutu dan Admin
 * Sistem; teks wajib, paling banyak `MAKS_REKOMENDASI` karakter.
 */
export async function simpanRekomendasi(aktor: Pengguna | null, isian: { triwulan: string; teks: string }, sekarang = new Date()) {
  wajibPeran(aktor, PENULIS, "Rekomendasi hanya ditulis Komite Mutu dan Admin Sistem.");
  wajibTriwulanSelesai(isian.triwulan, sekarang);
  const teks = typeof isian.teks === "string" ? isian.teks.trim() : "";
  if (!teks) throw new ServiceError(400, "Rekomendasi wajib diisi.");
  if (teks.length > MAKS_REKOMENDASI) throw new ServiceError(400, `Rekomendasi maksimal ${MAKS_REKOMENDASI} karakter.`);
  const data = { teks, diubahOlehId: aktor.id, diubahPada: new Date() };
  const { tahun, nomor } = uraiTriwulan(isian.triwulan);
  await db.transaction(async (tx) => {
    await tx
      .insert(rekomendasi)
      .values({ tahun, triwulan: nomor, ...data })
      .onConflictDoUpdate({ target: [rekomendasi.tahun, rekomendasi.triwulan], set: data });
    await catatJejak(tx, aktor, "laporan", null, `Menulis Rekomendasi ${labelTriwulan(isian.triwulan)}`);
  });
}

/**
 * Mencatat Umpan Balik Dewan Pengawas atas Laporan Triwulan yang sudah selesai (TKRS 1); mencatat ulang mengubah yang
 * sama. Teks wajib; tanggal diterima ("YYYY-MM-DD") tidak sebelum Triwulan itu berakhir dan tidak di masa depan.
 */
export async function simpanUmpanBalik(
  aktor: Pengguna | null,
  isian: { triwulan: string; teks: string; diterimaPada: string },
  sekarang = new Date(),
) {
  wajibPeran(aktor, PENCATAT_UMPAN_BALIK, "Umpan Balik Dewan Pengawas hanya dicatat Komite Mutu, Direktur, dan Admin Sistem.");
  wajibTriwulanSelesai(isian.triwulan, sekarang);
  const teks = wajibTeks(isian.teks, "Umpan balik", MAKS_REKOMENDASI);
  const tanggal = isian.diterimaPada;
  if (typeof tanggal !== "string" || !tanggalValid(tanggal)) throw new ServiceError(400, "Tanggal diterima harus tanggal yang valid.");
  if (tanggal < `${geserBulan(bulanTriwulan(isian.triwulan)[2], 1)}-01`) {
    throw new ServiceError(400, "Tanggal diterima tidak boleh sebelum Triwulan itu berakhir.");
  }
  if (tanggal > hariIni(sekarang)) throw new ServiceError(400, "Tanggal diterima tidak boleh di masa depan.");
  const data = { teks, diterimaPada: tanggal, diubahOlehId: aktor.id, diubahPada: new Date() };
  const { tahun, nomor } = uraiTriwulan(isian.triwulan);
  await db.transaction(async (tx) => {
    await tx
      .insert(umpanBalikDewanPengawas)
      .values({ tahun, triwulan: nomor, ...data })
      .onConflictDoUpdate({ target: [umpanBalikDewanPengawas.tahun, umpanBalikDewanPengawas.triwulan], set: data });
    await catatJejak(tx, aktor, "laporan", null, `Mencatat Umpan Balik Dewan Pengawas ${labelTriwulan(isian.triwulan)}`);
  });
}

/** Tindak lanjut Umpan Balik Dewan Pengawas satu Triwulan, untuk dievaluasi pada pertemuan berikutnya; umpan baliknya harus sudah dicatat. */
export async function simpanTindakLanjutUmpanBalik(aktor: Pengguna | null, isian: { triwulan: string; tindakLanjut: string }) {
  wajibPeran(aktor, PENCATAT_UMPAN_BALIK, "Tindak lanjut umpan balik hanya dicatat Komite Mutu, Direktur, dan Admin Sistem.");
  if (typeof isian.triwulan !== "string" || !triwulanValid(isian.triwulan)) throw new ServiceError(400, "Triwulan tidak valid.");
  const tindakLanjut = wajibTeks(isian.tindakLanjut, "Tindak lanjut", MAKS_REKOMENDASI);
  const { tahun, nomor } = uraiTriwulan(isian.triwulan);
  await db.transaction(async (tx) => {
    const diubah = await tx
      .update(umpanBalikDewanPengawas)
      .set({ tindakLanjut, diubahOlehId: aktor.id, diubahPada: new Date() })
      .where(and(eq(umpanBalikDewanPengawas.tahun, tahun), eq(umpanBalikDewanPengawas.triwulan, nomor)))
      .returning({ id: umpanBalikDewanPengawas.id });
    if (diubah.length === 0) throw new ServiceError(404, "Catat Umpan Balik Dewan Pengawas Triwulan itu dulu.");
    await catatJejak(tx, aktor, "laporan", null, `Mencatat tindak lanjut Umpan Balik Dewan Pengawas ${labelTriwulan(isian.triwulan)}`);
  });
}

/**
 * Rekap SIMAR satu bulan "YYYY-MM" (tanpa = bulan lalu; bulan setelah bulan berjalan ditolak): satu baris per INM aktif
 * yang diukur bulan itu, urut kode, termasuk INM tanpa Unit Pelapor. N, D, dan Capaian = Capaian RS bulan itu (hanya
 * Pengukuran Terverifikasi); `analisa` = teks Analisis Lingkup RS (null = belum); `rencana` = Tindak Lanjut-nya
 * (`teksRencanaTindakLanjut`); `tanda` = `tandaSimar` (kosong = siap). `tenggat` = tanggal 10 bulan berikutnya.
 */
export async function rekapSimar(aktor: Pengguna | null, bulan?: string, sekarang = new Date()) {
  wajibPeran(aktor, PELIHAT_RS, "Rekap SIMAR hanya untuk Komite Mutu, Direktur, dan Admin Sistem.");
  bulan ||= bulanLalu(sekarang);
  wajibBulanBerjalan(bulan, sekarang);
  const inm = (await daftarIndikator(aktor)).filter((i) => i.kelompok === "INM" && i.aktif && diukurPadaBulan(i.frekuensi, bulan));
  const [ringkasan, analisis] = await Promise.all([
    ringkasanCapaian(aktor, bulan, sekarang),
    analisisPada(
      aktor,
      inm.map((i) => i.id),
      [bulan],
      sekarang,
    ),
  ]);
  const baris = inm.map((i) => {
    const c = ringkasan.baris.find((r) => r.indikator.id === i.id);
    const a = analisis.find((x) => x.indikatorId === i.id && x.unitId === null);
    const isi = {
      n: c?.n ?? 0,
      d: c?.d ?? 0,
      capaian: c?.capaian ?? null,
      kelengkapan: c?.kelengkapan ?? { terverifikasi: 0, wajib: 0 },
      analisa: a?.teks ?? null,
      rencana: a ? teksRencanaTindakLanjut(a.tindakLanjut) : "",
    };
    return {
      indikator: { id: i.id, kode: i.kode, nama: i.nama, satuan: i.satuan },
      ...isi,
      tanda: tandaSimar({ kode: i.kode, ...isi }),
    };
  });
  return {
    bulan,
    ...jadwalSimar(bulan, sekarang),
    baris,
    jumlahSiap: baris.filter((b) => b.tanda.length === 0).length,
  };
}
