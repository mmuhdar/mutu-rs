# 08: Verifikasi Pengukuran

**What to build:** Kepala Unit melihat antrean Pengukuran yang Diajukan dari Unit-Unit-nya. Kepala Unit bisa memverifikasi, mengembalikan ke Draf dengan alasan, atau membuka kembali Pengukuran yang sudah Terverifikasi dengan alasan. Setiap Pengukuran menampilkan riwayat statusnya. Komite Mutu dan Admin Sistem bisa melihat status semua Pengukuran di semua Unit untuk memantau proses pengisian.

**Blocked by:** 07 (Isi dan ajukan Pengukuran)

**Status:** ready-for-agent

- [ ] Perpindahan status yang diizinkan, semuanya hanya oleh Kepala Unit dari Unit itu:
  - Diajukan → Terverifikasi (verifikasi);
  - Diajukan → Draf (kembalikan, alasan wajib);
  - Terverifikasi → Diajukan (buka kembali, alasan wajib).
  Perpindahan lain ditolak.
- [ ] Setiap perpindahan tercatat di Riwayat Status Pengukuran: siapa, kapan, dari status apa ke status apa, dan alasannya. Riwayat ini tampil di detail Pengukuran.
- [ ] Antrean Verifikasi Kepala Unit berisi semua Pengukuran Diajukan dari Unit-Unit-nya, di bulan mana pun.
- [ ] Petugas Input Data melihat alasan pengembalian pada Pengukuran Draf yang dikembalikan, lalu bisa memperbaiki dan mengajukannya lagi.
- [ ] Kepala Unit boleh mengisi, mengajukan, dan memverifikasi Pengukuran yang diisinya sendiri.
- [ ] Komite Mutu dan Admin Sistem melihat daftar semua Pengukuran per bulan beserta statusnya, bisa disaring per Unit dan status, termasuk Unit Pelapor yang belum mengisi. Mereka tidak bisa mengubah atau memverifikasi.
- [ ] Tes service: setiap perpindahan status yang sah dan yang ditolak (Petugas memverifikasi, Kepala Unit dari Unit lain, Komite Mutu, tanpa alasan), isi Riwayat Status, dan siklus "dikembalikan → diperbaiki → diajukan → diverifikasi".
