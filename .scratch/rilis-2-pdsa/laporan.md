# Laporan Rilis 2 MutuRS — Analisis, Tindak Lanjut, dan PDSA (1 November 2026)

## Ringkasan

- **Semua 5 tiket selesai** (spec `.scratch/rilis-2-pdsa/spec.md`). Kodenya ada di branch **`rilis-2-pdsa`**, berisi 8 commit di atas `main`, dan **belum di-merge**.
- **Rilis 1 sudah di-merge** fast-forward ke `main` atas persetujuan Anda. Repo ini tidak punya remote, jadi belum ada yang di-push.
- `npm run check` lulus: typecheck, lint, dan **162 tes service**. Rilis 1 punya 117 tes, Rilis 2 menambah 45.
- **Proses yang sudah dijalankan:**
  1. Sesi tanya-jawab Q1–Q26. Anda menyetujui semua rekomendasi lalu menyerahkan sisa keputusan.
  2. Riset regulasi PDSA dan pelaporan, hasilnya di `docs/research/pdsa-tindak-lanjut-evaluasi.md`.
  3. Glosarium bagian **Perbaikan** dibuat.
  4. Tiket dikerjakan dengan TDD, termasuk pengecekan browser untuk setiap tiket.
  5. Code review dua sisi (standar kode dan kesesuaian spec), lalu satu batch perbaikan.
  6. **Dua kali QA end-to-end** di build produksi docker compose, desktop 1280 px dan HP 390 px, untuk lima peran. Pass kedua mencakup 32 halaman, termasuk halaman Rilis 1, tanpa horizontal overflow dan tanpa error konsol.

### Yang baru di aplikasi

- **Analisis** (`/analisis?indikator=&unit=&bulan=`) adalah catatan atas Capaian satu Indikator dalam satu Lingkup (RS atau satu Unit) untuk satu bulan.
  - Ditulis di samping Capaian, Target, Status Capaian, dan Kelengkapan terkini.
  - Dibuka dari tabel Monitoring (tautan "Analisis" atau "Belum dianalisis" per bulan) dan dari Dashboard.
- **Tindak Lanjut** adalah tindakan milik sebuah Analisis, berisi PIC, tenggat, dan status (Direncanakan, Berjalan, Selesai, atau Dibatalkan).
  - Yang melewati tenggat ditandai "Lewat tenggat".
  - Menu **Tindak Lanjut** menampilkan semuanya, dengan yang lewat tenggat paling atas.
- **PDSA** (menu **PDSA**) diisi berurutan: Plan → Do → Study → Act.
  - Tahap Study menampilkan grafik dan tabel Capaian 12 bulan, dengan periode uji coba diberi sorotan.
  - Setelah Act, bisa dimulai siklus berikutnya yang tertaut ke siklus sebelumnya.
- **Dashboard** kini juga menampilkan:
  - Analisis yang belum ditulis untuk bulan itu.
  - Jumlah Tindak Lanjut yang lewat tenggat.
  - Jumlah PDSA yang sedang berjalan.

## Cara mencoba

### Demo berisi data uji (stack yang sama dengan Rilis 1, sudah dibangun ulang dengan Rilis 2)

```
docker start mutu-e2e-db-1 mutu-e2e-app-1 mutu-e2e-backup-1
```

Buka http://localhost:3917. Akunnya sama dengan Rilis 1:

| Akun | Sandi | Peran |
|---|---|---|
| admin | admin-e2e-123 | Admin Sistem |
| komite | sandi-e2e-123 | Komite Mutu |
| direktur | sandi-e2e-123 | Direktur |
| kepala_icu | sandi-e2e-123 | Kepala Unit (ICU + HCU) |
| petugas_icu | sandi-e2e-123 | Petugas Input Data (ICU) |

Data Rilis 2 yang sudah ada di demo (dibuat lewat UI saat QA):

- **INM-01, Lingkup RS, September 2026.** Capaian RS 53,64% (Belum Tercapai) beserta:
  - satu Analisis;
  - dua Tindak Lanjut, salah satunya **lewat tenggat**;
  - satu PDSA yang sedang di tahap **Study**. Silakan lanjutkan sendiri sampai Act, lalu coba "Mulai siklus berikutnya".
- **IMP-ICU-01, Unit ICU, Oktober 2026:** Analisis dari Kepala ICU.

Menghentikan demo: `docker stop mutu-e2e-app-1 mutu-e2e-backup-1 mutu-e2e-db-1`.

### Instalasi bersih atau development

Caranya sama seperti Rilis 1 (`INSTALASI.md`, bagian C di laporan Rilis 1). Migrasi baru (`0007_analisis`, `0008_tindak_lanjut`, `0009_pdsa`) berjalan otomatis saat aplikasi mulai.

## Yang perlu Anda cek manual (urut prioritas)

1. **Alur perbaikan di browser Anda sendiri:**
   1. Komite Mutu membuka Monitoring INM-01, klik "Belum dianalisis", tulis Analisis, lalu tambah Tindak Lanjut.
   2. Mulai PDSA dari halaman Analisis, lalu isi Do, Study, dan Act.
   3. Ubah status Tindak Lanjut menjadi Selesai. Catatan hasil wajib diisi.
   4. Periksa Dashboard sebagai Komite Mutu, Kepala Unit, Petugas, dan Direktur.
2. **Kesesuaian dengan praktik mutu RS Anda.** Sebaiknya dibaca oleh orang mutu RS:
   - Apakah isian Plan (masalah, tujuan, prediksi, rencana, periode) dan isian Act (Adopsi/Adaptasi/Tinggalkan + penjelasan) cocok dengan formulir PDSA yang dipakai RS?
   - Apakah satu teks "Analisis" cukup sebagai "Analisa Capaian" SIMAR?
3. **HP sungguhan dan Firefox desktop.** Kolom tenggat memakai `type="date"` dan format tampilannya mengikuti bahasa browser (mm/dd/yyyy di browser berbahasa Inggris). Kolom bulan sama seperti Rilis 1.
4. **Daftar keputusan di bawah.** Koreksi bila ada yang tidak sesuai keinginan Anda.

## Keputusan yang saya ambil sendiri

### Dari review dan QA

- **Indikator yang dinonaktifkan:**
  - Analisis lamanya tetap terbaca tetapi tidak bisa diubah.
  - Halaman Analisis untuk bulan tanpa Analisis ditolak, dan Monitoring tidak menampilkan "Belum dianalisis" untuk Indikator nonaktif.
  - Tindak Lanjut-nya **tetap bisa** diubah dan ditutup, supaya tidak menggantung sebagai "lewat tenggat". Hasil review menunjukkan sebelumnya hal ini tidak mungkin.
- **Mengubah Analisis** hanya bisa selama bulan itu masih bisa dianalisis. Bila periode Unit Pelapor-nya diakhiri atau dihapus, Analisis tampil hanya-baca.
- **Konfirmasi "tersimpan" ditiadakan.** Semua form di satu halaman dibuat ulang setelah simpan yang berhasil, sesuai aturan CLAUDE.md, sehingga pesan penolakan lama di form lain hilang. Tanda tersimpannya adalah baris "Terakhir diubah oleh …, waktu" dan daftar yang ikut berubah.
- **Grafik:** label tahun di sumbu tidak lagi bertabrakan bila rentang dimulai Desember. Ini cacat dari Rilis 1 yang muncul di HP.

### Analisis dan Tindak Lanjut

- Panjang maksimal: Analisis dan isian PDSA 4000 karakter; tindakan dan catatan Tindak Lanjut 1000; PIC 120; judul PDSA 200.
- "Belum dianalisis" di Dashboard hanya untuk bulan yang sedang ditampilkan, bukan tumpukan bulan-bulan sebelumnya. Daftarnya muncul walaupun Kelengkapan belum penuh.
- Tindak Lanjut hanya bisa ditambahkan setelah Analisis-nya disimpan.
- Tenggat boleh tanggal yang sudah lewat, misalnya untuk mencatat tindakan lama.
- Status Tindak Lanjut boleh berpindah ke mana saja, termasuk dari Selesai kembali ke Berjalan.
- Catatan Tindak Lanjut berupa satu isian: berisi hasil saat Selesai, atau alasan saat Dibatalkan.
- Jumlah "Tindak Lanjut lewat tenggat" di Dashboard mencakup semua bulan.

### PDSA

- PDSA yang baru dibuat langsung berada di tahap Do, karena Plan diisi saat membuatnya.
- Isian setiap tahap selalu wajib, baik saat "Simpan" maupun "Simpan dan lanjut".
- Tahap tidak bisa mundur, tetapi teks tahap yang sudah lewat bisa diperbaiki.
- Grafik Capaian sudah tampil di bagian Study sejak awal, sebagai data dasar (baseline).
- Aturan Lingkup:
  - Lingkup Unit: Unit harus aktif dan menjadi Unit Pelapor pada bulan mulai.
  - Lingkup RS: tidak ada syarat Unit Pelapor, karena uji coba bisa direncanakan sebelum ada Unit Pelapor.
- Judul disalin ke siklus berikutnya, setelah itu setiap siklus bisa memperbaiki judulnya sendiri.
- Daftar PDSA bawaannya hanya yang belum Selesai, ditambah pilihan "Semua".
- Petugas Input Data dan Direktur bisa membuka menu PDSA dan Tindak Lanjut untuk membaca saja. Petugas dan Kepala Unit hanya melihat Lingkup Unit-nya.

## Batasan yang diketahui

- Riwayat perubahan Analisis, Tindak Lanjut, dan PDSA hanya menyimpan pengubah dan waktu terakhir. Audit trail lengkap direncanakan di Rilis 3.
- Grafik Study hanya menampilkan 12 bulan. Uji coba yang lebih panjang hanya terlihat sebagian.
- Tidak ada pengingat tenggat (notifikasi masuk Rilis 3) dan tidak ada unggah berkas bukti.
- Form Rilis 1 (Indikator, Pengguna, Unit) masih memakai salinan kelas form masing-masing. Form Rilis 2 memakai `src/app/form.tsx` bersama.
- File env untuk membangun ulang stack demo ada di folder sementara sesi ini. Untuk menjalankan demo cukup `docker start`; untuk build ulang, buat env baru dengan `POSTGRES_PASSWORD=e2e_sandi_kuat`, `APP_PORT=3917`, dan `NAMA_RS="RSUD Uji E2E"`.

## Langkah berikutnya

1. Setelah dicek: `git switch main && git merge --ff-only rilis-2-pdsa`.
2. Rilis 3: laporan triwulan untuk Direktur dan Dewan Pengawas, ekspor PDF/Excel termasuk format SIMAR ("Analisa Capaian" dari Analisis, "Rencana Tindak Lanjut" dari Tindak Lanjut), notifikasi tenggat, dan audit trail lengkap.
