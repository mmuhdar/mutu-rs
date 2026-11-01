# 01: Analisis

**What to build:** Komite Mutu menulis Analisis Lingkup RS dan Kepala Unit menulis Analisis Lingkup Unit-nya untuk satu Indikator pada satu bulan, di halaman yang menampilkan Capaian, Target, Kelengkapan, dan Status Capaian terkini bulan itu. Analisis dibuka dari tabel Monitoring.

**Blocked by:** –

**Status:** selesai (2026-11-01, branch `rilis-2-pdsa`)

- [x] Tabel `analisis`: Indikator, Unit (null = Lingkup RS), bulan (tanggal 1), teks, diubah oleh, diubah pada; unik Indikator + Unit + bulan (`NULLS NOT DISTINCT`).
- [x] `src/lib/perbaikan.ts` (konstanta bersama Rilis 2) dan modul `src/modules/perbaikan/service.ts`.
- [x] Hak akses Lingkup: tulis = Komite Mutu, Admin Sistem (semua), Kepala Unit (Unit-nya); baca = Komite Mutu, Direktur, Admin Sistem (semua), Kepala Unit dan Petugas Input Data (Unit-nya). Helper tampilan `bolehTulisLingkup`.
- [x] `simpanAnalisis` (upsert) dengan aturan: teks wajib; bulan valid dan tidak setelah bulan berjalan; Indikator aktif dan dinilai bulan itu; Lingkup Unit = Unit Pelapor bulan itu (Unit nonaktif boleh); IMP-Unit Lingkup RS ditolak.
- [x] `ambilAnalisis`: Indikator, Unit, bulan, Analisis (atau null), Capaian bulan itu dari `trenCapaian`, dan apakah aktor boleh menulis.
- [x] Halaman `/analisis?indikator=&unit=&bulan=`; pesan penolakan service lewat `pesanAtau`.
- [x] Monitoring: kolom/tautan "Analisis" / "Belum dianalisis" per bulan untuk baris RS (selain IMP-Unit), setiap Unit di rincian per Unit, dan tabel Unit untuk Petugas/Kepala Unit.
- [x] Dicek manual di browser, termasuk 390 px.
- [x] Tes service: hak tulis/baca per peran dan Lingkup, setiap aturan isian, simpan ulang mengubah Analisis yang sama, Capaian mengikuti Pengukuran terkini.
