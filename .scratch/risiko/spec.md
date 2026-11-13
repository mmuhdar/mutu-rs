# Spec: Register Risiko

Status: selesai (2026-11-13, branch `risiko`, dari `rilis-5` karena membutuhkan Jejak Audit)

Permintaan user (13 November 2026): "tambahkan fitur Input Risiko juga seperti di project [aplikasi kepegawaian RS]". Sumber: `app/Filament/Pages/InputRisiko.php`, `resources/views/filament/pages/input-risiko.blade.php`, dan migrasi `2026_06_04_082125_create_risikos_table.php` di aplikasi kepegawaian RS (v1). Glosarium: bagian Manajemen Risiko.

## Problem Statement

Register risiko Unit (Input Risiko) masih hanya ada di aplikasi kepegawaian v1. Akibatnya, Komite Mutu harus membuka dua aplikasi untuk PMKP. Register v1 adalah satu tabel lebar yang langsung tersimpan saat diketik, dengan kolom berikut:
- Risiko, Kategori;
- Analisis Risiko Awal (Probabilitas, Dampak, Bobot, Nilai, Tingkat Risiko), Prioritas;
- Perlakuan (daftar butir), Jadwal Pelaksanaan;
- Hasil Pemantauan (P, D, Bobot, Nilai, Tingkat);
- Simpulan (Tingkat Risiko, Efektivitas);
- Review (unggahan PDF/DOC/DOCX).

## Solution

| Bagian | Hasil |
|---|---|
| Register | `/risiko?tahun=&unit=`: tabel Risiko satu tahun, untuk satu Unit atau Semua Unit yang terbaca. Urut nama Unit, lalu Nilai Risiko awal tertinggi. |
| Isian | `/risiko/baru`, `/risiko/[id]/ubah`. Form satu Risiko: Unit + tahun (hanya saat menambah), uraian, Kategori, Penilaian Awal, Perlakuan + Jadwal, Hasil Pemantauan, Efektivitas. Ada pratinjau langsung Nilai, Bobot, Tingkat, Prioritas, dan Simpulan. |
| Detail | `/risiko/[id]`: penilaian, Perlakuan bernomor, Simpulan, Dokumen Review (unggah/hapus), Hapus Risiko. |
| Berkas | `/risiko/dokumen/[id]`: PDF dibuka di browser, DOC/DOCX diunduh. |
| Data | Tabel `risiko`, tabel `dokumen_risiko` (bytea, ikut backup), dan entitas Jejak Audit `risiko`. |

## Keputusan (diambil sendiri)

- **Matriks Nilai Risiko dan Bobot disalin persis dari v1**, supaya angka register yang sudah dipakai RS tidak berubah. Ambang Tingkat Risiko juga sama dengan v1: ≥ 20, 15, 10, 5. Komite Mutu perlu memastikan sumber tabel Bobot, karena nilainya tidak berpola.
- **Bobot, Nilai, Tingkat, dan Prioritas tidak disimpan.** Semuanya dihitung dari Probabilitas + Dampak, sehingga tidak mungkin berbeda dari matriks. v1 menyimpannya.
- **Simpulan Tingkat Risiko dihitung, tidak dipilih:**
  - "Ada penurunan" bila Tingkat Risiko Hasil Pemantauan lebih rendah dari Penilaian Awal;
  - turunnya Nilai di dalam Tingkat yang sama tidak dihitung sebagai penurunan;
  - di v1 dipilih bebas, sehingga bisa bertentangan dengan angkanya.
- **Efektivitas tetap dinilai orang**, tetapi baru boleh diisi setelah Hasil Pemantauan diisi. Hasil Pemantauan harus diisi keduanya atau tidak sama sekali.
- **Penilaian Awal wajib**, karena Risiko tanpa penilaian tidak bisa diprioritaskan. Di v1, baris bisa tersimpan dengan P/D 0.
- **Perlakuan berupa satu kotak teks, satu langkah per baris.** Tidak ada tabel butir dan modal seperti v1. Tampilannya tetap daftar bernomor, dan jumlah langkahnya ada di register.
- **Penyimpanan per Risiko lewat form**, bukan simpan otomatis per sel seperti v1. Ini mengikuti pola MutuRS: server action + penolakan service tampil di form.
- **Hak akses:**
  - menulis: Komite Mutu, Admin Sistem, serta Petugas Input Data dan Kepala Unit dari Unit itu. Di v1, semua pengguna ruangan mengisi Unit-nya dan admin mengisi semua Unit;
  - membaca: aturan Lingkup Unit Perbaikan (`bolehBacaLingkup`), jadi Direktur juga membaca semua Unit.
- **Risiko boleh dihapus** untuk koreksi salah input, dengan konfirmasi browser, dan Dokumen Review ikut terhapus. Jejak Audit mencatat penghapusan beserta uraiannya.
- **Tahun:** 2000 sampai tahun berjalan + 1 (untuk menyusun register tahun depan). Unit dan tahun tidak bisa diubah setelah Risiko dibuat.
- **Dokumen Review:**
  - PDF/DOC/DOCX ditentukan dari isi berkas;
  - paling banyak 5 berkas per Risiko, masing-masing paling besar 10 MB (batas yang sama dengan Bukti);
  - semua ZIP dianggap DOCX dan selalu diunduh, tidak dibuka di browser.
- **Istilah:**
  - "Analisis Risiko Awal" v1 menjadi **Penilaian Awal**, karena "Analisis" sudah berarti Analisis Capaian;
  - "Fraud - Korupsi" menjadi **Fraud/Korupsi**;
  - menu bernama **Register Risiko**, di kelompok Perbaikan.
- **Warna Tingkat Risiko** memakai token terdekat dengan warna v1, dan labelnya selalu ditulis:
  - Sangat Tinggi dan Tinggi = merah;
  - Sedang = amber;
  - Rendah = hijau;
  - Sangat Rendah = biru.
- **Ditemukan sambil jalan:** radio tersembunyi `Segmen` dan matriks grading Insiden ternyata memakan lebar 16 px, karena `sr-only` kalah oleh `relative` bawaan shadcn. Akibatnya, Segmen 6 pilihan terlipat di HP. Sudah diperbaiki dengan `sr-only absolute`.

## Testing Decisions

`tests/risiko.test.ts` mencakup:
- matriks dan ambang;
- isian lengkap dan Jejak Audit;
- penolakan isian;
- hak akses: Unit lain, Direktur, Komite Mutu;
- urutan register dan jumlah dokumen;
- Dokumen Review: jenis, batas, hapus, dan Risiko dihapus.

Register dibaca per tahun + Unit, jadi tes cukup memakai Unit unik.

## Out of Scope

- **Profil Risiko RS** (gabungan register semua Unit menjadi risiko tingkat RS) dan **laporan manajemen risiko 6 bulanan** ke Direktur/Dewan Pengawas. Keduanya tidak ada di v1.
- **FMEA.**
- **Ekspor Excel/CSV register.**
- **Impor register v1.** Skrip `scripts/impor-v1.ts` hanya membaca tabel Indikator.
