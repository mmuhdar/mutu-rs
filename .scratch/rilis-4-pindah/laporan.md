# Laporan Rilis 4: pindah dari aplikasi mutu lama

Branch `rilis-4-pindah` (dari `main` yang sudah berisi Rilis 3 dan desain Hallmark), 7 commit, belum di-merge. Spec: `spec.md`, tiket: `issues/01` s.d. `04`.

## Isi

| Tiket | Hasil |
|---|---|
| 01 Kelompok SPM | SPM jadi kelompok keempat, dinilai seperti IMP-RS (Capaian RS, Analisis Lingkup RS), tidak masuk Rekap SIMAR. |
| 02 Rekap Bulanan | Tombol "Unduh CSV" di Dashboard (Komite Mutu, Direktur, Admin Sistem): Capaian RS per Indikator lalu tiap Unit Pelapor. |
| 03 Bukti | Pengisi melampirkan PDF/JPG/PNG ke Pengukuran Draf; Kepala Unit membukanya di detail Pengukuran sebelum Verifikasi. |
| 04 Impor v1 | `scripts/impor-v1.ts` membaca dump SQL aplikasi lama dan membuat Unit, Indikator, Target, Unit Pelapor; langkah pemasangan di `INSTALASI.md`. Sudah diuji dengan dump asli 10 November 2026; hasilnya di `daftar-periksa-impor.md`. |

## Cara mencoba

Server dev: `npx next dev -p 3456`, buka http://localhost:3456 (bukan 127.0.0.1). Sandi semua akun dummy `mutu12345`.

## Yang perlu Anda cek manual

1. **Unggah Bukti** sebagai `petugas.icu`:
   - Buka Isi Pengukuran, November 2026, lalu pilih satu Indikator.
   - Sebelum disimpan, bagian Bukti hanya berisi "Simpan sebagai Draf dulu…". Simpan sebagai Draf, lalu buka lagi.
   - Unggah foto dari HP dan sebuah PDF sekaligus. Klik nama berkas: berkas terbuka di tab baru. Hapus satu.
   - Coba berkas yang bukan PDF/JPG/PNG (misalnya .docx yang diganti namanya menjadi .pdf): harus ditolak dengan nama berkasnya.
2. **Bukti saat Verifikasi:**
   - Ajukan Pengukuran itu. Masuk sebagai `kepala.icu`, buka Verifikasi lalu Pengukurannya: Bukti tampil di atas tombol Verifikasi tanpa tombol Hapus.
   - Kembalikan ke Draf. Masuk lagi sebagai `petugas.icu`: Bukti bisa diubah lagi.
3. **Rekap Bulanan:** sebagai `komite`, unduh dari Dashboard (Capaian per Indikator, Unduh CSV). Buka di Excel: kolom rapi, koma desimal, Lingkup "Lingkup RS" / "Unit ICU". Sebagai `kepala.icu`, tombolnya tidak ada.
4. **SPM:** sebagai `komite`, buka Indikator, Tambah Indikator, pilih kelompok SPM. Tambah Unit Pelapor-nya.
   - Muncul di Katalog (bagian SPM) dan di pemilih Monitoring (kelompok SPM, setelah IMP-Unit).
   - Laporan Triwulan menampilkan tabel Capaian SPM setelah ada Pengukuran Terverifikasi.
5. **Mode terang/gelap** di halaman isian dan detail yang kini berisi Bukti.
6. **Impor aplikasi lama:** serahkan `daftar-periksa-impor.md` ke Komite Mutu (lihat "Hasil impor dump asli" di bawah).

## Keputusan yang saya ambil sendiri

Selain keputusan sesi tanya-jawab (Q1 s.d. Q18):

- **Bukti:**
  - Bagian Bukti terpisah dari form N/D dan baru aktif setelah Draf tersimpan, karena Bukti menempel pada Pengukuran yang sudah ada.
  - Kepala Unit juga bisa mengunggah, karena ia juga pengisi.
  - Direktur tidak bisa membuka Bukti, sama seperti detail Pengukuran.
  - Jenis berkas dibaca dari isinya, dan berkas kosong ditolak.
  - Berkas dibuka di tab baru dengan header `sandbox`, supaya isi berkas tidak bisa menjalankan skrip di aplikasi.
  - Lebih dari 5 berkas sekaligus, atau berkas di atas 10 MB, ditolak di browser sebelum dikirim, supaya pesannya tetap jelas.
- **Rekap Bulanan:**
  - IMP-Unit tidak diberi baris "Lingkup RS" karena tidak punya Lingkup RS.
  - Hanya Indikator aktif yang dinilai bulan itu.
  - Capaian kosong bila belum ada Pengukuran Terverifikasi.
  - Di HP, dua tombol kepala tabel bertumpuk supaya judul tidak terjepit.
- **SPM:**
  - Judul "Tambah IMP" menjadi "Tambah Indikator".
  - Pemilih Indikator di Monitoring kini diurutkan per kelompok. Sebelumnya urut kode, sehingga INM muncul setelah IMP.
- **Impor:**
  - Skrip menyiapkan database kosong sendiri (migrasi, Admin Sistem awal, 13 INM).
  - Nama INM yang tidak sama persis dicocokkan menurut kemiripan kata (≥ 75%, misalnya "Kepatuhan Penggunaan APD") dan ditandai untuk diperiksa. Alias khusus baru ditambahkan bila dump asli memerlukannya.
  - Indikator bernama sama dipakai ulang beserta kodenya, supaya impor ulang tidak membuat data ganda.
  - Target diambil dari nilai terbanyak di antara baris dengan Arah terbanyak.
  - Hal berikut dicatat di daftar periksa: satuan selain %, dan nama lebih dari 200 karakter (dipotong).
  - Kolom `type` yang kosong dianggap INM, sesuai nilai bawaan v1.
  - Dump boleh `.sql` atau `.sql.gz`.

## Hasil impor dump asli

Dump `u792262854_kepegawaian.20261110000307.sql.gz` (MariaDB, 10 November 2026) dibaca langsung dari Downloads, tanpa disalin atau dibongkar. Yang diurai hanya `units`, `master_indikator_mutus`, dan `indikator_mutus`; tabel kepegawaian dilewati.

- **Ke database PostgreSQL kosong:**
  - 287 baris Indikator aktif menjadi 52 Unit dan 50 Indikator: 13 INM, 13 IMP-RS, 20 IMP-Unit, 4 SPM.
  - Ke-13 INM cocok persis menurut nama, tanpa pencocokan kemiripan.
  - Dibuat 37 Indikator baru dan 258 Unit Pelapor, semuanya mulai Januari 2027. Tidak ada yang gagal.
  - Dijalankan ulang, tidak ada yang dibuat lagi. Hasilnya bisa di-`pg_dump`. Database sementaranya sudah dihapus.
- **287 baris menjadi 258 Unit Pelapor** karena v1 punya beberapa baris untuk Indikator dan ruangan yang sama (misalnya Distribusi Makanan tiga kali di Instalasi Gizi). Catatan Target di daftar periksa kini dihitung per baris.
- **Yang perlu diputuskan Komite Mutu** (tidak saya ubah sendiri):
  - `IMP-RS-02` bernama "Area non-klinis (mis. ruang administrasi, gudang, kantin) yang tidak memerlukan fasilitas kebersihan tangan klinis." Isinya tampak seperti kriteria eksklusi "Angka Kelengkapan Fasilitas Cuci Tangan" (`IMP-RS-01`) yang diketik sebagai Indikator di v1 (Poli Saraf, Poli TB Paru). Bila memang bukan Indikator, nonaktifkan setelah pemasangan.
  - `IMP-UNIT-03` Kejadian Cedera Akibat Restrain: di v1 ada ≤ 0 dan ≥ 0; dipakai ≤ 0.
  - `IMP-UNIT-01` Drop Out Rehabilitasi Medik: ≥ 60 dan ≥ 100; dipakai ≥ 60.
  - `IMP-UNIT-15` Distribusi Makanan: ≥ 90 (2 baris) dan ≥ 100; dipakai ≥ 90.
  - `INM-01` Target v1 ≥ 100, sedangkan MutuRS memakai Target PMK 85.
  - `INM-02` satu ruangan ≥ 90, sedangkan MutuRS memakai Target PMK 100.
  - Definisi N dan D `SPM-01` dan `SPM-04` kosong di v1. Sumber Data semua Indikator baru masih "Belum diisi".
  - Nama Unit dan beberapa nama Indikator ditulis huruf kapital semua seperti di v1 (misalnya `IMP-UNIT-04`). Bisa diganti di MutuRS setelah pemasangan.
  - Tiga Indikator IMP Unit yang di v1 dipakai beberapa ruangan menjadi IMP-RS (`IMP-RS-07`, `-09`, `-12`), sesuai keputusan sebelumnya.
- **Impor final** tetap dijalankan saat pemasangan di server dengan dump terbaru, mengikuti `INSTALASI.md`.

## Pemeriksaan

- **Proyek:** `npm run check` lulus (typecheck, lint, 210 tes; tes baru: `bukti`, `rekap-bulanan`, `impor-v1`, tambahan SPM).
- **Uji impor penuh** di PostgreSQL kosong dengan dump contoh:
  - membuat 2 Unit, 2 Indikator, dan 4 Unit Pelapor;
  - dijalankan ulang tidak membuat apa pun;
  - hasilnya bisa di-`pg_dump` untuk dipasang di server.
- **Uji browser (Playwright):**
  - unggah sebagian berhasil dan sebagian ditolak, buka berkas, hapus;
  - Bukti terkunci setelah Diajukan;
  - Unit lain mendapat 403, Kepala Unit melihat Bukti, CSV untuk Komite, 403 untuk Kepala Unit;
  - tampilan 1280 dan 390 px, kedua mode.
- **Code review dua sumbu (standar dan spec)**, semua temuan sudah diperbaiki di commit `72d9904`:
  - Bug impor: dua Indikator yang namanya hanya berbeda di dalam kurung tergabung, dan impor ulang menaruh Unit Pelapor di Indikator yang salah.
  - Arah dan Target bisa berasal dari baris yang berbeda.
  - Lingkup di CSV ditulis sendiri, padahal seharusnya lewat `labelLingkup`.
  - Beberapa duplikasi kecil.
- **Linter desain Hallmark:** 0 FAIL, 0 REFLEX.

## Batasan

- **Format dump:** impor diuji dengan dump MariaDB dari Hostinger. Ekspor dengan format lain (misalnya tanpa `CREATE TABLE` dan tanpa daftar kolom) akan ditolak dengan menyebut tabelnya.
- **Ukuran backup:** Bukti tersimpan di database, jadi backup harian membesar. Perkiraannya ada di `INSTALASI.md`.
- **Tampilan Bukti:** tanpa pratinjau gambar kecil (thumbnail); berkas dibuka di tab baru.
- **Demo produksi** di http://localhost:3917 belum dibangun ulang dengan Rilis 4.
- **Data dummy dev berubah** karena uji browser: beberapa Pengukuran November 2026 milik ICU (Draf dan Diajukan, satu dengan Bukti PDF).

## Langkah berikutnya

1. Komite Mutu memeriksa `daftar-periksa-impor.md` dan keputusan di "Hasil impor dump asli". Berkas dump di Downloads berisi data kepegawaian: hapus bila tidak dipakai lagi. Untuk pemasangan diperlukan dump terbaru.
2. Setelah cek manual di atas oke: `git switch main && git merge --ff-only rilis-4-pindah`.
3. Rilis 5 (kandidat): audit trail, notifikasi, umpan balik Dewan Pengawas, analisis efisiensi (PMKP 4 g), validasi data (PMKP 5).
