# Perbandingan aplikasi mutu versi pertama dengan MutuRS

Tanggal: 2026-11-12. Sumber v1: aplikasi kepegawaian RS (Laravel + Filament, grup menu "Mutu"; fitur mutu dibuat 2026-04-13 s.d. 2026-10-09). Data dibaca hanya sebagai jumlah agregat dan nama Indikator dari database lokal aplikasi itu (tanpa data pegawai atau pasien). Salinan lokal berhenti di entri 2026-09-30, jadi mungkin bukan data produksi terbaru.

## Ringkasan

- v1 adalah **lembar isian**: tiap ruangan mengisi N dan D **per hari** di tabel kalender satu bulan, boleh melampirkan bukti (PDF/foto), lalu admin mengunduh rekap Excel dan memantau ketertiban pengisian. Tidak ada Verifikasi, Analisis terstruktur, Tindak Lanjut, PDSA, grafik, atau laporan triwulan.
- MutuRS menutup siklus yang tidak ada di v1 (Verifikasi, Capaian RS vs Unit, Analisis, Tindak Lanjut, PDSA, Laporan Triwulan, Rekap SIMAR), tetapi **kurang tiga hal yang sudah dipakai di v1**: lampiran bukti, kelompok SPM, dan unduhan rekap bulanan (Excel).
- Pemakaian v1 rendah: 293 pasangan Indikator-ruangan disiapkan di 53 ruangan, tetapi hanya **11 ruangan** yang pernah mengisi, dan rata-rata hanya 1 s.d. 4 entri per Indikator per bulan. Isian harian praktis tidak dijalankan; ini mendukung isian bulanan MutuRS.

## Isi v1

| Bagian | Isi |
|---|---|
| Indikator Mutu | Per ruangan (satu baris per Indikator per ruangan). Field: jenis (INM, IMP RS, IMP Unit, SPM), nama dari master nama, inklusi, eksklusi, definisi operasional, definisi numerator, definisi denominator, operator (≥/≤), Target, satuan, aktif. Tanpa kode, frekuensi, sumber data, PIC, riwayat Target. |
| Input Mutu | Pilih ruangan, tahun, bulan; tabel Indikator × tanggal 1 s.d. akhir bulan. Klik sel = modal isi N, D, unggah bukti (PDF/JPG/PNG, maks 10 MB). Kolom total N, total D, Capaian bulan, dan satu kotak "alasan tidak tercapai". |
| Rekap Ketertiban | Admin: per Indikator per ruangan, total N, D, Capaian, dan **hari terisi / hari wajib** (Tertib ≥ 80%, Kurang tertib, Belum mengisi), paling jarang mengisi di atas; ekspor Excel. |
| Ekspor Excel | Rekap bulanan per ruangan atau semua ruangan; Indikator bernama sama digabung lintas ruangan, Capaian = ΣN/ΣD (bukan rata-rata persen). |
| Di luar Indikator | Input Risiko (register risiko: Peluang × Dampak, bobot, perlakuan, review berbukti) dan SPO (dokumen PDF per ruangan), keduanya di grup menu Mutu. |
| Peran | Admin/super admin (semua ruangan, ekspor) dan pengguna ruangan (ruangannya sendiri). Akun = akun kepegawaian. |

## Data v1 (agregat)

| | Jumlah |
|---|---|
| Baris Indikator (aktif, belum dihapus) | 293 di 53 ruangan, dari 52 nama master |
| Per jenis: nama master / baris | INM 13 / 75, IMP RS 11 / 147, IMP Unit 23 / 67, SPM 4 / 4 |
| Entri harian | 377, 2026-04-01 s.d. 2026-09-30, dari 11 ruangan |
| Entri per bulan (Indikator terisi) | Apr 13 (9), Mei 26 (24), Jun 75 (21), Jul 103 (25), Agu 84 (23), Sep 76 (12) |
| Entri berisi alasan tidak tercapai | 9 |
| Lampiran bukti | 76 berkas, 97 MB |
| Arah | 290 ≥, 3 ≤; satuan semuanya % |

Indikator yang dipakai banyak ruangan: Kelengkapan Fasilitas Cuci Tangan (30 ruangan, IMP RS), Kepatuhan Identifikasi Pasien (27, INM), Medication Error (22, IMP RS), Scoring Risiko Jatuh (22, IMP RS), SBAR (21, IMP RS), Double Check Obat High Alert (21, IMP RS), Pencegahan Risiko Jatuh (20, INM), TBAK (20, IMP RS), Visite Dokter (18, INM), Edukasi Obat Injeksi (18, **IMP Unit**). Satu nama punya Target berbeda per ruangan (Ketepatan Waktu Distribusi Makanan: ≥ 100% dan ≥ 90%).

## Perbandingan

| Kebutuhan | v1 | MutuRS |
|---|---|---|
| Satuan waktu isian | Harian | Bulanan (Semesteran untuk Indikator semesteran) |
| Satu Indikator di banyak ruangan | Baris Indikator digandakan per ruangan, disatukan oleh master nama | Satu Indikator + Unit Pelapor berperiode; Capaian RS = ΣN/ΣD |
| IMP Unit di banyak ruangan | Boleh (Edukasi Obat Injeksi di 18 ruangan) | Satu Unit Pelapor per waktu; ruangan lain = Indikator IMP-Unit sendiri atau dijadikan IMP-RS |
| Target | Satu nilai per baris ruangan, diubah = menimpa (Capaian lama dinilai ulang dengan Target baru) | Riwayat Target per Indikator (berlaku mulai bulan), sama untuk semua Unit |
| Kelompok SPM | Ada (4) | **Tidak ada** |
| Inklusi/eksklusi | Field terpisah | Digabung di definisi operasional |
| Bukti/lampiran | Per entri, PDF/JPG/PNG | **Tidak ada** |
| Verifikasi | Tidak ada | Draf, Diajukan, Terverifikasi oleh Kepala Unit + Riwayat Status |
| Alasan tidak tercapai | Satu kotak teks bebas per baris | Analisis per Lingkup + Tindak Lanjut bertenggat + PDSA |
| Kepatuhan pengisian | Rekap Ketertiban (hari terisi / hari wajib) | Status Pengukuran per bulan (Belum diisi, Draf, Diajukan, Terverifikasi) + Kelengkapan di Dashboard |
| Grafik dan tren | Tidak ada | Dashboard, Monitoring 12 bulan |
| Ekspor | Excel rekap bulanan, Excel ketertiban | CSV Laporan Triwulan, Rekap SIMAR (salin per isian); **tanpa rekap bulanan** |
| Hapus data | Hapus Indikator/ruangan ikut menghapus entri (cascade) | Tidak pernah dihapus, hanya nonaktif |
| Register risiko, SPO | Ada | Di luar cakupan |

## Yang sebaiknya tidak dibawa

- **Isian harian.** Datanya menunjukkan staf tidak mengisi harian (rata-rata 1 s.d. 4 entri per Indikator per bulan), dan tabel 31 kolom paling berat dipakai. Bila ruangan memang mencatat harian, catatan itu tetap di sumbernya; MutuRS menerima jumlah bulanannya.
- **Indikator digandakan per ruangan.** Itulah sebab v1 butuh master nama dan pembersih ejaan (7 varian nama yang sama ditemukan di migrasi 2026-10-09). Unit Pelapor di MutuRS sudah menyelesaikannya.
- **Target yang menimpa.** Capaian bulan lalu ikut berubah status bila Target diubah.
- **Hapus berantai.** Menghapus ruangan menghapus seluruh entri dan buktinya.

## Kandidat untuk MutuRS (menunggu keputusan)

1. **Lampiran bukti per Pengukuran** (PDF/JPG/PNG), dilihat Kepala Unit saat Verifikasi. Sudah dipakai di v1 (76 berkas). Butuh penyimpanan berkas + backup ikut berkas, bukan hanya database.
2. **Kelompok SPM** di `KELOMPOK` (4 Indikator di v1).
3. **Unduhan rekap bulanan** (CSV lewat `keCsv`, sama seperti Laporan Triwulan): per Indikator, Capaian RS dan per Unit, N, D, Target, Status Capaian.
4. **Target per Unit** (hanya bila memang disengaja; di v1 hanya 1 kasus, bisa jadi salah isi).
5. **Migrasi data v1** April s.d. September 2026: entri harian dijumlahkan per bulan per Indikator per ruangan, master nama dipetakan ke Indikator MutuRS (13 INM ke kode INM yang ada; IMP RS, IMP Unit, SPM dibuat baru dengan kode), ruangan ke Unit, lalu Pengukuran dibuat lewat service. Perlu keputusan statusnya (lihat pertanyaan 4), dan definisi N/D/frekuensi/sumber data yang tidak ada di v1 harus diisi Komite Mutu.
6. **Register risiko dan SPO**: tetap di aplikasi kepegawaian, kecuali Anda ingin semua PMKP di satu tempat (itu proyek tersendiri).

## Keputusan user (2026-11-12)

Pertanyaan 1, 2, 3, 5, 6 disetujui sesuai rekomendasi. Pertanyaan 4 belum: database lokal hanya salinan dev, data asli v1 ada di server produksi (Hostinger) dan masih berjalan (menjawab pertanyaan 7). Cara migrasi dibahas di sesi Rilis 4.

## Pertanyaan untuk Anda

1. **Isian bulanan cukup?** Rekomendasi: ya, MutuRS tetap bulanan.
2. **Lampiran bukti perlu masuk Rilis 4?** Rekomendasi: ya, opsional per Pengukuran, dilihat saat Verifikasi.
3. **SPM ditambahkan sebagai kelompok keempat?** Rekomendasi: ya, kecil dan sudah dipakai.
4. **Data April s.d. September dimigrasikan?** Rekomendasi: ya, sebagai Pengukuran Terverifikasi dengan Riwayat Status bertanda "dipindahkan dari aplikasi lama" (v1 tidak punya Verifikasi), supaya grafik dan Laporan Triwulan III tidak kosong. Datanya kecil (11 ruangan), jadi pemetaan bisa dicek manual.
5. **IMP Unit yang dipakai banyak ruangan** (Edukasi Obat Injeksi, 18 ruangan): dijadikan IMP-RS dengan Unit Pelapor, atau satu IMP-Unit per ruangan? Rekomendasi: IMP-RS.
6. **Register risiko dan SPO tetap di v1?** Rekomendasi: ya, di luar MutuRS untuk sekarang.
7. **Apakah v1 masih dipakai setelah September?** Salinan lokal berhenti 2026-09-30; bila produksi masih berjalan, migrasi memakai dump terbaru dan v1 dihentikan setelah MutuRS dipakai.
