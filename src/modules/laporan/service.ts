import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pengguna, rekomendasi } from "@/db/schema";
import { bulanLalu, bulanTriwulan, triwulanLalu, uraiTriwulan, wajibBulanBerjalan, wajibTriwulanSelesai } from "@/lib/bulan";
import { ringkasStatus } from "@/lib/capaian";
import { ServiceError } from "@/lib/errors";
import { diukurPadaBulan, KELOMPOK } from "@/lib/indikator";
import { jadwalSimar, MAKS_REKOMENDASI, tandaSimar, teksRencanaTindakLanjut } from "@/lib/laporan";
import { punyaLingkupRs } from "@/lib/perbaikan";
import type { Peran } from "@/lib/peran";
import { wajibPeran, type Pengguna } from "@/modules/auth/service";
import { capaianTriwulan, PELIHAT_RS, ringkasanCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { analisisPada, daftarPdsa } from "@/modules/perbaikan/service";

/*
 * Modul Laporan: Laporan Triwulan (Komite Mutu ke Direktur) dan Rekap SIMAR (isian INM bulanan ke Kemenkes). Angka
 * hanya dari modul Capaian; Analisis, Tindak Lanjut, dan PDSA hanya dari modul Perbaikan. Di sini penyusunannya dan
 * Rekomendasi. Keduanya hanya untuk yang melihat Capaian RS (Komite Mutu, Direktur, Admin Sistem).
 */

const PENULIS: readonly Peran[] = ["komiteMutu", "adminSistem"];
/** Menulis Rekomendasi: Komite Mutu dan Admin Sistem. Juga untuk tampilan. */
export const bolehTulisRekomendasi = (aktor: Pengguna) => PENULIS.includes(aktor.peran);

/**
 * Laporan Triwulan ("YYYY-T"; tanpa = Triwulan lalu), hanya Triwulan yang sudah selesai dan hanya untuk yang melihat
 * Capaian RS. Selalu dari data terkini:
 * - `capaian`: Capaian Triwulan per Indikator (`capaianTriwulan`), urut kelompok lalu kode, dan `ringkasan`-nya;
 * - `analisis`: satu baris per Indikator + bulan yang dinilai + Lingkup yang diharapkan (INM/IMP-RS: Lingkup RS bila
 *   ada Unit Pelapor bulan itu; IMP-Unit: setiap Unit Pelapor-nya bulan itu), dengan Analisis beserta Tindak
 *   Lanjut-nya, atau null = Belum dianalisis;
 * - `pdsa`: PDSA semua Lingkup yang periode uji cobanya bersinggungan dengan Triwulan itu;
 * - `rekomendasi` (null = belum ditulis) dan `bolehTulis` (Rekomendasi).
 */
export async function laporanTriwulan(aktor: Pengguna | null, triwulan?: string, sekarang = new Date()) {
  wajibPeran(aktor, PELIHAT_RS, "Laporan Triwulan hanya untuk Komite Mutu, Direktur, dan Admin Sistem.");
  triwulan ||= triwulanLalu(sekarang);
  // Triwulan diperiksa modul Capaian. Urutan laporan: per kelompok (INM, IMP-RS, IMP-Unit), lalu kode.
  const capaian = (await capaianTriwulan(aktor, triwulan, sekarang)).sort(
    (a, b) => KELOMPOK.indexOf(a.indikator.kelompok) - KELOMPOK.indexOf(b.indikator.kelompok) || a.indikator.kode.localeCompare(b.indikator.kode),
  );
  const bulan = bulanTriwulan(triwulan);
  const { tahun, nomor } = uraiTriwulan(triwulan);
  const [ada, pdsa, [rek]] = await Promise.all([
    analisisPada(
      aktor,
      capaian.map((c) => c.indikator.id),
      bulan,
      sekarang,
    ),
    daftarPdsa(aktor, { semua: true, periode: { mulai: bulan[0], akhir: bulan[2] } }),
    db
      .select({ teks: rekomendasi.teks, diubahOleh: pengguna.nama, diubahPada: rekomendasi.diubahPada })
      .from(rekomendasi)
      .innerJoin(pengguna, eq(pengguna.id, rekomendasi.diubahOlehId))
      .where(and(eq(rekomendasi.tahun, tahun), eq(rekomendasi.triwulan, nomor))),
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
    rekomendasi: rek ?? null,
    bolehTulis: bolehTulisRekomendasi(aktor),
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
  await db
    .insert(rekomendasi)
    .values({ tahun, triwulan: nomor, ...data })
    .onConflictDoUpdate({ target: [rekomendasi.tahun, rekomendasi.triwulan], set: data });
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
