# Spec: MutuRS Rilis 4 — pindah dari aplikasi mutu lama

Status: selesai (2026-11-12, branch `rilis-4-pindah`)

## Problem Statement

Rumah sakit sudah memakai aplikasi mutu versi pertama (modul "Mutu" di aplikasi kepegawaian `pegawai-mokopido`, berjalan di Hostinger). Perbandingannya ada di `.scratch/perbandingan-v1/laporan.md`. Ada tiga hal yang sudah dipakai di v1 tetapi belum ada di MutuRS:

- **Lampiran bukti.** Ruangan melampirkan foto atau PDF bukti pengukuran (76 berkas, 97 MB dalam enam bulan).
- **Kelompok SPM.** Ada empat Indikator Standar Pelayanan Minimal.
- **Rekap bulanan.** Admin mengunduh rekap Capaian satu bulan untuk diolah di Excel. MutuRS baru punya unduhan Laporan Triwulan.

Selain itu, pengaturan v1 (52 nama Indikator di 53 ruangan, beserta definisi dan Target) harus dipindahkan supaya Komite Mutu tidak mengetik ulang semuanya saat MutuRS dipasang.

## Solution

- **Bukti per Pengukuran.** Pengisi bisa melampirkan PDF/JPG/PNG ke Pengukuran Draf, di halaman isian. Kepala Unit, Komite Mutu, dan Admin Sistem melihatnya di detail Pengukuran.
- **SPM** menjadi kelompok Indikator keempat dan berperilaku seperti IMP-RS.
- **Rekap Bulanan** bisa diunduh sebagai CSV dari Dashboard untuk bulan yang ditampilkan.
- **Skrip impor pengaturan v1** (`scripts/impor-v1.ts`):
  - Membaca dump SQL database v1 dan membuat Unit, Indikator, Target, dan Unit Pelapor lewat service.
  - Mencetak daftar periksa untuk Komite Mutu.
  - Dijalankan ulang dengan dump terbaru saat MutuRS dipasang di server RS.

## User Stories

### Bukti

1. Sebagai Petugas Input Data atau Kepala Unit, saya ingin melampirkan foto atau PDF bukti ke Pengukuran Draf Unit saya, supaya Kepala Unit bisa memeriksa asal angka N dan D.
2. Sebagai pengisi, saya ingin menghapus bukti yang salah selama Pengukuran masih Draf.
3. Sebagai pengisi, saya ingin bukti terkunci setelah Pengukuran Diajukan, supaya Kepala Unit memverifikasi berkas yang sama persis. Bila Pengukuran dikembalikan atau dibuka kembali (kembali ke Draf), bukti bisa diubah lagi.
4. Sebagai Kepala Unit, saya ingin membuka bukti di detail Pengukuran saat Verifikasi.
5. Sebagai Komite Mutu atau Admin Sistem, saya ingin membuka bukti Pengukuran Unit mana pun.
6. Sebagai pengisi, saya ingin pesan yang jelas bila berkas bukan PDF/JPG/PNG, lebih dari 10 MB, atau bukti sudah 5 berkas.

### SPM

7. Sebagai Komite Mutu atau Admin Sistem, saya ingin menambah Indikator berkelompok SPM dengan Unit Pelapor dan Target, seperti IMP-RS.
8. Sebagai Komite Mutu, saya ingin SPM tampil sebagai kelompok sendiri setelah IMP-Unit di Katalog Indikator, Monitoring, dan Laporan Triwulan, dengan Analisis Lingkup RS. SPM tidak masuk Rekap SIMAR.

### Rekap Bulanan

9. Sebagai Komite Mutu, Direktur, atau Admin Sistem, saya ingin mengunduh Rekap Bulanan CSV dari Dashboard. Isinya Capaian RS setiap Indikator dan Capaian setiap Unit Pelapor-nya pada bulan itu, supaya bisa diolah di Excel.

### Impor v1

10. Sebagai pemasang MutuRS, saya ingin menjalankan satu perintah atas dump SQL v1. Hasilnya: Unit, Indikator, Target, dan Unit Pelapor mulai bulan peralihan, tanpa data ganda bila dijalankan ulang.
11. Sebagai Komite Mutu, saya ingin daftar periksa hasil impor: nama v1, kode, kelompok, Unit Pelapor, Target, field yang masih "Belum diisi", dan perbedaan dengan v1. Dengan begitu saya bisa melengkapi dan mengoreksinya sebelum isian pertama.

## Implementation Decisions

### Bukti

- **Tabel `bukti_pengukuran`.** Kolom:
  - `id`
  - `pengukuran_id` (FK)
  - `nama`: nama berkas asli, dirapikan, maksimal 200 karakter
  - `jenis`: `application/pdf`, `image/jpeg`, atau `image/png` (CHECK)
  - `ukuran`: 1 s.d. 10 MB (CHECK)
  - `isi`: `bytea`
  - `diunggah_oleh_id`, `diunggah_pada`

  Berkas disimpan di PostgreSQL, jadi otomatis ikut backup harian (keputusan grilling Q7). Tidak ada hapus berantai: Pengukuran tidak pernah dihapus.
- **Service di modul Pengukuran:**
  - `tambahBukti(aktor, pengukuranId, berkas)` dan `hapusBukti(aktor, buktiId)`:
    - Pengisi (`PENGISI`) dengan Unit Pengukuran di `aktor.unitIds`.
    - Status harus Draf, dengan baris Pengukuran dikunci `for update` supaya pengajuan tidak menyelip.
    - Aturan konteks sama dengan menyimpan isian (`periksaKonteks`).
    - Paling banyak `MAKS_BUKTI` = 5 berkas per Pengukuran.
  - `daftarBukti` (tanpa `isi`) ikut dalam `ambilIsian` dan `ambilPengukuran`.
  - `ambilBerkasBukti(aktor, buktiId)`: hak baca sama dengan `ambilPengukuran`.
- **Pemeriksaan berkas:**
  - Jenis ditentukan dari isi berkas (tanda awal `%PDF-`, `FF D8 FF`, `89 50 4E 47 0D 0A 1A 0A`), bukan dari nama atau tipe kiriman browser.
  - Batas ukuran `MAKS_UKURAN_BUKTI` = 10 MB.
  - Aturan murninya di `src/lib/bukti.ts`.
- **Tampilan:**
  - `/pengukuran/isi`: bagian "Bukti" di bawah form. Bagian ini hanya tampil bila Pengukuran sudah ada sebagai Draf; sebelum itu tertulis "Simpan sebagai Draf dulu untuk melampirkan bukti".
    - Form unggah (`multiple`) dan tombol Hapus per berkas lewat server action.
    - Unggah banyak berkas = beberapa panggilan `tambahBukti`. Berkas yang sudah lolos tetap tersimpan, dan pesan menyebut berkas yang ditolak.
    - Pilihan yang pasti ditolak (lebih dari 5 berkas sekaligus, atau satu berkas di atas 10 MB) sudah diperiksa di browser sebelum dikirim, supaya kiriman tidak melewati batas body dan pesannya tetap jelas.
  - `/pengukuran/[id]`: daftar bukti baca-saja.
  - Berkas dibuka lewat route handler `/pengukuran/bukti/[id]`:
    - `Content-Type` dari kolom `jenis`.
    - `Content-Disposition: inline` dengan nama asli.
    - `Content-Security-Policy: sandbox`.
- **Batas request:** `serverActions.bodySizeLimit` dan `proxyClientMaxBodySize` dinaikkan ke 52 MB, cukup untuk lima berkas 10 MB sekaligus. Bawaannya 1 MB dan 10 MB, dan proxy memotong body di atas batasnya.
- **Backup:** `INSTALASI.md` menyebut bahwa ukuran backup ikut membesar sesuai bukti.

### SPM

- `KELOMPOK` = `INM`, `IMP-RS`, `IMP-Unit`, `SPM` (urutan tampil). Migrasi CHECK `indikator_kelompok_check`.
- `tambahIndikator` menerima IMP-RS, IMP-Unit, dan SPM; INM tetap hanya dari data awal.
- Lingkup sudah terpusat di `punyaLingkupRs` (selain IMP-Unit punya Lingkup RS), jadi Analisis, Belum dianalisis, Laporan Triwulan, dan Monitoring otomatis berlaku untuk SPM. Rekap SIMAR hanya INM.
- Urutan tampil kelompok lalu kode = `urutKelompok` (`src/lib/indikator.ts`), dipakai Laporan Triwulan, Rekap Bulanan, pemilih Indikator Monitoring, dan rencana impor.
- Form Indikator: pilihan kelompok ditambah SPM; judul halaman tambah menjadi "Tambah Indikator". Teks halaman yang menyebut daftar kelompok diperbarui.
- Glosarium: entri **SPM (Standar Pelayanan Minimal)**.

### Rekap Bulanan

- `rekapBulanan(aktor, bulan?, sekarang?)` di modul Capaian:
  - Hanya `PELIHAT_RS`.
  - Tanpa bulan = `bulanLalu`; bulan yang belum berjalan ditolak.
  - Hanya Indikator aktif yang diukur bulan itu.
  - Per Indikator: satu baris Capaian RS (`unit` null; tidak ada untuk IMP-Unit, yang hanya punya Lingkup Unit), lalu satu baris per Unit Pelapor (urut nama).
  - Urutan Indikator: kelompok, lalu kode.
- Route handler `/rekap-bulanan?bulan=` (`src/app/rekap-bulanan/route.ts`), CSV lewat `keCsv`. Kolom:
  - Kelompok, Kode, Indikator, Lingkup (`labelLingkup`: "Lingkup RS" atau "Unit ICU"), Satuan, Arah
  - Target, N, D, Capaian, Status Capaian
  - Pengukuran Terverifikasi, Pengukuran wajib (dua kolom angka, sama dengan Laporan Triwulan)
- Nama berkas `rekap-bulanan-YYYY-MM.csv`. Tombol "Unduh CSV" di kepala tabel Capaian per Indikator Dashboard, hanya untuk `melihatCapaianRs`.
- Glosarium: entri **Rekap Bulanan**.

### Impor v1

- Perintah: `npx tsx --env-file=.env scripts/impor-v1.ts <dump.sql> [--mulai YYYY-MM] [--jalankan]`.
  - Tanpa `--jalankan` = pratinjau tanpa menulis.
  - Daftar periksa (Markdown) dicetak ke stdout, ringkasan ke stderr.
  - Bawaan `--mulai 2027-01`.
  - Bertindak sebagai Admin Sistem awal (`config.adminAwal`), seperti data dummy.
- **Membaca dump** (`scripts/impor-v1/dump.ts`, murni):
  - Hanya tabel `units`, `master_indikator_mutus`, dan `indikator_mutus`. Tabel lain (data kepegawaian) dilewati tanpa diurai.
  - Mendukung `INSERT` mysqldump (urutan kolom dari `CREATE TABLE`) dan ekspor phpMyAdmin (daftar kolom di `INSERT`), termasuk escape `\'`, `\\`, `\n`, `''`, dan `NULL`.
- **Rencana** (`scripts/impor-v1/rencana.ts`, murni):
  - Hanya baris Indikator yang `is_active` dan tidak `deleted_at`. Baris dikelompokkan per master (cadangan: nama yang dirapikan).
  - **Kelompok:**
    - `INM` dicocokkan dengan 13 INM MutuRS menurut nama yang dinormalkan (huruf kecil, hanya huruf dan angka, tanpa isi kurung). Bila tidak sama persis, kata-kata nama yang lebih pendek ≥ 75% ada di nama INM (mis. "Kepatuhan Penggunaan APD"); kecocokan ini ditandai "menurut kemiripan nama" di daftar periksa. Alias khusus ditambahkan bila dump asli memerlukannya.
    - `IMP RS` menjadi IMP-RS.
    - `IMP Unit` di satu ruangan tetap IMP-Unit; di lebih dari satu ruangan menjadi IMP-RS (keputusan Q5 perbandingan).
    - `SPM` menjadi SPM.
    - Jenis yang berbeda-beda dalam satu master: dipakai yang terbanyak, dicatat.
    - INM yang tidak cocok dicatat dan diperlakukan sebagai IMP-RS.
  - **Kode:** `IMP-RS-nn`, `IMP-UNIT-nn`, `SPM-nn` urut nama, melanjutkan nomor tertinggi yang sudah ada di database.
  - **Field Indikator:**
    - Definisi operasional = definisi v1 ditambah "Inklusi: …" dan "Eksklusi: …".
    - Definisi N/D diambil dari teks terbanyak yang tidak kosong.
    - Yang kosong, juga Sumber Data, diisi `BELUM_DIISI` = "Belum diisi (dari aplikasi lama)".
    - Faktor 100, satuan %, Frekuensi Bulanan, PIC kosong.
    - Arah dari operator terbanyak; Target = nilai terbanyak di antara baris ber-Arah itu (keduanya dari baris yang sama).
    - Nama dipotong ke 200 karakter bila perlu (dicatat).
    - INM tidak diubah sama sekali (definisi dan Target PMK tetap); perbedaan Target v1 dicatat.
  - **Target:** satu per Indikator, berlaku mulai bulan peralihan; nilai terbanyak (lihat Arah), dan perbedaannya dicatat.
  - **Unit:** hanya ruangan yang punya baris di atas, nama dirapikan spasinya.
  - **Unit Pelapor:** setiap pasangan Indikator-ruangan, mulai bulan peralihan, tanpa bulan berhenti.
- **Pelaksana** (`scripts/impor-v1/jalankan.ts`, lewat service):
  - Unit dicari menurut nama tanpa membedakan huruf besar/kecil (`daftarUnit`), atau ditambah.
  - Indikator dicari menurut kode, atau ditambah (`tambahIndikator`). Indikator yang kodenya sudah ada tidak diubah.
  - Supaya rencana ulang atas database yang sudah diimpor memberi kode yang sama, rencana memakai ulang Indikator non-INM yang namanya sama (kunci nama: huruf kecil, hanya huruf dan angka, isi kurung tetap dihitung) beserta kodenya, dan kode baru melanjutkan nomor tertinggi. Pengelompokan baris tanpa master memakai kunci yang sama, jadi "Waktu Tunggu (IGD)" dan "Waktu Tunggu (Rawat Jalan)" tetap dua Indikator.
  - Penolakan service saat menambah Indikator atau Unit Pelapor dicatat sebagai gagal di daftar periksa; impor tetap berlanjut dan aman diulang.
  - Unit Pelapor ditambah bila Unit itu belum menjadi Unit Pelapor yang bersinggungan dengan bulan peralihan (`unitPelaporAktif`).
  - Hasilnya dihitung: dibuat dan dilewati.
- Akun pengguna, isian, dan bukti v1 tidak diimpor.

## Testing Decisions

- **Bukti** (`tests/bukti.test.ts`):
  - Pengisi Unit sendiri bisa menambah dan menghapus bukti Draf.
  - Ditolak untuk Unit lain, Komite Mutu, Pengukuran Diajukan/Terverifikasi, berkas ke-6, berkas > 10 MB, dan berkas yang isinya bukan PDF/JPG/PNG walau namanya `.pdf`.
  - Setelah dikembalikan, bukti bisa diubah lagi.
  - `ambilPengukuran` membawa daftar bukti.
  - `ambilBerkasBukti` mengikuti hak baca detail Pengukuran.
  - Aturan murni `jenisBukti` dites tanpa database.
- **SPM** (tambahan di `tests/indikator.test.ts` dan `tests/analisis.test.ts`): SPM bisa ditambah dan punya Lingkup RS; INM tetap tidak bisa ditambah.
- **Rekap Bulanan** (`tests/rekap-bulanan.test.ts`, **tahun 2017**):
  - Baris RS + Unit, urutan kelompok lalu kode.
  - Hanya Pengukuran Terverifikasi yang dihitung.
  - Ditolak untuk Petugas Input Data/Kepala Unit dan untuk bulan yang belum berjalan.
- **Impor** (`tests/impor-v1.test.ts`):
  - Pengurai dump untuk kedua format.
  - Rencana dari baris contoh: kelompok, kode, placeholder, Target terbanyak, IMP Unit multi-ruangan, baris nonaktif/terhapus, INM cocok dan tidak cocok.
  - Pelaksana dengan bulan peralihan **2031** (tidak bersinggungan dengan tes lain yang memakai INM), dijalankan dua kali tanpa data ganda.
  - Unit Pelapor INM yang dibuat tes dihapus lagi di akhir.

## Out of Scope

- Halaman impor di aplikasi (ditolak user; impor lewat skrip saat pemasangan).
- Pemindahan isian (`mutu_entries`), bukti, dan akun pengguna v1.
- Rekap Ketertiban v1 (sudah tercakup oleh Status Pengukuran dan Kelengkapan).
- Register risiko dan SPO (tetap di aplikasi kepegawaian).
- Rilis 5: audit trail, notifikasi email/WA, umpan balik Dewan Pengawas, analisis efisiensi (PMKP 4 g), validasi data (PMKP 5).

## Further Notes

- Keputusan diambil di sesi grilling 2026-11-12 (Q1 s.d. Q18) dan di `.scratch/perbandingan-v1/laporan.md`.
- Dump v1 berisi data kepegawaian. Skrip hanya membaca tiga tabel di atas. Dump tidak masuk repo dan dihapus dari folder sementara setelah dipakai.
