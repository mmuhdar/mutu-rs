# 03: Kelola Unit

**What to build:** Admin Sistem mengelola daftar baku Unit: menambah, mengganti nama, menonaktifkan, dan mengaktifkan kembali. Unit yang nonaktif hilang dari pilihan, tetapi datanya tetap ada.

**Blocked by:** 02 (Masuk dan keluar)

**Status:** ready-for-agent

- [ ] Unit punya nama dan status aktif. Nama Unit unik tanpa membedakan huruf besar/kecil dan spasi di tepi, sehingga "Rawat Inap" dan " rawat inap" ditolak sebagai duplikat.
- [ ] Admin Sistem bisa menambah, mengganti nama, menonaktifkan, dan mengaktifkan kembali Unit. Tidak ada aksi hapus.
- [ ] Pilihan Unit di tempat lain hanya berisi Unit aktif, sedangkan daftar kelola menampilkan semua Unit beserta statusnya.
- [ ] Hanya Admin Sistem yang boleh mengelola Unit. Peran lain ditolak di service.
- [ ] Tes service: tambah, nama duplikat ditolak, ganti nama, nonaktif dan aktif kembali, dan penolakan untuk peran selain Admin Sistem.
