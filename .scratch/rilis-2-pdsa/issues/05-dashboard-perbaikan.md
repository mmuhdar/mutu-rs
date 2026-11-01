# 05: Dashboard perbaikan

**What to build:** Dashboard menampilkan Analisis yang belum ditulis untuk bulan yang ditampilkan, jumlah Tindak Lanjut lewat tenggat, dan jumlah PDSA berjalan, sesuai Lingkup yang boleh dilihat aktor.

**Blocked by:** 02 (Tindak Lanjut), 03 (PDSA — Plan dan daftar)

**Status:** ready-for-agent

- [ ] `belumDianalisis(aktor, bulan?, sekarang?)`: Komite Mutu, Direktur, Admin Sistem = Lingkup RS untuk INM dan IMP-RS yang dinilai bulan itu + IMP-Unit Lingkup Unit Pelapor-nya; Kepala Unit dan Petugas Input Data = IMP-Unit Unit-nya. Tanpa Analisis. Bulan bawaan = bulan lalu.
- [ ] Dashboard: daftar "Belum dianalisis" yang menaut ke halaman Analisis; kartu Tindak Lanjut lewat tenggat (menaut ke `/tindak-lanjut`) dan PDSA berjalan (menaut ke `/pdsa`), angkanya dari service.
- [ ] Dicek manual di browser, termasuk 390 px.
- [ ] Tes service: harapan per kelompok Indikator, Semesteran, Unit nonaktif yang masih Unit Pelapor, saringan Unit untuk Kepala Unit, Analisis yang sudah ada tidak muncul.
