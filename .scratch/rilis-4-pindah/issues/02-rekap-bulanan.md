# 02: Rekap Bulanan CSV

**What to build:** Komite Mutu, Direktur, dan Admin Sistem mengunduh Rekap Bulanan CSV dari Dashboard: Capaian RS per Indikator dan Capaian tiap Unit Pelapor-nya pada bulan yang ditampilkan.

**Blocked by:** 01 (urutan kelompok)

**Status:** ready-for-agent

- [ ] `rekapBulanan(aktor, bulan?, sekarang?)` di modul Capaian.
- [ ] Route handler `/rekap-bulanan?bulan=` (CSV lewat `keCsv`).
- [ ] Tombol "Unduh CSV" di Dashboard (hanya `melihatCapaianRs`).
- [ ] Glosarium: Rekap Bulanan.
- [ ] Tes (tahun 2017).
