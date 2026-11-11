# 01: Capaian Triwulan dan Laporan Triwulan

**What to build:** Komite Mutu, Direktur, dan Admin Sistem membuka Laporan Triwulan untuk Triwulan yang sudah selesai: ringkasan, Capaian Triwulan semua Indikator, Analisis, Tindak Lanjut, PDSA, dan Rekomendasi yang ditulis Komite Mutu. Laporan dicetak / disimpan PDF lewat browser.

**Blocked by:** –

**Status:** selesai (branch `rilis-3-laporan`)

- [x] Triwulan `"YYYY-T"` di `src/lib/bulan.ts`: `triwulanValid`, `bulanTriwulan`, `triwulanDari`, `triwulanLalu`, `labelTriwulan`; tes murni.
- [x] `capaianTriwulan` di modul Capaian (`capaianDari` atas baris tiga bulan; Target bulan terakhir; Indikator aktif atau punya Pengukuran Terverifikasi dalam Triwulan).
- [x] Tabel `rekomendasi` (tahun, triwulan, teks, diubah oleh/pada; unik tahun + triwulan) + migrasi.
- [x] Modul `src/modules/laporan/service.ts`: `laporanTriwulan`, `simpanRekomendasi`; hanya Triwulan yang sudah selesai; hak baca `melihatCapaianRs`, tulis Komite Mutu + Admin Sistem.
- [x] Halaman `/laporan?triwulan=` + menu kelompok Laporan; tampilan cetak A4 (`print:`), tanggal cetak, kolom tanda tangan.
- [x] Glosarium: Triwulan, Laporan Triwulan, Capaian Triwulan, Rekomendasi.
- [x] Tes service sesuai spec (tahun 2016).
- [x] Dicek manual di browser, termasuk 390 px dan pratinjau cetak.
