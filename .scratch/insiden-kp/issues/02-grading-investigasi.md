# 02: Grading, investigasi, dan penutupan

**What to build:** Grading dengan matriks, Investigasi Sederhana (Kepala Unit), tinjauan dan grading ulang (Komite Mutu), RCA, Bukan Insiden, dan tanggal e-Report; riwayat status dan tenggat investigasi.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Aturan murni: `warnaGrading` (Tabel 3 KKP-RS 2008), `perluRca`, `hariInvestigasi`, lewat/mendekati tenggat.
- [ ] Service: `gradingInsiden`, `simpanInvestigasi`, `tinjauInsiden`, `selesaikanRca`, `tandaiBukanInsiden`, `catatEreport`; semua perpindahan lewat satu `pindah`.
- [ ] Detail `/insiden/[id]`: form langkah berikutnya, matriks grading `RadioGroup`, riwayat, alat Komite Mutu.
- [ ] Tes service: alur biru/hijau/kuning/sentinel, tenggat, hak per peran, umpan balik ke Pembuat Laporan.
