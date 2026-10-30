# 12: Backup harian

**What to build:** Database MutuRS di-dump otomatis setiap hari ke satu folder di server yang di-mount dari docker-compose, dan dump disimpan selama 30 hari. IT RS bisa menyalin folder itu ke NAS dan memulihkan data dengan petunjuk yang tersedia.

**Blocked by:** 01 (Kerangka aplikasi)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] docker-compose punya layanan backup yang menjalankan dump PostgreSQL sekali sehari, menurut zona waktu konfigurasi, ke folder yang di-mount. Nama berkas memuat tanggal.
- [ ] Dump yang lebih tua dari 30 hari dihapus otomatis.
- [ ] Dokumentasi instalasi menjelaskan lokasi folder backup, cara memicu backup segera, cara memulihkan ke database kosong, dan bahwa menyalin ke NAS menjadi tanggung jawab IT RS.
- [ ] Dicek manual: memicu backup, lalu memulihkannya ke database kosong menghasilkan data yang sama.
