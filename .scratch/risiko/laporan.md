# Laporan: Register Risiko

Branch `risiko`, dibuat dari `rilis-5` karena membutuhkan Jejak Audit; di-merge fast-forward ke `main` 2026-11-13 bersama Rilis 5. Keputusan lengkap ada di `spec.md`.

## Hasil

- Menu **Perbaikan → Register Risiko** (`/risiko`). Isinya register satu tahun per Unit atau Semua Unit, dengan kolom yang sama dengan Input Risiko v1:
  - Risiko + Kategori;
  - Penilaian Awal (Nilai, Tingkat, P × D, Bobot) dan Prioritas;
  - Perlakuan (jumlah langkah + jadwal);
  - Hasil Pemantauan;
  - Simpulan (penurunan Tingkat Risiko + Efektivitas);
  - jumlah Dokumen Review.
- **Tambah dan Ubah Risiko** lewat form dengan pratinjau langsung Nilai Risiko, Bobot, Tingkat, Prioritas, dan Simpulan. Penolakan service tampil di form, dan pilihan yang ditolak tetap terpilih.
- **Detail Risiko**:
  - Perlakuan bernomor;
  - Dokumen Review PDF/DOC/DOCX, paling banyak 5 berkas dan 10 MB per berkas;
  - tombol Hapus dengan konfirmasi.
- **Jejak Audit** mencatat tambah, ubah, hapus, serta unggah dan hapus dokumen, di bawah jenis data "Register Risiko".
- **Data dummy** ditambah 5 Risiko di IGD, Farmasi, ICU, dan Humas. Isinya hanya masuk ke database yang baru diisi data dummy.

## Cara mencoba

1. `npx next dev -p 3000`. Migrasi `0018_register-risiko` jalan otomatis saat server mulai.
2. Masuk sebagai `petugas.igd` (sandi `mutu12345`), lalu buka Register Risiko, Tambah Risiko, isi, Simpan, dan unggah PDF.
3. Ubah Risiko itu: isi Hasil Pemantauan dan Efektivitas, lalu lihat Simpulan.
4. Masuk sebagai `petugas.rajal`: Risiko IGD ditolak. Masuk sebagai `direktur`: bisa membaca tanpa tombol Ubah. Masuk sebagai `komite`: Semua Unit tampil dengan kolom Unit.

Database dev sudah berisi satu Risiko contoh dari QA: "Pasien jatuh saat dipindahkan dari brankar", IGD, 2026, dengan satu PDF. Hapus saja bila tidak perlu.

## Pemeriksaan

- `npm run check`: typecheck, lint, dan 259 tes lolos, termasuk 6 tes baru di `tests/risiko.test.ts`.
- QA browser (Playwright headless, desktop 1280 dan HP 390 px) lolos:
  - alur tambah → unggah → ubah → Simpulan;
  - route dokumen;
  - penolakan di form;
  - Direktur, Unit lain, dan Komite Mutu;
  - tidak ada halaman yang melebar di 390 px.
- `sloplint`: temuan yang sama dengan halaman Validasi yang sudah ada (focus/active/disabled ada di komponen shadcn bersama).
- **Code review** (10 temuan):
  - **9 diperbaiki:**
    - Hak tulis diperiksa sebelum isian dan Unit, supaya yang tidak berhak mendapat 403, bukan keterangan Unit.
    - Hitungan Dokumen Review ikut saringan register.
    - Judul register untuk Unit nonaktif.
    - `key` versi data di form hapus pada detail.
    - Hapus tidak lagi `size="lg"`.
    - Aturan tahun dan pesan penolakan ditulis di satu tempat (`tahunRisikoValid`, `tahunMaksRisiko`, `TOLAK_TULIS_RISIKO`).
    - Halaman Tambah memberi pesan bila semua Unit aktor nonaktif.
    - Nama berkas dengan `'()*` kini dikodekan benar lewat `contentDisposition` (`src/lib/bukti.ts`). Perbaikan ini juga berlaku untuk route Bukti Pengukuran.
  - **1 tidak terbukti:** "PDF dengan `Content-Security-Policy: sandbox` tidak tampil di Chrome". Sudah diuji di Chromium penuh: PDF tampil normal dengan maupun tanpa header itu.

## Perlu dicek manual

- [ ] **Tabel Bobot v1** tidak berpola (mis. P2 D3 = 1,83, P5 D5 = 1,00). Disalin apa adanya; minta Komite Mutu memastikan sumbernya.
- [ ] **Simpulan "Ada penurunan"** dihitung dari Tingkat Risiko. Nilai yang turun di dalam Tingkat yang sama tidak dihitung turun. Apakah sesuai cara RS?
- [ ] **Hak tulis Petugas Input Data.** Di v1 semua pengguna ruangan mengisi. Bila register hanya boleh diisi Kepala Unit, ini cukup diubah di satu fungsi (`bolehTulisRisiko`).
- [ ] **Register di HP** digeser ke samping (kolom Risiko terkunci).
- [ ] **Perbaikan sampingan:** pilihan Segmen di semua form dan sel matriks grading Insiden kini benar-benar di tengah. Sebelumnya tergeser karena radio tersembunyi memakan 16 px.

## Belum dibuat

- Profil Risiko RS dan laporan manajemen risiko 6 bulanan.
- FMEA.
- Ekspor register.
- Impor register dari v1.
