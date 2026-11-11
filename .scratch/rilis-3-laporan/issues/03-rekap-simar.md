# 03: Rekap SIMAR

**What to build:** Komite Mutu membuka isian SIMAR satu bulan per INM (N, D, Capaian, Analisa Capaian, Rencana Tindak Lanjut) dengan tombol Salin dan tanda bila belum siap.

**Blocked by:** 01 (modul laporan)

**Status:** selesai (2026-11-11, branch `rilis-3-laporan`)

- [x] `src/lib/laporan.ts`: `teksRencanaTindakLanjut`, `tandaSimar` (kode + pesan), `BATAS_TEKS_SIMAR`, `MIN_D_SIMAR`, `tenggatSimar`.
- [x] `rekapSimar(aktor, bulan?, sekarang)` di modul laporan; hak baca `melihatCapaianRs`.
- [x] Halaman `/simar?bulan=` + menu; `TombolSalin` dengan cadangan untuk `http://`.
- [x] Glosarium: Rekap SIMAR.
- [x] Tes service sesuai spec (tahun 2015, Unit Pelapor INM berhenti 2015).
- [x] Dicek manual di browser, termasuk 390 px dan tombol Salin lewat `http://`.
