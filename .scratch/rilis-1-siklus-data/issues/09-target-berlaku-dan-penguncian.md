# 09: Target berlaku dan penguncian Indikator

**What to build:** Komite Mutu bisa menetapkan Target baru yang berlaku mulai bulan tertentu dan melihat riwayat Target, sementara bulan-bulan sebelumnya tetap dinilai dengan Target lamanya. Setelah Indikator punya Pengukuran, field yang menentukan cara hitung terkunci, supaya tren tidak mencampur dua cara hitung.

**Blocked by:** 07 (Isi dan ajukan Pengukuran)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Komite Mutu dan Admin Sistem bisa menambah Target dengan nilai dan bulan mulai berlaku. Menetapkan Target untuk bulan mulai yang sudah punya Target akan mengganti nilainya; ini dipakai untuk koreksi salah ketik. Riwayat Target tampil di detail Indikator.
- [ ] Ada satu fungsi "Target berlaku untuk Indikator X pada bulan M". Fungsi ini memilih Target dengan bulan mulai terbaru yang tidak lewat dari M. Target pertama juga berlaku untuk semua bulan sebelumnya. Fungsi ini teruji karena dipakai modul Capaian (10).
- [ ] Faktor, satuan, Arah, definisi N/D, dan Frekuensi tidak bisa diubah bila Indikator sudah punya Pengukuran dengan status apa pun. Formulir menampilkan field itu terkunci beserta alasannya, dan menyarankan membuat Indikator baru lalu menonaktifkan yang lama.
- [ ] Nama, definisi operasional, Sumber Data, dan PIC tetap bisa diubah.
- [ ] Tes service: contoh Target 80% diganti 85% mulai Januari 2027, sehingga Desember 2026 = 80% dan Januari 2027 = 85%. Target pertama berlaku mundur. Penggantian Target pada bulan mulai yang sama. Penguncian setiap field setelah ada Pengukuran, sementara field teks tetap bisa diubah.
