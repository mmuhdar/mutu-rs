# 01: Kerangka aplikasi

**What to build:** MutuRS bisa dijalankan dengan docker-compose (aplikasi + PostgreSQL 17). Migrasi database berjalan otomatis saat aplikasi mulai, dan halaman awal menampilkan nama RS dari konfigurasi. Harness tes service juga sudah siap, sehingga tiket-tiket berikutnya tinggal menambah tes di seam yang sama: fungsi service yang dipanggil dengan database PostgreSQL sementara.

**Blocked by:** None (can start immediately)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Stack: Next.js 16 (App Router), Drizzle ORM, PostgreSQL 17. Polanya mengikuti `sistem-radiologi-digital`: logika bisnis di service per modul, route handler dan server action tipis, migrasi dijalankan saat server mulai. Baca dokumentasi Next yang terpasang di `node_modules` sebelum memakai API Next, karena versi 16 berbeda dari yang umum dikenal.
- [ ] `docker compose up` menjalankan aplikasi dan PostgreSQL 17. Migrasi berjalan otomatis saat aplikasi mulai.
- [ ] Konfigurasi dibaca dari environment: nama RS dan zona waktu (bawaan `Asia/Makassar`). Tersedia contoh berkas konfigurasi yang menjelaskan setiap nilai.
- [ ] Ada satu fungsi "bulan berjalan" yang mengikuti zona waktu konfigurasi, dan fungsi ini teruji. Contoh: 1 November 00.30 WITA (31 Oktober 16.30 UTC) sudah termasuk November.
- [ ] Satu perintah tes melakukan langkah berikut: membuat database sementara, menjalankan migrasi dan data awal, menjalankan tes dengan `node:test` lewat `tsx`, lalu menghapus database itu, termasuk ketika tes gagal. Prior art: skrip e2e `logistik-rs`.
- [ ] Ada satu perintah pemeriksaan yang menjalankan typecheck, lint, dan tes, dan perintah itu lulus.
- [ ] Tata letak dasar sudah responsif dan berbahasa Indonesia, dengan nama RS di kepala halaman.
