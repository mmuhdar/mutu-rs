# Laporan: Pelaporan Insiden Keselamatan Pasien

Branch `insiden-kp`, dari `rilis-4-pindah`: Rilis 4 belum di-merge, jadi branch ini juga memuat Rilis 4. Ada 7 commit di atas Rilis 4.

Dokumen terkait:
- Spec: `spec.md`, berisi keputusan Q1–Q12.
- Tiket: `issues/01` s.d. `03`, semuanya selesai.
- Riset regulasi: `docs/research/insiden-keselamatan-pasien.md`.

## Isi

| Tiket | Hasil |
|---|---|
| 01 Laporan Insiden | Semua Pengguna melaporkan Insiden lewat isian Formulir 1 PMK 11/2017 (menu Insiden). Pembuat Laporan bisa mengubahnya sampai digrading. |
| 02 Grading dan investigasi | Matriks grading 5×5 KKP-RS 2008 berupa sel yang bisa diklik. Biru dan hijau masuk Investigasi Sederhana oleh Kepala Unit (7 atau 14 hari). Kuning, merah, dan Kejadian Sentinel masuk RCA oleh Komite Mutu (45 hari). Komite Mutu juga meninjau, menggrading ulang, menandai Bukan Insiden, dan mencatat tanggal e-report Kemenkes untuk KTD dan Kejadian Sentinel. Setiap Insiden punya Riwayat Status beserta grading-nya. |
| 03 Rekap | Dashboard menampilkan antrean Insiden per peran. Laporan Triwulan dan CSV-nya mendapat bagian Insiden tanpa identitas. Data dummy mendapat 9 Insiden contoh. |

## Dasar regulasi singkat

- **PMK 11/2017 masih berlaku.** Permenkes 6/2026 tidak mencabutnya.
- **PP 28/2024 Pasal 888–890 sekarang juga mengatur:**
  - jenis insiden ada lima, dengan Kejadian Sentinel sebagai jenis tersendiri;
  - laporan internal ditujukan ke pimpinan RS;
  - yang wajib dilaporkan ke Kemenkes hanya KTD dan Kejadian Sentinel.

  MutuRS mengikuti keduanya: lima jenis, Direktur ikut membaca semua laporan, dan e-report dicatat hanya untuk KTD dan Sentinel.
- **Sumber matriks grading dan tenggat RCA kuning/merah: Pedoman KKP-RS 2008.** Edisi 2015 tidak bisa diperoleh. Tenggat biru 7 hari, hijau 14 hari, dan RCA sentinel 45 hari berasal dari standar akreditasi KMK 1596/2024 PMKP 8.

## Cara mencoba

- **Server dev:** http://localhost:3456. Server sudah berjalan dan migrasi `0013_insiden` sudah masuk.
- **Akun:** sandi semua akun dummy `mutu12345`.
- **Data contoh:** database dev sudah berisi 9 Insiden di semua status (Dilaporkan, Investigasi Sederhana, Ditinjau, RCA, Selesai, Bukan Insiden), dua di antaranya dari Triwulan III 2026. Database baru mendapatkannya dari `npx tsx --env-file=.env scripts/data-dummy.ts`; untuk database yang sudah punya data dummy, perintah yang sama hanya menambahkan Insiden contoh.

## Yang perlu Anda cek manual

1. **Melapor** sebagai `petugas.icu`, sebaiknya dari HP:
   - Buka Insiden, lalu Laporkan Insiden.
   - Pilih KTD dengan akibat "Tidak ada cedera": harus ditolak, dan isian lain tetap ada.
   - Perbaiki lalu kirim.
   - Coba juga KPC tanpa data pasien.
2. **Grading dan Investigasi Sederhana** sebagai `kepala.icu`:
   - Buka laporan tadi dan klik satu sel matriks.
   - Biru atau hijau menjadi Investigasi Sederhana dengan tenggat 7 atau 14 hari.
   - Isi investigasi, lalu Kirim ke Komite Mutu.
3. **Tinjauan dan RCA** sebagai `komite`:
   - Tinjau Insiden "Pasien jatuh saat ke kamar mandi". Pilih kuning atau merah: Insiden dialihkan ke RCA. Pilih biru atau hijau: Insiden Selesai.
   - Selesaikan RCA "Reaksi alergi setelah antibiotik intravena".
   - Catat tanggal e-report-nya. Di daftar, tanda "Belum e-report" hilang.
4. **Umpan balik ke Pembuat Laporan** (`petugas.icu`): sebelum Selesai, hasil investigasi dan catatan Komite Mutu tidak terlihat. Setelah Selesai, keduanya terlihat.
5. **Hak baca:**
   - `kepala.igd` tidak bisa membuka Insiden ICU.
   - `direktur` membaca semua Insiden tanpa tombol aksi.
   - `admin` hanya melihat laporan buatannya sendiri.
6. **Rekap:**
   - Dashboard per peran:
     - Kepala Unit: Insiden menunggu Anda dan yang lewat tenggat;
     - Komite Mutu: ditambah KTD dan Sentinel yang belum di e-report;
     - Direktur: Insiden terbuka.
   - Laporan Triwulan III 2026: bagian Insiden Keselamatan Pasien, lalu Unduh CSV (tabelnya ada di bawah tabel Capaian).
   - Sebagai `admin`, bagian itu tidak ada.
7. **Mode terang/gelap** pada matriks grading. Warnanya: biru = cool, hijau = ok, kuning = amber, merah = bad, selalu bertuliskan warnanya.

## Keputusan yang saya ambil sendiri

Selain Q1–Q12:

- **Formulir:**
  - Ruangan dan tanggal masuk boleh kosong, karena tidak berlaku untuk semua pasien rawat jalan dan UGD. Data pasien lain wajib, kecuali untuk KPC.
  - Pilihan "Lain-lain (sebutkan)" di formulir kertas tidak punya isian tambahan; rinciannya ditulis di kronologi.
  - Nama pasien cukup inisial, dan judul insiden diberi petunjuk "tanpa nama pasien".
  - Kelompok umur dihitung otomatis dari umur tahun dan bulan.
  - Kejadian Sentinel boleh berakibat cedera sedang, karena "cedera berat sementara" (Pasal 15) bisa reversibel. Yang ditolak hanya "Tidak ada cedera". Sebaliknya, KPC, KNC, dan KTC wajib "Tidak ada cedera".
- **Alur:**
  - Komite Mutu juga boleh menggrading bila Kepala Unit belum.
  - Setelah digrading, laporan dan jenis insidennya terkunci; tidak ada fitur ubah oleh Komite Mutu. Bila jenisnya salah, laporan ditandai Bukan Insiden lalu dilaporkan ulang.
  - Isian RCA terisi awal dari Investigasi Sederhana dan menggantikannya.
  - Simpan investigasi mewajibkan semua isian, sama seperti tahap PDSA.
  - Tanggal e-report boleh dikosongkan lagi untuk menghapus tanda.
- **Tenggat:**
  - Dihitung dari tanggal laporan dibuat menurut zona waktu RS.
  - Saat dialihkan ke RCA, 45 hari dihitung dari hari peninjauan.
  - Lewat tenggat di Dashboard Kepala Unit hanya menghitung Investigasi Sederhana Unit-nya; RCA adalah tanggungan Komite Mutu.
- **Kerahasiaan:**
  - Pembuat Laporan sejak awal melihat status dan grading.
  - Hasil investigasi dan catatan Komite Mutu baru terlihat setelah Insiden ditutup.
  - Rekap Laporan Triwulan hanya untuk Komite Mutu dan Direktur, sesuai Q4 yang menyatakan Admin Sistem tidak membaca Insiden.
  - Daftar RCA di rekap hanya memuat tanggal insiden (tanpa jam), dan akar masalah serta rekomendasinya hanya dari RCA yang sudah Selesai.
- **Tampilan:** menu "Insiden" ada di kelompok Data, untuk semua peran.

## Pemeriksaan

- **Proyek:** `npm run check` lulus (typecheck, lint, 236 tes). Tes baru: `tests/insiden.test.ts` (24 tes) dan waktu setempat di `tests/bulan.test.ts`.
- **Uji browser (Playwright):**
  - alur lengkap: lapor dari HP, ditolak lalu diperbaiki, grading hijau, investigasi, tinjauan kuning ke RCA, RCA Selesai, e-report, umpan balik ke Pembuat Laporan;
  - Kepala Unit lain ditolak;
  - Dashboard per peran;
  - Laporan Triwulan dan CSV;
  - 1280 dan 390 px, tanpa halaman yang melebar.
- **Code review dua sumbu (standar dan spec)**, perbaikannya di commit `05bab94`:
  - Rekap Insiden sebelumnya terbaca Admin Sistem, dan menampilkan teks RCA yang belum Selesai beserta jam insiden.
  - Pembuat Laporan sebelumnya melihat catatan Komite Mutu sebelum Insiden ditutup.
  - Unit bisa dinonaktifkan bersamaan saat laporan disimpan (race); sekarang Unit dikunci.
  - Pilihan matriks dan faktor kontributor hilang setelah form ditolak.
  - Lewat tenggat di Dashboard Kepala Unit ikut menghitung RCA.
  - Kata yang dihindari glosarium ("pelapor", "kejadian"), tanda pisah di label umur, dan beberapa duplikasi kecil.
- **Saran review yang tidak saya ambil:** menyatukan aturan "siapa boleh apa di status mana" ke satu tabel seperti `PERPINDAHAN` Pengukuran. Alur Insiden bercabang menurut warna, jadi tabelnya tidak lebih sederhana dari pemeriksaan per fungsi.
- **Linter desain Hallmark:** 0 FAIL, 0 REFLEX.

## Batasan

- **Matriks grading** mengikuti Pedoman KKP-RS 2008. Bila pedoman keselamatan pasien RS memakai matriks lain, cukup ubah `MATRIKS` di `src/lib/insiden.ts`.
- **Tidak dibuat:**
  - pengiriman otomatis ke aplikasi IKP Kemenkes (login SSO, tanpa API);
  - unduhan Formulir 2;
  - lampiran berkas, misalnya diagram RCA;
  - subtipe insiden, tipe harm ICD-10, dan notifikasi.
- **Peraturan Menteri pelaksana PP 28/2024 Pasal 892** (rincian pelaporan insiden) belum terbit menurut riset. Bila nanti terbit, aturan di sini mungkin perlu disesuaikan.
- **Demo produksi** di http://localhost:3917 belum dibangun ulang.
- **Data dummy dev:** 9 Insiden contoh. Insiden buatan uji browser sudah dihapus.

## Langkah berikutnya

1. Cek manual di atas, ditambah cek manual Rilis 4 (`.scratch/rilis-4-pindah/laporan.md`), karena branch ini memuat Rilis 4.
2. Bila oke, satu perintah memasukkan keduanya ke `main`: `git switch main && git merge --ff-only insiden-kp`.
3. Rilis 5 (kandidat): audit trail, validasi data (PMKP 5), umpan balik Dewan Pengawas, analisis efisiensi (PMKP 4 g), dan notifikasi.
