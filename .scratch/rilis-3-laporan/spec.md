# Spec: MutuRS Rilis 3 — Laporan Triwulan, Rekap SIMAR, dan pengingat

Status: berjalan (branch `rilis-3-laporan`)

## Problem Statement

Rilis 1–2 sudah mengumpulkan Pengukuran, menghitung Capaian, dan mencatat Analisis, Tindak Lanjut, serta PDSA. Dua laporan wajib masih disusun di luar aplikasi:

- **Laporan triwulan Komite Mutu ke Direktur**, yang diteruskan ke Dewan Pengawas. Surveior memeriksa laporan ini di PMKP 1, PMKP 4 b–c, dan PMKP 6 d. Isinya: Capaian semua Indikator, analisis, perbaikan yang sudah dilakukan, keberhasilan perbaikan, dan rekomendasi. Saat ini Komite Mutu menyalin angka dan teks dari aplikasi ke Word/Excel.
- **Pelaporan INM bulanan ke SIMAR** (Kemenkes) paling lambat tanggal 10 bulan berikutnya. Per INM ada empat isian: N, D, "Analisa Capaian", dan "Rencana Tindak Lanjut". SIMAR tidak menerima unggahan berkas, jadi isiannya diketik ulang. Juknis SIMAR Ver.07.2024 hal. 17–21: satu halaman per bulan, semua INM, kotak teks bertanda "1000". D kebersihan tangan minimal 200. Bila tidak ada layanan, N = D = 0 dengan keterangan di Analisa Capaian. Kepuasan pasien hanya pada bulan 6 dan 12.

Selain itu, Tindak Lanjut baru terlihat bermasalah setelah lewat tenggat. Belum ada tanda yang muncul sebelum tenggat.

## Solution

- **Laporan Triwulan** (`/laporan?triwulan=`) disusun otomatis dari data terkini, ditambah satu teks Rekomendasi yang ditulis Komite Mutu. Laporan dicetak atau disimpan sebagai PDF lewat browser (tampilan cetak A4). Tabel Capaian-nya bisa diunduh sebagai CSV untuk Excel.
- **Rekap SIMAR** (`/simar?bulan=`) menampilkan isian SIMAR satu bulan per INM, masing-masing dengan tombol Salin dan tanda bila belum siap.
- **Pengingat di dalam aplikasi:**
  - Tindak Lanjut yang **mendekati tenggat** (≤ 7 hari) ditandai di daftar Tindak Lanjut dan Dashboard.
  - Dashboard Komite Mutu dan Admin Sistem menampilkan kesiapan SIMAR bulan lalu beserta tenggatnya.

## User Stories

### Laporan Triwulan

1. Sebagai Komite Mutu, saya ingin memilih satu Triwulan dan melihat Laporan Triwulan-nya, dengan bawaan Triwulan terakhir yang sudah selesai, supaya laporan ke Direktur tidak disusun manual.
2. Sebagai Komite Mutu, saya ingin ringkasan di awal laporan memuat jumlah Indikator yang dinilai, jumlah yang Tercapai dan Belum Tercapai, serta Kelengkapan Triwulan itu.
3. Sebagai Komite Mutu, saya ingin tabel Capaian semua Indikator per kelompok (INM, IMP-RS, IMP-Unit). Isinya Target, Capaian tiap bulan, Capaian Triwulan, Status Capaian, dan Kelengkapan, supaya Direktur membaca semua Indikator di satu tabel.
4. Sebagai Komite Mutu, saya ingin semua Analisis bulan-bulan Triwulan itu ikut termuat, dengan tanda "Belum dianalisis" untuk bulan yang belum. Untuk INM/IMP-RS yang diambil Lingkup RS, untuk IMP-Unit Lingkup Unit-nya. Dengan begitu bukti analisis (PMKP 4 b) ada di laporan.
5. Sebagai Komite Mutu, saya ingin Tindak Lanjut milik Analisis-Analisis itu termuat dengan status terkininya, supaya "perbaikan yang telah dilakukan" terlihat.
6. Sebagai Komite Mutu, saya ingin PDSA yang periode uji cobanya bersinggungan dengan Triwulan itu termuat dengan tahap, hasil Study, dan keputusan Act-nya, supaya keberhasilan perbaikan (PMKP 6 d) tercantum.
7. Sebagai Komite Mutu, saya ingin menulis Rekomendasi untuk Triwulan itu dan bisa mengubahnya kapan saja, supaya rekomendasi tindakan perbaikan (PMKP 4 b) ada di laporan.
8. Sebagai Komite Mutu, saya ingin mencetak laporan atau menyimpannya sebagai PDF A4 tanpa menu aplikasi, dengan tanggal cetak dan kolom tanda tangan, supaya bisa dikirim dan diarsipkan.
9. Sebagai Komite Mutu, saya ingin mengunduh tabel Capaian Triwulan sebagai CSV yang langsung terbuka rapi di Excel berbahasa Indonesia, supaya bisa diolah sendiri.
10. Sebagai Direktur, saya ingin membaca dan mencetak Laporan Triwulan tanpa bisa mengubah Rekomendasi.
11. Sebagai Kepala Unit atau Petugas Input Data, saya tidak bisa membuka Laporan Triwulan. Capaian Unit saya tetap terlihat di Monitoring.

### Rekap SIMAR

12. Sebagai Komite Mutu, saya ingin Rekap SIMAR satu bulan (bawaan bulan lalu) dengan urutan INM yang sama seperti form SIMAR. Per INM tampil N, D, Capaian, Analisa Capaian, dan Rencana Tindak Lanjut, supaya pengisian SIMAR cukup salin-tempel.
13. Sebagai Komite Mutu, saya ingin tombol Salin di setiap isian yang tetap berfungsi walau aplikasi dibuka lewat `http://` di jaringan RS.
14. Sebagai Komite Mutu, saya ingin setiap INM yang belum siap diberi tanda tertulis, supaya saya tahu apa yang harus dibereskan sebelum tanggal 10. Tandanya:
    - Kelengkapan belum penuh;
    - belum ada Unit Pelapor;
    - belum ada Analisis;
    - belum ada Tindak Lanjut;
    - D kebersihan tangan di bawah 200;
    - D = 0;
    - teks lebih dari 1000 karakter.

### Pengingat

15. Sebagai penulis Tindak Lanjut, saya ingin Tindak Lanjut terbuka yang tenggatnya hari ini sampai 7 hari lagi ditandai "mendekati tenggat" di daftar Tindak Lanjut. Dashboard juga menghitungnya, supaya bisa diselesaikan sebelum lewat.
16. Sebagai Komite Mutu, saya ingin Dashboard menampilkan berapa INM bulan lalu yang siap dilaporkan ke SIMAR dan tanggal tenggatnya, dengan tautan ke Rekap SIMAR.

## Implementation Decisions

### Istilah (GLOSSARY.md)

Istilah baru:

- **Triwulan**: TW I Januari–Maret, TW II April–Juni, TW III Juli–September, TW IV Oktober–Desember.
- **Laporan Triwulan**
- **Capaian Triwulan**
- **Rekomendasi**
- **Rekap SIMAR**
- **Mendekati tenggat**, ditambahkan pada definisi Tindak Lanjut.

"Analisa Capaian" dan "Rencana Tindak Lanjut" hanya dipakai sebagai nama isian SIMAR di Rekap SIMAR.

### Triwulan

- Ditulis `"YYYY-T"` (mis. `"2026-3"`), di alamat `?triwulan=2026-3`, dan ditampilkan "Triwulan III 2026". Fungsi murninya di `src/lib/bulan.ts`:
  - `triwulanValid`
  - `bulanTriwulan` (tiga bulan "YYYY-MM")
  - `triwulanDari(bulan)`
  - `triwulanLalu(sekarang)`, yaitu Triwulan terakhir yang sudah selesai
  - `labelTriwulan`
- Hanya Triwulan yang sudah selesai yang bisa dibuka dan diberi Rekomendasi: bulan terakhirnya sebelum bulan berjalan menurut zona waktu konfigurasi. Triwulan lain ditolak 400. Alasannya, laporan dibuat setelah Triwulan berakhir dan laporan setengah jalan menyesatkan.

### Capaian Triwulan (modul Capaian)

- `capaianTriwulan(aktor, triwulan, sekarang)` di `src/modules/capaian/service.ts`, hanya untuk `melihatCapaianRs`.
- Rumusnya tetap `capaianDari`: barisnya = Unit Pelapor aktif setiap bulan Triwulan itu yang diukur (Semesteran hanya Juni/Desember). ΣN/ΣD dari Pengukuran Terverifikasi; Kelengkapan = Terverifikasi / wajib selama Triwulan.
- Target = Target yang berlaku pada bulan terakhir Triwulan, sama untuk semua Indikator karena Semesteran hanya dinilai di TW II/IV yang berakhir Juni/Desember.
- Indikator yang dimuat: dinilai pada setidaknya satu bulan Triwulan itu (punya Unit Pelapor aktif dan diukur bulan itu), dan aktif atau punya setidaknya satu Pengukuran Terverifikasi dalam Triwulan itu. Laporan TW III yang dicetak setelah sebuah IMP dinonaktifkan pada Oktober tetap memuat IMP itu, sedangkan Indikator nonaktif yang lama tidak diukur tidak ikut.
- Per Indikator dikembalikan: deret bulan (Capaian RS per bulan), Capaian Triwulan, dan Unit Pelapor dalam Triwulan (nama, untuk IMP-Unit).

### Laporan Triwulan (modul baru `src/modules/laporan/service.ts`)

- `laporanTriwulan(aktor, triwulan?, sekarang)`: tanpa triwulan = `triwulanLalu`. Hasilnya:
  - ringkasan (dinilai, tercapai, belumTercapai, kosong, kelengkapan);
  - baris Capaian Triwulan;
  - Analisis per Indikator per bulan yang dinilai: INM/IMP-RS Lingkup RS, IMP-Unit Lingkup Unit Pelapor-nya; null = Belum dianalisis;
  - Tindak Lanjut milik Analisis itu (dengan `lewatTenggat`);
  - PDSA yang periode uji cobanya bersinggungan dengan Triwulan, semua Lingkup;
  - Rekomendasi (teks, pengubah, waktu, atau null);
  - `bolehTulis`.
- `simpanRekomendasi(aktor, { triwulan, teks }, sekarang)`: Komite Mutu dan Admin Sistem; upsert per Triwulan; teks wajib, maks 8000 karakter. Panjangnya dua kali Analisis karena merangkum satu Triwulan.
- Hak baca: `melihatCapaianRs` (Komite Mutu, Direktur, Admin Sistem). Peran lain 403.
- Tabel `rekomendasi` (tahun, triwulan 1–4, teks, diubah_oleh, diubah_pada), unik per tahun + triwulan. Tidak ada hapus.
- Laporan selalu dihitung dari data terkini, tanpa snapshot. Arsipnya adalah PDF hasil cetak, yang memuat "Dicetak pada …".

### Halaman Laporan Triwulan

- `/laporan?triwulan=`: pemilih Triwulan (`PilihCari` dari 8 Triwulan selesai terakhir), tombol **Cetak / Simpan PDF** (`window.print()`), dan tombol **Unduh CSV**.
- Urutan bagian:
  1. Ringkasan
  2. Capaian per kelompok (IMP-Unit dengan nama Unit-nya)
  3. Analisis
  4. Tindak Lanjut
  5. PDSA
  6. Rekomendasi (form untuk penulis; teks untuk pembaca dan saat dicetak)
  7. Kolom tanda tangan (Ketua Komite Mutu, Direktur)
- Tampilan cetak (`print:`): sidebar, bar atas, saringan, tombol, dan form disembunyikan; kartu tanpa bayangan; tabel tidak terpotong lebar (huruf lebih kecil). `@page` A4 berada di `globals.css`.
- CSV: route handler `src/app/laporan/unduh/route.ts` (`GET ?triwulan=`) memakai service yang sama. Ini unduhan berkas, bukan API untuk UI.
  - Format: UTF-8 dengan BOM, pemisah `;`, koma desimal tanpa pemisah ribuan, CRLF. Pembentuknya `keCsv` di `src/lib/csv.ts`.
  - Kolom: Kelompok, Kode, Indikator, Unit Pelapor, Target, Capaian bulan 1–3, N Triwulan, D Triwulan, Capaian Triwulan, Status Capaian, Kelengkapan.

### Rekap SIMAR

- `rekapSimar(aktor, bulan?, sekarang)` di modul laporan: `melihatCapaianRs`; tanpa bulan = bulan lalu; bulan setelah bulan berjalan ditolak.
- Barisnya = INM aktif yang diukur bulan itu (INM-13 Semesteran hanya Juni/Desember), urut kode. INM tanpa Unit Pelapor tetap muncul.
- Per INM:
  - N, D, dan Capaian dari Capaian RS bulan itu (`ringkasanCapaian`, hanya Terverifikasi).
  - **Analisa Capaian** = teks Analisis Lingkup RS.
  - **Rencana Tindak Lanjut** = Tindak Lanjut milik Analisis itu, kecuali yang Dibatalkan. Satu baris per Tindak Lanjut: `1. tindakan (PIC: …, tenggat 5 Nov 2026)`. Pembentuknya `teksRencanaTindakLanjut` di `src/lib/laporan.ts`.
  - **Tanda** (`tandaSimar`, `src/lib/laporan.ts`):

    | Tanda | Kapan |
    |---|---|
    | `tanpaUnitPelapor` | belum ada Unit Pelapor |
    | `belumLengkap` | Kelengkapan belum penuh |
    | `dNol` | D = 0 padahal ada Pengukuran Terverifikasi |
    | `dKurang` | D di bawah minimum SIMAR (`MIN_D_SIMAR`, INM-01 = 200) |
    | `belumDianalisis` | belum ada Analisis |
    | `tanpaTindakLanjut` | belum ada Tindak Lanjut |
    | `terlaluPanjang` | teks melebihi 1000 karakter (`BATAS_TEKS_SIMAR`) |

  - INM tanpa tanda = siap.
- Tidak ada isian SIMAR tersendiri. Teks diubah lewat Analisis dan Tindak Lanjut.
- Halaman `/simar?bulan=` (`bulanDariAlamat`) menampilkan baris per INM: kode dan nama, N, D, Capaian, tanda, dan isian teks.
  - Setiap isian punya tombol **Salin** (`TombolSalin`, client). Tombol ini memakai `navigator.clipboard` bila tersedia, dan cadangan `textarea` + `execCommand("copy")` untuk `http://` di LAN, karena Clipboard API hanya ada di secure context.
  - Ada tautan "Tulis Analisis" ke halaman Analisis Lingkup RS.

### Pengingat

- `mendekatiTenggat(tl, hariIni)` di `src/lib/perbaikan.ts`: status terbuka dan `hariIni ≤ tenggat ≤ hariIni + 7 hari` (`tambahHari` di `src/lib/bulan.ts`).
- Baris `daftarTindakLanjut` dan Tindak Lanjut di halaman Analisis membawa `mendekatiTenggat`. Tabel Tindak Lanjut menulis "· mendekati" berwarna peringatan.
- Ubin "Lewat tenggat" di halaman Tindak Lanjut menyebut jumlah yang mendekati tenggat.
- Dashboard "Perlu tindakan": tambah "Tindak Lanjut mendekati tenggat". Untuk `bolehKelolaIndikator` juga tambah "SIMAR <bulan lalu>" dengan nilai `siap/jumlah` INM dan keterangan "paling lambat 10 <bulan berjalan>" (ditambah "· sudah lewat" setelah tanggal 10); tautannya ke `/simar`. Jadwalnya dari `jadwalSimar(sekarang)` di `src/lib/laporan.ts`.
- Kartu "Lapor SIMAR" di sidebar menaut ke `/simar`.

### Menu

Kelompok baru **Laporan** (Komite Mutu, Direktur, Admin Sistem) berisi "Laporan Triwulan" (`/laporan`) dan "Rekap SIMAR" (`/simar`).

## Testing Decisions

- Seam sama: fungsi service dipanggil sebagai Pengguna sungguhan, database sementara, data disiapkan lewat service.
- Laporan Triwulan dan Capaian Triwulan mencakup seluruh database bersama, jadi tesnya memakai tahun 2016. Rekap SIMAR membaca INM bersama, jadi tesnya memakai tahun 2015 dengan Unit Pelapor INM yang berhenti di 2015.
- Yang wajib teruji:
  - Capaian Triwulan:
    - ΣN/ΣD tiga bulan, bukan rata-rata;
    - Target bulan terakhir;
    - Kelengkapan;
    - periode Unit Pelapor;
    - Semesteran hanya TW II/IV;
    - Indikator nonaktif dengan dan tanpa Pengukuran Terverifikasi;
    - hanya Terverifikasi.
  - Laporan Triwulan:
    - hak baca dan tulis per peran;
    - Triwulan belum selesai dan Triwulan tidak valid ditolak;
    - bawaan = Triwulan lalu;
    - Analisis per bulan (Lingkup RS vs IMP-Unit), Belum dianalisis;
    - Tindak Lanjut miliknya;
    - PDSA bersinggungan;
    - Rekomendasi upsert, wajib, dan batas panjang.
  - Rekap SIMAR:
    - N/D dari Terverifikasi;
    - teks Analisa Capaian dan Rencana Tindak Lanjut (tanpa Dibatalkan);
    - setiap tanda;
    - INM Semesteran;
    - hak baca;
    - bulan bawaan.
  - Mendekati tenggat: batas 0 dan 7 hari, yang sudah lewat, dan status Selesai.
  - Fungsi murni: Triwulan, `keCsv`, `jadwalSimar`.
- UI dicek manual di browser, termasuk 390 px dan pratinjau cetak.

## Out of Scope

- Audit trail / riwayat perubahan lengkap (ditunda; tidak diminta regulasi maupun surveior).
- Notifikasi email atau WhatsApp. Pengingat hanya di dalam aplikasi.
- PDF yang dibuat di server dan berkas `.xlsx` asli.
- Snapshot laporan yang dibekukan, persetujuan Direktur, dan umpan balik Dewan Pengawas.
- Laporan bulanan atau tahunan terpisah. Survei ulang memakai empat Laporan Triwulan.
- Insiden keselamatan pasien, validasi data PMKP 5, dan pengiriman otomatis ke SIMAR.

## Further Notes

- Keputusan Q1–Q13 dari sesi tanya-jawab 2026-11-11. User menyetujui semua rekomendasi dan menyerahkan sisanya.
- Agen riset menemukan bahwa halaman login SIMAR memuat skrip dari domain asing (`raineyeshadowguilty.com`, aktif 02.00–05.00). Temuan ini sudah diteruskan ke user, dan MutuRS tidak terhubung ke SIMAR.
