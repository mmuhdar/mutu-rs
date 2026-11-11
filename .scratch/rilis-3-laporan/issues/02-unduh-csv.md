# 02: Unduhan CSV Laporan Triwulan

**What to build:** Tabel Capaian Triwulan bisa diunduh sebagai CSV yang terbuka rapi di Excel berbahasa Indonesia.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `keCsv` di `src/lib/csv.ts`: BOM, pemisah `;`, kutip ganda bila perlu, koma desimal tanpa pemisah ribuan, CRLF; tes murni.
- [ ] Route handler `src/app/laporan/unduh/route.ts` (`GET ?triwulan=`) memakai `laporanTriwulan` dengan sesi; penolakan service = respons teks dengan status-nya.
- [ ] Tombol "Unduh CSV" di halaman Laporan Triwulan.
- [ ] Dicek: berkas terunduh dan isinya benar.
