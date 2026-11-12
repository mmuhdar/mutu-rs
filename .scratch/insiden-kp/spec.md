# Spec: Pelaporan Insiden Keselamatan Pasien

Status: selesai (2026-11-12, branch `insiden-kp`, dari `rilis-4-pindah`)

Riset: `docs/research/insiden-keselamatan-pasien.md`. Keputusan user Q1–Q12 (12 November 2026) tercatat di bagian "Keputusan".

## Problem Statement

Rumah sakit wajib melaporkan setiap Insiden Keselamatan Pasien secara internal paling lambat 2×24 jam (PMK 11/2017 Pasal 18, PP 28/2024 Pasal 889). Laporan itu lalu digrading, diinvestigasi (investigasi sederhana atau RCA menurut warna), dan direkap per triwulan untuk Direktur dan Dewan Pengawas (KMK 1596/2024 PMKP 1, 8, 9). Saat ini semua itu di atas kertas (Formulir 1). Aplikasi mutu lama tidak punya modul insiden, dan MutuRS juga belum.

## Solution

Modul **Insiden** di MutuRS:

- **Laporan.** Setiap Pengguna bisa melaporkan Insiden lewat isian Formulir 1. Staf tanpa akun tetap melapor ke atasannya, lalu atasan atau Petugas Input Data yang memasukkannya. Laporan yang dibuat lewat dari 2×24 jam sejak waktu insiden tetap diterima, tetapi ditandai "Terlambat dilaporkan".
- **Grading.** Kepala Unit dari Unit tempat insiden (atasan langsung), atau Komite Mutu, memilih satu sel matriks dampak × probabilitas (KKP-RS 2008). Warnanya menentukan jalur:
  - biru dan hijau masuk Investigasi Sederhana oleh Kepala Unit, paling lama 7 atau 14 hari;
  - kuning, merah, dan semua Kejadian Sentinel masuk RCA oleh Komite Mutu, paling lama 45 hari.
- **Investigasi Sederhana** dikirim ke Komite Mutu untuk ditinjau dan digrading ulang. Hasilnya Selesai, atau dialihkan ke RCA.
- **RCA** diselesaikan Komite Mutu dengan grading akhir.
- **Bukan Insiden.** Komite Mutu bisa menutup laporan yang ternyata bukan insiden keselamatan pasien, disertai alasan.
- **e-Report.** Untuk KTD dan Kejadian Sentinel, Komite Mutu mencatat tanggal laporan dikirim ke e-report Kemenkes. MutuRS tidak mengirim apa pun ke luar.
- **Rekap.**
  - Dashboard menampilkan Insiden yang menunggu, yang lewat tenggat, dan KTD/Sentinel yang belum masuk e-report.
  - Laporan Triwulan (juga CSV-nya) mendapat bagian Insiden Keselamatan Pasien tanpa identitas pasien dan Pembuat Laporan.

## User Stories

1. Sebagai Pengguna mana pun, saya ingin melaporkan Insiden yang saya ketahui (atau yang dilaporkan staf tanpa akun kepada saya), lengkap dengan data pasien dan kronologinya, supaya bisa ditangani tanpa formulir kertas.
2. Sebagai Pembuat Laporan, saya ingin memperbaiki laporan saya selama belum digrading.
3. Sebagai Pembuat Laporan, saya ingin melihat status laporan saya dan, setelah Selesai, hasil investigasinya sebagai umpan balik.
4. Sebagai Kepala Unit, saya ingin melihat semua Insiden Unit saya, menggradingnya dengan matriks, lalu menulis investigasi sederhana untuk yang biru atau hijau sebelum tenggatnya.
5. Sebagai Komite Mutu, saya ingin melihat semua Insiden. Saya juga ingin menggrading yang belum digrading, meninjau dan menggrading ulang hasil investigasi sederhana, menyelesaikan RCA, dan menutup laporan yang bukan insiden.
6. Sebagai Komite Mutu, saya ingin tahu Insiden mana yang lewat atau mendekati tenggat investigasi, dan KTD/Kejadian Sentinel mana yang belum dilaporkan ke e-report Kemenkes.
7. Sebagai Direktur, saya ingin membaca semua laporan Insiden (tanpa mengubah) sebagai pimpinan yang menerima laporan.
8. Sebagai Komite Mutu atau Direktur, saya ingin Laporan Triwulan memuat rekap Insiden: jumlah per jenis dan warna, per Unit, per tipe insiden, akibat terhadap pasien, tindak lanjut, dan daftar RCA beserta rekomendasinya.
9. Sebagai Pengguna yang melaporkan Kejadian Sentinel, saya ingin diingatkan bahwa sentinel berdampak luas harus juga dilaporkan lewat telepon ke Kemenkes paling lama 1 jam.

## Keputusan (sesi tanya-jawab Q1–Q12)

| No | Keputusan |
|---|---|
| Q1 | Semua Pengguna bisa melapor; tanpa peran baru. "Orang pertama yang melaporkan" mencatat pelapor sebenarnya. |
| Q2 | Tim Keselamatan Pasien = Komite Mutu; tanpa peran baru. |
| Q3 | Satu Unit tempat insiden (dari daftar Unit; Kepala Unit-nya = atasan langsung), Unit penyebab terpisah (opsional), tempat dan ruangan diketik bebas. |
| Q4 | Pembaca: Pembuat Laporan (laporannya sendiri), Kepala Unit (Unit-nya), Komite Mutu dan Direktur (semua; Direktur hanya baca). Admin Sistem hanya laporan buatannya sendiri. |
| Q5 | Data pasien sesuai Formulir 1, nama cukup inisial, kelompok umur dihitung. Hanya insiden pada pasien (non-pasien ke K3 RS). KPC boleh tanpa data pasien. |
| Q6 | Lima jenis: KPC, KNC, KTC, KTD, Kejadian Sentinel. Sentinel selalu RCA; pengingat telepon 1 jam. |
| Q7 | Grading dua tahap (Kepala Unit, lalu Komite Mutu saat meninjau/menyelesaikan RCA); matriks KKP-RS 2008. |
| Q8 | Status Dilaporkan, Investigasi Sederhana, Ditinjau, RCA, Selesai, Bukan Insiden. Laporan tidak pernah dihapus. Pembuat Laporan bisa mengubah sampai digrading. |
| Q9 | 2×24 jam hanya penanda. Tenggat investigasi biru 7, hijau 14, kuning/merah/sentinel 45 hari sejak laporan dibuat; dialihkan ke RCA saat ditinjau = 45 hari sejak pengalihan. Lewat/mendekati tenggat seperti Tindak Lanjut. |
| Q10 | Isian investigasi sama untuk sederhana dan RCA: tipe insiden (15), faktor kontributor (8, boleh lebih dari satu), penyebab langsung, akar masalah, rekomendasi. Tanpa ICD-10, tanpa hubungan ke Tindak Lanjut/PDSA. |
| Q11 | Tidak ada pengiriman otomatis ke Kemenkes; Komite Mutu mencatat tanggal e-report untuk KTD dan Kejadian Sentinel. |
| Q12 | Laporan Triwulan dan CSV-nya mendapat bagian Insiden tanpa identitas; Dashboard menampilkan antrean Insiden. |

## Implementation Decisions

### Aturan murni (`src/lib/insiden.ts`)

- **Konstanta + label:** `JENIS_INSIDEN`, `STATUS_INSIDEN` (+ `STATUS_INSIDEN_TERBUKA`), `WARNA_GRADING`, `DAMPAK`, `PROBABILITAS`, `AKIBAT_INSIDEN`, `ORANG_PERTAMA`, `PENANGGUNG_BIAYA`, `KATEGORI_PASIEN`, `SPESIALISASI`, `TINDAKAN_OLEH`, `TIPE_INSIDEN`, `FAKTOR_KONTRIBUTOR`. Pilihan dan teksnya dari Formulir 1 PMK 11/2017 dan pedoman KKP-RS 2008.
- **`warnaGrading(dampak, probabilitas)`:** dibaca dari sel Tabel 3 KKP-RS 2008, bukan dari ambang skor.
- **`perluRca(jenis, warna)`:** sentinel, kuning, atau merah.
- **`hariInvestigasi(jenis, warna)`:** 7, 14, atau 45 hari.
- **`akibatSesuaiJenis(jenis, akibat)`:**
  - KPC, KNC, dan KTC harus "Tidak ada cedera";
  - KTD dan Kejadian Sentinel tidak boleh "Tidak ada cedera" (definisi PMK Pasal 14 dan 15).
- **`dampakAkibat(akibat)`:** tingkat dampak 1–5 yang sejajar dengan isian "Akibat insiden". Dipakai sebagai petunjuk di form grading.
- **`kelompokUmur(umurBulan)`:** kelompok umur Formulir 1.
- **`terlambatDilaporkan(waktuInsiden, dilaporkanPada)`:** lebih dari 48 jam.
- **`lewatTenggatInsiden` dan `mendekatiTenggatInsiden`:** hanya untuk status Investigasi Sederhana dan RCA. Batas "mendekati" sama dengan Tindak Lanjut (`HARI_MENDEKATI_TENGGAT`).
- **Waktu setempat** di `src/lib/bulan.ts`: `waktuSetempat(date)` menghasilkan "YYYY-MM-DDTHH:mm" untuk `datetime-local`, dan `dariWaktuSetempat(teks)` membalikkannya. Keduanya mengikuti zona waktu konfigurasi (Indonesia tanpa DST).

### Skema

- **`insiden`:**
  - Data laporan: Unit tempat insiden (FK, wajib), Unit penyebab (FK, opsional), waktu insiden, judul (butir 2 Formulir 1), kronologi, jenis, orang pertama yang melapor, tempat.
  - Data pasien: inisial, No. RM, umur dalam bulan, jenis kelamin, penanggung biaya, kategori pasien, spesialisasi (wajib kecuali untuk KPC; CHECK di database), ruangan dan tanggal masuk (opsional: tidak berlaku untuk semua pasien rawat jalan dan UGD).
  - Tindakan: akibat, tindakan segera, tindakan oleh, pernah terjadi di unit lain beserta keterangannya.
  - Pembuat Laporan dan waktu laporan dibuat.
  - Status, grading (dampak dan probabilitas; keduanya kosong atau keduanya terisi), dan tenggat investigasi.
  - Hasil investigasi: tipe, faktor kontributor (`text[]` dengan CHECK subset), penyebab langsung, akar masalah, rekomendasi.
  - Tanggal e-report, dan `diubah_pada`.
- **`riwayat_status_insiden`:** setiap perpindahan status beserta pelaku, waktu (`clock_timestamp()`), grading pada perpindahan itu, dan catatan atau alasan. Polanya sama dengan Riwayat Status Pengukuran.

### Service (`src/modules/insiden/service.ts`)

**Hak akses**

| Aksi | Siapa |
|---|---|
| Membaca | `bolehBacaInsiden`: Pembuat Laporan, Komite Mutu, Direktur, dan Kepala Unit dengan Unit tempat insiden di `aktor.unitIds` |
| Grading dan Investigasi Sederhana | Kepala Unit dari Unit itu, atau Komite Mutu |
| Tinjauan, RCA, Bukan Insiden, e-Report | Komite Mutu saja |

Pembuat Laporan yang tidak punya hak baca lain baru melihat hasil investigasi setelah Insiden Selesai.

**Fungsi**

- `laporkanInsiden` / `ubahLaporan`:
  - Validasi isian.
  - Unit tempat insiden dan Unit penyebab harus Unit aktif.
  - Waktu insiden tidak boleh di masa depan, dan tanggal masuk tidak boleh setelah waktu insiden.
  - Ubah hanya oleh Pembuat Laporan selama Dilaporkan.
- `gradingInsiden`: Dilaporkan → Investigasi Sederhana atau RCA, dengan tenggat = tanggal laporan dibuat + `hariInvestigasi`.
- `simpanInvestigasi(…, kirim)`:
  - Investigasi Sederhana dan RCA.
  - `kirim` hanya dari Investigasi Sederhana, ke Ditinjau.
- `tinjauInsiden`: Ditinjau → Selesai (biru/hijau) atau RCA (kuning/merah), dengan grading akhir. Bila ke RCA, tenggat = hari ini + 45.
- `selesaikanRca`: RCA → Selesai, dengan isian investigasi dan grading akhir.
- `tandaiBukanInsiden`: dari status terbuka mana pun, alasan wajib.
- `catatEreport`:
  - Hanya KTD dan Kejadian Sentinel yang bukan Bukan Insiden.
  - Tanggal tidak boleh di masa depan; kosong = hapus tanda.
- Bacaan:
  - `ambilInsiden`: detail + riwayat + hak tampilan per aksi.
  - `daftarInsiden({ status })`: bawaan terbuka; yang lewat tenggat di atas, lalu yang terbaru.
  - `ringkasanInsiden`: Dashboard.
  - `rekapInsiden(triwulan)`: Laporan Triwulan; Komite Mutu dan Direktur saja (Q4: Admin Sistem tidak membaca Insiden, jadi Laporan Triwulan-nya tanpa bagian ini); menurut waktu insiden; tanpa Bukan Insiden; daftar RCA hanya tanggal insiden, dan akar masalah/rekomendasi hanya dari RCA yang sudah Selesai.
- Setiap perpindahan status lewat satu fungsi `pindah` (baris sudah dikunci `for update` dan status asalnya diperiksa pemanggil lewat `wajibStatus`; `pindah` menulis status, grading, dan satu baris riwayat), seperti `pindahStatus` Pengukuran.
- Pembuat Laporan yang bukan pembaca penuh baru melihat hasil investigasi dan catatan Komite Mutu di Riwayat Status setelah Insiden ditutup.

### Tampilan

- **Menu** "Insiden" (kelompok Data, semua peran), ikon `insiden`.
- **`/insiden?status=`:**
  - Pita jumlah per status terbuka.
  - Tabel Insiden: judul dan waktu, jenis (KTD/Sentinel tanpa tanggal e-report ditandai "Belum e-report"), grading, Unit, status, tenggat.
  - Tombol "Laporkan Insiden".
- **`/insiden/lapor` dan `/insiden/[id]/ubah`:** form Formulir 1. Bagian data pasien diberi catatan bahwa untuk KPC boleh kosong, dan ada catatan K3 RS untuk insiden pada non-pasien. Pengingat sentinel ditampilkan di bawah pilihan jenis.
- **`/insiden/[id]`:**
  - Langkah berikutnya sesuai status dan hak.
  - Matriks grading berupa `RadioGroup` 5×5, dengan sel bertuliskan warnanya.
  - Laporan (rekaman Formulir 1), investigasi, riwayat status.
  - Alat Komite Mutu: e-Report dan Bukan Insiden.
- **Warna grading** = `Pil`: biru = cool, hijau = ok, kuning = signal, merah = bad. Warna selalu disertai tulisan.
- **Dashboard:** baris "Perlu tindakan" untuk penangan (Insiden menunggu Anda, lewat tenggat) dan Komite Mutu (KTD/Sentinel belum e-report). Direktur melihat jumlah Insiden terbuka dan yang lewat tenggat.
- **Laporan Triwulan:** kartu "Insiden Keselamatan Pasien" sebelum Rekomendasi. CSV-nya mendapat tabel jenis × warna dan daftar RCA.

## Testing Decisions

- `tests/insiden.test.ts` (service, lewat Pengguna sungguhan), mencakup:
  - validasi laporan dan KPC tanpa data pasien;
  - hak baca per peran;
  - ubah sampai digrading;
  - alur biru → ditinjau → selesai dan hijau → ditinjau → RCA → selesai;
  - sentinel langsung RCA;
  - tenggat dan lewat tenggat;
  - Bukan Insiden;
  - e-Report;
  - Pembuat Laporan tidak melihat investigasi sebelum Selesai;
  - daftar dan ringkasan;
  - rekap triwulan (tahun 2013, tidak dipakai tes lain).
- Aturan murni (matriks, kelompok umur, waktu setempat) dites di `tests/insiden.test.ts` dan `tests/bulan.test.ts`.

## Out of Scope

- Pengiriman otomatis ke aplikasi IKP Kemenkes.
- Formulir 2 (laporan eksternal) sebagai unduhan.
- Subtipe insiden, tipe harm ICD-10, CMP/SDP.
- Lampiran berkas.
- Hubungan rekomendasi ke Tindak Lanjut/PDSA.
- Notifikasi.
- Insiden pada karyawan atau pengunjung (K3 RS).
- Matriks grading versi RS sendiri.
