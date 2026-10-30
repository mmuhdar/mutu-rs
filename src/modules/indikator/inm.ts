import type { Arah, Frekuensi } from "@/lib/indikator";

/**
 * 13 INM rumah sakit menurut PMK 30/2022 (Pasal 4 ayat 4; profil di Lampiran BAB III.4 hal. 41–62),
 * disalin dari `docs/research/inm-rumah-sakit.md`, BUKAN dari seed SIMRS yang memuat kesalahan
 * INM-09, INM-10, dan INM-13. Sumber Data dibaca dari baris "Sumber Data" setiap profil.
 */
export type DataInm = {
  kode: string;
  nama: string;
  definisiOperasional: string;
  definisiNumerator: string;
  definisiDenominator: string;
  sumberData: string;
  faktor: number;
  satuan: string;
  arah: Arah;
  frekuensi: Frekuensi;
  target: number;
};

/** Target awal INM berlaku sejak PMK 30/2022 diundangkan (17 Oktober 2022). */
export const TARGET_INM_BERLAKU_MULAI = "2022-10";

const persen = { faktor: 100, satuan: "%", arah: "makinTinggi", frekuensi: "bulanan" } as const;

export const INM: DataInm[] = [
  {
    kode: "INM-01",
    nama: "Kepatuhan Kebersihan Tangan",
    definisiOperasional:
      "Kebersihan tangan dilakukan dengan benar sesuai 5 momen (indikasi) dan langkah kebersihan tangan WHO. " +
      "Observasi minimal 200 peluang per unit per bulan, dengan sesi observasi maksimal 20 menit.",
    definisiNumerator: "Jumlah tindakan kebersihan tangan yang dilakukan",
    definisiDenominator: "Jumlah total peluang kebersihan tangan yang seharusnya dilakukan dalam periode observasi",
    sumberData: "Hasil observasi",
    ...persen,
    target: 85,
  },
  {
    kode: "INM-02",
    nama: "Kepatuhan Penggunaan Alat Pelindung Diri (APD)",
    definisiOperasional:
      "Petugas menggunakan alat pelindung diri (APD) dengan tepat sesuai indikasi risiko kontak, droplet, " +
      "atau airborne dalam periode observasi.",
    definisiNumerator: "Jumlah petugas yang patuh menggunakan APD sesuai indikasi dalam periode observasi",
    definisiDenominator: "Jumlah seluruh petugas yang terindikasi menggunakan APD dalam periode observasi",
    sumberData: "Hasil observasi",
    ...persen,
    target: 100,
  },
  {
    kode: "INM-03",
    nama: "Kepatuhan Identifikasi Pasien",
    definisiOperasional:
      "Pemberi pelayanan melakukan identifikasi pasien secara benar dengan minimal 2 penanda identitas " +
      "(nama, tanggal lahir, nomor rekam medik, atau NIK) pada setiap intervensi.",
    definisiNumerator: "Jumlah pemberi pelayanan yang melakukan identifikasi pasien secara benar dalam periode observasi",
    definisiDenominator: "Jumlah pemberi pelayanan yang diobservasi dalam periode observasi",
    sumberData: "Hasil observasi",
    ...persen,
    target: 100,
  },
  {
    kode: "INM-04",
    nama: "Waktu Tanggap Operasi Seksio Sesarea Emergensi",
    definisiOperasional:
      "Waktu sejak diputuskan tindakan seksio sesarea (SC) emergensi kategori I sampai insisi di kamar operasi " +
      "paling lama 30 menit.",
    definisiNumerator:
      "Jumlah pasien yang diputuskan tindakan SC emergensi kategori I yang mendapatkan tindakan SC emergensi ≤ 30 menit",
    definisiDenominator: "Jumlah pasien yang diputuskan tindakan SC emergensi kategori I",
    sumberData: "Data sekunder dari rekam medik, laporan operasi",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-05",
    nama: "Waktu Tunggu Rawat Jalan",
    definisiOperasional:
      "Waktu sejak pasien kontak dengan petugas pendaftaran (untuk pendaftaran online: konfirmasi kehadiran; " +
      "untuk anjungan mandiri: bukti pendaftaran tercetak) sampai mendapat pelayanan dokter/dokter spesialis, " +
      "paling lama 60 menit. Eksklusi: pasien medical check up, pasien poli gigi, pasien pendaftaran online " +
      "atau anjungan mandiri yang datang lebih dari 60 menit dari waktu yang sudah ditentukan, dan pasien yang " +
      "ada tindakan pasien sebelumnya.",
    definisiNumerator: "Jumlah pasien rawat jalan dengan waktu tunggu ≤ 60 menit",
    definisiDenominator: "Jumlah pasien rawat jalan yang diobservasi",
    sumberData:
      "Data sekunder antara lain dari catatan pendaftaran pasien rawat jalan, rekam medik pasien rawat jalan, " +
      "dan formulir waktu tunggu rawat jalan",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-06",
    nama: "Penundaan Operasi Elektif",
    definisiOperasional:
      "Operasi elektif yang tertunda lebih dari 1 jam dari jadwal operasi yang ditetapkan. " +
      "Eksklusi: penundaan operasi atas indikasi medis.",
    definisiNumerator: "Jumlah pasien yang jadwal operasinya tertunda lebih dari 1 jam",
    definisiDenominator: "Jumlah pasien operasi elektif",
    sumberData: "Data sekunder dari catatan pasien yang dijadwalkan operasi dan data pelaksanaan operasi",
    ...persen,
    arah: "makinRendah",
    target: 5,
  },
  {
    kode: "INM-07",
    nama: "Kepatuhan Waktu Visite Dokter",
    definisiOperasional:
      "Dokter melakukan visite kepada pasien rawat inap yang menjadi tanggung jawabnya pada pukul 06.00–14.00. " +
      "Eksklusi: pasien yang baru masuk rawat inap hari itu dan pasien konsul.",
    definisiNumerator: "Jumlah pasien yang di-visite dokter pada pukul 06.00–14.00",
    definisiDenominator: "Jumlah pasien yang diobservasi",
    sumberData: "Data sekunder berupa laporan visite rawat inap dalam rekam medik",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-08",
    nama: "Pelaporan Hasil Kritis Laboratorium",
    definisiOperasional:
      "Hasil kritis laboratorium dilaporkan kepada dokter peminta paling lama 30 menit sejak hasil keluar " +
      "dan dibaca oleh petugas laboratorium yang berwenang.",
    definisiNumerator: "Jumlah hasil kritis laboratorium yang dilaporkan ≤ 30 menit",
    definisiDenominator: "Jumlah hasil kritis laboratorium yang diobservasi",
    sumberData: "Data sekunder dari catatan data laporan hasil tes kritis laboratorium",
    ...persen,
    target: 100,
  },
  {
    kode: "INM-09",
    nama: "Kepatuhan Penggunaan Formularium Nasional",
    definisiOperasional:
      "Peresepan obat oleh DPJP sesuai Formularium Nasional (Fornas), dihitung per item R/ recipe dalam lembar " +
      "resep, bukan per lembar resep. Eksklusi: obat di luar Fornas yang dibutuhkan pasien dan telah disetujui " +
      "komite medik dan direktur, serta obat di luar Fornas karena stok obat nasional berdasarkan e-katalog " +
      "habis/kosong.",
    definisiNumerator: "Jumlah R/ recipe dalam lembar resep yang sesuai dengan Formularium Nasional",
    definisiDenominator: "Jumlah R/ recipe dalam lembar resep yang diobservasi",
    sumberData: "Lembar resep di Instalasi Farmasi",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-10",
    nama: "Kepatuhan terhadap Alur Klinis (Clinical Pathway)",
    definisiOperasional:
      "Pelayanan oleh Profesional Pemberi Asuhan (PPA) sesuai clinical pathway yang ditetapkan rumah sakit. " +
      "Prioritas: hipertensi, diabetes melitus, TB, HIV, dan keganasan. Eksklusi: pasien pulang atas permintaan " +
      "sendiri, pasien meninggal, dan variasi yang terjadi sesuai indikasi klinis.",
    definisiNumerator: "Jumlah pelayanan oleh PPA yang sesuai dengan clinical pathway",
    definisiDenominator: "Jumlah seluruh pelayanan oleh PPA pada clinical pathway yang diobservasi",
    sumberData: "Data sekunder dari rekam medis pasien",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-11",
    nama: "Kepatuhan Upaya Pencegahan Risiko Pasien Jatuh",
    definisiOperasional:
      "Pasien rawat inap berisiko tinggi jatuh mendapatkan ketiga upaya pencegahan risiko jatuh: " +
      "asesmen awal risiko jatuh, asesmen ulang risiko jatuh, dan intervensi pencegahan risiko jatuh.",
    definisiNumerator:
      "Jumlah pasien rawat inap berisiko tinggi jatuh yang mendapatkan ketiga upaya pencegahan risiko jatuh",
    definisiDenominator: "Jumlah pasien rawat inap berisiko tinggi jatuh yang diobservasi",
    sumberData: "Data sekunder menggunakan data dari rekam medis",
    ...persen,
    target: 100,
  },
  {
    kode: "INM-12",
    nama: "Kecepatan Waktu Tanggap Komplain",
    definisiOperasional:
      "Komplain ditanggapi dan ditindaklanjuti sesuai waktu yang ditetapkan menurut grading, sejak keluhan " +
      "disampaikan oleh pasien/keluarga/pengunjung: merah (ekstrem) maksimal 1 × 24 jam, kuning (tinggi) " +
      "maksimal 3 hari, hijau (rendah) maksimal 7 hari.",
    definisiNumerator:
      "Jumlah komplain yang ditanggapi dan ditindaklanjuti sesuai waktu yang ditetapkan berdasarkan grading",
    definisiDenominator: "Jumlah komplain yang disurvei",
    sumberData: "Data sekunder dari catatan komplain",
    ...persen,
    target: 80,
  },
  {
    kode: "INM-13",
    nama: "Kepuasan Pasien",
    definisiOperasional:
      "Indeks kepuasan pasien dari survei 9 unsur pelayanan menurut Peraturan Menteri PANRB tentang pedoman " +
      "penyusunan survei kepuasan masyarakat. Nilai persepsi setiap unsur berskala 1–4, sehingga indeks berkisar " +
      "25–100. Besar sampel menurut tabel Krejcie dan Morgan dengan stratified random sampling. Eksklusi: pasien " +
      "yang tidak kompeten mengisi kuesioner dan/atau tidak ada keluarga yang mendampingi.",
    definisiNumerator: "Total nilai persepsi seluruh responden (jumlah nilai semua unsur yang terisi)",
    definisiDenominator: "Total unsur yang terisi dari seluruh responden",
    sumberData: "Hasil survei",
    faktor: 25,
    satuan: "indeks",
    arah: "makinTinggi",
    frekuensi: "semesteran",
    target: 76.61,
  },
];
