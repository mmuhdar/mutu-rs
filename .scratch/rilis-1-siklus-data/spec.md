# Spec: MutuRS Rilis 1 — Siklus Data Indikator Mutu

Status: selesai (2026-10-31, branch `rilis-1-siklus-data`)

## Problem Statement

Rumah sakit wajib mengukur 13 INM setiap bulan dan melaporkannya ke Kemenkes, ditambah IMP-RS dan IMP-Unit pilihannya sendiri. Pengukuran itu dikumpulkan dari banyak Unit. Tanpa satu tempat bersama:

- Komite Mutu harus mengumpulkan, mengecek, dan menghitung angka dari setiap Unit secara manual.
- Salah ketik (misalnya N lebih besar dari D) bisa lolos sampai ke Direktur.
- Tidak ada jejak siapa yang mengisi dan siapa yang memeriksa.
- Sulit melihat Unit mana yang belum mengisi.
- Tren Capaian terhadap Target tidak terlihat dari bulan ke bulan.

Capaian RS juga mudah salah dihitung, misalnya dengan merata-ratakan persentase Unit, padahal seharusnya menjumlahkan N dan D.

## Solution

MutuRS adalah aplikasi web yang berdiri sendiri dan dipasang di server RS. Alurnya:

1. Komite Mutu mengelola daftar Indikator. 13 INM sesuai PMK 30/2022 sudah tersedia sejak hari pertama.
2. Komite Mutu menentukan Unit Pelapor dan Target setiap Indikator.
3. Petugas Input Data mengisi Pengukuran bulanan untuk Unit-nya.
4. Kepala Unit memverifikasi Pengukuran tersebut.
5. Aplikasi menghitung Capaian dan Capaian RS secara otomatis dari Pengukuran Terverifikasi, membandingkannya dengan Target menurut Arah, dan menunjukkan Kelengkapan.

Dashboard dan Monitoring memperlihatkan Status Capaian dan tren 12 bulan kepada setiap peran, sesuai Unit yang menjadi haknya. Aplikasi bisa dibuka di komputer maupun browser HP dalam jaringan RS.

## User Stories

### Masuk dan akun

1. Sebagai Pengguna, saya ingin masuk dengan username dan sandi, supaya hanya pegawai RS yang terdaftar yang bisa memakai MutuRS.
2. Sebagai Pengguna, saya ingin keluar dari aplikasi, supaya orang lain yang memakai komputer yang sama tidak bisa memakai sesi saya.
3. Sebagai Pengguna, saya ingin mengganti sandi saya sendiri, supaya sandi sementara dari Admin Sistem tidak terus dipakai.
4. Sebagai Admin Sistem, saya ingin percobaan masuk yang gagal berulang kali dibatasi, supaya sandi tidak bisa ditebak secara otomatis.
5. Sebagai Admin Sistem, saya ingin Pengguna yang nonaktif tidak bisa masuk lagi, supaya pegawai yang sudah pindah tidak punya akses.
6. Sebagai IT RS, saya ingin akun Admin Sistem pertama dibuat dari konfigurasi saat deploy, supaya aplikasi bisa langsung dipakai tanpa langkah manual di database.

### Admin Sistem: Pengguna dan Unit

7. Sebagai Admin Sistem, saya ingin membuat Pengguna dengan username, nama, sandi awal, dan satu peran, supaya setiap pegawai mendapat akses sesuai tugasnya.
8. Sebagai Admin Sistem, saya ingin mengaitkan Petugas Input Data dan Kepala Unit ke satu atau lebih Unit, supaya mereka hanya bisa mengisi dan melihat data Unit-nya. Contohnya perawat yang menangani ICU dan HCU sekaligus.
9. Sebagai Admin Sistem, saya ingin mengubah peran dan Unit seorang Pengguna, supaya mutasi pegawai bisa diikuti.
10. Sebagai Admin Sistem, saya ingin mereset sandi seorang Pengguna, supaya pegawai yang lupa sandi bisa masuk lagi.
11. Sebagai Admin Sistem, saya ingin menonaktifkan Pengguna alih-alih menghapusnya, supaya jejak siapa yang mengisi dan memverifikasi Pengukuran lama tetap ada.
12. Sebagai Admin Sistem, saya ingin mengelola daftar Unit (tambah, ganti nama, nonaktifkan), supaya Unit dipilih dari daftar baku dan Capaian satu Unit tidak terpecah karena ejaan yang berbeda.
13. Sebagai Admin Sistem, saya ingin Unit yang nonaktif hilang dari pilihan tetapi riwayatnya tetap tampil di Monitoring, supaya ruangan yang ditutup tidak menghapus data lama.
14. Sebagai Admin Sistem, saya ingin memiliki semua hak Komite Mutu, supaya saya bisa membantu mengelola Indikator.

### Komite Mutu: Indikator

15. Sebagai Komite Mutu, saya ingin 13 INM sesuai PMK 30/2022 sudah tersedia lengkap dengan definisi operasional, numerator, denominator, Sumber Data, faktor, satuan, Target, Arah, dan Frekuensi, supaya saya tidak perlu mengetik ulang definisi resmi.
16. Sebagai Komite Mutu, saya ingin menambah IMP-RS dan IMP-Unit dengan kode, nama, definisi operasional, definisi N dan D, Sumber Data, faktor, satuan, Arah, Frekuensi, PIC, dan Target awal, supaya indikator prioritas RS bisa dipantau dengan cara yang sama.
17. Sebagai Komite Mutu, saya ingin menentukan Unit Pelapor setiap Indikator beserta bulan mulai dan (opsional) bulan berhentinya, supaya Unit yang baru dibuka atau berhenti melapor tidak mengubah Kelengkapan bulan-bulan sebelumnya.
18. Sebagai Komite Mutu, saya ingin IMP-Unit hanya bisa punya tepat satu Unit Pelapor, supaya indikator milik satu Unit tidak tercampur dengan Unit lain.
19. Sebagai Komite Mutu, saya ingin menetapkan Target baru yang berlaku mulai bulan tertentu, supaya bulan-bulan sebelumnya tetap dinilai dengan Target lamanya.
20. Sebagai Komite Mutu, saya ingin melihat riwayat Target setiap Indikator, supaya saya tahu Target mana yang berlaku pada bulan tertentu.
21. Sebagai Komite Mutu, saya ingin faktor, satuan, Arah, definisi N dan D, serta Frekuensi terkunci setelah Indikator punya Pengukuran, supaya tren tidak mencampur dua cara hitung.
22. Sebagai Komite Mutu, saya ingin tetap bisa memperbaiki nama, definisi operasional, Sumber Data, dan PIC kapan saja, supaya salah ketik pada teks bisa dibetulkan.
23. Sebagai Komite Mutu, saya ingin menonaktifkan Indikator lama dan membuat Indikator pengganti, supaya perubahan cara hitung tidak merusak riwayat.
24. Sebagai Komite Mutu, saya ingin Indikator nonaktif hilang dari isian tetapi riwayatnya tetap ada di Monitoring, supaya data lama tetap bisa dilihat.
25. Sebagai Komite Mutu, saya ingin mengatur Indikator Semesteran (seperti INM Kepuasan pasien) yang hanya diisi pada bulan Juni dan Desember, supaya frekuensinya sesuai regulasi.

### Petugas Input Data: Pengukuran

26. Sebagai Petugas Input Data, saya ingin melihat daftar Indikator yang wajib diisi Unit saya pada bulan yang dipilih, lengkap dengan status masing-masing (belum diisi, Draf, Diajukan, Terverifikasi), supaya saya tahu apa yang belum selesai.
27. Sebagai Petugas Input Data yang terkait ke beberapa Unit, saya ingin memilih Unit yang sedang saya isi, supaya data tidak salah masuk ke Unit lain.
28. Sebagai Petugas Input Data, saya ingin melihat definisi N, definisi D, dan Sumber Data saat mengisi, supaya saya menghitung dengan benar.
29. Sebagai Petugas Input Data, saya ingin mengisi N, D, dan Catatan opsional lalu menyimpannya sebagai Draf, supaya saya bisa melanjutkan nanti.
30. Sebagai Petugas Input Data, saya ingin melihat pratinjau Capaian sebelum mengajukan, supaya salah ketik yang mencolok langsung terlihat.
31. Sebagai Petugas Input Data, saya ingin mengajukan Pengukuran, supaya Kepala Unit bisa memverifikasinya.
32. Sebagai Petugas Input Data, saya ingin isian ditolak bila N atau D negatif atau bukan bilangan bulat, bila N lebih besar dari D pada Indikator persen, atau bila D = 0 tetapi N lebih dari 0, supaya data yang mustahil tidak tersimpan.
33. Sebagai Petugas Input Data, saya ingin boleh mengisi D = 0 dengan N = 0 (misalnya tidak ada operasi SC emergensi bulan itu), supaya bulan tanpa kejadian tetap tercatat dengan Capaian kosong.
34. Sebagai Petugas Input Data, saya ingin bisa mengisi bulan berjalan dan bulan-bulan sebelumnya, termasuk data lama dari arsip kertas, supaya tren langsung terisi.
35. Sebagai Petugas Input Data, saya ingin bulan depan tidak bisa diisi, supaya tidak ada data untuk periode yang belum terjadi.
36. Sebagai Petugas Input Data, saya ingin Indikator Semesteran hanya bisa diisi pada bulan Juni dan Desember, supaya saya tidak salah mengisinya di bulan lain.
37. Sebagai Petugas Input Data, saya ingin hanya bisa mengisi Indikator untuk Unit yang menjadi Unit Pelapor-nya pada bulan itu, supaya tidak ada Pengukuran di luar tanggung jawab Unit.
38. Sebagai Petugas Input Data, saya ingin mengisi ulang bulan yang sama berarti mengubah Pengukuran yang sama, supaya tidak ada dua angka untuk satu Indikator, Unit, dan bulan.
39. Sebagai Petugas Input Data, saya ingin melihat alasan ketika Pengukuran saya dikembalikan, memperbaikinya, lalu mengajukannya lagi, supaya kesalahan bisa dibetulkan dengan jelas.
40. Sebagai Petugas Input Data, saya ingin hanya bisa mengubah Pengukuran yang masih Draf, supaya angka yang sedang atau sudah diverifikasi tidak berubah diam-diam.
41. Sebagai Petugas Input Data, saya ingin nama pengisi tercatat otomatis dari akun saya, supaya tidak ada yang bisa mengisi atas nama orang lain.
42. Sebagai Petugas Input Data, saya ingin formulir isian nyaman dipakai di browser HP, supaya saya bisa mengisi dari ruangan tanpa komputer.

### Kepala Unit: Verifikasi

43. Sebagai Kepala Unit, saya ingin melihat antrean Pengukuran Diajukan untuk Unit-Unit saya, supaya tidak ada yang terlewat.
44. Sebagai Kepala Unit, saya ingin memverifikasi Pengukuran yang wajar, supaya angkanya ikut dihitung dalam Capaian.
45. Sebagai Kepala Unit, saya ingin mengembalikan Pengukuran ke Draf dengan alasan wajib, supaya Petugas tahu apa yang harus diperbaiki.
46. Sebagai Kepala Unit, saya ingin membuka kembali Pengukuran yang sudah Terverifikasi (statusnya kembali Diajukan) dengan alasan wajib, supaya kesalahan yang ketahuan belakangan bisa dikoreksi.
47. Sebagai Kepala Unit di Unit kecil tanpa Petugas, saya ingin mengisi, mengajukan, dan memverifikasi Pengukuran sendiri, supaya Unit saya tetap bisa melapor.
48. Sebagai Kepala Unit, saya ingin melihat riwayat status setiap Pengukuran (siapa, kapan, dari status apa ke status apa, dan alasannya), supaya setiap perubahan bisa ditelusuri.
49. Sebagai Kepala Unit, saya ingin hanya Pengukuran Terverifikasi yang dihitung dalam Capaian, supaya angka yang belum diperiksa tidak sampai ke Direktur.

### Dashboard

50. Sebagai Direktur, saya ingin Dashboard saat dibuka menampilkan bulan lalu, supaya saya tidak melihat "0 dari 13 Tercapai" di awal bulan hanya karena belum ada yang mengisi.
51. Sebagai Pengguna, saya ingin bisa memilih bulan lain di Dashboard, supaya saya bisa melihat kondisi bulan mana pun.
52. Sebagai Direktur, saya ingin melihat jumlah Indikator aktif, jumlah Tercapai, dan jumlah Belum Tercapai untuk bulan itu, supaya saya langsung tahu kondisi mutu RS.
53. Sebagai Komite Mutu, saya ingin melihat Kelengkapan bulan itu (Pengukuran Terverifikasi dibanding yang seharusnya ada), supaya saya tahu Unit mana yang perlu ditagih.
54. Sebagai Direktur, saya ingin melihat daftar Indikator yang Belum Tercapai, supaya saya tahu di mana perbaikan dibutuhkan.
55. Sebagai Kepala Unit, saya ingin melihat jumlah Pengukuran yang menunggu Verifikasi di Dashboard, supaya saya tahu ada pekerjaan yang menunggu.
56. Sebagai Petugas Input Data atau Kepala Unit, saya ingin Dashboard hanya menampilkan data Unit saya, supaya tampilannya relevan dengan tugas saya.

### Monitoring

57. Sebagai Komite Mutu, saya ingin melihat tren 12 bulan Capaian RS setiap Indikator dibanding Target yang berlaku tiap bulan, supaya arah perbaikan terlihat.
58. Sebagai Komite Mutu, saya ingin Capaian RS dihitung sebagai ΣN/ΣD dari Pengukuran Terverifikasi semua Unit Pelapor, bukan rata-rata persentase Unit, supaya hasilnya benar secara statistik. Contoh: ICU 9/10 dan Rawat Inap 50/100 menghasilkan 53,6%, bukan 70%.
59. Sebagai Komite Mutu, saya ingin Capaian RS diberi tanda "belum lengkap (3/5 Unit)" bila sebagian Unit Pelapor belum terverifikasi, supaya angka sementara tidak disangka final.
60. Sebagai Komite Mutu, saya ingin melihat selisih Capaian terhadap Target, supaya saya tahu seberapa jauh sebuah Indikator dari Target.
61. Sebagai Komite Mutu, saya ingin melihat rincian Capaian per Unit untuk setiap Indikator, supaya Unit yang menarik Capaian RS ke bawah terlihat.
62. Sebagai Komite Mutu, saya ingin Status Capaian dinilai menurut Arah Indikator, supaya indikator "makin rendah makin baik" seperti penundaan operasi elektif tidak dinilai terbalik.
63. Sebagai Komite Mutu, saya ingin Indikator Semesteran tampil sebagai satu titik per semester, supaya tren tidak dipenuhi bulan kosong.
64. Sebagai Komite Mutu, saya ingin bulan dengan ΣD = 0 tampil dengan Capaian kosong tanpa Status Capaian, supaya bulan tanpa kejadian tidak dianggap gagal.
65. Sebagai Komite Mutu, saya ingin melihat semua Pengukuran beserta statusnya di semua Unit, supaya saya bisa memantau proses pengisian.
66. Sebagai Direktur, saya ingin melihat Monitoring semua Unit, supaya saya bisa membandingkan antar Unit.
67. Sebagai Petugas Input Data atau Kepala Unit, saya ingin Monitoring hanya menampilkan Capaian Unit saya, supaya saya bisa memantau kinerja Unit sendiri.

### Operasional

68. Sebagai IT RS, saya ingin memasang MutuRS dengan docker-compose (aplikasi dan PostgreSQL) di server RS, supaya pemasangan dan pembaruan mudah.
69. Sebagai IT RS, saya ingin migrasi database dan data awal berjalan otomatis saat aplikasi mulai, supaya pembaruan versi tidak memerlukan langkah manual.
70. Sebagai IT RS, saya ingin mengatur nama RS dan zona waktu (bawaan WITA) lewat konfigurasi, supaya pergantian bulan sesuai jam setempat dan RS lain bisa memakai aplikasi yang sama.
71. Sebagai IT RS, saya ingin database di-dump otomatis setiap hari ke satu folder dan disimpan 30 hari, supaya data bisa dipulihkan dan saya bisa menyalinnya ke NAS.

## Implementation Decisions

### Arsitektur dan stack

- MutuRS berdiri sendiri, tanpa integrasi dengan SIMRS maupun SIMAR (lihat ADR-0001). MutuRS adalah sumber resmi data indikator mutu.
- Stack: Next.js 16 (App Router), Drizzle ORM, PostgreSQL 17. Polanya mengikuti repo `sistem-radiologi-digital`:
  - Logika bisnis berada di service per modul.
  - Route handler dan server action dibuat tipis.
  - Login lokal dengan hash sandi bcrypt, sesi cookie, dan pembatasan percobaan masuk.
  - Migrasi dan data awal dijalankan saat server mulai.
- Next.js 16 berbeda dari versi yang umum dikenal (misalnya `middleware` diganti `proxy`). Baca dokumentasi Next yang terpasang di `node_modules` sebelum memakai API-nya.
- Satu instalasi untuk satu RS. Konfigurasi lewat environment:
  - nama RS;
  - zona waktu (bawaan `Asia/Makassar`), yang menentukan "bulan berjalan";
  - username dan sandi Admin Sistem awal.
- Deploy: docker-compose berisi aplikasi dan PostgreSQL 17 di server RS, hanya diakses dari jaringan RS. Tampilan responsif, tanpa aplikasi native dan tanpa mode offline.
- Backup: dump database harian ke satu folder yang di-mount, disimpan 30 hari. Menyalin ke NAS menjadi tanggung jawab IT RS.
- Tidak ada data pasien di mana pun. Kolom Catatan berupa teks bebas dan diberi petunjuk agar tidak memuat identitas pasien.
- Tampilan, pesan error, dan komentar kode memakai Bahasa Indonesia.

### Modul

- **Auth/sesi:** masuk, keluar, ganti sandi, pembatasan percobaan masuk, dan pemuatan Pengguna aktif beserta peran dan Unit-nya.
- **Pengguna:** CRUD Pengguna, peran, keterkaitan Unit, reset sandi, dan nonaktif.
- **Unit:** CRUD Unit dan nonaktif.
- **Indikator:** CRUD Indikator, Target (riwayat berlaku), Unit Pelapor (periode), aturan kunci, dan nonaktif.
- **Pengukuran:** simpan Draf, ajukan, verifikasi, kembalikan, buka kembali, riwayat status, dan daftar isian per Unit dan bulan.
- **Capaian:** modul inti yang dalam, yaitu satu tempat untuk semua aturan perhitungan: Capaian, Capaian RS, Kelengkapan, Status Capaian, Target yang berlaku pada suatu bulan, Unit Pelapor yang aktif pada suatu bulan, dan bulan yang diharapkan menurut Frekuensi. Dashboard dan Monitoring hanya membaca dari modul ini.
- **Dashboard dan Monitoring:** tampilan baca yang dibatasi menurut peran dan Unit.

### Hak akses

- Lima peran tetap disimpan sebagai konstanta, tanpa tabel atau editor peran: Petugas Input Data, Kepala Unit, Komite Mutu, Direktur, Admin Sistem. Satu Pengguna punya tepat satu peran.
- Setiap fungsi service menerima Pengguna yang sedang bertindak dan memeriksa peran serta Unit di dalam service, bukan di route atau halaman.

| Peran | Pengguna/Unit | Indikator | Isi & ajukan | Verifikasi | Lihat data |
|---|---|---|---|---|---|
| Petugas Input Data | – | lihat | Unit-nya | – | Unit-nya |
| Kepala Unit | – | lihat | Unit-nya | Unit-nya | Unit-nya |
| Komite Mutu | – | kelola | – | – | semua |
| Direktur | – | lihat | – | – | semua (Dashboard, Monitoring) |
| Admin Sistem | kelola | kelola | – | – | semua |

### Skema (konseptual)

- **Pengguna:** username unik, nama, hash sandi, peran, aktif. Relasi banyak-ke-banyak dengan Unit, hanya dipakai untuk Petugas Input Data dan Kepala Unit.
- **Unit:** nama unik, aktif.
- **Indikator:**
  - kode unik, nama, kelompok (INM, IMP-RS, IMP-Unit);
  - definisi operasional (termasuk eksklusi), definisi numerator, definisi denominator, Sumber Data;
  - faktor (bilangan bulat positif, misalnya 1, 25, 100, 1000) dan satuan;
  - Arah (makin tinggi atau makin rendah makin baik);
  - Frekuensi (Bulanan atau Semesteran);
  - PIC (teks), aktif.
- **Target:** Indikator, nilai (desimal, misalnya 76,61), berlaku mulai (bulan).
  - Target untuk bulan M adalah Target dengan "berlaku mulai" terbaru yang tidak lewat dari M.
  - Target pertama sebuah Indikator berlaku juga untuk semua bulan sebelumnya, supaya data lama dari arsip tetap punya Target.
- **Unit Pelapor:** Indikator, Unit, bulan mulai, bulan berhenti (opsional).
  - Periode untuk pasangan Indikator–Unit yang sama tidak boleh tumpang tindih.
  - IMP-Unit hanya boleh punya satu Unit Pelapor yang aktif pada bulan mana pun.
- **Pengukuran:** Indikator, Unit, bulan (tanggal 1), N, D (bilangan bulat ≥ 0), Catatan, status, dan pengisi (Pengguna, diambil dari sesi). Kombinasi Indikator + Unit + bulan unik.
- **Riwayat Status Pengukuran:** Pengukuran, status asal, status tujuan, oleh, waktu, alasan.

### Status Pengukuran

| Dari | Ke | Aksi | Oleh | Syarat |
|---|---|---|---|---|
| (belum ada) / Draf | Draf | simpan | Petugas Input Data atau Kepala Unit dari Unit itu | aturan isian |
| Draf | Diajukan | ajukan | Petugas Input Data atau Kepala Unit dari Unit itu | aturan isian |
| Diajukan | Terverifikasi | verifikasi | Kepala Unit dari Unit itu | – |
| Diajukan | Draf | kembalikan | Kepala Unit dari Unit itu | alasan wajib |
| Terverifikasi | Diajukan | buka kembali | Kepala Unit dari Unit itu | alasan wajib |

Setiap perpindahan status dicatat di Riwayat Status Pengukuran.

**Aturan isian** (diperiksa setiap kali menyimpan dan mengajukan):
- N dan D bilangan bulat ≥ 0.
- Untuk faktor 100 (persen), N tidak boleh lebih dari D.
- D = 0 hanya boleh bila N = 0.
- Bulan tidak boleh melewati bulan berjalan (menurut zona waktu konfigurasi).
- Indikator Semesteran hanya untuk bulan Juni dan Desember.
- Indikator harus aktif.
- Unit harus aktif dan menjadi Unit Pelapor Indikator itu pada bulan tersebut.

### Aturan Capaian

- Capaian = N/D × faktor. Bila D = 0, Capaian kosong.
- Capaian Unit dihitung dari Pengukuran Terverifikasi Unit itu.
- Capaian RS bulan M = ΣN/ΣD × faktor atas Pengukuran Terverifikasi dari Unit Pelapor yang aktif pada bulan M. Bila ΣD = 0, Capaian RS kosong.
- Kelengkapan bulan M = jumlah Pengukuran Terverifikasi dibanding jumlah Unit Pelapor yang aktif pada bulan M. Untuk Indikator Semesteran, Kelengkapan hanya dihitung pada bulan Juni dan Desember.
- Status Capaian:
  - Arah "makin tinggi": Tercapai bila Capaian ≥ Target yang berlaku pada bulan itu.
  - Arah "makin rendah": Tercapai bila Capaian ≤ Target yang berlaku pada bulan itu.
  - Capaian kosong tidak punya Status Capaian.
- Dashboard saat dibuka menampilkan bulan lalu. Monitoring menampilkan 12 bulan yang berakhir di bulan pilihan; Indikator Semesteran hanya punya titik di bulan Juni dan Desember.

### Data awal

- 13 INM diambil dari teks PMK 30/2022 sesuai dokumen riset INM di repo, **bukan** dari seed SIMRS yang memuat kesalahan. Artinya:
  - INM-09 dihitung per item R/.
  - INM-10 dihitung per pelayanan oleh PPA.
  - INM-13 memakai N = Σ nilai persepsi, D = Σ unsur terisi, faktor 25, Frekuensi Semesteran.
  - INM-06 memakai Arah "makin rendah".
- Setiap INM mendapat satu Target awal.
- Unit Pelapor tidak di-seed karena Unit berbeda di setiap RS. Komite Mutu menetapkannya setelah instalasi.

## Testing Decisions

- **Satu seam:** fungsi service per modul, dipanggil sebagai Pengguna tertentu, memakai PostgreSQL sementara.
  - Database dibuat di awal setiap run dan dihapus di akhir, lalu dimigrasi dan diisi data awal.
  - Runner: `node:test` lewat `tsx`.
  - Prior art: skrip e2e `logistik-rs` (membuat dan menghapus database sementara) dan `sistem-radiologi-digital` (`tsx --test`).
- **Tes yang baik menguji perilaku dari luar:** data disiapkan dan dibaca lewat fungsi service (misalnya isi, ajukan, dan verifikasi Pengukuran, lalu baca Monitoring), bukan dengan memeriksa tabel atau fungsi internal.
- **Yang wajib teruji:**
  - Semua perpindahan Status Pengukuran beserta siapa yang boleh dan tidak boleh melakukannya, termasuk alasan wajib dan isi Riwayat Status.
  - Semua aturan isian: angka mustahil, bulan depan, Indikator Semesteran di luar Juni/Desember, Unit yang bukan Unit Pelapor, serta Indikator atau Unit yang nonaktif.
  - Pembatasan Unit: Petugas tidak bisa mengisi atau melihat Unit lain. Komite Mutu dan Direktur tidak bisa mengisi atau memverifikasi.
  - Capaian RS = ΣN/ΣD dengan contoh ICU 9/10 dan Rawat Inap 50/100 menghasilkan 53,6%. Kasus D = 0 dan ΣD = 0.
  - Kelengkapan dengan periode Unit Pelapor. Contoh: HCU ditambahkan mulai Maret, maka Januari dan Februari tidak menjadi "belum lengkap".
  - Target berlaku. Contoh: Target 80% diganti 85% mulai Januari 2027, maka Desember 2026 tetap dinilai dengan 80%. Target pertama berlaku mundur.
  - Status Capaian menurut Arah, termasuk Arah "makin rendah".
  - Penguncian faktor, satuan, Arah, definisi N/D, dan Frekuensi setelah ada Pengukuran.
  - Nonaktif, bukan hapus: Pengguna nonaktif tidak bisa masuk; Unit dan Indikator nonaktif hilang dari isian tetapi tetap ada di Monitoring.
  - Pembatasan percobaan masuk.
  - Data awal: 13 INM tersedia, dan INM-13 memakai faktor 25 serta Frekuensi Semesteran.
- **UI tidak dites otomatis.** Setiap tiket yang menyentuh halaman dicek manual di browser, termasuk ukuran layar HP.

## Out of Scope

- PDSA, Tindak Lanjut, dan Evaluasi (Rilis 2).
- Laporan dan ekspor PDF/Excel (termasuk format untuk SIMAR), notifikasi, dan audit trail lengkap (Rilis 3). Riwayat Status Pengukuran sudah termasuk Rilis 1.
- Integrasi dengan SIMRS (ADR-0001) dan SIMAR. Pelaporan ke Kemenkes tetap manual oleh Komite Mutu.
- Aplikasi native, mode offline, dan akses dari luar jaringan RS (diurus jaringan RS lewat VPN).
- Banyak RS dalam satu instalasi.
- Editor hak akses atau peran kustom.
- Tenggat pengisian, penguncian bulan, dan peringatan kewajaran otomatis.
- Data pasien dalam bentuk apa pun.
- Penyalinan backup ke luar server.
- Pendaftaran mandiri dan pemulihan sandi lewat email.

## Further Notes

- Istilah mengikuti `GLOSSARY.md`. Keputusan arsitektur ada di ADR-0001. Daftar INM resmi dan perbedaannya dengan seed SIMRS ada di dokumen riset INM.
- Beberapa keputusan kecil disimpulkan dari pembahasan tanpa ditanyakan satu per satu:
  - Pengguna bisa mengganti sandinya sendiri.
  - Petugas Input Data hanya bisa mengubah Pengukuran berstatus Draf.
  - Membuka kembali Pengukuran Terverifikasi wajib disertai alasan.
  - Target pertama berlaku mundur ke semua bulan sebelumnya.
  - Nama, definisi operasional, Sumber Data, dan PIC tetap bisa diubah setelah ada Pengukuran.
- Sebelum menu indikator mutu di SIMRS dinonaktifkan, perlu diingat bahwa seed SIMRS memuat kesalahan definisi INM-09, INM-10, dan INM-13 (rincian di dokumen riset).
