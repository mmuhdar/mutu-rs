# Spec: MutuRS Rilis 2 — Analisis, Tindak Lanjut, dan PDSA

Status: ready-for-agent (2026-11-01, branch `rilis-2-pdsa`)

## Problem Statement

Rilis 1 mengumpulkan Pengukuran, memverifikasinya, dan menghitung Capaian. Siklus perbaikannya belum ada di aplikasi:

- Analisis setiap Indikator (mengapa tercapai atau tidak) masih ditulis di luar aplikasi, padahal SIMAR meminta "Analisa Capaian" dan "Rencana Tindak Lanjut" untuk setiap INM setiap bulan.
- Tindakan perbaikan tidak tercatat dengan PIC dan tenggat, jadi tidak terlihat mana yang lewat tenggat atau belum selesai.
- Uji coba perbaikan (PDSA) tidak terhubung dengan data Capaian, padahal surveior PMKP 6 meminta bukti Plan, Do skala kecil, Study, Act, dan **kesinambungan data**: pengumpulan data, validasi, analisis, rencana perbaikan, implementasi, sampai bukti Capaian yang membaik terus-menerus.

Rilis 1 sudah menyediakan dua mata rantai pertama (Pengukuran dan Verifikasi). Rilis 2 melengkapi sisanya di tempat yang sama.

## Solution

- **Analisis**: catatan tertulis tentang Capaian satu Indikator dalam satu Lingkup (RS atau satu Unit) untuk satu bulan, ditulis di samping Capaian, Target, Kelengkapan, dan Status Capaian terkini bulan itu.
- **Tindak Lanjut**: tindakan konkret milik sebuah Analisis, dengan PIC, tenggat, dan status; yang lewat tenggat ditandai.
- **PDSA**: siklus uji coba perbaikan untuk satu Indikator dalam satu Lingkup. Tahap Study menampilkan grafik Capaian sebelum dan selama uji coba dari data Rilis 1. Siklus berikutnya tertaut ke siklus sebelumnya.
- Dashboard menunjukkan Analisis yang belum ditulis, Tindak Lanjut lewat tenggat, dan PDSA yang sedang berjalan.

Dasar regulasi dan bukti surveior: `docs/research/pdsa-tindak-lanjut-evaluasi.md`.

## User Stories

### Analisis

1. Sebagai Komite Mutu, saya ingin menulis Analisis Lingkup RS untuk setiap INM dan IMP-RS setiap bulan, supaya isian "Analisa Capaian" SIMAR tersedia dari satu tempat.
2. Sebagai Kepala Unit, saya ingin menulis Analisis untuk IMP-Unit Unit saya, supaya Indikator milik Unit dianalisis oleh Unit itu sendiri.
3. Sebagai Kepala Unit, saya ingin bisa menulis Analisis Lingkup Unit untuk INM dan IMP-RS bila Unit saya punya masalah sendiri, supaya penyebab di tingkat Unit tercatat.
4. Sebagai penulis Analisis, saya ingin melihat Capaian, Target, Kelengkapan, dan Status Capaian terkini bulan itu di samping isian, supaya Analisis selalu dibaca bersama angkanya.
5. Sebagai Komite Mutu, saya ingin Analisis IMP-Unit Lingkup RS ditolak, supaya Indikator milik satu Unit tidak dianalisis dua kali.
6. Sebagai penulis Analisis, saya ingin Analisis untuk Indikator yang tidak dinilai bulan itu (bukan Unit Pelapor, di luar Juni/Desember untuk Semesteran, bulan yang belum berjalan, Indikator nonaktif) ditolak, supaya tidak ada Analisis tanpa Capaian yang bisa dianalisis.
7. Sebagai pembaca, saya ingin membuka Analisis dari tabel Monitoring setiap bulan (baris RS dan setiap Unit), dengan tanda "Belum dianalisis" bila belum ada, supaya Analisis dibaca bersama tren-nya.
8. Sebagai Petugas Input Data, saya ingin membaca Analisis dan Tindak Lanjut Unit saya, supaya saya tahu apa yang sedang diperbaiki.

### Tindak Lanjut

9. Sebagai penulis Analisis, saya ingin menambahkan Tindak Lanjut berisi tindakan, PIC (nama atau jabatan), dan tenggat, supaya rencana perbaikan bisa ditagih.
10. Sebagai penulis Analisis, saya ingin mengubah status Tindak Lanjut (Direncanakan, Berjalan, Selesai, Dibatalkan), dengan catatan hasil wajib saat Selesai dan alasan wajib saat Dibatalkan, supaya hasil setiap tindakan tercatat.
11. Sebagai Komite Mutu, saya ingin melihat semua Tindak Lanjut yang belum selesai, urut tenggat, dengan yang lewat tenggat paling atas dan ditandai tulisan "Lewat tenggat", supaya saya tahu mana yang perlu ditagih.
12. Sebagai penulis Analisis bulan ini, saya ingin melihat Tindak Lanjut bulan-bulan sebelumnya untuk Indikator dan Lingkup yang sama yang masih Direncanakan atau Berjalan, supaya tindakan lama tidak terlupa.
13. Sebagai Komite Mutu, saya ingin Tindak Lanjut tidak bisa dihapus, supaya rantai bukti perbaikan tidak terputus.

### PDSA

14. Sebagai Komite Mutu atau Kepala Unit, saya ingin memulai PDSA untuk satu Indikator dan satu Lingkup dengan judul dan Plan (masalah, tujuan, prediksi, rencana perubahan skala kecil, bulan mulai, bulan akhir uji coba), supaya uji coba perbaikan terencana.
15. Sebagai pelaksana PDSA, saya ingin mengisi tahap Do, Study, dan Act berurutan, dan tetap bisa memperbaiki teks tahap yang sudah lewat, supaya catatan uji coba lengkap.
16. Sebagai pelaksana PDSA, saya ingin tahap Study menampilkan grafik dan tabel Capaian Lingkup itu selama 12 bulan sampai bulan akhir uji coba, dengan periode uji coba ditandai, supaya hasil dibandingkan dengan data, bukan perkiraan.
17. Sebagai pelaksana PDSA, saya ingin tahap Act mencatat keputusan Adopsi, Adaptasi, atau Tinggalkan beserta penjelasannya (misalnya SPO atau regulasi baru yang diterapkan luas), supaya bukti PMKP 6 EP c tersedia.
18. Sebagai pelaksana PDSA, saya ingin memulai siklus berikutnya dari PDSA yang sudah selesai, tertaut ke siklus sebelumnya, supaya rangkaian siklus untuk satu masalah terlihat.
19. Sebagai Komite Mutu, saya ingin melihat daftar PDSA yang sedang berjalan beserta tahap aktifnya, supaya kemajuan perbaikan terpantau.
20. Sebagai penulis Analisis, saya ingin melihat PDSA yang sedang berjalan untuk Indikator dan Lingkup yang sama, dan bisa memulai PDSA langsung dari halaman Analisis.

### Dashboard dan hak akses

21. Sebagai Komite Mutu, saya ingin Dashboard menampilkan daftar Analisis yang belum ditulis untuk bulan itu, supaya tidak ada Indikator yang terlewat dianalisis.
22. Sebagai Kepala Unit, saya ingin Dashboard menampilkan IMP-Unit Unit saya yang belum dianalisis.
23. Sebagai Pengguna, saya ingin Dashboard menampilkan jumlah Tindak Lanjut lewat tenggat dan jumlah PDSA yang sedang berjalan yang boleh saya lihat, supaya pekerjaan perbaikan terlihat.
24. Sebagai Direktur, saya ingin membaca semua Analisis, Tindak Lanjut, dan PDSA, supaya saya tahu perbaikan apa yang sedang dijalankan.
25. Sebagai Kepala Unit dan Petugas Input Data, saya ingin hanya melihat Lingkup Unit saya, sesuai Rilis 1 yang tidak menampilkan Capaian RS kepada mereka.

## Implementation Decisions

### Istilah

`GLOSSARY.md` bagian **Perbaikan**: Lingkup, Analisis, Tindak Lanjut, PDSA. Kata "Evaluasi" dihindari (dipakai dalam sedikitnya lima arti di regulasi; laporan triwulan ke Direktur masuk Rilis 3).

### Modul

- Satu modul baru `src/modules/perbaikan/service.ts` (Analisis, Tindak Lanjut, PDSA), aturan murni dan konstanta di `src/lib/perbaikan.ts`.
- Angka Capaian di halaman Analisis dan grafik Study hanya dari `trenCapaian` (modul Capaian); modul Perbaikan tidak menghitung Capaian sendiri.
- Hari ini (untuk "lewat tenggat") dari `hariIni()` di `src/lib/bulan.ts`, menurut zona waktu konfigurasi seperti `bulanBerjalan()`.

### Lingkup dan hak akses

- Lingkup = `unitId` yang boleh null; null = Lingkup RS.
- Menulis (Analisis, Tindak Lanjut, PDSA): Komite Mutu dan Admin Sistem untuk semua Lingkup; Kepala Unit hanya untuk Lingkup Unit di `aktor.unitIds`. Petugas Input Data dan Direktur tidak menulis.
- Membaca: Komite Mutu, Direktur, Admin Sistem semua Lingkup (sama dengan `melihatCapaianRs`); Kepala Unit dan Petugas Input Data hanya Lingkup Unit di `aktor.unitIds`.
- Diperiksa di service; halaman memakai helper service untuk tampilan.

### Skema (konseptual)

- **Analisis**: Indikator, Unit (null = RS), bulan (tanggal 1), teks, diubah oleh, diubah pada. Unik per Indikator + Unit + bulan (`NULLS NOT DISTINCT`).
- **Tindak Lanjut**: Analisis, tindakan, PIC (teks), tenggat (tanggal), status (`direncanakan`, `berjalan`, `selesai`, `dibatalkan`), catatan (hasil saat Selesai, alasan saat Dibatalkan), diubah oleh, diubah pada.
- **PDSA**: Indikator, Unit (null = RS), judul, siklus ke-n, siklus sebelumnya (unik, jadi satu siklus hanya punya satu siklus berikutnya), tahap aktif (`plan`, `do`, `study`, `act`, `selesai`), bulan mulai dan bulan akhir uji coba, Plan (masalah, tujuan, prediksi, rencana), Do (pelaksanaan), Study (hasil), Act (keputusan `adopsi`/`adaptasi`/`tinggalkan`, penjelasan), diubah oleh, diubah pada.
- Tidak ada yang dihapus. Identitas (Indikator, Lingkup, bulan) tidak bisa diubah. Teks bisa diubah kapan saja oleh yang berhak; yang disimpan hanya pengubah dan waktu terakhir (riwayat lengkap = audit trail Rilis 3).

### Aturan Analisis

- Satu Analisis per Indikator + Lingkup + bulan; menyimpan lagi mengubah yang sama. Teks wajib, satu isian (seperti "Analisa Capaian" SIMAR).
- Bulan valid dan tidak setelah bulan berjalan.
- Indikator aktif dan dinilai bulan itu: punya Unit Pelapor pada bulan itu dan bulannya sesuai Frekuensi.
- Lingkup Unit: Unit itu Unit Pelapor Indikator pada bulan itu (Unit yang kini nonaktif tetap boleh). IMP-Unit dengan Lingkup RS ditolak.
- Yang diharapkan ada (hanya untuk daftar "Belum dianalisis", tidak memblokir apa pun): Lingkup RS untuk INM dan IMP-RS yang dinilai bulan itu, termasuk yang Tercapai; Lingkup Unit untuk IMP-Unit (Unit Pelapor-nya). Analisis Lingkup Unit untuk INM/IMP-RS opsional.
- Halaman Analisis menampilkan Capaian terkini, bukan salinan angka saat Analisis ditulis.
- Mengubah Analisis yang sudah ada juga hanya selama bulan itu bisa dianalisis. Bila tidak lagi (Indikator dinonaktifkan, periode Unit Pelapor diakhiri), Analisis tampil hanya-baca, sedangkan Tindak Lanjut-nya tetap bisa diubah dan ditutup oleh yang berhak.

### Aturan Tindak Lanjut

- Selalu milik satu Analisis (ikut Indikator, Lingkup, dan bulannya); Analisis harus sudah disimpan.
- Tindakan dan PIC wajib; tenggat = tanggal valid. Status awal Direncanakan; status boleh diubah bebas oleh yang berhak.
- Catatan wajib saat Selesai (hasil) dan Dibatalkan (alasan).
- Lewat tenggat = tenggat sebelum hari ini dan status Direncanakan atau Berjalan; dihitung, bukan status.

### Aturan PDSA

| Tahap aktif | Diisi | Isian wajib (setiap simpan, juga "Simpan dan lanjut") |
|---|---|---|
| (dibuat) | judul + Plan | judul, masalah, tujuan, prediksi, rencana wajib; bulan akhir ≥ bulan mulai |
| `do` | pelaksanaan | pelaksanaan wajib |
| `study` | hasil (+ grafik otomatis) | hasil wajib |
| `act` | keputusan + penjelasan | keputusan dan penjelasan wajib |
| `selesai` | – | boleh memulai siklus berikutnya (sekali) |

- Membuat PDSA = Plan tersimpan, tahap aktif langsung `do`. Tahap hanya maju berurutan, tanpa syarat waktu. Isian tahap selalu wajib saat disimpan; "Simpan dan lanjut" hanya untuk tahap aktif. Teks tahap yang sudah lewat tetap bisa diperbaiki; teks tahap yang belum dicapai tidak bisa diisi.
- Saat dibuat: Indikator aktif; Lingkup Unit = Unit aktif dan Unit Pelapor Indikator pada bulan mulai; IMP-Unit dengan Lingkup RS ditolak. Bulan mulai boleh di masa depan.
- Siklus berikutnya: dari PDSA `selesai`, Indikator, Lingkup, dan judul disalin, siklus ke-n + 1, Plan baru diisi. Satu siklus hanya punya satu siklus berikutnya. Judul setiap siklus tetap bisa diperbaiki sendiri lewat Plan.
- Grafik Study: `trenCapaian` 12 bulan yang berakhir di bulan akhir uji coba (atau bulan berjalan bila belum lewat), deret RS atau Unit Lingkup itu, periode uji coba ditandai. Ponytail: uji coba lebih dari 12 bulan hanya terlihat sebagian.

### Tampilan

- `/analisis?indikator=&unit=&bulan=` (unit kosong = RS): satu-satunya tempat menulis Analisis dan mengelola Tindak Lanjut-nya. Berisi Capaian terkini, form Analisis, Tindak Lanjut miliknya, Tindak Lanjut bulan sebelumnya yang masih terbuka, PDSA berjalan untuk Indikator + Lingkup yang sama, dan tombol "Mulai PDSA".
- Analisis tanpa menu sendiri; dibuka dari tabel Monitoring (tautan per bulan, baris RS dan Unit) dan dari Dashboard.
- Menu **Tindak Lanjut** (`/tindak-lanjut`, semua peran): bawaan yang Direncanakan/Berjalan, urut tenggat (lewat tenggat di atas), saringan status dan Unit; baris menaut ke halaman Analisis-nya.
- Menu **PDSA** (`/pdsa`, semua peran): daftar (bawaan belum Selesai), `/pdsa/baru`, `/pdsa/[id]` (semua tahap, form tahap aktif, perbaikan tahap lalu, grafik Study, tautan siklus sebelum/sesudah).
- Dashboard: daftar "Belum dianalisis" bulan itu, jumlah Tindak Lanjut lewat tenggat (semua bulan), jumlah PDSA berjalan; semua dari service.

## Testing Decisions

- Seam sama dengan Rilis 1: fungsi service dipanggil sebagai Pengguna sungguhan (`tests/bantuan.ts`), database sementara. Data disiapkan dan dibaca lewat service.
- Yang wajib teruji:
  - Hak tulis dan baca per peran dan Lingkup untuk Analisis, Tindak Lanjut, dan PDSA (Kepala Unit Unit lain, Petugas, Direktur ditolak menulis; Petugas/Kepala Unit tidak membaca Lingkup RS).
  - Aturan Analisis: bukan Unit Pelapor, Semesteran di luar Juni/Desember, bulan depan, Indikator nonaktif, IMP-Unit Lingkup RS, Unit nonaktif yang masih Unit Pelapor bulan itu diterima; simpan ulang mengubah Analisis yang sama.
  - Capaian di halaman Analisis mengikuti Pengukuran terkini (berubah setelah Pengukuran dibuka kembali).
  - Tindak Lanjut: catatan wajib saat Selesai/Dibatalkan, lewat tenggat menurut hari ini di zona waktu konfigurasi, urutan daftar, Tindak Lanjut terbuka bulan sebelumnya.
  - PDSA: urutan tahap, syarat lanjut, teks tahap yang belum dicapai ditolak, aturan saat dibuat, siklus berikutnya hanya dari `selesai` dan hanya sekali, deret Study untuk Lingkup RS dan Unit.
  - Belum dianalisis: INM/IMP-RS Lingkup RS, IMP-Unit Lingkup Unit, Semesteran, saringan Unit untuk Kepala Unit.
- UI dicek manual di browser, termasuk 390 px.

## Out of Scope

- Laporan triwulan ke Direktur/Dewan Pengawas dan ekspor SIMAR (Rilis 3; Tindak Lanjut nanti digabung menjadi teks "Rencana Tindak Lanjut").
- Notifikasi atau pengingat tenggat, riwayat perubahan lengkap (Rilis 3).
- Unggah berkas; bukti fisik dirujuk lewat teks.
- Persetujuan atau umpan balik Direktur atas Analisis dan PDSA; penandaan "prioritas perbaikan"; analisis efisiensi tahunan (PMKP 4 EP g).
- Menghapus Analisis, Tindak Lanjut, atau PDSA.

## Further Notes

- Semua keputusan desain diambil dari sesi tanya-jawab 2026-11-01 (Q1–Q26); user menyerahkan sisanya.
- PDSA tidak diwajibkan peraturan; hanya diperiksa surveior (PMKP 6). Status Capaian "Belum Tercapai" tidak otomatis mewajibkan PDSA.
