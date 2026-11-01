# 03: PDSA — Plan dan daftar

**What to build:** Komite Mutu atau Kepala Unit memulai PDSA untuk satu Indikator dan satu Lingkup dengan judul dan Plan. Menu PDSA menampilkan PDSA yang sedang berjalan; halaman Analisis menampilkan PDSA berjalan untuk Indikator + Lingkup yang sama dan tombol "Mulai PDSA".

**Blocked by:** 01 (Analisis)

**Status:** ready-for-agent

- [ ] Tabel `pdsa`: Indikator, Unit (null = RS), judul, siklus, sebelumnya (unik), tahap, bulan mulai, bulan akhir, masalah, tujuan, prediksi, rencana, pelaksanaan, hasil, keputusan, penjelasan, diubah oleh, diubah pada.
- [ ] `TAHAP_PDSA`, `KEPUTUSAN_PDSA` + label di `src/lib/perbaikan.ts`.
- [ ] `buatPdsa`: judul dan Plan wajib; bulan akhir ≥ bulan mulai; Indikator aktif; Lingkup Unit = Unit aktif dan Unit Pelapor pada bulan mulai; IMP-Unit Lingkup RS ditolak; tahap aktif langsung `do`.
- [ ] `daftarPdsa` (Lingkup yang boleh dibaca; bawaan belum Selesai) dan `ambilPdsa` (detail).
- [ ] Halaman `/pdsa`, `/pdsa/baru?indikator=&unit=`, `/pdsa/[id]` (Plan); menu "PDSA" untuk semua peran.
- [ ] Halaman Analisis: PDSA berjalan untuk Indikator + Lingkup sama, dan tautan "Mulai PDSA" bila boleh menulis.
- [ ] Dicek manual di browser, termasuk 390 px.
- [ ] Tes service: aturan pembuatan, hak akses, daftar bawaan dan saringan Lingkup.
