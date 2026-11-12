# 02: Rekap Bulanan CSV

**What to build:** Komite Mutu, Direktur, dan Admin Sistem mengunduh Rekap Bulanan CSV dari Dashboard: Capaian RS per Indikator dan Capaian tiap Unit Pelapor-nya pada bulan yang ditampilkan.

**Blocked by:** 01 (urutan kelompok)

**Status:** selesai (2026-11-12)

- [x] `rekapBulanan(aktor, bulan?, sekarang?)` di modul Capaian.
- [x] Route handler `/rekap-bulanan?bulan=` (CSV lewat `keCsv`).
- [x] Tombol "Unduh CSV" di Dashboard (hanya `melihatCapaianRs`).
- [x] Glosarium: Rekap Bulanan.
- [x] Tes (tahun 2017).
