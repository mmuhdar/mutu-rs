# 02: Masuk dan keluar

**What to build:** Admin Sistem awal (dibuat dari konfigurasi) bisa masuk dengan username dan sandi, lalu keluar. Semua halaman selain halaman Masuk mewajibkan sesi. Percobaan masuk yang gagal berulang kali dibatasi. Service lain bisa memuat Pengguna yang sedang bertindak beserta peran dan Unit-nya.

**Blocked by:** 01 (Kerangka aplikasi)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Tabel Pengguna berisi username unik, nama, hash sandi (bcrypt), peran (salah satu dari lima peran tetap yang disimpan sebagai konstanta), dan aktif. Relasi ke Unit belum ada di tiket ini.
- [ ] Saat start, Admin Sistem awal dibuat dari konfigurasi (username dan sandi) **hanya bila username itu belum ada**, sehingga restart tidak menimpa sandi yang sudah diganti.
- [ ] Masuk memakai username dan sandi, lalu membuat sesi cookie. Keluar mengakhiri sesi. Pola login, sesi, dan pembatasan percobaan mengikuti `sistem-radiologi-digital`.
- [ ] Pesan gagal masuk tidak membedakan "username tidak ada" dari "sandi salah".
- [ ] Percobaan masuk yang gagal berulang kali diblokir sementara.
- [ ] Akses tanpa sesi ke halaman mana pun diarahkan ke halaman Masuk. Pemanggilan service tanpa Pengguna ditolak.
- [ ] Tes service: masuk dengan sandi benar dan salah, pembatasan percobaan, dan Admin awal tidak dibuat ulang atau ditimpa saat start kedua.
