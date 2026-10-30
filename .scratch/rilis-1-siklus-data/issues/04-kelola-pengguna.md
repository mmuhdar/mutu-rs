# 04: Kelola Pengguna

**What to build:** Admin Sistem membuat dan mengelola Pengguna: peran, Unit, reset sandi, serta nonaktif dan aktif kembali. Pengguna nonaktif tidak bisa masuk. Setiap Pengguna bisa mengganti sandinya sendiri.

**Blocked by:** 03 (Kelola Unit)

**Status:** ready-for-agent

- [ ] Admin Sistem membuat Pengguna dengan username unik, nama, sandi awal, dan tepat satu peran: Petugas Input Data, Kepala Unit, Komite Mutu, Direktur, atau Admin Sistem.
- [ ] Petugas Input Data dan Kepala Unit wajib terkait ke satu atau lebih Unit aktif. Peran lain tidak punya Unit.
- [ ] Admin Sistem bisa mengubah peran dan Unit, mereset sandi, serta menonaktifkan dan mengaktifkan kembali Pengguna. Tidak ada aksi hapus.
- [ ] Pengguna nonaktif tidak bisa masuk, dan sesinya yang masih berjalan ditolak pada permintaan berikutnya.
- [ ] Admin Sistem aktif yang terakhir tidak bisa dinonaktifkan atau diganti perannya, supaya tidak ada yang terkunci di luar aplikasi.
- [ ] Pengguna bisa mengganti sandinya sendiri dengan memasukkan sandi lama. Panjang sandi minimal 8 karakter.
- [ ] Hanya Admin Sistem yang boleh mengelola Pengguna.
- [ ] Tes service: aturan Unit per peran, Pengguna nonaktif tidak bisa masuk, penjaga Admin terakhir, ganti sandi (sandi lama salah ditolak), reset sandi, dan penolakan untuk peran lain.
