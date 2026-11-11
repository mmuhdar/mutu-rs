# Laporan Rilis 3 MutuRS — Laporan Triwulan, Rekap SIMAR, dan pengingat (11 November 2026)

## Ringkasan

- **Keempat tiket selesai** (spec `.scratch/rilis-3-laporan/spec.md`). Kodenya ada di branch **`rilis-3-laporan`** dan **belum di-merge** ke `main`. Repo ini tidak punya remote, jadi belum ada yang di-push.
- Sebelum Rilis 3 dimulai, Rilis 2 sudah di-merge ke `main` atas persetujuan Anda, dan `scripts/data-dummy.ts` sudah di-commit.
- `npm run check` lulus: typecheck, lint, dan **190 tes service** (Rilis 2 punya 162). `next build` produksi juga lulus.
- **Proses yang sudah dijalankan:**
  1. Sesi tanya-jawab Q1–Q13. Anda menyetujui semua rekomendasi lalu menyerahkan sisa keputusan.
  2. Riset Juknis SIMAR Ver.07.2024 untuk mengetahui cara input, isian, dan tenggat SIMAR.
  3. Glosarium bagian **Pelaporan** dibuat: Triwulan, Capaian Triwulan, Laporan Triwulan, Rekomendasi, dan Rekap SIMAR. Definisi Tindak Lanjut ditambah "mendekati tenggat".
  4. Tiket dikerjakan dengan TDD, dan setiap tiket dicek di browser.
  5. Code review dua sisi (standar kode dan kesesuaian spec), lalu satu batch perbaikan.
  6. QA akhir:
     - Dev server: empat peran, 11 halaman, lebar 1280 px dan 390 px. Tidak ada horizontal overflow dan tidak ada error konsol.
     - Build produksi docker (stack demo `mutu-e2e`): halaman yang sama, unduhan CSV, dan PDF cetak.

### Yang baru di aplikasi

Ada kelompok menu baru **Laporan**, hanya untuk Komite Mutu, Direktur, dan Admin Sistem.

- **Laporan Triwulan** (`/laporan?triwulan=`), bawaannya Triwulan terakhir yang sudah selesai. Isinya:
  1. Ringkasan: Indikator yang dinilai, Tercapai, Belum Tercapai, dan Kelengkapan.
  2. Tabel Capaian per kelompok (INM, IMP-RS, IMP-Unit): Target, Capaian tiap bulan, Capaian Triwulan (ΣN/ΣD tiga bulan), Status Capaian, dan Kelengkapan.
  3. Analisis setiap bulan per Indikator, dengan Tindak Lanjut di bawahnya. Bulan yang belum dianalisis ditandai "Belum dianalisis".
  4. PDSA yang periode uji cobanya bersinggungan dengan Triwulan itu, termasuk hasil Study dan keputusan Act.
  5. **Rekomendasi** yang ditulis Komite Mutu atau Admin Sistem. Direktur hanya membaca.
  6. Tombol **Cetak / Simpan PDF**: PDF A4 tanpa menu aplikasi, dengan kolom tanda tangan Direktur dan Ketua Komite Mutu.
  7. Tombol **Unduh CSV**: tabel Capaian untuk Excel.
- **Rekap SIMAR** (`/simar?bulan=`), bawaannya bulan lalu. Per INM, dengan urutan seperti form SIMAR, tampil:
  - N, D, dan Capaian;
  - "Analisa Capaian", diambil dari Analisis Lingkup RS;
  - "Rencana Tindak Lanjut", diambil dari Tindak Lanjut-nya;
  - tombol **Salin** di setiap isian, yang tetap bekerja walau aplikasi dibuka lewat `http://` di jaringan RS;
  - tanda "Belum siap" beserta alasannya:
    - Kelengkapan belum penuh;
    - belum ada Unit Pelapor;
    - belum ada Analisis atau Tindak Lanjut;
    - D kebersihan tangan di bawah 200;
    - D = 0 tanpa keterangan;
    - teks lebih dari 1000 karakter.
- **Pengingat di dalam aplikasi:**
  - Tindak Lanjut yang tenggatnya hari ini sampai 7 hari lagi ditandai **"mendekati"** di daftar Tindak Lanjut dan dihitung di Dashboard ("Perlu tindakan").
  - Dashboard Komite Mutu dan Admin Sistem menampilkan **"SIMAR <bulan lalu>: x/y INM siap, paling lambat 10 …"** yang menaut ke Rekap SIMAR.
  - Kartu "Lapor SIMAR" di sidebar kini menaut ke Rekap SIMAR dan menyebut bila tenggatnya sudah lewat.

## Cara mencoba

### Demo produksi (stack yang sama dengan Rilis 1–2, sudah dibangun ulang dengan Rilis 3)

```
docker start mutu-e2e-db-1 mutu-e2e-app-1 mutu-e2e-backup-1
```

Buka http://localhost:3917. Akunnya sama seperti sebelumnya (`komite`, `direktur`, `kepala_icu`, `petugas_icu` bersandi `sandi-e2e-123`; `admin` bersandi `admin-e2e-123`). Data demo hanya mencakup September–Oktober 2026, jadi Laporan Triwulan III 2026 di sana tipis. Untuk laporan yang terisi penuh, pakai database dev di bawah.

Menghentikan demo: `docker stop mutu-e2e-app-1 mutu-e2e-backup-1 mutu-e2e-db-1`.

Untuk membangun ulang demo, buat file env berisi `POSTGRES_PASSWORD=e2e_sandi_kuat`, `APP_PORT=3917`, `NAMA_RS="RSUD Uji E2E"`, `ADMIN_PASSWORD=admin-e2e-123`, `BACKUP_DIR=<folder>`, lalu jalankan `docker compose -p mutu-e2e --env-file <file> up -d --build`.

### Development dengan data dummy 12 bulan (lebih lengkap)

```
npx next dev -p 3456      # database dev mutu-rs-db sudah berisi data dummy
```

Buka http://localhost:3456 dan masuk sebagai `komite` atau `direktur` (sandi `mutu12345`).

- Laporan Triwulan III 2026 sudah memuat:
  - Capaian semua Indikator;
  - Analisis dan Tindak Lanjut bulan September;
  - dua PDSA;
  - satu Rekomendasi contoh dari QA.
- Rekap SIMAR yang paling menarik adalah September 2026 (`/simar?bulan=2026-09`), karena 2 dari 12 INM sudah siap.

Migrasi baru (`0010_rekomendasi`) berjalan otomatis saat aplikasi mulai. Tidak ada variabel environment baru.

## Yang perlu Anda cek manual (urut prioritas)

1. **Cetak / Simpan PDF di browser Anda sendiri (Chrome dan Firefox).** QA saya memakai Chromium headless karena ekstensi Chrome tidak tersambung. Cek tiga hal:
   - Hasilnya A4 tegak, semua kolom tabel muat, dan kolom tanda tangan ada di akhir.
   - Matikan "Header dan footer" di dialog cetak supaya alamat situs dan tanggal browser tidak ikut tercetak.
   - Aktifkan "Grafik latar belakang" bila ingin label status tetap berwarna.
2. **Buka CSV di Excel komputer RS.** Dengan pengaturan regional Indonesia, kolomnya terpisah rapi. Bila Excel-nya berbahasa Inggris, semua isi bisa masuk ke satu kolom. Kabari saya bila itu terjadi, supaya saya ganti dengan berkas `.xlsx` asli.
3. **Tombol Salin di Rekap SIMAR dari komputer lain di jaringan RS**, lewat `http://<IP-server>`, bukan `localhost`. Bandingkan juga urutan dan isiannya dengan form SIMAR yang sebenarnya.
4. **Kesesuaian dengan praktik RS.** Sebaiknya dibaca orang mutu RS:
   - Apakah susunan Laporan Triwulan cocok dengan laporan PMKP yang biasa dikirim ke Direktur dan Dewan Pengawas?
   - Apakah satu isian Rekomendasi cukup?
   - Apakah format "Rencana Tindak Lanjut" (`1. tindakan (PIC: …, tenggat …)`) layak dikirim ke SIMAR?
5. **Daftar keputusan di bawah.** Koreksi bila ada yang tidak sesuai keinginan Anda.

## Keputusan yang saya ambil sendiri

### Laporan Triwulan

- Hanya Triwulan yang **sudah selesai** yang bisa dibuka dan diberi Rekomendasi. Triwulan IV 2026 baru bisa dibuka mulai 1 Januari 2027.
- Alamat dengan Triwulan yang tidak valid atau belum selesai menampilkan Triwulan bawaan disertai pemberitahuan.
- **Capaian Triwulan** dihitung dari ΣN/ΣD Pengukuran Terverifikasi ketiga bulan, lalu dinilai dengan **Target bulan terakhir** Triwulan. Indikator Semesteran hanya muncul di Triwulan II dan IV.
- Indikator yang **kini nonaktif** tetap dimuat bila punya Pengukuran Terverifikasi dalam Triwulan itu. Dengan begitu, laporan TW III yang dicetak setelah sebuah IMP dinonaktifkan tetap lengkap.
- Analisis yang dimuat:
  - INM dan IMP-RS: Lingkup RS saja. Analisis Lingkup Unit untuk INM/IMP-RS tidak dimuat, supaya laporan tidak terlalu panjang.
  - IMP-Unit: Lingkup Unit Pelapor-nya.
- Bagian Analisis dan Tindak Lanjut **digabung per Indikator**: setiap Tindak Lanjut ditulis di bawah Analisis-nya dengan status terkini, termasuk tanda lewat atau mendekati tenggat.
- Urutan laporan per kelompok: INM, IMP-RS, lalu IMP-Unit, masing-masing urut kode.
- Rekomendasi paling panjang 8000 karakter, bisa diubah kapan saja, dan tanpa riwayat. Yang tersimpan hanya pengubah dan waktu terakhir.
- Kepala laporan menulis **"data per <waktu halaman dibuka>"**, bukan waktu cetak. Laporan tidak dibekukan; arsipnya adalah PDF.
- Kolom tanda tangan hanya muncul di hasil cetak:
  - kiri: "Mengetahui, Direktur";
  - kanan: tanggal hari ini dan "Ketua Komite Mutu", tanpa nama kota.
- Tampilan cetak A4 tegak dengan tabel dipadatkan (huruf 11 px).
- Pemilih Triwulan menampilkan 8 Triwulan selesai terakhir.

### CSV

- Hanya tabel Capaian. Analisis dan teks lain tetap di PDF.
- Kelengkapan dipecah menjadi dua kolom angka, karena teks "3/3" dibaca Excel sebagai tanggal 3 Maret.
- Angka memakai paling banyak dua desimal, sama seperti di layar.
- Teks yang diawali `= + - @` diberi petik supaya tidak dijalankan Excel sebagai rumus.

### Rekap SIMAR

- Yang dimuat hanya **INM aktif** yang diukur bulan itu. INM tanpa Unit Pelapor tetap tampil dengan tanda.
- Direktur boleh membaca, tetapi hanya mendapat tautan "Lihat Analisis".
- **Rencana Tindak Lanjut**:
  - Memuat semua Tindak Lanjut Analisis bulan itu **kecuali yang Dibatalkan**. Yang Selesai tetap ikut.
  - Statusnya tidak ditulis.
- Tanda D di bawah minimal SIMAR (200 untuk INM-01) dan D = 0:
  - Tanda D di bawah minimal hanya muncul bila Kelengkapan sudah penuh dan D > 0.
  - D = 0 dengan Kelengkapan penuh tanpa Analisis diberi tanda "tulis keterangan tidak ada layanan" sebagai ganti "Belum dianalisis".
- Teks lebih dari 1000 karakter **ditandai, tidak dipotong**.
- Tidak ada isian SIMAR tersendiri. Teksnya diubah lewat halaman Analisis.
- Tenggat ditulis "pukul 23.59" sesuai Juknis hal. 19.

### Pengingat

- "Mendekati tenggat" = tenggat hari ini sampai 7 hari lagi (termasuk keduanya), hanya untuk status Direncanakan atau Berjalan.
- Jumlah "mendekati tenggat" di Dashboard mencakup semua bulan, sama seperti "lewat tenggat".
- Kartu SIMAR di Dashboard dan sidebar selalu tentang **bulan lalu**. Setelah tanggal 10, kartunya menulis "sudah lewat" sampai bulan berganti.

## Batasan yang diketahui

- **Audit trail dan notifikasi email/WhatsApp tidak dikerjakan** sesuai keputusan Q1–Q2. Pengingat hanya muncul di dalam aplikasi.
- Isi laporan tidak dibekukan. Bila Pengukuran dibuka kembali setelah laporan dicetak, angka di layar bisa berbeda dari PDF arsip.
- CSV bukan `.xlsx`. Lihat cek manual nomor 2.
- Aturan SIMAR diambil dari Juknis Ver.07.2024. Batas 1000 karakter hanya terlihat di gambar form dan tidak dijelaskan juknis. Aplikasi SIMAR sekarang bisa saja berbeda.
- QA browser memakai Chromium headless (Playwright), bukan Firefox atau HP sungguhan.
- **Temuan keamanan, belum saya periksa sendiri:** agen riset melihat halaman login SIMAR memuat skrip dari domain asing (`raineyeshadowguilty.com`, aktif 02.00–05.00). Sebaiknya diteruskan ke IT RS. MutuRS tidak terhubung ke SIMAR.

## Langkah berikutnya

1. Setelah dicek: `git switch main && git merge --ff-only rilis-3-laporan`.
2. Kandidat Rilis 4, perlu sesi tanya-jawab:
   - audit trail (riwayat perubahan Indikator, Target, Analisis, Tindak Lanjut, PDSA);
   - notifikasi email/WhatsApp, bila server RS punya akses internet atau SMTP;
   - umpan balik tertulis Dewan Pengawas (TKRS 1);
   - analisis efisiensi proyek prioritas (PMKP 4 g);
   - bukti validasi data (PMKP 5).
