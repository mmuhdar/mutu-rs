# Spec: MutuRS Rilis 5 — kelengkapan akreditasi

Status: berjalan (branch `rilis-5`, dari `main` yang sudah memuat Rilis 4 dan modul Insiden)

Permintaan user (12 November 2026): "mulai rilis 5 saja dulu ... selesaikan saja dulu app ini sampai tahap akhir". Isi diambil dari kandidat Rilis 5 yang sudah disepakati sejak Rilis 4. User menyerahkan keputusan; semua keputusan dicatat di sini dan di laporan akhir.

Riset: `docs/research/pdsa-tindak-lanjut-evaluasi.md` (TKRS 1, PMKP 4 g) dan `docs/research/validasi-data-pmkp5.md` (PMKP 5, PMK 30/2022 Lampiran BAB IV.B).

## Problem Statement

Empat bukti akreditasi belum bisa dihasilkan MutuRS:
1. **Validasi data (PMKP 5):** pengukuran ulang oleh orang lain atas sampel data, dengan kesesuaian minimal 90%, setiap kali ada pemicu. Laporan triwulan juga harus memuat validasi (PMKP 1).
2. **Umpan balik Dewan Pengawas (TKRS 1):** umpan balik tertulis atas laporan triwulan, dan evaluasi tindak lanjutnya pada pertemuan berikutnya.
3. **Analisis efisiensi (PMKP 4 EP g):** biaya per jenis sumber daya sebelum dan sesudah perbaikan, untuk satu proyek prioritas per tahun.
4. **Jejak audit:** siapa mengubah data apa dan kapan. Ini tidak diminta regulasi, tetapi dibutuhkan untuk akuntabilitas data, misalnya Target, Unit Pelapor, angka N/D, dan peran Pengguna.

## Solution

| Bagian | Hasil |
|---|---|
| Validasi Data | Halaman `/validasi`. Hasil dicatat per Indikator + Unit Pelapor + bulan data: pemicu, pengumpul data, validator, populasi, sampel, jumlah sesuai, lalu kesesuaian dan hasil (valid ≥ 90%). Hasil tidak valid wajib disertai penyebab dan perbaikan, lalu dilakukan validasi ulang. Ditampilkan di Laporan Triwulan dan di Dashboard ("belum valid"). |
| Umpan Balik Dewan Pengawas | Di Laporan Triwulan: umpan balik atas laporan ini (dicatat setelah pertemuan), dan tindak lanjut umpan balik Triwulan sebelumnya (dievaluasi pada pertemuan laporan ini). |
| Analisis Efisiensi | Di detail PDSA: biaya Rupiah per jenis sumber daya (tenaga, bahan, alat, waktu, lain-lain) sebelum dan sesudah, ditambah kesimpulan. Ringkasannya tampil di daftar PDSA Laporan Triwulan. |
| Jejak Audit | Tabel `jejak_audit` ditulis setiap service yang mengubah data, dalam transaksi yang sama. Halaman `/jejak` untuk Admin Sistem dan Komite Mutu. |

## Keputusan (diambil sendiri, user menyerahkan)

- **Notifikasi email/WA tidak dibuat.** Butuh akun SMTP atau gateway WA dan internet di server RS. Antrean "Perlu tindakan" di Dashboard tetap menjadi pengingat di dalam aplikasi.
- **Validasi Data:**
  - **Satuannya** Indikator + Unit Pelapor + bulan data, karena data dikumpulkan per Unit. Regulasi tidak menyebut periode; bulan dipilih supaya validasi menempel pada Pengukuran yang divalidasi.
  - **Pemicu** dipilih dari enam pemicu PMKP 5 / PMK 30/2022. MutuRS tidak mendeteksinya otomatis, karena sebagian besar pemicu tidak punya padanan data di aplikasi.
  - **Rumus:** kesesuaian = jumlah sesuai / sampel validator × 100%. Valid bila ≥ 90%.
  - **Sampel minimal validator** menurut Tabel 3: populasi 1–16 = seluruh populasi, 17–160 = 16, ≥ 161 = 48. Sampel tidak boleh melebihi populasi.
  - **Pengumpul data dan validator** diketik namanya, karena belum tentu Pengguna MutuRS. Keduanya harus orang berbeda (metode *reproducibility*).
  - **Hasil tidak valid** wajib disertai penyebab (8 faktor di Lampiran) dan perbaikan. Validasi ulang dicatat sebagai validasi baru untuk Indikator + Unit + bulan yang sama. Status "belum valid" hilang begitu ada validasi sesudahnya yang valid.
  - **Hak akses:**
    - pencatat sama dengan penulis Lingkup Unit (`bolehTulisLingkup`: Komite Mutu, Admin Sistem, Kepala Unit Unit itu), karena validator boleh Kepala Unit bila tenaga terbatas;
    - pembaca sama dengan Lingkup (`bolehBacaLingkup`).
  - **Catatan validasi bisa diperbaiki** oleh pencatat. Setiap perubahan masuk Jejak Audit.
- **Umpan Balik Dewan Pengawas:**
  - Dicatat oleh Komite Mutu, Direktur (penerima umpan balik), dan Admin Sistem.
  - Tanggal diterima tidak boleh sebelum Triwulan berakhir.
  - Satu baris per Triwulan, berisi umpan balik dan tindak lanjutnya.
- **Analisis Efisiensi:**
  - Menempel di PDSA, karena PDSA adalah proyek perbaikan di MutuRS.
  - Ada lima jenis sumber daya tetap; jenis yang tidak terkait dikosongkan.
  - Biaya dalam Rupiah bulat, maksimal 2 miliar per baris. Boleh diisi di tahap mana pun.
- **Jejak Audit:**
  - Ringkasan berupa kalimat untuk dibaca orang, tanpa sandi, isi berkas, atau identitas pasien. Jejak Insiden hanya mencatat perpindahan status, tanpa isi laporan.
  - Percobaan masuk yang gagal juga dicatat.
  - Admin Sistem tidak membaca jejak Insiden (keputusan Q4 modul Insiden).
  - Halaman menampilkan 300 perubahan terbaru dengan saringan jenis data dan tanggal.

## Testing Decisions

- `tests/umpan-balik.test.ts` (tahun 2012).
- `tests/pdsa.test.ts`, bagian Analisis Efisiensi.
- `tests/jejak.test.ts`.
- `tests/validasi.test.ts`, mencakup:
  - aturan murni (sampel minimal, kesesuaian);
  - hak akses;
  - Unit Pelapor;
  - validator berbeda;
  - tidak valid → penyebab wajib → validasi ulang;
  - status belum valid;
  - Laporan Triwulan (tahun 2011).

## Out of Scope

- Notifikasi email/WA.
- Deteksi otomatis pemicu validasi.
- Unggah dokumen validasi.
- Persetujuan Direktur atas laporan.
- Pengiriman otomatis ke SIMAR atau aplikasi IKP Kemenkes.
