# 02: Grading, investigasi, dan penutupan

**What to build:** Grading dengan matriks, Investigasi Sederhana (Kepala Unit), tinjauan dan grading ulang (Komite Mutu), RCA, Bukan Insiden, dan tanggal e-Report; riwayat status dan tenggat investigasi.

**Blocked by:** 01

**Status:** selesai (2026-11-12)

- [x] Aturan murni: `warnaGrading` (Tabel 3 KKP-RS 2008), `perluRca`, `hariInvestigasi`, lewat/mendekati tenggat.
- [x] Service: `gradingInsiden`, `simpanInvestigasi`, `tinjauInsiden`, `selesaikanRca`, `tandaiBukanInsiden`, `catatEreport`; semua perpindahan lewat satu `pindah`.
- [x] Detail `/insiden/[id]`: form langkah berikutnya, matriks grading `RadioGroup`, riwayat, alat Komite Mutu.
- [x] Tes service: alur biru/hijau/kuning/sentinel, tenggat, hak per peran, umpan balik ke Pembuat Laporan.
