# 05: Kelola Indikator dan 13 INM awal

**What to build:** Sejak aplikasi pertama kali jalan, 13 INM sesuai PMK 30/2022 sudah tersedia. Komite Mutu (dan Admin Sistem) bisa menambah IMP-RS dan IMP-Unit beserta Target awalnya, mengubah teksnya, serta menonaktifkan dan mengaktifkan kembali Indikator. Semua peran bisa melihat daftar dan detail Indikator.

**Blocked by:** 02 (Masuk dan keluar)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Field Indikator:
  - kode unik, nama, kelompok (INM, IMP-RS, IMP-Unit);
  - definisi operasional (termasuk eksklusi), definisi numerator, definisi denominator, Sumber Data;
  - faktor (bilangan bulat positif) dan satuan;
  - Arah (makin tinggi atau makin rendah makin baik);
  - Frekuensi (Bulanan atau Semesteran);
  - PIC (teks) dan aktif.
- [ ] Target disimpan sebagai riwayat yang terpisah dari Indikator: nilai desimal dan bulan mulai berlaku. Tiket ini hanya membuat Target awal. Target baru dan aturan "Target berlaku" ada di tiket 09.
- [ ] Data awal 13 INM (INM-01 sampai INM-13) diambil dari dokumen riset INM di repo, yang bersumber dari teks PMK 30/2022, **bukan** dari seed SIMRS:
  - INM-06 memakai Arah "makin rendah".
  - INM-09 dihitung per item R/.
  - INM-10 dihitung per pelayanan oleh PPA.
  - INM-13 memakai N = Σ nilai persepsi, D = Σ unsur terisi, faktor 25, Frekuensi Semesteran, dan Target 76,61.
  - Sumber Data setiap INM diambil dari profil indikator di PMK 30/2022 (sumber [S1] dokumen riset), karena tabel riset belum mencantumkannya.
- [ ] Data awal idempoten: saat restart, Indikator yang sudah ada tidak ditimpa, sehingga perubahan yang dibuat Komite Mutu tetap utuh.
- [ ] Komite Mutu dan Admin Sistem bisa menambah IMP-RS dan IMP-Unit dengan semua field di atas ditambah Target awal, mengubahnya, serta menonaktifkan dan mengaktifkan kembali. Tidak ada aksi hapus.
- [ ] Indikator nonaktif tidak muncul di isian (tiket 07), tetapi tetap tampil di daftar kelola.
- [ ] Peran lain hanya bisa melihat dan ditolak di service saat mencoba mengelola.
- [ ] Tes service: 13 INM tersedia dengan nilai kunci di atas, data awal tidak menimpa perubahan, tambah IMP-Unit beserta Target awal, kode duplikat ditolak, dan penolakan untuk peran lain.
