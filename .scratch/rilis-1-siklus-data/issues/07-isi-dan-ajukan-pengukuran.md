# 07: Isi dan ajukan Pengukuran

**What to build:** Petugas Input Data (dan Kepala Unit) memilih Unit dan bulan, lalu melihat daftar Indikator yang wajib diisi beserta statusnya. Mereka mengisi N, D, dan Catatan sambil melihat definisi dan pratinjau Capaian, menyimpannya sebagai Draf, lalu mengajukannya. Isian yang mustahil atau di luar tanggung jawab Unit ditolak. Formulir nyaman dipakai di HP.

**Blocked by:** 04 (Kelola Pengguna), 06 (Unit Pelapor)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Pengukuran berisi Indikator, Unit, bulan (tanggal 1), N, D, Catatan, status, dan pengisi (diambil dari sesi, bukan dari isian). Kombinasi Indikator + Unit + bulan unik, jadi mengisi ulang berarti mengubah Pengukuran yang sama.
- [ ] Riwayat Status Pengukuran dibuat di tiket ini: Pengukuran, status asal, status tujuan, oleh, waktu, alasan. Setiap simpan pertama dan setiap pengajuan tercatat.
- [ ] Daftar isian per Unit dan bulan (bawaan: bulan lalu) menampilkan Indikator aktif yang Unit-nya menjadi Unit Pelapor aktif bulan itu, beserta statusnya: belum diisi, Draf, Diajukan, atau Terverifikasi. Indikator Semesteran hanya muncul di bulan Juni dan Desember. Pengguna yang terkait ke lebih dari satu Unit memilih Unit lebih dulu.
- [ ] Formulir menampilkan definisi N, definisi D, dan Sumber Data. Kolom Catatan opsional dan diberi petunjuk agar tidak memuat identitas pasien. Pratinjau Capaian (N/D × faktor dan satuan) tampil sebelum diajukan.
- [ ] Aturan isian, diperiksa setiap kali menyimpan dan mengajukan:
  - N dan D bilangan bulat ≥ 0.
  - Untuk faktor 100, N tidak boleh lebih dari D.
  - D = 0 hanya boleh bila N = 0.
  - Bulan tidak boleh melewati bulan berjalan.
  - Indikator Semesteran hanya untuk bulan Juni dan Desember.
  - Indikator dan Unit harus aktif, dan Unit harus menjadi Unit Pelapor aktif pada bulan itu.
- [ ] Hanya Pengukuran berstatus Draf yang bisa diubah. Ajukan memindahkan Draf ke Diajukan.
- [ ] Hanya Petugas Input Data dan Kepala Unit dari Unit itu yang bisa mengisi dan mengajukan. Komite Mutu, Direktur, Admin Sistem, dan Petugas dari Unit lain ditolak di service.
- [ ] Penjaga tambahan: periode Unit Pelapor yang sudah punya Pengukuran tidak bisa dihapus (melengkapi tiket 06).
- [ ] Dicek manual di browser dengan ukuran layar HP.
- [ ] Tes service: setiap aturan isian (termasuk D = 0 dengan N = 0 diterima), isi ulang mengubah Pengukuran yang sama, Diajukan tidak bisa diubah, pembatasan Unit dan peran, pengisi diambil dari sesi, dan Riwayat Status tercatat.
