# 11: Dashboard

**What to build:** Setelah masuk, Pengguna langsung melihat Dashboard untuk bulan lalu, dan bulannya bisa diganti. Dashboard menampilkan jumlah Indikator aktif, jumlah Tercapai dan Belum Tercapai, Kelengkapan, daftar Indikator Belum Tercapai, serta (untuk Kepala Unit) jumlah Pengukuran yang menunggu Verifikasi. Isinya dibatasi sesuai peran dan Unit.

**Blocked by:** 10 (Monitoring)

**Status:** ready-for-agent

- [ ] Dashboard adalah halaman pertama setelah masuk. Bulan bawaannya adalah bulan lalu menurut zona waktu konfigurasi, dan bisa diganti ke bulan lain.
- [ ] Kartu ringkasan berisi:
  - jumlah Indikator aktif yang dinilai bulan itu;
  - jumlah Tercapai, Belum Tercapai, dan yang belum punya Capaian;
  - Kelengkapan keseluruhan (Pengukuran Terverifikasi dibanding yang seharusnya ada).
- [ ] Daftar Indikator Belum Tercapai dilengkapi Capaian, Target, dan tautan ke Monitoring.
- [ ] Kepala Unit melihat jumlah Pengukuran Diajukan di Unit-Unit-nya, dengan tautan ke antrean Verifikasi.
- [ ] Semua angka dibaca dari modul Capaian (tiket 10), tanpa perhitungan sendiri.
- [ ] Pembatasan: Petugas Input Data dan Kepala Unit melihat Capaian Unit-nya. Komite Mutu, Direktur, dan Admin Sistem melihat Capaian RS.
- [ ] Dicek manual di browser, termasuk ukuran layar HP.
- [ ] Tes service: bulan bawaan dihitung di batas bulan dengan zona waktu WITA, isi ringkasan untuk contoh data campuran (Tercapai, Belum Tercapai, kosong, belum lengkap), dan pembatasan peran.
