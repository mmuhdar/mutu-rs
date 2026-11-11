# 03: Rekap SIMAR

**What to build:** Komite Mutu membuka isian SIMAR satu bulan per INM (N, D, Capaian, Analisa Capaian, Rencana Tindak Lanjut) dengan tombol Salin dan tanda bila belum siap.

**Blocked by:** 01 (modul laporan)

**Status:** ready-for-agent

- [ ] `src/lib/laporan.ts`: `teksRencanaTindakLanjut`, `tandaSimar` + label, `BATAS_TEKS_SIMAR`, `MIN_D_SIMAR`, `jadwalSimar`.
- [ ] `rekapSimar(aktor, bulan?, sekarang)` di modul laporan; hak baca `melihatCapaianRs`.
- [ ] Halaman `/simar?bulan=` + menu; `TombolSalin` dengan cadangan untuk `http://`.
- [ ] Glosarium: Rekap SIMAR.
- [ ] Tes service sesuai spec (tahun 2015, Unit Pelapor INM berhenti 2015).
- [ ] Dicek manual di browser, termasuk 390 px dan tombol Salin lewat `http://`.
