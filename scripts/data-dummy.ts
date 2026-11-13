// Data dummy untuk database dev, semuanya lewat service: Unit, Pengguna per peran, IMP, Unit Pelapor, Pengukuran
// 12 bulan sampai bulan lalu (berbagai status), Analisis, Tindak Lanjut, PDSA, Rekomendasi, dan Insiden. Jalankan sekali:
//   npx tsx --env-file=.env scripts/data-dummy.ts
// Semua Pengguna dummy bersandi SANDI. Tanpa top-level await: tsx menjalankan .ts sebagai CJS.
import {
  bulanBerjalan,
  bulanLalu,
  bulanTriwulan,
  dariWaktuSetempat,
  geserBulan,
  hariIni,
  tambahHari,
  triwulanDari,
  triwulanLalu,
} from "@/lib/bulan";
import { config } from "@/lib/config";
import { diukurPadaBulan } from "@/lib/indikator";
import { getPool } from "@/db";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import { daftarIndikator, tambahIndikator, tambahUnitPelapor, type IndikatorBaru } from "@/modules/indikator/service";
import {
  catatEreport,
  daftarInsiden,
  gradingInsiden,
  laporkanInsiden,
  selesaikanRca,
  simpanInvestigasi,
  tandaiBukanInsiden,
  tinjauInsiden,
  type IsianInvestigasi,
  type IsianLaporan,
} from "@/modules/insiden/service";
import { simpanRekomendasi, simpanTindakLanjutUmpanBalik, simpanUmpanBalik } from "@/modules/laporan/service";
import { daftarPengguna, tambahPengguna } from "@/modules/pengguna/service";
import { ajukanPengukuran, kembalikanPengukuran, simpanPengukuran, verifikasiPengukuran } from "@/modules/pengukuran/service";
import { buatPdsa, daftarPdsa, simpanAnalisis, simpanEfisiensiPdsa, simpanTahapPdsa, tambahTindakLanjut, ubahTindakLanjut } from "@/modules/perbaikan/service";
import { simpanRisiko, tahunBerjalan, type IsianRisiko } from "@/modules/risiko/service";
import { daftarValidasi, simpanValidasi, type IsianValidasi } from "@/modules/validasi/service";
import { daftarUnit, tambahUnit } from "@/modules/unit/service";

const SANDI = "mutu12345";

const UNIT = {
  icu: "ICU",
  igd: "IGD",
  mawar: "Rawat Inap Mawar",
  melati: "Rawat Inap Melati",
  ok: "Kamar Operasi",
  rajal: "Rawat Jalan",
  lab: "Laboratorium",
  farmasi: "Farmasi",
  humas: "Humas",
} as const;
type KodeUnit = keyof typeof UNIT;

/** Nama [Kepala Unit, Petugas Input Data] per Unit. */
const ORANG: Record<KodeUnit, [string, string]> = {
  icu: ["Ns. Yohanes Batara", "Ns. Fitri Handayani"],
  igd: ["dr. Andi Saputra", "Ns. Rini Pratiwi"],
  mawar: ["Ns. Maria Tandi", "Ns. Ayu Lestari"],
  melati: ["Ns. Siti Rahma", "Ns. Bayu Firmansyah"],
  ok: ["Ns. Agus Salim", "Ns. Nurul Hidayah"],
  rajal: ["Ns. Lina Marlina", "Rudi Hartono, A.Md.Kep"],
  lab: ["Wahyu Nugroho, S.Tr.AK", "Dian Puspita, A.Md.AK"],
  farmasi: ["apt. Ratna Sari", "Eko Prasetyo, A.Md.Farm"],
  humas: ["Hendra Gunawan, S.Sos", "Putri Amelia"],
};

/** Pola nilai: D per bulan [min, maks], sebaran acak, dan Capaian tiap Unit Pelapor dari bulan pertama ke terakhir. */
type Pola = { d: [number, number]; sebar?: number; unit: Partial<Record<KodeUnit, [number, number]>> };

const POLA_INM: Record<string, Pola> = {
  "INM-01": { d: [180, 240], unit: { icu: [86, 92], igd: [70, 84], mawar: [84, 90], melati: [83, 89], ok: [72, 86] } },
  "INM-02": { d: [40, 70], unit: { icu: [97, 100], igd: [92, 98], ok: [96, 100] } },
  "INM-03": { d: [150, 250], unit: { icu: [98, 100], igd: [94, 99], mawar: [96, 100], melati: [95, 99], rajal: [93, 98] } },
  "INM-04": { d: [6, 14], sebar: 4, unit: { ok: [70, 86] } },
  "INM-05": { d: [1500, 2200], unit: { rajal: [72, 83] } },
  "INM-06": { d: [80, 120], sebar: 1.5, unit: { ok: [9, 4] } },
  "INM-07": { d: [300, 420], unit: { mawar: [80, 88], melati: [70, 79] } },
  "INM-08": { d: [20, 45], unit: { lab: [96, 100] } },
  "INM-09": { d: [2500, 3500], unit: { farmasi: [82, 90] } },
  "INM-10": { d: [30, 60], unit: { mawar: [75, 86], melati: [80, 88] } },
  "INM-11": { d: [120, 200], unit: { icu: [98, 100], mawar: [94, 99], melati: [96, 100] } },
  "INM-12": { d: [15, 35], sebar: 5, unit: { humas: [70, 90] } },
  "INM-13": { d: [100, 100], sebar: 1.5, unit: { rajal: [77, 81], mawar: [74, 79] } },
};

const akhir = bulanLalu();
const BULAN = Array.from({ length: 12 }, (_, i) => geserBulan(akhir, i - 11));
const b = (geser: number) => geserBulan(akhir, geser);
const berjalan = bulanBerjalan();

const persen = { faktor: 100, satuan: "%", arah: "makinTinggi", frekuensi: "bulanan" } as const;
const IMP: (IndikatorBaru & { pola: Pola })[] = [
  {
    kode: "IMP-RS-01",
    kelompok: "IMP-RS",
    nama: "Kelengkapan Pengisian Rekam Medis 24 Jam Setelah Pasien Pulang",
    definisiOperasional: "Rekam medis pasien rawat inap terisi lengkap oleh DPJP dan PPA paling lambat 24 jam setelah pasien pulang.",
    definisiNumerator: "Jumlah rekam medis pasien pulang yang lengkap dalam 24 jam",
    definisiDenominator: "Jumlah rekam medis pasien pulang pada bulan itu",
    sumberData: "Audit rekam medis",
    ...persen,
    pic: "Kepala Instalasi Rekam Medis",
    target: { nilai: 85, berlakuMulai: BULAN[0] },
    pola: { d: [150, 300], unit: { mawar: [78, 90], melati: [72, 86], icu: [85, 92] } },
  },
  {
    kode: "IMP-UNIT-IGD-01",
    kelompok: "IMP-Unit",
    nama: "Waktu Tanggap Pelayanan Dokter di IGD ≤ 5 Menit",
    definisiOperasional: "Pasien IGD dilayani dokter paling lambat 5 menit sejak tiba di IGD.",
    definisiNumerator: "Jumlah pasien IGD yang dilayani dokter ≤ 5 menit",
    definisiDenominator: "Jumlah pasien IGD pada bulan itu",
    sumberData: "Register IGD",
    ...persen,
    pic: "Kepala IGD",
    target: { nilai: 95, berlakuMulai: BULAN[0] },
    pola: { d: [1200, 1600], unit: { igd: [88, 96] } },
  },
  {
    kode: "IMP-UNIT-MAWAR-01",
    kelompok: "IMP-Unit",
    nama: "Angka Kejadian Phlebitis",
    definisiOperasional: "Peradangan vena akibat pemasangan kateter intravena perifer, per 1.000 hari pemasangan.",
    definisiNumerator: "Jumlah kejadian phlebitis",
    definisiDenominator: "Jumlah hari pemasangan kateter intravena perifer",
    sumberData: "Surveilans PPI",
    faktor: 1000,
    satuan: "‰",
    arah: "makinRendah",
    frekuensi: "bulanan",
    pic: "Kepala Ruang Mawar",
    target: { nilai: 1.5, berlakuMulai: BULAN[0] },
    pola: { d: [600, 900], sebar: 0.6, unit: { mawar: [3.2, 1.4] } },
  },
  {
    kode: "IMP-UNIT-LAB-01",
    kelompok: "IMP-Unit",
    nama: "Waktu Tunggu Hasil Laboratorium Rutin ≤ 140 Menit",
    definisiOperasional: "Hasil pemeriksaan laboratorium rutin diterima peminta paling lambat 140 menit sejak sampel diterima.",
    definisiNumerator: "Jumlah pemeriksaan rutin dengan hasil ≤ 140 menit",
    definisiDenominator: "Jumlah pemeriksaan laboratorium rutin",
    sumberData: "LIS laboratorium",
    ...persen,
    pic: "Kepala Instalasi Laboratorium",
    target: { nilai: 90, berlakuMulai: BULAN[0] },
    pola: { d: [2000, 3000], unit: { lab: [85, 93] } },
  },
];

/** Status dummy per Pengukuran: sebagian besar Terverifikasi, bulan lalu dibuat campur untuk antrean dan pemantauan. */
type StatusDummy = "terverifikasi" | "diajukan" | "draf" | "dikembalikan" | "kosong";
function statusDummy(kode: string, u: KodeUnit, bulan: string): StatusDummy {
  if (bulan === akhir) {
    if (u === "farmasi") return "kosong";
    if (u === "rajal") return "draf";
    if (u === "melati") return "diajukan";
    if (u === "igd" && kode === "INM-01") return "dikembalikan";
  }
  if (bulan === b(-1) && kode === "INM-06") return "diajukan";
  return "terverifikasi";
}

const acak = (min: number, maks: number) => min + Math.random() * (maks - min);

/** N dan D satu bulan: Capaian bergerak lurus dari `dari` ke `ke` sepanjang 12 bulan, ditambah sebaran acak. */
function angka(pola: Pola, [dari, ke]: [number, number], i: number, faktor: number) {
  const d = Math.round(acak(...pola.d));
  const sebar = pola.sebar ?? 2.5;
  let capaian = dari + ((ke - dari) * i) / 11 + acak(-sebar, sebar);
  if (faktor === 100) capaian = Math.min(100, capaian);
  const n = Math.max(0, Math.round((Math.max(0, capaian) * d) / faktor));
  return { n: faktor === 100 ? Math.min(n, d) : n, d };
}

async function sesi(username: string, sandi: string) {
  const p = await penggunaDariToken(await masuk({ username, sandi, ip: "127.0.0.1" }));
  if (!p) throw new Error(`Sesi ${username} tidak termuat.`);
  return p;
}

/** Isian laporan Insiden contoh: KNC tanpa cedera di Unit `unitId`; `ubahan` menimpa field. */
const laporan = (unitId: string, ubahan: Partial<IsianLaporan>): IsianLaporan => ({
  unitId,
  unitPenyebabId: "",
  waktuInsiden: "",
  judul: "",
  kronologi: "",
  jenis: "knc",
  orangPertama: "perawat",
  tempat: "",
  pasienInisial: "Tn AR",
  pasienNoRm: "204517",
  pasienRuangan: "",
  umurTahun: 58,
  umurBulan: Number.NaN,
  jenisKelamin: "L",
  penanggungBiaya: "bpjs",
  kategoriPasien: "rawatInap",
  spesialisasi: "penyakitDalam",
  tanggalMasuk: "",
  akibat: "tidakAdaCedera",
  tindakanSegera: "",
  tindakanOleh: "perawat",
  pernahTerjadi: false,
  pernahTerjadiKeterangan: "",
  ...ubahan,
});

/**
 * Insiden contoh di semua status: menunggu grading (termasuk KPC yang terlambat dilaporkan), Investigasi Sederhana,
 * Ditinjau, RCA, Selesai, Bukan Insiden, serta dua Insiden Triwulan lalu (Selesai, salah satunya KTD dengan e-report)
 * untuk Laporan Triwulan. Waktu laporan dibuat (`sekarang`) dibuat dekat dengan waktu insidennya.
 */
async function insidenContoh(unitId: Record<KodeUnit, string>) {
  const komite = await sesi("komite", SANDI);
  const kepala = (k: KodeUnit) => sesi(`kepala.${k}`, SANDI);
  const petugas = (k: KodeUnit) => sesi(`petugas.${k}`, SANDI);
  const hari = hariIni();
  /** Waktu setempat "YYYY-MM-DDTHH:mm". */
  const pada = (tanggal: string, jam: string) => `${tanggal}T${jam}`;
  /** Melapor `jamKemudian` jam setelah waktu insiden. */
  const lapor = async (aktor: Pengguna, isian: IsianLaporan, jamKemudian = 3) =>
    (await laporkanInsiden(aktor, isian, new Date(dariWaktuSetempat(isian.waktuInsiden)!.getTime() + jamKemudian * 3_600_000))).id;
  const investigasi = (ubahan: Partial<IsianInvestigasi>): IsianInvestigasi => ({
    tipeInsiden: "medikasi",
    faktorKontributor: ["komunikasi", "petugas"],
    penyebabLangsung: "",
    akarMasalah: "",
    rekomendasi: "",
    ...ubahan,
  });

  await lapor(
    await petugas("mawar"),
    laporan(unitId.mawar, {
      waktuInsiden: pada(tambahHari(hari, -1), "07:45"),
      judul: "Obat oral hampir diberikan ke pasien sebelah",
      kronologi: "Saat pembagian obat pagi, label obat dua pasien di kamar yang sama tertukar. Diketahui saat identifikasi dua penanda sebelum pemberian.",
      tempat: "Kamar 204",
      pasienRuangan: "Mawar 204",
      tindakanSegera: "Obat ditahan, label diperbaiki, kedua pasien diidentifikasi ulang. Obat diberikan sesuai resep.",
    }),
  );
  // KPC di Farmasi, dilaporkan 4 hari setelah diketahui (terlambat), tanpa data pasien.
  await lapor(
    await petugas("farmasi"),
    laporan(unitId.farmasi, {
      jenis: "kpc",
      waktuInsiden: pada(tambahHari(hari, -5), "13:00"),
      judul: "Suhu lemari pendingin obat di atas batas",
      kronologi: "Termometer lemari pendingin vaksin dan insulin menunjukkan 11 °C saat pengecekan siang; batasnya 2 sampai 8 °C.",
      orangPertama: "petugasLain",
      tempat: "Gudang farmasi",
      pasienInisial: "",
      pasienNoRm: "",
      umurTahun: Number.NaN,
      jenisKelamin: "",
      penanggungBiaya: "",
      kategoriPasien: "",
      spesialisasi: "",
      tindakanSegera: "Obat dipindahkan ke lemari cadangan; teknisi dipanggil.",
      tindakanOleh: "petugasLain",
    }),
    96,
  );

  const icu = await lapor(
    await petugas("icu"),
    laporan(unitId.icu, {
      jenis: "ktc",
      waktuInsiden: pada(tambahHari(hari, -3), "22:10"),
      judul: "Cairan infus diberikan dengan kecepatan salah",
      kronologi: "Pompa infus diatur 100 ml/jam, seharusnya 50 ml/jam. Diketahui saat serah terima 1 jam kemudian; pasien stabil.",
      tempat: "Bed 3 ICU",
      pasienInisial: "Ny SY",
      pasienNoRm: "198342",
      umurTahun: 67,
      jenisKelamin: "P",
      spesialisasi: "jantung",
      tindakanSegera: "Kecepatan diperbaiki, tanda vital dipantau tiap 15 menit selama 2 jam.",
    }),
  );
  await gradingInsiden(await kepala("icu"), icu, { dampak: 1, probabilitas: 2 });

  const jatuh = await lapor(
    await petugas("mawar"),
    laporan(unitId.mawar, {
      jenis: "ktd",
      akibat: "cederaRingan",
      waktuInsiden: pada(tambahHari(hari, -10), "03:20"),
      judul: "Pasien jatuh saat ke kamar mandi",
      kronologi: "Pasien berisiko tinggi jatuh berjalan sendiri ke kamar mandi pada malam hari, terpeleset, lutut lecet.",
      tempat: "Kamar mandi kamar 207",
      pasienInisial: "Tn HS",
      pasienNoRm: "201877",
      umurTahun: 74,
      tindakanSegera: "Pasien dibantu kembali ke tempat tidur, luka dibersihkan, dokter jaga memeriksa: tidak ada cedera lain.",
    }),
  );
  const kepalaMawar = await kepala("mawar");
  await gradingInsiden(kepalaMawar, jatuh, { dampak: 2, probabilitas: 4 });
  await simpanInvestigasi(
    kepalaMawar,
    jatuh,
    investigasi({
      tipeInsiden: "jatuh",
      faktorKontributor: ["pasien", "lingkungan", "tugas"],
      penyebabLangsung: "Pasien berjalan sendiri tanpa pendamping; lantai kamar mandi basah.",
      akarMasalah: "Bel panggil jauh dari tempat tidur, dan edukasi risiko jatuh tidak diulang setelah pasien pindah kamar.",
      rekomendasi: "Bel panggil di sisi tempat tidur semua pasien risiko tinggi; edukasi ulang setiap pindah kamar; keset antiselip.",
    }),
    true,
  );

  const alergi = await lapor(
    await petugas("igd"),
    laporan(unitId.igd, {
      jenis: "ktd",
      akibat: "cederaSedang",
      waktuInsiden: pada(tambahHari(hari, -12), "16:40"),
      judul: "Reaksi alergi setelah antibiotik intravena",
      kronologi: "Pasien mendapat antibiotik intravena tanpa tes; riwayat alergi tercatat di rekam medis lama tetapi tidak di lembar triase.",
      tempat: "Ruang tindakan IGD",
      pasienInisial: "Nn RA",
      pasienNoRm: "210004",
      umurTahun: 24,
      jenisKelamin: "P",
      kategoriPasien: "ugd",
      spesialisasi: "penyakitDalam",
      penanggungBiaya: "pribadi",
      tindakanSegera: "Infus dihentikan, diberikan penanganan anafilaksis sesuai protokol; pasien stabil dan dirawat 1 malam.",
      tindakanOleh: "tim",
    }),
  );
  await gradingInsiden(await kepala("igd"), alergi, { dampak: 3, probabilitas: 3 });

  const sampel = await lapor(
    await petugas("lab"),
    laporan(unitId.lab, {
      waktuInsiden: pada(tambahHari(hari, -20), "09:15"),
      judul: "Sampel darah tanpa label identitas",
      kronologi: "Tabung sampel dari Rawat Inap Melati diterima tanpa label; diketahui saat registrasi laboratorium.",
      orangPertama: "petugasLain",
      tempat: "Loket penerimaan sampel",
      unitPenyebabId: unitId.melati,
      tindakanSegera: "Sampel ditolak, ruangan diminta mengambil ulang dengan label.",
      tindakanOleh: "petugasLain",
    }),
  );
  const kepalaLab = await kepala("lab");
  await gradingInsiden(kepalaLab, sampel, { dampak: 1, probabilitas: 3 });
  await simpanInvestigasi(
    kepalaLab,
    sampel,
    investigasi({
      tipeInsiden: "laboratorium",
      faktorKontributor: ["komunikasi", "tugas"],
      penyebabLangsung: "Label dicetak setelah sampel diambil dan terlupa ditempel.",
      akarMasalah: "Urutan kerja pengambilan sampel tidak mewajibkan label ditempel di samping pasien.",
      rekomendasi: "Label ditempel di samping pasien sebelum pengambilan; sosialisasi ke semua ruang rawat inap.",
    }),
    true,
  );
  await tinjauInsiden(komite, sampel, { dampak: 1, probabilitas: 3, catatan: "Sosialisasi masuk agenda rapat kepala ruang bulan ini." });

  const pengunjung = await lapor(
    await petugas("rajal"),
    laporan(unitId.rajal, {
      waktuInsiden: pada(tambahHari(hari, -6), "10:30"),
      judul: "Pengunjung terpeleset di lobi poliklinik",
      kronologi: "Pengunjung terpeleset di lantai yang baru dipel.",
      orangPertama: "pengunjung",
      tempat: "Lobi poliklinik",
      tindakanSegera: "Pengunjung dibantu dan diperiksa; tanda lantai basah dipasang.",
      tindakanOleh: "petugasLain",
    }),
  );
  await tandaiBukanInsiden(komite, pengunjung, "Insiden pada pengunjung; dilaporkan ke K3 RS.");

  // Triwulan lalu, sudah Selesai: KTD merah lewat RCA (dengan e-report) dan KNC biru.
  const [awalTriwulan] = bulanTriwulan(triwulanLalu());
  const t1 = `${awalTriwulan}-14`;
  const salahSisi = await lapor(
    await petugas("ok"),
    laporan(unitId.ok, {
      jenis: "ktd",
      akibat: "cederaSedang",
      waktuInsiden: pada(t1, "10:05"),
      judul: "Penandaan sisi operasi tidak dilakukan",
      kronologi: "Operasi lutut kanan; penandaan sisi tidak dilakukan dan time-out dipersingkat. Insisi awal di sisi kiri dihentikan setelah perawat sirkuler mengingatkan.",
      tempat: "Kamar Operasi 2",
      pasienInisial: "Tn BW",
      pasienNoRm: "187650",
      umurTahun: 61,
      spesialisasi: "bedah",
      tindakanSegera: "Operasi dihentikan, luka dijahit, operasi dilanjutkan di sisi yang benar setelah time-out ulang. Keluarga diberi penjelasan.",
      tindakanOleh: "tim",
    }),
  );
  await gradingInsiden(await kepala("ok"), salahSisi, { dampak: 3, probabilitas: 3 });
  await selesaikanRca(komite, salahSisi, {
    tipeInsiden: "prosedurKlinis",
    faktorKontributor: ["tim", "komunikasi", "organisasi"],
    penyebabLangsung: "Penandaan sisi operasi tidak dilakukan di ruang persiapan, dan time-out tidak menyebut sisi.",
    akarMasalah: "Daftar tilik keselamatan operasi tidak mewajibkan tanda tangan penandaan sisi sebelum pasien masuk kamar operasi.",
    rekomendasi: "Pasien tidak boleh masuk kamar operasi tanpa penandaan sisi yang diverifikasi; audit kepatuhan time-out mingguan selama 3 bulan.",
    dampak: 3,
    probabilitas: 3,
  });
  await catatEreport(komite, salahSisi, tambahHari(t1, 20), new Date(`${tambahHari(t1, 21)}T02:00:00Z`));
  const t2 = `${geserBulan(awalTriwulan, 1)}-03`;
  const resep = await lapor(
    await petugas("farmasi"),
    laporan(unitId.farmasi, {
      waktuInsiden: pada(t2, "11:20"),
      judul: "Resep dengan dosis sepuluh kali lipat",
      kronologi: "Resep parasetamol sirup anak tertulis 50 ml, seharusnya 5 ml; diketahui apoteker saat telaah resep.",
      orangPertama: "petugasLain",
      tempat: "Depo farmasi rawat jalan",
      pasienInisial: "An KD",
      pasienNoRm: "215530",
      umurTahun: 4,
      jenisKelamin: "P",
      kategoriPasien: "rawatJalan",
      spesialisasi: "anak",
      tindakanSegera: "Apoteker mengonfirmasi ke dokter, resep diperbaiki sebelum obat diserahkan.",
      tindakanOleh: "petugasLain",
    }),
  );
  const kepalaFarmasi = await kepala("farmasi");
  await gradingInsiden(kepalaFarmasi, resep, { dampak: 1, probabilitas: 2 });
  await simpanInvestigasi(
    kepalaFarmasi,
    resep,
    investigasi({
      penyebabLangsung: "Satuan ditulis tanpa koma desimal yang jelas.",
      akarMasalah: "Resep anak masih ditulis tangan tanpa kolom berat badan.",
      rekomendasi: "Format resep anak dengan kolom berat badan dan dosis per kg; telaah resep anak wajib dua orang.",
    }),
    true,
  );
  await tinjauInsiden(komite, resep, { dampak: 1, probabilitas: 2, catatan: "" }, new Date(`${tambahHari(t2, 7)}T02:00:00Z`));
}

/**
 * Contoh Rilis 5: Validasi Data (valid, tidak valid lalu diulang, dan satu yang belum valid), Umpan Balik Dewan Pengawas
 * dua Triwulan terakhir, dan Analisis Efisiensi PDSA IGD yang sudah Selesai. Jejak Audit terisi sendiri lewat service.
 */
async function contohRilis5(unitId: Record<KodeUnit, string>) {
  const komite = await sesi("komite", SANDI);
  const inm = new Map((await daftarIndikator(komite)).map((i) => [i.kode, i.id]));
  const hari = hariIni();
  const validasi = (ubahan: Partial<IsianValidasi>): IsianValidasi => ({
    indikatorId: inm.get("INM-01")!,
    unitId: unitId.icu,
    bulan: b(-1),
    pemicu: "perubahanPengukuran",
    tanggal: tambahHari(hari, -10),
    pengumpulData: ORANG.icu[1],
    validator: "Ns. Dewi Anggraini",
    populasi: 210,
    sampel: 48,
    sesuai: 46,
    penyebab: [],
    perbaikan: "",
    catatan: "Lembar observasi kebersihan tangan; sampel acak dari 210 peluang.",
    ...ubahan,
  });
  await simpanValidasi(komite, validasi({}));
  await simpanValidasi(
    komite,
    validasi({
      unitId: unitId.mawar,
      pengumpulData: ORANG.mawar[1],
      tanggal: tambahHari(hari, -20),
      sesuai: 40,
      penyebab: ["definisi", "waktu"],
      perbaikan: "Sosialisasi ulang 5 momen kebersihan tangan; observasi tidak lagi dilakukan saat serah terima shift.",
    }),
  );
  await simpanValidasi(komite, validasi({ unitId: unitId.mawar, pengumpulData: ORANG.mawar[1], tanggal: tambahHari(hari, -5), sesuai: 45 }));
  await simpanValidasi(
    await sesi("kepala.igd", SANDI),
    validasi({
      indikatorId: inm.get("INM-02")!,
      unitId: unitId.igd,
      pemicu: "indikatorBaru",
      pengumpulData: ORANG.igd[1],
      validator: ORANG.igd[0],
      populasi: 60,
      sampel: 16,
      sesuai: 13,
      penyebab: ["formulir"],
      perbaikan: "Formulir observasi APD direvisi: kolom indikasi kontak, droplet, dan airborne dipisah.",
    }),
  );

  const [awal] = bulanTriwulan(triwulanLalu());
  const sebelumnya = triwulanDari(geserBulan(awal, -3));
  await simpanUmpanBalik(komite, {
    triwulan: sebelumnya,
    teks: "Percepat perbaikan Kepatuhan APD di IGD; laporkan hasilnya pada pertemuan berikutnya.",
    diterimaPada: `${geserBulan(awal, 0)}-15`,
  });
  await simpanTindakLanjutUmpanBalik(komite, {
    triwulan: sebelumnya,
    tindakLanjut: "Formulir observasi APD direvisi dan audit APD mingguan di IGD berjalan sejak bulan berikutnya.",
  });
  await simpanUmpanBalik(komite, {
    triwulan: triwulanLalu(),
    teks: "Pertahankan kebersihan tangan; minta Analisis Efisiensi untuk proyek dokter triase IGD.",
    // Tanggal 20 bulan sesudah Triwulan itu, atau hari ini bila belum sampai.
    diterimaPada: [`${geserBulan(awal, 3)}-20`, hari].sort()[0],
  });

  const igd = (await daftarPdsa(komite, { semua: true })).find((p) => p.unit?.id === unitId.igd && p.tahap === "selesai");
  if (igd) {
    await simpanEfisiensiPdsa(komite, igd.id, {
      baris: [
        { jenis: "tenaga", sebelum: 18_000_000, sesudah: 21_600_000, keterangan: "Tambahan dokter triase sore" },
        { jenis: "waktu", sebelum: 9_500_000, sesudah: 5_200_000, keterangan: "Pasien pulang paksa dan rujukan ulang berkurang" },
        { jenis: "bahan", sebelum: 4_000_000, sesudah: 3_700_000, keterangan: "" },
      ],
      kesimpulan: "Per bulan, tiga bulan sebelum dibanding tiga bulan sesudah uji coba. Biaya tenaga naik, tetapi biaya akibat waktu tunggu turun lebih besar.",
    });
  }
}

/** Register Risiko tahun berjalan: IGD (sudah dipantau), Farmasi, ICU, Humas. */
async function contohRisiko(unitId: Record<KodeUnit, string>) {
  const tahun = tahunBerjalan();
  const kosong = { perlakuan: "", jadwal: "", probabilitasPemantauan: Number.NaN, dampakPemantauan: Number.NaN, efektivitas: "" };
  const isi = async (kode: KodeUnit, x: Partial<IsianRisiko> & Pick<IsianRisiko, "uraian" | "kategori" | "probabilitas" | "dampak">) =>
    simpanRisiko(await sesi(`kepala.${kode}`, SANDI), { unitId: unitId[kode], tahun, ...kosong, ...x });
  await isi("igd", {
    uraian: "Pasien jatuh saat dipindahkan dari brankar ke tempat tidur",
    kategori: "operasional",
    probabilitas: 3,
    dampak: 4,
    perlakuan: "Brankar dengan pengaman samping\nPemindahan oleh dua petugas\nEdukasi keluarga pasien",
    jadwal: `${tahun}-03-01`,
    probabilitasPemantauan: 2,
    dampakPemantauan: 3,
    efektivitas: "efektif",
  });
  await isi("igd", { uraian: "Tenaga triase kurang pada jam sibuk sore", kategori: "operasional", probabilitas: 4, dampak: 3, perlakuan: "Dokter triase sore" });
  await isi("farmasi", {
    uraian: "Obat high alert tertukar karena kemasan mirip (LASA)",
    kategori: "operasional",
    probabilitas: 2,
    dampak: 5,
    perlakuan: "Label LASA di rak\nDouble check sebelum penyerahan",
    jadwal: `${tahun}-05-15`,
    probabilitasPemantauan: 2,
    dampakPemantauan: 5,
    efektivitas: "tidakEfektif",
  });
  await isi("icu", { uraian: "Alat ventilator tidak dikalibrasi sesuai jadwal", kategori: "kepatuhan", probabilitas: 2, dampak: 4 });
  await isi("humas", { uraian: "Keluhan pasien viral di media sosial", kategori: "reputasi", probabilitas: 3, dampak: 3, perlakuan: "SPO tanggapan keluhan 1×24 jam" });
}

async function main() {
  const admin = await sesi(config.adminAwal.username, config.adminAwal.sandi);
  if ((await daftarPengguna(admin)).some((p) => p.username === "komite")) {
    const ada = await daftarUnit(admin);
    const unitIdAda = Object.fromEntries(
      (Object.entries(UNIT) as [KodeUnit, string][]).map(([k, nama]) => [k, ada.find((u) => u.nama === nama)!.id]),
    ) as Record<KodeUnit, string>;
    // Database dev dari sebelum modul tertentu ada: tambahkan contohnya sekali saja.
    const ditambah: string[] = [];
    if ((await daftarInsiden(await sesi("komite", SANDI), { status: "semua" })).length === 0) {
      await insidenContoh(unitIdAda);
      ditambah.push("Insiden");
    }
    if ((await daftarValidasi(await sesi("komite", SANDI))).length === 0) {
      await contohRilis5(unitIdAda);
      ditambah.push("Validasi Data, Umpan Balik Dewan Pengawas, Analisis Efisiensi");
    }
    console.log(
      ditambah.length
        ? `Data dummy sudah ada; contoh ${ditambah.join("; ")} ditambahkan.`
        : "Data dummy sudah ada (Pengguna komite ditemukan); tidak ada yang diubah.",
    );
    return;
  }

  // Unit: pakai yang sudah ada bila namanya sama (mis. ICU).
  const adaUnit = await daftarUnit(admin);
  const unitId = {} as Record<KodeUnit, string>;
  for (const [k, nama] of Object.entries(UNIT) as [KodeUnit, string][]) {
    unitId[k] = adaUnit.find((u) => u.nama.toLowerCase() === nama.toLowerCase())?.id ?? (await tambahUnit(admin, { nama })).id;
  }

  // Pengguna.
  const buat = async (username: string, nama: string, peran: Pengguna["peran"], unitIds: string[] = []) => {
    await tambahPengguna(admin, { username, nama, sandi: SANDI, peran, unitIds });
    return sesi(username, SANDI);
  };
  const komite = await buat("komite", "Ns. Dewi Anggraini", "komiteMutu");
  await buat("direktur", "dr. Bambang Sutrisno, MARS", "direktur");
  const kepala = {} as Record<KodeUnit, Pengguna>;
  const petugas = {} as Record<KodeUnit, Pengguna>;
  for (const k of Object.keys(UNIT) as KodeUnit[]) {
    kepala[k] = await buat(`kepala.${k}`, ORANG[k][0], "kepalaUnit", [unitId[k]]);
    petugas[k] = await buat(`petugas.${k}`, ORANG[k][1], "petugasInputData", [unitId[k]]);
  }

  // IMP + Unit Pelapor (semua mulai bulan pertama, masih berlangsung).
  const pola: Record<string, Pola> = { ...POLA_INM };
  for (const { pola: p, ...imp } of IMP) {
    await tambahIndikator(komite, imp);
    pola[imp.kode] = p;
  }
  const indikator = new Map((await daftarIndikator(komite)).map((i) => [i.kode, i]));
  for (const [kode, p] of Object.entries(pola)) {
    for (const u of Object.keys(p.unit) as KodeUnit[]) {
      await tambahUnitPelapor(komite, indikator.get(kode)!.id, { unitId: unitId[u], bulanMulai: BULAN[0] });
    }
  }

  // Pengukuran.
  let jumlah = 0;
  for (const [i, bulan] of BULAN.entries()) {
    for (const [kode, p] of Object.entries(pola)) {
      const ind = indikator.get(kode)!;
      if (!diukurPadaBulan(ind.frekuensi, bulan)) continue;
      for (const [u, rentang] of Object.entries(p.unit) as [KodeUnit, [number, number]][]) {
        const status = statusDummy(kode, u, bulan);
        if (status === "kosong") continue;
        const isian = { indikatorId: ind.id, unitId: unitId[u], bulan, ...angka(p, rentang, i, ind.faktor) };
        jumlah++;
        if (status === "draf") {
          await simpanPengukuran(petugas[u], isian);
          continue;
        }
        const { id } = await ajukanPengukuran(petugas[u], isian);
        if (status === "terverifikasi") await verifikasiPengukuran(kepala[u], id);
        if (status === "dikembalikan") {
          await kembalikanPengukuran(kepala[u], id, "D tidak sama dengan jumlah peluang di lembar observasi; mohon dicek ulang.");
        }
      }
    }
  }

  // Analisis + Tindak Lanjut.
  const id = (kode: string) => indikator.get(kode)!.id;
  const tl = async (
    aktor: Pengguna,
    analisisId: string,
    isian: { tindakan: string; pic: string; tenggat: string },
    ubah?: { status: "berjalan" | "selesai" | "dibatalkan"; catatan?: string },
  ) => {
    const t = await tambahTindakLanjut(aktor, analisisId, isian);
    if (ubah) await ubahTindakLanjut(aktor, t.id, { ...isian, ...ubah });
  };

  const a1 = await simpanAnalisis(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    bulan: b(-1),
    teks:
      "Kepatuhan kebersihan tangan RS masih di bawah Target 85%. Penyumbang terbesar IGD dan Kamar Operasi: " +
      "handrub tidak tersedia di setiap bed, beban kerja tinggi saat jam sibuk, dan perawat baru belum mengikuti pelatihan 5 momen.",
  });
  await tl(komite, a1.id, { tindakan: "Audit kepatuhan kebersihan tangan mingguan di IGD dan Kamar Operasi", pic: "IPCN", tenggat: `${akhir}-28` }, { status: "berjalan" });
  await tl(
    komite,
    a1.id,
    { tindakan: "Pemasangan dispenser handrub di setiap bed IGD", pic: "Instalasi Sarana Prasarana", tenggat: `${akhir}-15` },
    { status: "selesai", catatan: "24 dispenser terpasang; stok handrub dipantau farmasi." },
  );
  await tl(komite, a1.id, {
    tindakan: "Pelatihan ulang 5 momen kebersihan tangan untuk perawat baru",
    pic: "Komite PPI",
    tenggat: `${geserBulan(berjalan, 1)}-15`,
  });

  const a2 = await simpanAnalisis(komite, {
    indikatorId: id("INM-07"),
    unitId: null,
    bulan: b(-1),
    teks: "Visite dokter sebelum pukul 14.00 belum mencapai Target, terutama di Rawat Inap Melati karena DPJP praktik poliklinik pagi.",
  });
  await tl(komite, a2.id, { tindakan: "Sosialisasi jadwal visite DPJP sebelum pukul 14.00", pic: "Kepala Bidang Pelayanan Medik", tenggat: `${berjalan}-20` });

  const a3 = await simpanAnalisis(komite, {
    indikatorId: id("INM-06"),
    unitId: null,
    bulan: b(-2),
    teks: "Penundaan operasi elektif melebihi 5%. Penyebab utama: jadwal OK bentrok dengan operasi cito dan pasien belum lengkap pemeriksaan pra-operasi.",
  });
  await tl(
    komite,
    a3.id,
    { tindakan: "Penjadwalan operasi elektif lewat antrean OK terpusat", pic: "Kepala Kamar Operasi", tenggat: `${akhir}-10` },
    { status: "dibatalkan", catatan: "Digantikan PDSA penjadwalan Kamar Operasi." },
  );

  const a4 = await simpanAnalisis(kepala.mawar, {
    indikatorId: id("IMP-UNIT-MAWAR-01"),
    unitId: unitId.mawar,
    bulan: b(-1),
    teks: "Kejadian phlebitis masih di atas 1,5‰. Ditemukan kateter IV terpasang lebih dari 96 jam tanpa label tanggal pemasangan.",
  });
  await tl(kepala.mawar, a4.id, { tindakan: "Label tanggal pemasangan pada setiap kateter IV dan penggantian tiap 72–96 jam", pic: "Kepala Ruang Mawar", tenggat: `${berjalan}-30` }, { status: "berjalan" });

  await simpanAnalisis(kepala.melati, {
    indikatorId: id("INM-07"),
    unitId: unitId.melati,
    bulan: b(-1),
    teks: "Tiga DPJP penyakit dalam visite setelah pukul 14.00 karena poliklinik pagi penuh.",
  });

  // PDSA: INM-01 RS siklus 1 Selesai + siklus 2 di Study; INM-06 RS di Do; phlebitis Mawar di Act; IGD Selesai.
  const p1 = await buatPdsa(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    judul: "Handrub di titik pelayanan",
    masalah: "Kepatuhan kebersihan tangan IGD dan Kamar Operasi di bawah 80%.",
    tujuan: "Kepatuhan kebersihan tangan RS ≥ 85% dalam 3 bulan.",
    prediksi: "Handrub yang mudah dijangkau menaikkan kepatuhan momen sebelum kontak pasien.",
    rencana: "Uji coba handrub di setiap bed IGD dan pintu Kamar Operasi, observasi mingguan oleh IPCN.",
    bulanMulai: b(-7),
    bulanAkhir: b(-5),
  });
  await simpanTahapPdsa(komite, p1.id, "do", { pelaksanaan: "Handrub dipasang di 24 bed IGD dan 4 pintu OK; observasi mingguan berjalan 12 minggu." }, true);
  await simpanTahapPdsa(komite, p1.id, "study", { hasil: "Kepatuhan IGD naik sekitar 6 poin, Kamar Operasi naik 5 poin; RS belum mencapai 85%." }, true);
  await simpanTahapPdsa(komite, p1.id, "act", { keputusan: "adaptasi", penjelasan: "Handrub dipertahankan; ditambah umpan balik hasil audit ke kepala ruang setiap minggu." }, true);
  const p2 = await buatPdsa(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    sebelumnyaId: p1.id,
    judul: "",
    masalah: "Kepatuhan RS belum ≥ 85% setelah siklus 1.",
    tujuan: "Kepatuhan kebersihan tangan RS ≥ 85%.",
    prediksi: "Umpan balik mingguan ke kepala ruang menaikkan kepatuhan 3–5 poin.",
    rencana: "IPCN mengirim hasil audit mingguan ke kepala ruang dan membahasnya di apel pagi.",
    bulanMulai: b(-3),
    bulanAkhir: b(-1),
  });
  await simpanTahapPdsa(komite, p2.id, "do", { pelaksanaan: "Umpan balik mingguan berjalan di 5 Unit Pelapor; 2 minggu terlewat saat akreditasi." }, true);

  await buatPdsa(komite, {
    indikatorId: id("INM-06"),
    unitId: null,
    judul: "Kelengkapan pra-operasi H-1",
    masalah: "Operasi elektif tertunda karena pemeriksaan pra-operasi belum lengkap.",
    tujuan: "Penundaan operasi elektif ≤ 5%.",
    prediksi: "Daftar tilik pra-operasi H-1 mengurangi penundaan karena kelengkapan.",
    rencana: "Perawat ruangan mengisi daftar tilik pra-operasi H-1 dan melaporkannya ke Kamar Operasi pukul 15.00.",
    bulanMulai: akhir,
    bulanAkhir: geserBulan(berjalan, 1),
  });

  const p4 = await buatPdsa(kepala.mawar, {
    indikatorId: id("IMP-UNIT-MAWAR-01"),
    unitId: unitId.mawar,
    judul: "Label tanggal kateter IV",
    masalah: "Kateter IV terpasang lebih dari 96 jam tanpa label tanggal.",
    tujuan: "Angka phlebitis ≤ 1,5‰.",
    prediksi: "Label tanggal memudahkan penggantian tepat waktu sehingga phlebitis turun.",
    rencana: "Semua pemasangan kateter IV diberi label tanggal; ketua tim memeriksa setiap pergantian dinas.",
    bulanMulai: b(-4),
    bulanAkhir: b(-2),
  });
  await simpanTahapPdsa(kepala.mawar, p4.id, "do", { pelaksanaan: "Label dipakai sejak minggu kedua; kepatuhan pelabelan sekitar 90%." }, true);
  await simpanTahapPdsa(kepala.mawar, p4.id, "study", { hasil: "Phlebitis turun dari sekitar 2,5‰ menjadi 1,8‰, belum mencapai Target." }, true);

  const p5 = await buatPdsa(kepala.igd, {
    indikatorId: id("IMP-UNIT-IGD-01"),
    unitId: unitId.igd,
    judul: "Dokter jaga triase",
    masalah: "Pasien menunggu dokter lebih dari 5 menit saat jam sibuk sore.",
    tujuan: "Waktu tanggap ≤ 5 menit ≥ 95%.",
    prediksi: "Satu dokter khusus triase pada pukul 16.00–22.00 memangkas waktu tunggu.",
    rencana: "Uji coba dokter triase sore selama 3 bulan.",
    bulanMulai: b(-6),
    bulanAkhir: b(-4),
  });
  await simpanTahapPdsa(kepala.igd, p5.id, "do", { pelaksanaan: "Dokter triase sore berjalan penuh 3 bulan." }, true);
  await simpanTahapPdsa(kepala.igd, p5.id, "study", { hasil: "Waktu tanggap ≤ 5 menit naik dari sekitar 90% menjadi 94%." }, true);
  await simpanTahapPdsa(kepala.igd, p5.id, "act", { keputusan: "adopsi", penjelasan: "Dokter triase sore menjadi jadwal tetap IGD." }, true);

  await simpanRekomendasi(komite, {
    triwulan: triwulanLalu(),
    teks:
      "Kepatuhan kebersihan tangan mulai stabil di atas Target setelah handrub di titik pelayanan; perluas ke semua ruang rawat inap.\n" +
      "Prioritaskan Kepatuhan APD dan Identifikasi Pasien yang belum mencapai 100%: audit mingguan oleh kepala ruang.\n" +
      "Phlebitis Rawat Inap Mawar turun tetapi belum mencapai Target; lanjutkan PDSA label kateter IV.",
  });

  await insidenContoh(unitId);
  await contohRilis5(unitId);
  await contohRisiko(unitId);

  console.log(
    `Selesai: ${Object.keys(UNIT).length} Unit, ${2 + 2 * Object.keys(UNIT).length} Pengguna, ${IMP.length} IMP, ` +
      `${jumlah} Pengukuran (${BULAN[0]} s.d. ${akhir}), 5 Analisis, 5 PDSA, 9 Insiden, 5 Risiko. Sandi semua Pengguna dummy: ${SANDI}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
