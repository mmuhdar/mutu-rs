import { dalamJendelaTenggat } from "./perbaikan";

/*
 * Konstanta dan aturan murni modul Insiden (Insiden Keselamatan Pasien); service di `src/modules/insiden`. Pilihan dan
 * teksnya dari Formulir 1 PMK 11/2017 dan Pedoman Pelaporan IKP KKP-RS 2008 (`docs/research/insiden-keselamatan-pasien.md`).
 */

/** Daftar pilihan berlabel: kunci yang disimpan + label tampilan, urut seperti di formulir. */
const pilihan = <const K extends string>(label: Record<K, string>) => Object.keys(label) as K[];

/** Jenis Insiden (PMK 11/2017 Pasal 14–15, PP 28/2024 Pasal 888). Kejadian Sentinel dipisah dari KTD. */
export const LABEL_JENIS_INSIDEN = {
  kpc: "KPC",
  knc: "KNC",
  ktc: "KTC",
  ktd: "KTD",
  sentinel: "Kejadian Sentinel",
} as const;
export type JenisInsiden = keyof typeof LABEL_JENIS_INSIDEN;
export const JENIS_INSIDEN = pilihan(LABEL_JENIS_INSIDEN);
/** Nama lengkap dan definisi singkat (PMK 11/2017 Pasal 14–15) untuk petunjuk di form. */
export const DEFINISI_JENIS_INSIDEN: Record<JenisInsiden, string> = {
  kpc: "Kondisi Potensial Cedera: kondisi yang sangat berpotensi menimbulkan cedera, tetapi belum terjadi insiden.",
  knc: "Kejadian Nyaris Cedera: insiden yang belum sampai terpapar ke pasien.",
  ktc: "Kejadian Tidak Cedera: insiden sudah terpapar ke pasien, tetapi tidak timbul cedera.",
  ktd: "Kejadian Tidak Diharapkan: insiden yang mengakibatkan cedera pada pasien.",
  sentinel:
    "KTD yang mengakibatkan kematian, cedera permanen, atau cedera berat sementara yang membutuhkan intervensi untuk mempertahankan kehidupan, tidak terkait perjalanan penyakit pasien.",
};
/** Jenis yang wajib dilaporkan ke Kemenkes (PP 28/2024 Pasal 889 ayat (2)); MutuRS hanya mencatat tanggal e-report-nya. */
export const JENIS_EREPORT: readonly JenisInsiden[] = ["ktd", "sentinel"];

/** Status Insiden; urutan = urutan alur. */
export const LABEL_STATUS_INSIDEN = {
  dilaporkan: "Dilaporkan",
  investigasi: "Investigasi Sederhana",
  ditinjau: "Ditinjau",
  rca: "RCA",
  selesai: "Selesai",
  bukanInsiden: "Bukan Insiden",
} as const;
export type StatusInsiden = keyof typeof LABEL_STATUS_INSIDEN;
export const STATUS_INSIDEN = pilihan(LABEL_STATUS_INSIDEN);
/** Status yang masih menunggu penanganan (bawaan daftar Insiden). */
export const STATUS_INSIDEN_TERBUKA: readonly StatusInsiden[] = ["dilaporkan", "investigasi", "ditinjau", "rca"];
/** Status yang punya tenggat investigasi. */
export const STATUS_BERTENGGAT: readonly StatusInsiden[] = ["investigasi", "rca"];

/** Warna grading risiko (di pedoman: risiko Rendah, Moderat, Tinggi, Ekstrim). */
export const LABEL_WARNA_GRADING = { biru: "Biru", hijau: "Hijau", kuning: "Kuning", merah: "Merah" } as const;
export type WarnaGrading = keyof typeof LABEL_WARNA_GRADING;
export const WARNA_GRADING = pilihan(LABEL_WARNA_GRADING);

/** Tingkat dampak 1–5 (KKP-RS 2008 Tabel 1). */
export const DAMPAK = [
  { nilai: 1, label: "Tidak signifikan", keterangan: "Tidak ada cedera" },
  { nilai: 2, label: "Minor", keterangan: "Cedera ringan, dapat diatasi dengan pertolongan pertama" },
  { nilai: 3, label: "Moderat", keterangan: "Cedera sedang, berkurangnya fungsi (reversibel), atau memperpanjang perawatan" },
  { nilai: 4, label: "Mayor", keterangan: "Cedera luas/berat, kehilangan fungsi (irreversibel)" },
  { nilai: 5, label: "Katastropik", keterangan: "Kematian yang tidak berhubungan dengan perjalanan penyakit" },
] as const;
/** Tingkat probabilitas 1–5: seberapa sering insiden serupa terjadi di RS (KKP-RS 2008 Tabel 2). */
export const PROBABILITAS = [
  { nilai: 1, label: "Sangat jarang", keterangan: "lebih dari 5 tahun sekali" },
  { nilai: 2, label: "Jarang", keterangan: "lebih dari 2 sampai 5 tahun sekali" },
  { nilai: 3, label: "Mungkin", keterangan: "1 sampai 2 tahun sekali" },
  { nilai: 4, label: "Sering", keterangan: "beberapa kali setahun" },
  { nilai: 5, label: "Sangat sering", keterangan: "tiap minggu atau bulan" },
] as const;

/**
 * Matriks grading KKP-RS 2008 Tabel 3: baris = probabilitas 1–5, kolom = dampak 1–5. Warna dibaca dari sel, bukan dari
 * skor dampak × probabilitas (skor yang sama bisa berwarna berbeda, mis. 5×1 merah, 1×5 hijau).
 */
const MATRIKS: readonly (readonly WarnaGrading[])[] = [
  ["biru", "biru", "hijau", "kuning", "merah"],
  ["biru", "biru", "hijau", "kuning", "merah"],
  ["biru", "hijau", "kuning", "merah", "merah"],
  ["hijau", "hijau", "kuning", "merah", "merah"],
  ["hijau", "hijau", "kuning", "merah", "merah"],
];

/** Benar bila `n` tingkat dampak/probabilitas yang sah (bilangan bulat 1–5). */
export const tingkatValid = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

/** Sel matriks sebagai nilai form "dampak-probabilitas"; undefined = belum digrading. */
export const selGrading = (g: { dampak: number | null; probabilitas: number | null }) =>
  g.dampak && g.probabilitas ? `${g.dampak}-${g.probabilitas}` : undefined;

/** Warna grading dari dampak dan probabilitas (masing-masing 1–5). */
export const warnaGrading = (dampak: number, probabilitas: number): WarnaGrading => MATRIKS[probabilitas - 1][dampak - 1];

/** Perlu dicatat tanggal e-report Kemenkes-nya: KTD atau Kejadian Sentinel yang bukan Bukan Insiden. */
export const perluEreport = (i: { jenis: JenisInsiden; status: StatusInsiden }) => JENIS_EREPORT.includes(i.jenis) && i.status !== "bukanInsiden";

/** Kuning, merah, dan semua Kejadian Sentinel diinvestigasi dengan RCA oleh Komite Mutu; biru dan hijau cukup Investigasi Sederhana. */
export const perluRca = (jenis: JenisInsiden, warna: WarnaGrading) => jenis === "sentinel" || warna === "kuning" || warna === "merah";

/** Lama investigasi paling lama (hari): biru 7, hijau 14 (KMK 1596/2024 PMKP 8), RCA 45 (PMKP 8 untuk sentinel, pedoman untuk kuning/merah). */
export const hariInvestigasi = (jenis: JenisInsiden, warna: WarnaGrading) => (perluRca(jenis, warna) ? 45 : warna === "biru" ? 7 : 14);

/** Insiden dengan status dan tenggat ("YYYY-MM-DD"; null = belum digrading). */
type BerTenggat = { status: StatusInsiden; tenggat: string | null };

/** Lewat tenggat: masih Investigasi Sederhana atau RCA dan tenggatnya sebelum hari ini. Dihitung, bukan status. */
export const lewatTenggatInsiden = (i: BerTenggat, hariIni: string) =>
  STATUS_BERTENGGAT.includes(i.status) && i.tenggat !== null && i.tenggat < hariIni;

/** Mendekati tenggat: masih Investigasi Sederhana atau RCA dan tenggatnya hari ini sampai 7 hari lagi (sama dengan Tindak Lanjut). */
export const mendekatiTenggatInsiden = (i: BerTenggat, hariIni: string) =>
  STATUS_BERTENGGAT.includes(i.status) && i.tenggat !== null && dalamJendelaTenggat(i.tenggat, hariIni);

/** Batas laporan internal: 2×24 jam (PMK 11/2017 Pasal 18 ayat (1)). */
const JAM_BATAS_LAPOR = 48;
/** Laporan dibuat lebih dari 2×24 jam setelah waktu insiden. Hanya penanda: laporan terlambat tetap diterima. */
export const terlambatDilaporkan = (waktuInsiden: Date, dilaporkanPada: Date) =>
  dilaporkanPada.getTime() - waktuInsiden.getTime() > JAM_BATAS_LAPOR * 3_600_000;

/** Akibat insiden terhadap pasien (Formulir 1 butir 11), dari yang paling ringan; urutannya sejajar dampak 1–5. */
export const LABEL_AKIBAT_INSIDEN = {
  tidakAdaCedera: "Tidak ada cedera",
  cederaRingan: "Cedera ringan",
  cederaSedang: "Cedera reversibel / sedang",
  cederaBerat: "Cedera irreversibel / berat",
  kematian: "Kematian",
} as const;
export type AkibatInsiden = keyof typeof LABEL_AKIBAT_INSIDEN;
export const AKIBAT_INSIDEN = pilihan(LABEL_AKIBAT_INSIDEN);
/** Tingkat dampak yang sejajar dengan akibat insiden (petunjuk grading). */
export const dampakAkibat = (akibat: AkibatInsiden) => AKIBAT_INSIDEN.indexOf(akibat) + 1;

/** KPC, KNC, dan KTC tidak menimbulkan cedera; KTD dan Kejadian Sentinel menimbulkan cedera (PMK 11/2017 Pasal 14–15). */
export const akibatSesuaiJenis = (jenis: JenisInsiden, akibat: AkibatInsiden) =>
  jenis === "ktd" || jenis === "sentinel" ? akibat !== "tidakAdaCedera" : akibat === "tidakAdaCedera";

/** Orang pertama yang melaporkan insiden (Formulir 1 butir 5). */
export const LABEL_ORANG_PERTAMA = {
  dokter: "Karyawan: Dokter",
  perawat: "Karyawan: Perawat",
  petugasLain: "Karyawan: Petugas lainnya",
  pasien: "Pasien",
  keluarga: "Keluarga / Pendamping pasien",
  pengunjung: "Pengunjung",
  lainnya: "Lain-lain",
} as const;
export type OrangPertama = keyof typeof LABEL_ORANG_PERTAMA;
export const ORANG_PERTAMA = pilihan(LABEL_ORANG_PERTAMA);

/** Penanggung biaya pasien (Formulir 1 bagian A). */
export const LABEL_PENANGGUNG_BIAYA = {
  pribadi: "Pribadi",
  asuransiSwasta: "Asuransi swasta",
  pemerintah: "Pemerintah",
  perusahaan: "Perusahaan",
  bpjs: "BPJS",
  lainnya: "Lain-lain",
} as const;
export type PenanggungBiaya = keyof typeof LABEL_PENANGGUNG_BIAYA;
export const PENANGGUNG_BIAYA = pilihan(LABEL_PENANGGUNG_BIAYA);

/** Insiden menyangkut pasien (Formulir 1 butir 7). */
export const LABEL_KATEGORI_PASIEN = {
  rawatInap: "Rawat inap",
  rawatJalan: "Rawat jalan",
  ugd: "UGD",
  lainnya: "Lain-lain",
} as const;
export type KategoriPasien = keyof typeof LABEL_KATEGORI_PASIEN;
export const KATEGORI_PASIEN = pilihan(LABEL_KATEGORI_PASIEN);

/** Spesialisasi kasus penyakit pasien (Formulir 1 butir 9), masing-masing beserta subspesialisasinya. */
export const LABEL_SPESIALISASI = {
  penyakitDalam: "Penyakit Dalam",
  anak: "Anak",
  bedah: "Bedah",
  obstetriGinekologi: "Obstetri Ginekologi",
  tht: "THT",
  mata: "Mata",
  saraf: "Saraf",
  anestesi: "Anestesi",
  kulitKelamin: "Kulit dan Kelamin",
  jantung: "Jantung",
  paru: "Paru",
  jiwa: "Jiwa",
  lainnya: "Lain-lain (termasuk umum)",
} as const;
export type Spesialisasi = keyof typeof LABEL_SPESIALISASI;
export const SPESIALISASI = pilihan(LABEL_SPESIALISASI);

/** Tindakan segera dilakukan oleh (Formulir 1 butir 13). */
export const LABEL_TINDAKAN_OLEH = { tim: "Tim", dokter: "Dokter", perawat: "Perawat", petugasLain: "Petugas lainnya" } as const;
export type TindakanOleh = keyof typeof LABEL_TINDAKAN_OLEH;
export const TINDAKAN_OLEH = pilihan(LABEL_TINDAKAN_OLEH);

/** Jenis kelamin pasien. */
export const LABEL_JENIS_KELAMIN = { L: "Laki-laki", P: "Perempuan" } as const;
export type JenisKelamin = keyof typeof LABEL_JENIS_KELAMIN;
export const JENIS_KELAMIN = pilihan(LABEL_JENIS_KELAMIN);

/** Tipe insiden (KKP-RS 2008 Tabel 5), diisi setelah investigasi; subtipe tidak dicatat. */
export const LABEL_TIPE_INSIDEN = {
  administrasiKlinik: "Administrasi klinik",
  prosedurKlinis: "Proses/prosedur klinis",
  dokumentasi: "Dokumentasi",
  infeksiNosokomial: "Infeksi nosokomial",
  medikasi: "Medikasi/cairan infus",
  transfusi: "Transfusi darah/produk darah",
  nutrisi: "Nutrisi",
  oksigen: "Oksigen/gas",
  alatMedis: "Alat medis/alat kesehatan",
  perilakuPasien: "Perilaku pasien/kekerasan",
  jatuh: "Jatuh",
  kecelakaan: "Kecelakaan",
  infrastruktur: "Infrastruktur/bangunan/benda terpasang tetap",
  manajemenOrganisasi: "Sumber daya/manajemen organisasi",
  laboratorium: "Laboratorium/patologi",
} as const;
export type TipeInsiden = keyof typeof LABEL_TIPE_INSIDEN;
export const TIPE_INSIDEN = pilihan(LABEL_TIPE_INSIDEN);

/** Faktor kontributor (Formulir 2 bagian D), boleh lebih dari satu. */
export const LABEL_FAKTOR_KONTRIBUTOR = {
  eksternal: "Eksternal/di luar RS",
  organisasi: "Organisasi dan manajemen",
  lingkungan: "Lingkungan kerja",
  tim: "Tim",
  petugas: "Petugas/staf",
  tugas: "Tugas",
  pasien: "Pasien",
  komunikasi: "Komunikasi",
} as const;
export type FaktorKontributor = keyof typeof LABEL_FAKTOR_KONTRIBUTOR;
export const FAKTOR_KONTRIBUTOR = pilihan(LABEL_FAKTOR_KONTRIBUTOR);

/** Kelompok umur Formulir 1 dari umur dalam bulan (batas atas termasuk: 12 bulan = ">1 bulan s.d. 1 tahun"). */
export function kelompokUmur(umurBulan: number) {
  const batas: [number, string][] = [
    [1, "0 s.d. 1 bulan"],
    [12, ">1 bulan s.d. 1 tahun"],
    [60, ">1 s.d. 5 tahun"],
    [180, ">5 s.d. 15 tahun"],
    [360, ">15 s.d. 30 tahun"],
    [780, ">30 s.d. 65 tahun"],
  ];
  return batas.find(([b]) => umurBulan <= b)?.[1] ?? ">65 tahun";
}

/** Umur untuk tampilan: "3 tahun 2 bulan", "5 bulan". */
export function labelUmur(umurBulan: number) {
  const [tahun, bulan] = [Math.floor(umurBulan / 12), umurBulan % 12];
  return [tahun > 0 && `${tahun} tahun`, (bulan > 0 || tahun === 0) && `${bulan} bulan`].filter(Boolean).join(" ");
}
