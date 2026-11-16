import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { dokumenRisiko, pengguna, risiko, unit } from "@/db/schema";
import { bulanBerjalan, labelTanggal, tanggalValid } from "@/lib/bulan";
import { labelUkuran, MAKS_UKURAN_BUKTI, namaBerkas } from "@/lib/bukti";
import { ServiceError } from "@/lib/errors";
import { salahSatuDari, teksOpsional, wajibTeks } from "@/lib/form";
import { PENGHAPUS_DATA, PERAN_BER_UNIT, type Peran } from "@/lib/peran";
import {
  daftarPerlakuan,
  EFEKTIVITAS,
  jenisDokumenRisiko,
  KATEGORI_RISIKO,
  LABEL_TINGKAT_RISIKO,
  MAKS_DOKUMEN_RISIKO,
  nilaiRisiko,
  nilaiRisikoAtauNull,
  tingkatTurun,
  type Efektivitas,
} from "@/lib/risiko";
import { apakahUuid } from "@/lib/uuid";
import { wajibPengguna, wajibPeran, type Pengguna } from "@/modules/auth/service";
import { catatJejak, kutip } from "@/modules/jejak/catat";
import { bolehBacaLingkup, saringLingkup } from "@/modules/perbaikan/service";

/*
 * Modul Register Risiko (glosarium: Manajemen Risiko). Satu Risiko = satu baris register satu Unit untuk satu tahun.
 * Membaca = Lingkup Unit modul Perbaikan (`bolehBacaLingkup`: Komite Mutu, Direktur, Admin Sistem, dan Unit sendiri).
 * Menulis = Komite Mutu, Admin Sistem, serta Petugas Input Data dan Kepala Unit dari Unit itu (seperti Input Risiko v1,
 * yang diisi pengguna ruangan). Penilaian dihitung `nilaiRisiko`, tidak disimpan.
 */

const PENULIS_SEMUA: readonly Peran[] = ["komiteMutu", "adminSistem"];
const MAKS_URAIAN = 2000;
const MAKS_PERLAKUAN = 8000;
/** Penolakan menulis; juga ditampilkan halaman bagi yang tidak boleh menulis. */
export const TOLAK_TULIS_RISIKO =
  "Register Risiko Unit ini hanya diisi Komite Mutu, Admin Sistem, serta Petugas Input Data dan Kepala Unit dari Unit itu.";

/** Menulis Risiko Unit ini. Juga untuk tampilan. */
export const bolehTulisRisiko = (aktor: Pengguna, unitId: string) =>
  PENULIS_SEMUA.includes(aktor.peran) || (PERAN_BER_UNIT.includes(aktor.peran) && aktor.unitIds.includes(unitId));

/** Untuk tampilan (tombol "Tambah Risiko"): aktor bisa menulis setidaknya satu Unit. */
export const bolehTambahRisiko = (aktor: Pengguna) =>
  PENULIS_SEMUA.includes(aktor.peran) || (PERAN_BER_UNIT.includes(aktor.peran) && aktor.unitIds.length > 0);

/** Tahun berjalan menurut zona waktu konfigurasi. */
export const tahunBerjalan = (sekarang = new Date()) => Number(bulanBerjalan(sekarang).slice(0, 4));
/** Tahun Register Risiko paling akhir: tahun berjalan + 1 (menyusun register tahun depan). */
export const tahunMaksRisiko = (sekarang = new Date()) => tahunBerjalan(sekarang) + 1;
/** Tahun Register Risiko yang sah: 2000 sampai `tahunMaksRisiko`. */
export const tahunRisikoValid = (tahun: number, sekarang = new Date()) =>
  Number.isInteger(tahun) && tahun >= 2000 && tahun <= tahunMaksRisiko(sekarang);

/** Isian satu Risiko dari form; angka NaN = kosong. Pemantauan NaN keduanya = belum dipantau. */
export type IsianRisiko = {
  unitId: string;
  tahun: number;
  uraian: string;
  kategori: string;
  probabilitas: number;
  dampak: number;
  perlakuan: string;
  jadwal: string;
  probabilitasPemantauan: number;
  dampakPemantauan: number;
  efektivitas: string;
};

const skala = (n: number, label: string) => {
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new ServiceError(400, `Pilih ${label} 1 sampai 5.`);
  return n;
};

/** Isian yang sudah diperiksa (tanpa Unit dan tahun). */
function periksaIsian(isian: IsianRisiko) {
  const kosong = (n: number) => Number.isNaN(n);
  const dipantau = !kosong(isian.probabilitasPemantauan) || !kosong(isian.dampakPemantauan);
  const efektivitas = isian.efektivitas ? salahSatuDari<Efektivitas>(isian.efektivitas, EFEKTIVITAS, "Pilih Efektivitas.") : null;
  if (efektivitas && !dipantau) throw new ServiceError(400, "Efektivitas dinilai setelah Hasil Pemantauan diisi.");
  const jadwal = isian.jadwal || null;
  if (jadwal !== null && !tanggalValid(jadwal)) throw new ServiceError(400, "Jadwal pelaksanaan harus tanggal yang valid.");
  return {
    uraian: wajibTeks(isian.uraian, "Uraian risiko", MAKS_URAIAN),
    kategori: salahSatuDari(isian.kategori, KATEGORI_RISIKO, "Pilih Kategori Risiko."),
    probabilitas: skala(isian.probabilitas, "Probabilitas"),
    dampak: skala(isian.dampak, "Dampak"),
    perlakuan: daftarPerlakuan(teksOpsional(isian.perlakuan, "Perlakuan", MAKS_PERLAKUAN)).join("\n"),
    jadwal,
    probabilitasPemantauan: dipantau ? skala(isian.probabilitasPemantauan, "Probabilitas Hasil Pemantauan") : null,
    dampakPemantauan: dipantau ? skala(isian.dampakPemantauan, "Dampak Hasil Pemantauan") : null,
    efektivitas,
  };
}

/** "Nilai 13 (Sedang)" untuk Jejak Audit. */
const labelNilai = (p: number, d: number) => {
  const n = nilaiRisiko(p, d);
  return `Nilai ${n.nilai} (${LABEL_TINGKAT_RISIKO[n.tingkat]})`;
};

/**
 * Menambah Risiko (tanpa `id`) untuk Unit aktif pada tahun 2000 sampai tahun berjalan + 1, atau mengubah Risiko `id`
 * (Unit dan tahunnya tetap). Mengembalikan id Risiko.
 */
export async function simpanRisiko(aktor: Pengguna | null, isian: IsianRisiko, id?: string, sekarang = new Date()) {
  wajibPengguna(aktor);
  return db.transaction(async (tx) => {
    let kunci: { unitId: string; tahun: number; namaUnit: string };
    if (id !== undefined) {
      const [lama] = apakahUuid(id)
        ? await tx
            .select({ unitId: risiko.unitId, tahun: risiko.tahun, namaUnit: unit.nama })
            .from(risiko)
            .innerJoin(unit, eq(unit.id, risiko.unitId))
            .where(eq(risiko.id, id))
            .for("update", { of: risiko })
        : [];
      if (!lama) throw new ServiceError(404, "Risiko tidak ditemukan.");
      kunci = lama;
    } else {
      // Hak tulis lebih dulu, supaya yang tidak berhak tidak mendapat keterangan Unit lewat pesan penolakan isian.
      if (!bolehTulisRisiko(aktor, isian.unitId)) throw new ServiceError(403, TOLAK_TULIS_RISIKO);
      const [u] = apakahUuid(isian.unitId) ? await tx.select({ nama: unit.nama, aktif: unit.aktif }).from(unit).where(eq(unit.id, isian.unitId)) : [];
      if (!u) throw new ServiceError(400, "Pilih Unit.");
      if (!u.aktif) throw new ServiceError(400, `Unit ${u.nama} nonaktif.`);
      if (!tahunRisikoValid(isian.tahun, sekarang)) throw new ServiceError(400, `Tahun harus 2000 sampai ${tahunMaksRisiko(sekarang)}.`);
      kunci = { unitId: isian.unitId, tahun: isian.tahun, namaUnit: u.nama };
    }
    if (!bolehTulisRisiko(aktor, kunci.unitId)) throw new ServiceError(403, TOLAK_TULIS_RISIKO);
    const data = periksaIsian(isian);
    const nilai = { ...data, diubahOlehId: aktor.id, diubahPada: new Date() };
    const [baris] = id
      ? await tx.update(risiko).set(nilai).where(eq(risiko.id, id)).returning({ id: risiko.id })
      : await tx
          .insert(risiko)
          .values({ unitId: kunci.unitId, tahun: kunci.tahun, ...nilai })
          .returning({ id: risiko.id });
    const pemantauan = data.probabilitasPemantauan && data.dampakPemantauan ? `, pemantauan ${labelNilai(data.probabilitasPemantauan, data.dampakPemantauan)}` : "";
    await catatJejak(
      tx,
      aktor,
      "risiko",
      baris.id,
      `${id ? "Mengubah" : "Menambah"} Risiko ${kutip(data.uraian)} Unit ${kunci.namaUnit} ${kunci.tahun}: ${labelNilai(data.probabilitas, data.dampak)}${pemantauan}`,
    );
    return baris.id;
  });
}

/** Risiko yang ada dan boleh ditulis aktor, dikunci `for update` sampai transaksi selesai. */
async function risikoUntukDitulis(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], aktor: Pengguna, id: string) {
  const [r] = apakahUuid(id)
    ? await tx
        .select({ unitId: risiko.unitId, tahun: risiko.tahun, uraian: risiko.uraian, namaUnit: unit.nama })
        .from(risiko)
        .innerJoin(unit, eq(unit.id, risiko.unitId))
        .where(eq(risiko.id, id))
        .for("update", { of: risiko })
    : [];
  if (!r) throw new ServiceError(404, "Risiko tidak ditemukan.");
  if (!bolehTulisRisiko(aktor, r.unitId)) throw new ServiceError(403, TOLAK_TULIS_RISIKO);
  return { ...r, label: `Risiko ${kutip(r.uraian)} Unit ${r.namaUnit} ${r.tahun}` };
}

/** Menghapus Risiko yang salah dimasukkan, beserta Dokumen Review-nya. Hanya Admin Sistem. */
export async function hapusRisiko(aktor: Pengguna | null, id: string) {
  wajibPeran(aktor, PENGHAPUS_DATA, "Risiko hanya bisa dihapus Admin Sistem.");
  await db.transaction(async (tx) => {
    const r = await risikoUntukDitulis(tx, aktor, id);
    await tx.delete(risiko).where(eq(risiko.id, id));
    await catatJejak(tx, aktor, "risiko", id, `Menghapus ${r.label}`);
  });
}

/** Risiko beserta Unit dan pengubah terakhirnya, ditambah penilaian turunan. */
const pilihRisiko = () =>
  db
    .select({
      id: risiko.id,
      tahun: risiko.tahun,
      uraian: risiko.uraian,
      kategori: risiko.kategori,
      probabilitas: risiko.probabilitas,
      dampak: risiko.dampak,
      perlakuan: risiko.perlakuan,
      jadwal: risiko.jadwal,
      probabilitasPemantauan: risiko.probabilitasPemantauan,
      dampakPemantauan: risiko.dampakPemantauan,
      efektivitas: risiko.efektivitas,
      diubahOleh: pengguna.nama,
      diubahPada: risiko.diubahPada,
      createdAt: risiko.createdAt,
      unit: { id: unit.id, nama: unit.nama },
    })
    .from(risiko)
    .innerJoin(unit, eq(unit.id, risiko.unitId))
    .innerJoin(pengguna, eq(pengguna.id, risiko.diubahOlehId));

function denganPenilaian<T extends { probabilitas: number; dampak: number; probabilitasPemantauan: number | null; dampakPemantauan: number | null; perlakuan: string }>(r: T) {
  const awal = nilaiRisiko(r.probabilitas, r.dampak);
  const pemantauan = nilaiRisikoAtauNull(r.probabilitasPemantauan, r.dampakPemantauan);
  return { ...r, awal, pemantauan, turun: tingkatTurun(awal, pemantauan), daftarPerlakuan: daftarPerlakuan(r.perlakuan) };
}

/**
 * Register Risiko tahun itu yang boleh dibaca aktor: satu Unit (`unitId`), atau semua Unit yang terbaca bila tanpa
 * `unitId`. Urut nama Unit, lalu Nilai Risiko awal tertinggi. Setiap baris membawa jumlah Dokumen Review-nya.
 */
export async function daftarRisiko(aktor: Pengguna | null, saringan: { tahun: number; unitId?: string }) {
  wajibPengguna(aktor);
  if (saringan.unitId !== undefined) {
    if (!apakahUuid(saringan.unitId)) throw new ServiceError(404, "Unit tidak ditemukan.");
    if (!bolehBacaLingkup(aktor, saringan.unitId)) throw new ServiceError(403, "Anda hanya bisa melihat Register Risiko Unit Anda sendiri.");
  }
  const saring = and(
    eq(risiko.tahun, saringan.tahun),
    saringan.unitId ? eq(risiko.unitId, saringan.unitId) : saringLingkup(aktor, risiko.unitId),
  );
  const [baris, dokumen] = await Promise.all([
    pilihRisiko().where(saring).orderBy(asc(risiko.createdAt)),
    db
      .select({ risikoId: dokumenRisiko.risikoId, jumlah: count() })
      .from(dokumenRisiko)
      .innerJoin(risiko, eq(risiko.id, dokumenRisiko.risikoId))
      .where(saring)
      .groupBy(dokumenRisiko.risikoId),
  ]);
  const jumlahDokumen = new Map(dokumen.map((d) => [d.risikoId, d.jumlah]));
  return baris
    .map((r) => ({ ...denganPenilaian(r), jumlahDokumen: jumlahDokumen.get(r.id) ?? 0 }))
    .sort((a, b) => a.unit.nama.localeCompare(b.unit.nama, "id") || b.awal.nilai - a.awal.nilai);
}

/** Satu Risiko beserta penilaian, Dokumen Review (tanpa isi), dan apakah aktor boleh mengubahnya. */
export async function ambilRisiko(aktor: Pengguna | null, id: string) {
  wajibPengguna(aktor);
  const [r] = apakahUuid(id) ? await pilihRisiko().where(eq(risiko.id, id)) : [];
  if (!r) throw new ServiceError(404, "Risiko tidak ditemukan.");
  if (!bolehBacaLingkup(aktor, r.unit.id)) throw new ServiceError(403, "Anda hanya bisa melihat Register Risiko Unit Anda sendiri.");
  const dokumen = await db
    .select({
      id: dokumenRisiko.id,
      nama: dokumenRisiko.nama,
      jenis: dokumenRisiko.jenis,
      ukuran: dokumenRisiko.ukuran,
      diunggahOleh: pengguna.nama,
      diunggahPada: dokumenRisiko.diunggahPada,
    })
    .from(dokumenRisiko)
    .innerJoin(pengguna, eq(pengguna.id, dokumenRisiko.diunggahOlehId))
    .where(eq(dokumenRisiko.risikoId, id))
    .orderBy(asc(dokumenRisiko.diunggahPada));
  return { ...denganPenilaian(r), jadwalLabel: r.jadwal && labelTanggal(r.jadwal), dokumen, bolehTulis: bolehTulisRisiko(aktor, r.unit.id) };
}

/** Berkas yang diunggah sebagai Dokumen Review: nama asli dan isinya. */
export type BerkasDokumen = { nama: string; isi: Uint8Array };

/** Melampirkan satu Dokumen Review (PDF/DOC/DOCX menurut isinya, maks 10 MB; paling banyak 5 per Risiko). */
export async function tambahDokumenRisiko(aktor: Pengguna | null, risikoId: string, berkas: BerkasDokumen) {
  wajibPengguna(aktor);
  const nama = namaBerkas(berkas.nama);
  const isi = Buffer.from(berkas.isi.buffer, berkas.isi.byteOffset, berkas.isi.byteLength);
  if (isi.length === 0) throw new ServiceError(400, `Berkas ${nama} kosong.`);
  if (isi.length > MAKS_UKURAN_BUKTI) throw new ServiceError(400, `Berkas ${nama} lebih dari ${labelUkuran(MAKS_UKURAN_BUKTI)}.`);
  const jenis = jenisDokumenRisiko(isi);
  if (!jenis) throw new ServiceError(400, `Berkas ${nama} bukan PDF, DOC, atau DOCX.`);
  return db.transaction(async (tx) => {
    const r = await risikoUntukDitulis(tx, aktor, risikoId);
    const [{ jumlah }] = await tx.select({ jumlah: count() }).from(dokumenRisiko).where(eq(dokumenRisiko.risikoId, risikoId));
    if (jumlah >= MAKS_DOKUMEN_RISIKO) throw new ServiceError(400, `Dokumen Review paling banyak ${MAKS_DOKUMEN_RISIKO} berkas per Risiko.`);
    const [{ id }] = await tx
      .insert(dokumenRisiko)
      .values({ risikoId, nama, jenis, ukuran: isi.length, isi, diunggahOlehId: aktor.id })
      .returning({ id: dokumenRisiko.id });
    await catatJejak(tx, aktor, "risiko", risikoId, `Melampirkan Dokumen Review ${nama} ke ${r.label}`);
    return id;
  });
}

/** Menghapus satu Dokumen Review. */
export async function hapusDokumenRisiko(aktor: Pengguna | null, dokumenId: string) {
  wajibPengguna(aktor);
  await db.transaction(async (tx) => {
    const [d] = apakahUuid(dokumenId)
      ? await tx.select({ risikoId: dokumenRisiko.risikoId, nama: dokumenRisiko.nama }).from(dokumenRisiko).where(eq(dokumenRisiko.id, dokumenId))
      : [];
    if (!d) throw new ServiceError(404, "Dokumen Review tidak ditemukan.");
    const r = await risikoUntukDitulis(tx, aktor, d.risikoId);
    await tx.delete(dokumenRisiko).where(eq(dokumenRisiko.id, dokumenId));
    await catatJejak(tx, aktor, "risiko", d.risikoId, `Menghapus Dokumen Review ${d.nama} dari ${r.label}`);
  });
}

/** Nama, jenis, dan isi satu Dokumen Review untuk dibuka; hak baca sama dengan detail Risiko. */
export async function ambilBerkasDokumenRisiko(aktor: Pengguna | null, dokumenId: string) {
  wajibPengguna(aktor);
  const [d] = apakahUuid(dokumenId)
    ? await db
        .select({ nama: dokumenRisiko.nama, jenis: dokumenRisiko.jenis, isi: dokumenRisiko.isi, unitId: risiko.unitId })
        .from(dokumenRisiko)
        .innerJoin(risiko, eq(risiko.id, dokumenRisiko.risikoId))
        .where(eq(dokumenRisiko.id, dokumenId))
    : [];
  if (!d) throw new ServiceError(404, "Dokumen Review tidak ditemukan.");
  if (!bolehBacaLingkup(aktor, d.unitId)) throw new ServiceError(403, "Anda hanya bisa melihat Register Risiko Unit Anda sendiri.");
  return { nama: d.nama, jenis: d.jenis, isi: d.isi };
}
