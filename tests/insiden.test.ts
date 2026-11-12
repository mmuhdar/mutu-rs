import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import {
  akibatSesuaiJenis,
  hariInvestigasi,
  kelompokUmur,
  labelUmur,
  perluRca,
  terlambatDilaporkan,
  warnaGrading,
} from "@/lib/insiden";
import type { Pengguna } from "@/modules/auth/service";
import {
  ambilInsiden,
  catatEreport,
  daftarInsiden,
  gradingInsiden,
  laporkanInsiden,
  rekapInsiden,
  ringkasanInsiden,
  selesaikanRca,
  simpanInvestigasi,
  tandaiBukanInsiden,
  tinjauInsiden,
  ubahLaporan,
  type IsianInvestigasi,
  type IsianLaporan,
} from "@/modules/insiden/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, komiteMutu, sebagai, unitBaru } from "./bantuan";

/*
 * Insiden Keselamatan Pasien. Hanya file ini yang membuat Insiden; rekap Triwulan memakai tahun 2013 yang tidak dipakai
 * tes lain. Waktu dikunci lewat `sekarang`: 15 Juni 2026 pukul 10.00 WITA.
 */

const SEKARANG = new Date("2026-06-15T02:00:00Z");
const ditolak = (status: number, pesan?: RegExp) => (e: unknown) =>
  e instanceof ServiceError && e.status === status && (!pesan || pesan.test(e.message));

let unitA: { id: string };
let unitB: { id: string };
let komite: Pengguna;
let kepalaA: Pengguna;
let kepalaB: Pengguna;
let petugasA: Pengguna;
let petugasLain: Pengguna;
let direktur: Pengguna;
let admin: Pengguna;

const isian = (ubahan: Partial<IsianLaporan> = {}): IsianLaporan => ({
  unitId: unitA.id,
  unitPenyebabId: "",
  waktuInsiden: "2026-06-14T08:30",
  judul: "Label obat tertukar sebelum diberikan",
  kronologi: "Perawat menyiapkan obat oral, label tertukar dengan pasien sebelah, diketahui saat identifikasi.",
  jenis: "knc",
  orangPertama: "perawat",
  tempat: "Kamar 3",
  pasienInisial: "Tn AR",
  pasienNoRm: "123456",
  pasienRuangan: "Mawar 3",
  umurTahun: 45,
  umurBulan: Number.NaN,
  jenisKelamin: "L",
  penanggungBiaya: "bpjs",
  kategoriPasien: "rawatInap",
  spesialisasi: "penyakitDalam",
  tanggalMasuk: "2026-06-12T10:00",
  akibat: "tidakAdaCedera",
  tindakanSegera: "Obat ditahan, label diganti, pasien diidentifikasi ulang.",
  tindakanOleh: "perawat",
  pernahTerjadi: false,
  pernahTerjadiKeterangan: "",
  ...ubahan,
});

const investigasi: IsianInvestigasi = {
  tipeInsiden: "medikasi",
  faktorKontributor: ["komunikasi", "petugas", "komunikasi"],
  penyebabLangsung: "Label dicetak untuk dua pasien sekaligus.",
  akarMasalah: "Tidak ada aturan satu pasien satu kali cetak.",
  rekomendasi: "Cetak label per pasien; identifikasi dua penanda sebelum pemberian.",
};

const lapor = (ubahan: Partial<IsianLaporan> = {}, aktor = petugasA, sekarang = SEKARANG) =>
  laporkanInsiden(aktor, isian(ubahan), sekarang).then((r) => r.id);

before(async () => {
  unitA = await unitBaru("Unit Insiden A");
  unitB = await unitBaru("Unit Insiden B");
  komite = await komiteMutu();
  kepalaA = await sebagai("kepalaUnit", [unitA.id]);
  kepalaB = await sebagai("kepalaUnit", [unitB.id]);
  petugasA = await sebagai("petugasInputData", [unitA.id]);
  petugasLain = await sebagai("petugasInputData", [unitA.id]);
  direktur = await sebagai("direktur");
  admin = await adminSistem();
});

describe("aturan murni Insiden", () => {
  it("warna grading dibaca dari sel matriks KKP-RS 2008, bukan dari skor", () => {
    assert.equal(warnaGrading(5, 1), "merah");
    assert.equal(warnaGrading(1, 5), "hijau");
    assert.equal(warnaGrading(3, 1), "hijau");
    assert.equal(warnaGrading(1, 3), "biru");
    assert.equal(warnaGrading(5, 3), "merah");
    assert.equal(warnaGrading(3, 4), "kuning");
  });

  it("kuning, merah, dan Kejadian Sentinel masuk RCA 45 hari; biru 7 dan hijau 14 hari", () => {
    assert.equal(perluRca("knc", "hijau"), false);
    assert.equal(perluRca("ktd", "kuning"), true);
    assert.equal(perluRca("sentinel", "biru"), true);
    assert.deepEqual(
      [hariInvestigasi("knc", "biru"), hariInvestigasi("ktc", "hijau"), hariInvestigasi("ktd", "merah"), hariInvestigasi("sentinel", "biru")],
      [7, 14, 45, 45],
    );
  });

  it("kelompok umur mengikuti Formulir 1 dengan batas atas termasuk", () => {
    assert.deepEqual(
      [0, 1, 2, 12, 13, 60, 61, 780, 781].map(kelompokUmur),
      ["0–1 bulan", "0–1 bulan", ">1 bulan–1 tahun", ">1 bulan–1 tahun", ">1–5 tahun", ">1–5 tahun", ">5–15 tahun", ">30–65 tahun", ">65 tahun"],
    );
    assert.deepEqual([0, 5, 12, 38].map(labelUmur), ["0 bulan", "5 bulan", "1 tahun", "3 tahun 2 bulan"]);
  });

  it("KPC, KNC, dan KTC tanpa cedera; KTD dan Kejadian Sentinel dengan cedera", () => {
    assert.equal(akibatSesuaiJenis("ktc", "tidakAdaCedera"), true);
    assert.equal(akibatSesuaiJenis("ktc", "cederaRingan"), false);
    assert.equal(akibatSesuaiJenis("ktd", "tidakAdaCedera"), false);
    assert.equal(akibatSesuaiJenis("sentinel", "kematian"), true);
  });

  it("terlambat dilaporkan bila lebih dari 2×24 jam", () => {
    const insiden = new Date("2026-06-10T00:00:00Z");
    assert.equal(terlambatDilaporkan(insiden, new Date("2026-06-12T00:00:00Z")), false);
    assert.equal(terlambatDilaporkan(insiden, new Date("2026-06-12T00:01:00Z")), true);
  });
});

describe("melaporkan Insiden", () => {
  it("Petugas Input Data melaporkan Insiden; statusnya Dilaporkan dengan satu Riwayat Status", async () => {
    const id = await lapor();
    const i = await ambilInsiden(petugasA, id, SEKARANG);
    assert.equal(i.status, "dilaporkan");
    assert.equal(i.pasienUmurBulan, 540);
    assert.equal(i.terlambatDilaporkan, false);
    assert.equal(i.warna, null);
    assert.equal(i.pembuat, petugasA.nama);
    assert.deepEqual(
      i.riwayat.map((r) => [r.statusAsal, r.statusTujuan]),
      [[null, "dilaporkan"]],
    );
    assert.equal(i.boleh.ubah, true);
    assert.equal(i.boleh.grading, false);
  });

  it("semua peran bisa melapor, termasuk Admin Sistem", async () => {
    const id = await lapor({}, admin);
    assert.equal((await ambilInsiden(admin, id, SEKARANG)).status, "dilaporkan");
  });

  it("laporan lewat 2×24 jam tetap diterima tetapi ditandai terlambat", async () => {
    const id = await lapor({ waktuInsiden: "2026-06-11T08:00", tanggalMasuk: "2026-06-10T10:00" });
    assert.equal((await ambilInsiden(petugasA, id, SEKARANG)).terlambatDilaporkan, true);
  });

  it("menolak isian yang tidak sah", async () => {
    await assert.rejects(lapor({ waktuInsiden: "2026-06-15T11:00" }), ditolak(400, /masa depan/));
    await assert.rejects(lapor({ waktuInsiden: "2026-02-30T08:00" }), ditolak(400, /valid/));
    await assert.rejects(lapor({ tanggalMasuk: "2026-06-14T09:00" }), ditolak(400, /setelah waktu insiden/));
    await assert.rejects(lapor({ akibat: "cederaRingan" }), ditolak(400, /KTD atau Kejadian Sentinel/));
    await assert.rejects(lapor({ jenis: "ktd" }), ditolak(400, /tidak boleh "Tidak ada cedera"/));
    await assert.rejects(lapor({ pasienInisial: " " }), ditolak(400, /Inisial pasien/));
    await assert.rejects(lapor({ umurTahun: Number.NaN }), ditolak(400, /Umur/));
    await assert.rejects(lapor({ umurBulan: 12 }), ditolak(400, /Umur/));
    await assert.rejects(lapor({ jenis: "lain" }), ditolak(400, /jenis insiden/));
    await assert.rejects(lapor({ pernahTerjadi: null }), ditolak(400, /pernah terjadi/));
    await assert.rejects(lapor({ pernahTerjadi: true }), ditolak(400, /unit kerja lain/));
    await assert.rejects(lapor({ unitId: "bukan-uuid" }), ditolak(400, /Unit tempat insiden/));
  });

  it("KPC boleh tanpa data pasien", async () => {
    const id = await lapor({
      jenis: "kpc",
      pasienInisial: "",
      pasienNoRm: "",
      umurTahun: Number.NaN,
      jenisKelamin: "",
      penanggungBiaya: "",
      kategoriPasien: "",
      spesialisasi: "",
      tanggalMasuk: "",
    });
    const i = await ambilInsiden(petugasA, id, SEKARANG);
    assert.equal(i.pasienInisial, null);
    assert.equal(i.spesialisasi, null);
  });

  it("menolak Unit nonaktif sebagai Unit tempat insiden", async () => {
    const u = await unitBaru("Unit Nonaktif");
    await aturAktifUnit(admin, u.id, false);
    await assert.rejects(lapor({ unitId: u.id }), ditolak(400, /nonaktif/));
  });
});

describe("hak baca dan ubah laporan", () => {
  let id: string;
  before(async () => {
    id = await lapor();
  });

  it("Pembuat Laporan, Kepala Unit dari Unit itu, Komite Mutu, dan Direktur membaca laporan", async () => {
    for (const aktor of [petugasA, kepalaA, komite, direktur]) assert.equal((await ambilInsiden(aktor, id, SEKARANG)).id, id);
  });

  it("Kepala Unit lain, Petugas lain dari Unit yang sama, dan Admin Sistem ditolak", async () => {
    for (const aktor of [kepalaB, petugasLain, admin]) await assert.rejects(ambilInsiden(aktor, id, SEKARANG), ditolak(403));
    assert.equal((await daftarInsiden(kepalaB, {}, SEKARANG)).some((i) => i.id === id), false);
    assert.equal((await daftarInsiden(petugasLain, {}, SEKARANG)).some((i) => i.id === id), false);
    assert.equal((await daftarInsiden(kepalaA, {}, SEKARANG)).some((i) => i.id === id), true);
    assert.equal((await daftarInsiden(direktur, {}, SEKARANG)).some((i) => i.id === id), true);
  });

  it("hanya Pembuat Laporan yang mengubah laporan, dan hanya sebelum digrading", async () => {
    await ubahLaporan(petugasA, id, isian({ judul: "Label obat tertukar (diperbaiki)" }), SEKARANG);
    assert.equal((await ambilInsiden(petugasA, id, SEKARANG)).judul, "Label obat tertukar (diperbaiki)");
    await assert.rejects(ubahLaporan(kepalaA, id, isian(), SEKARANG), ditolak(403));
    await gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 1 });
    await assert.rejects(ubahLaporan(petugasA, id, isian(), SEKARANG), ditolak(409, /sudah digrading/));
  });
});

describe("alur grading dan investigasi", () => {
  it("biru: Kepala Unit menginvestigasi 7 hari, Komite Mutu meninjau lalu Selesai; Pembuat Laporan melihat hasilnya setelah Selesai", async () => {
    const id = await lapor();
    await assert.rejects(gradingInsiden(kepalaB, id, { dampak: 1, probabilitas: 1 }), ditolak(403));
    await assert.rejects(gradingInsiden(petugasA, id, { dampak: 1, probabilitas: 1 }), ditolak(403));
    await assert.rejects(gradingInsiden(kepalaA, id, { dampak: 0, probabilitas: 1 }), ditolak(400, /matriks/));
    assert.deepEqual(await gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 2 }), { status: "investigasi", warna: "biru" });
    await assert.rejects(gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 2 }), ditolak(409));
    let i = await ambilInsiden(kepalaA, id, SEKARANG);
    assert.equal(i.tenggat, "2026-06-22");
    assert.equal(i.boleh.investigasi, true);

    await simpanInvestigasi(kepalaA, id, investigasi, false);
    i = await ambilInsiden(kepalaA, id, SEKARANG);
    assert.equal(i.status, "investigasi");
    assert.deepEqual(i.investigasi?.faktorKontributor, ["petugas", "komunikasi"]);
    assert.equal((await ambilInsiden(petugasA, id, SEKARANG)).investigasi, null);
    await assert.rejects(simpanInvestigasi(kepalaA, id, { ...investigasi, faktorKontributor: [] }, true), ditolak(400, /faktor kontributor/));
    await simpanInvestigasi(kepalaA, id, investigasi, true);
    assert.equal((await ambilInsiden(kepalaA, id, SEKARANG)).status, "ditinjau");

    await assert.rejects(tinjauInsiden(kepalaA, id, { dampak: 1, probabilitas: 2, catatan: "" }, SEKARANG), ditolak(403));
    assert.deepEqual(await tinjauInsiden(komite, id, { dampak: 2, probabilitas: 1, catatan: "Sudah tepat." }, SEKARANG), {
      status: "selesai",
      warna: "biru",
    });
    i = await ambilInsiden(petugasA, id, SEKARANG);
    assert.equal(i.status, "selesai");
    assert.equal(i.investigasi?.akarMasalah, investigasi.akarMasalah);
    assert.deepEqual(
      i.riwayat.map((r) => r.statusTujuan),
      ["dilaporkan", "investigasi", "ditinjau", "selesai"],
    );
    assert.equal(i.riwayat[3].catatan, "Sudah tepat.");
    assert.deepEqual([i.riwayat[1].dampak, i.riwayat[3].dampak], [1, 2]);
  });

  it("hijau: 14 hari; Komite Mutu menggrading ulang kuning sehingga masuk RCA 45 hari sejak tinjauan", async () => {
    const id = await lapor({ jenis: "ktc" });
    assert.equal((await gradingInsiden(komite, id, { dampak: 2, probabilitas: 4 })).warna, "hijau");
    assert.equal((await ambilInsiden(komite, id, SEKARANG)).tenggat, "2026-06-29");
    await simpanInvestigasi(kepalaA, id, investigasi, true);
    const tinjau = new Date("2026-06-20T02:00:00Z");
    assert.deepEqual(await tinjauInsiden(komite, id, { dampak: 3, probabilitas: 3, catatan: "" }, tinjau), { status: "rca", warna: "kuning" });
    const i = await ambilInsiden(komite, id, tinjau);
    assert.equal(i.tenggat, "2026-08-04");
    assert.equal(i.riwayat.at(-1)?.catatan, null);
    assert.equal(i.boleh.investigasi, true);
    assert.equal((await ambilInsiden(kepalaA, id, tinjau)).boleh.investigasi, false);
    await assert.rejects(simpanInvestigasi(kepalaA, id, investigasi, false), ditolak(403, /RCA/));
    await assert.rejects(simpanInvestigasi(komite, id, investigasi, true), ditolak(409, /Selesaikan RCA/));
    await assert.rejects(selesaikanRca(kepalaA, id, { ...investigasi, dampak: 3, probabilitas: 3 }), ditolak(403));
    await selesaikanRca(komite, id, { ...investigasi, rekomendasi: "Rekomendasi RCA.", dampak: 3, probabilitas: 2 });
    const akhir = await ambilInsiden(komite, id, tinjau);
    assert.equal(akhir.status, "selesai");
    assert.equal(akhir.warna, "hijau");
    assert.equal(akhir.investigasi?.rekomendasi, "Rekomendasi RCA.");
  });

  it("Kejadian Sentinel selalu masuk RCA walau gradingnya biru", async () => {
    const id = await lapor({ jenis: "sentinel", akibat: "kematian" });
    assert.deepEqual(await gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 1 }), { status: "rca", warna: "biru" });
    assert.equal((await ambilInsiden(komite, id, SEKARANG)).tenggat, "2026-07-30");
  });

  it("lewat dan mendekati tenggat dihitung pada hari ini; yang lewat tenggat di atas daftar", async () => {
    const id = await lapor();
    await gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 1 });
    const mendekati = (await daftarInsiden(kepalaA, {}, new Date("2026-06-20T02:00:00Z"))).find((i) => i.id === id)!;
    assert.deepEqual([mendekati.lewatTenggat, mendekati.mendekatiTenggat], [false, true]);
    const daftar = await daftarInsiden(kepalaA, {}, new Date("2026-06-23T02:00:00Z"));
    assert.equal(daftar.find((i) => i.id === id)?.lewatTenggat, true);
    assert.equal(daftar[0].lewatTenggat, true);
  });

  it("Komite Mutu menandai Bukan Insiden dengan alasan; statusnya final", async () => {
    const id = await lapor();
    await assert.rejects(tandaiBukanInsiden(kepalaA, id, "Bukan IKP"), ditolak(403));
    await assert.rejects(tandaiBukanInsiden(komite, id, " "), ditolak(400, /Alasan/));
    await tandaiBukanInsiden(komite, id, "Insiden pada pengunjung, dilaporkan ke K3 RS.");
    const i = await ambilInsiden(komite, id, SEKARANG);
    assert.equal(i.status, "bukanInsiden");
    assert.equal(i.riwayat.at(-1)?.catatan, "Insiden pada pengunjung, dilaporkan ke K3 RS.");
    assert.equal(i.boleh.bukanInsiden, false);
    await assert.rejects(tandaiBukanInsiden(komite, id, "lagi"), ditolak(409));
    await assert.rejects(gradingInsiden(komite, id, { dampak: 1, probabilitas: 1 }), ditolak(409));
  });

  it("tanggal e-report dicatat Komite Mutu untuk KTD dan Kejadian Sentinel saja", async () => {
    const sebelum = (await ringkasanInsiden(komite, SEKARANG)).belumEreport!;
    const ktd = await lapor({ jenis: "ktd", akibat: "cederaRingan" });
    assert.equal((await ringkasanInsiden(komite, SEKARANG)).belumEreport, sebelum + 1);
    const knc = await lapor();
    await assert.rejects(catatEreport(komite, knc, "2026-06-15", SEKARANG), ditolak(400, /KTD/));
    await assert.rejects(catatEreport(kepalaA, ktd, "2026-06-15", SEKARANG), ditolak(403));
    await assert.rejects(catatEreport(komite, ktd, "2026-06-16", SEKARANG), ditolak(400, /masa depan/));
    await catatEreport(komite, ktd, "2026-06-15", SEKARANG);
    assert.equal((await ambilInsiden(komite, ktd, SEKARANG)).ereportPada, "2026-06-15");
    assert.equal((await ringkasanInsiden(komite, SEKARANG)).belumEreport, sebelum);
    await catatEreport(komite, ktd, "", SEKARANG);
    assert.equal((await ambilInsiden(komite, ktd, SEKARANG)).ereportPada, null);
  });
});

describe("ringkasan Dashboard", () => {
  it("menghitung yang menunggu tindakan aktor", async () => {
    const [kepala, komiteSebelum] = [await ringkasanInsiden(kepalaA, SEKARANG), await ringkasanInsiden(komite, SEKARANG)];
    const id = await lapor();
    assert.equal((await ringkasanInsiden(kepalaA, SEKARANG)).menunggu, kepala.menunggu + 1);
    assert.equal((await ringkasanInsiden(komite, SEKARANG)).menunggu, komiteSebelum.menunggu + 1);
    assert.equal((await ringkasanInsiden(kepalaB, SEKARANG)).menunggu, 0);
    assert.equal((await ringkasanInsiden(petugasA, SEKARANG)).belumEreport, null);
    // Investigasi Sederhana menunggu Kepala Unit, bukan Komite Mutu.
    await gradingInsiden(kepalaA, id, { dampak: 1, probabilitas: 1 });
    assert.equal((await ringkasanInsiden(kepalaA, SEKARANG)).menunggu, kepala.menunggu + 1);
    assert.equal((await ringkasanInsiden(komite, SEKARANG)).menunggu, komiteSebelum.menunggu);
  });
});

describe("rekap Insiden Triwulan", () => {
  const april = new Date("2013-04-10T02:00:00Z");
  let rca: string;
  before(async () => {
    rca = await lapor({ jenis: "ktd", akibat: "cederaBerat", waktuInsiden: "2013-02-10T09:00", tanggalMasuk: "" }, petugasA, april);
    await gradingInsiden(kepalaA, rca, { dampak: 4, probabilitas: 3 });
    await selesaikanRca(komite, rca, { ...investigasi, dampak: 4, probabilitas: 3 });
    const biru = await lapor({ waktuInsiden: "2013-03-31T23:30", tanggalMasuk: "", unitId: unitB.id }, petugasA, april);
    await gradingInsiden(kepalaB, biru, { dampak: 1, probabilitas: 1 });
    const bukan = await lapor({ waktuInsiden: "2013-01-05T09:00", tanggalMasuk: "" }, petugasA, april);
    await tandaiBukanInsiden(komite, bukan, "Duplikat.");
    // Triwulan II, tidak dihitung.
    await lapor({ waktuInsiden: "2013-04-01T00:10", tanggalMasuk: "" }, petugasA, april);
  });

  it("menurut waktu insiden, tanpa Bukan Insiden, dengan daftar RCA", async () => {
    const r = await rekapInsiden(komite, "2013-1", april);
    assert.equal(r.jumlah, 2);
    const ktd = r.perJenis.find((j) => j.jenis === "ktd")!;
    assert.deepEqual([ktd.jumlah, ktd.perWarna.merah], [1, 1]);
    assert.equal(r.perJenis.find((j) => j.jenis === "knc")!.perWarna.biru, 1);
    assert.deepEqual(
      r.perUnit.map((u) => u.jumlah),
      [1, 1],
    );
    assert.deepEqual(r.perTipe, [{ kunci: "medikasi", jumlah: 1 }]);
    assert.equal(r.belumDiinvestigasi, 1);
    assert.deepEqual(r.penanganan, { selesai: 1, berjalan: 1, lewatTenggat: 0 });
    assert.deepEqual(
      r.rca.map((x) => [x.id, x.akarMasalah, x.warna]),
      [[rca, investigasi.akarMasalah, "merah"]],
    );
    // Tanpa identitas pasien dan Pembuat Laporan.
    assert.equal(JSON.stringify(r).includes("Tn AR"), false);
  });

  it("hanya untuk yang melihat Capaian RS dan hanya Triwulan yang sudah selesai", async () => {
    await assert.rejects(rekapInsiden(kepalaA, "2013-1", april), ditolak(403));
    await assert.rejects(rekapInsiden(komite, "2013-2", april), ditolak(400));
    assert.equal((await rekapInsiden(admin, "2013-1", april)).jumlah, 2);
  });
});
