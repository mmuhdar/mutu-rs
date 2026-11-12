# Laporan Rilis 5: kelengkapan akreditasi

- **Branch:** `rilis-5`, dibuat dari `main` (yang sudah memuat Rilis 4 dan modul Insiden), 11 commit, belum di-merge.
- **Spec:** `spec.md`.
- **Riset baru:** `docs/research/validasi-data-pmkp5.md`.

## Isi

| Fitur | Hasil | Dasar |
|---|---|---|
| Validasi Data | Menu "Validasi Data". Validasi dicatat per Indikator + Unit Pelapor + bulan data, berisi pemicu, pengumpul data, validator, populasi, sampel, dan jumlah sesuai. Kesesuaian dan sampel minimal dihitung langsung. Hasil di bawah 90% wajib disertai penyebab dan perbaikan, lalu divalidasi ulang. Tampil di Laporan Triwulan dan Dashboard. | PMKP 5, PMK 30/2022 Lampiran BAB IV.B |
| Umpan Balik Dewan Pengawas | Di Laporan Triwulan: umpan balik atas laporan itu (dicatat setelah pertemuan), dan tindak lanjut umpan balik Triwulan sebelumnya (dievaluasi pada pertemuan laporan ini). | TKRS 1 |
| Analisis Efisiensi | Di detail PDSA: biaya Rupiah per jenis sumber daya sebelum dan sesudah perbaikan, total penghematan, dan kesimpulan. Ringkasannya ikut di daftar PDSA Laporan Triwulan. | PMKP 4 EP g |
| Jejak Audit | Menu "Jejak Audit" (Admin Sistem, Komite Mutu). Setiap perubahan data lewat aplikasi tercatat: siapa, kapan, apa, termasuk nilai lama. Masuk yang berhasil dan yang gagal juga tercatat. | Akuntabilitas data |
| Pemasangan | Bagian baru di `INSTALASI.md` tentang listrik padam dan server rusak. Build produksi (`next build`) sudah dicek berhasil. | Permintaan user |

Dengan rilis ini, Laporan Triwulan memuat semua isi yang diminta PMKP 1:
- Capaian;
- Analisis;
- validasi;
- perbaikan (Tindak Lanjut, PDSA, efisiensi);
- Insiden;
- Rekomendasi;
- Umpan Balik Dewan Pengawas.

## Cara mencoba

- **Server dev:** http://localhost:3456. Server sudah berjalan dan migrasi 0014–0017 sudah masuk.
- **Akun:** sandi semua akun dummy `mutu12345`.
- **Data contoh di database dev:**
  - 4 validasi: valid; tidak valid lalu diulang; dan satu yang belum valid (INM-02 IGD);
  - Umpan Balik Dewan Pengawas Triwulan II dan III 2026;
  - Analisis Efisiensi pada PDSA "Dokter jaga triase" (IGD, Selesai).

## Yang perlu Anda cek manual

1. **Validasi Data** sebagai `komite`:
   - Buka Validasi Data, lalu Catat Validasi.
   - Isi populasi, sampel, dan data sesuai. Pratinjau kesesuaian dan sampel minimal ikut berubah.
   - Coba di bawah 90% tanpa penyebab: harus ditolak.
   - Isi penyebab dan perbaikan, lalu simpan.
   - Di detailnya, tekan Validasi ulang dan catat hasil yang valid. Status "Belum valid" hilang.
2. **Validasi oleh Kepala Unit:**
   - `kepala.igd` bisa mencatat validasi untuk IGD saja.
   - `petugas.igd` hanya bisa membaca.
3. **Laporan Triwulan III 2026** sebagai `komite` atau `direktur`:
   - bagian Validasi Data;
   - Umpan Balik Dewan Pengawas: tindak lanjut Triwulan II dan umpan balik Triwulan III;
   - cetak lewat browser.
4. **Analisis Efisiensi:** buka PDSA "Dokter jaga triase", lalu Perbaiki Analisis Efisiensi. Coba juga di PDSA lain.
5. **Jejak Audit:**
   - Sebagai `komite`: ubah Target satu Indikator, lalu buka Jejak Audit. Perubahannya tercatat beserta Target lama.
   - Sebagai `admin` (Admin Sistem): jejak Insiden tidak tampil.
6. **Dashboard:** "Validasi belum valid" tampil untuk Komite Mutu, Kepala Unit, dan Direktur.
7. **Mode terang/gelap dan HP (390 px)** pada halaman Validasi Data dan Jejak Audit.

## Keputusan yang saya ambil sendiri

Semuanya tercatat di `spec.md` bagian "Keputusan". Yang paling penting:

- **Notifikasi email/WA tidak dibuat.** Butuh akun SMTP atau gateway WA dan internet di server RS. Dashboard tetap jadi pengingat di dalam aplikasi.
- **Validasi Data:**
  - **Satuannya** Indikator + Unit Pelapor + bulan data, dan hanya untuk bulan yang sudah punya Pengukuran.
  - **Pengumpul data dan validator** diketik namanya dan harus orang berbeda.
  - **Sampel minimal** mengikuti Tabel 3 PMK 30/2022: 1–16 = semua, 17–160 = 16, ≥ 161 = 48.
  - **Valid** bila kesesuaian ≥ 90%. Kesesuaian ditampilkan dengan satu desimal yang dipotong, supaya 89,96% tidak tampil "90%".
  - **Pemicu tidak dideteksi otomatis**, karena sebagian besar pemicu tidak punya padanan data di aplikasi.
  - **Yang mencatat:** Komite Mutu, Admin Sistem, dan Kepala Unit dari Unit itu (validator boleh Kepala Unit, PMKP 1).
- **Umpan Balik Dewan Pengawas:**
  - Dicatat Komite Mutu, Direktur, atau Admin Sistem, karena Dewan Pengawas tidak punya akun.
  - Tanggal diterima tidak boleh sebelum Triwulan berakhir.
- **Analisis Efisiensi:**
  - Ada lima jenis sumber daya tetap. Biaya dalam Rupiah bulat, maksimal 2 miliar per baris.
  - Tidak ada penanda "proyek prioritas tahun ini"; Komite Mutu memilih PDSA mana yang dianalisis.
- **Jejak Audit:**
  - Ditulis dalam transaksi yang sama dengan perubahannya, jadi tidak ada perubahan tanpa jejak.
  - Tanpa sandi, isi berkas, atau identitas pasien. Insiden hanya dicatat status dan warnanya.
  - Username yang tidak dikenal pada percobaan masuk yang gagal tidak ditulis, karena bisa jadi sandi yang salah diketik di kolom username.
  - Percobaan yang ditolak karena terlalu sering tidak dicatat.
  - Halaman menampilkan 300 perubahan terbaru, dengan saringan jenis data dan tanggal.

## Pemeriksaan

- **Proyek:** `npm run check` lulus (typecheck, lint, 253 tes). Tes baru: `validasi`, `umpan-balik`, `jejak`, ditambah Analisis Efisiensi di `pdsa`.
- **Build produksi:** `npx next build` berhasil (semua route, termasuk `/validasi` dan `/jejak`).
- **Uji browser (Playwright):**
  - catat validasi lewat form: pratinjau 87,5% tidak valid, ditolak tanpa penyebab, tersimpan setelah penyebab diisi;
  - halaman Validasi, Jejak Audit, PDSA, Laporan Triwulan, dan Dashboard, di 1280 dan 390 px, tanpa halaman yang melebar;
  - Admin Sistem tanpa jejak Insiden;
  - Kepala Unit ditolak membuka Jejak Audit.
- **Code review dua sumbu (standar dan spec):** semua temuan sudah diperbaiki di commit `6b3585a`. Yang terpenting:
  - beberapa jejak ditulis di luar transaksi;
  - percobaan masuk yang gagal bisa menyimpan sandi yang salah diketik di kolom username;
  - validasi bisa dicatat untuk bulan tanpa Pengukuran, dan periode Unit Pelapor-nya bisa dihapus;
  - Laporan Triwulan belum memuat penyebab dan perbaikan validasi;
  - beberapa duplikasi.
- **Linter desain Hallmark:** 0 FAIL, 0 REFLEX.

## Batasan

- **Tidak dibuat:** notifikasi email/WA, deteksi otomatis pemicu validasi, unggah dokumen validasi, dan pengiriman otomatis ke SIMAR atau aplikasi IKP Kemenkes.
- **Penyimpanan jejak:** Jejak Audit disimpan selamanya dan ikut backup. Ukurannya kecil (satu baris teks per perubahan).
- **Demo produksi** di port 3917 belum dibangun ulang.

## Langkah berikutnya

1. Cek manual di atas.
2. Bila oke: `git switch main && git merge --ff-only rilis-5`.
3. **Pemasangan di server:**
   - pasang ulang server (Proxmox atau langsung), lalu ikuti `INSTALASI.md`, termasuk bagian listrik padam;
   - jalankan impor dari dump aplikasi lama yang terbaru;
   - Komite Mutu melengkapi daftar periksa impor dan Sumber Data Indikator sebelum isian Januari 2027.
