# Instalasi MutuRS

Petunjuk untuk IT RS. MutuRS berjalan dengan docker compose di satu server RS, berisi tiga layanan: `app` (aplikasi), `db` (PostgreSQL 17), dan `backup` (dump database harian). Semua perintah di bawah dijalankan di shell Linux, dari folder yang berisi `docker-compose.yml`.

## Pemasangan

1. Pasang Docker beserta plugin compose. Periksa dengan `docker --version` dan `docker compose version`.
2. Salin folder aplikasi ke server, lalu masuk ke folder itu.
3. Buat konfigurasi:

   ```bash
   cp .env.example .env
   nano .env
   ```

   Isi `NAMA_RS`, ganti `POSTGRES_PASSWORD` dan `ADMIN_PASSWORD` dengan sandi yang kuat, lalu sesuaikan `APP_TIMEZONE`, `APP_PORT`, dan `BACKUP_DIR` bila perlu. Penjelasan setiap variabel ada di `.env.example`.
4. Jalankan:

   ```bash
   docker compose up -d --build
   ```

   Migrasi database berjalan otomatis saat aplikasi mulai. Periksa dengan `docker compose ps` dan `docker compose logs app`.
5. Buka `http://<ip-server>:<APP_PORT>` dari komputer di jaringan RS, lalu masuk sebagai Admin Sistem dengan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `.env`. Akun ini dibuat saat start pertama; restart berikutnya tidak menimpa sandinya.

**Pembaruan versi:** picu backup segera (lihat di bawah), ganti isi folder aplikasi dengan versi baru (`.env` dan folder backup tetap), lalu jalankan lagi `docker compose up -d --build`.

## Backup harian

- Layanan `backup` membuat dump seluruh database MutuRS setiap hari pukul 01.00 menurut zona waktu `APP_TIMEZONE`.
- **Lokasi folder backup:** `BACKUP_DIR` di `.env`. Bawaannya folder `backup/` di samping `docker-compose.yml`. Di dalam container `backup`, folder yang sama terlihat sebagai `/backup`.
- Nama berkas memuat tanggal dan jam pembuatan: `mutu-TAHUN-BULAN-TANGGAL_JAMMENIT.sql`, misalnya `mutu-2026-10-31_0100.sql`. Isinya SQL biasa.
- Dump yang lebih tua dari 30 hari dihapus otomatis setiap kali backup berjalan. Yang dihapus hanya berkas `mutu-*.sql` di folder itu; berkas lain dibiarkan.
- Setiap backup yang berhasil menulis `Backup selesai: ...` ke log. Bila gagal, pesan errornya juga muncul di log:

  ```bash
  docker compose logs backup
  ls -l backup/
  ```

- **Ukuran backup ikut bukti.** Berkas Bukti Pengukuran (foto/PDF, maks 10 MB per berkas) disimpan di database, jadi ikut setiap dump. Bila semua Unit rutin melampirkan bukti, perkirakan sekitar 1 GB per tahun, dan karena 30 dump disimpan, folder backup bisa mencapai puluhan GB. Pantau ruang disk (`du -sh backup/`, `df -h`).
- Berkas backup berisi seluruh data MutuRS, termasuk hash sandi Pengguna. Batasi siapa yang bisa membaca folder backup dan salinannya.

### Menyalin ke NAS: tanggung jawab IT RS

MutuRS hanya menyimpan backup di server yang sama. Bila disk atau server rusak, backup ikut hilang. **Menyalin folder backup ke NAS (atau tempat lain di luar server) menjadi tanggung jawab IT RS.** Contoh dengan cron di server, setiap hari pukul 02.00 (sesuaikan path):

```
0 2 * * * rsync -a /opt/mutu-rs/backup/ /mnt/nas/mutu-rs/
```

### Memicu backup segera

Misalnya sebelum pembaruan versi atau sebelum memulihkan:

```bash
docker compose exec backup backup.sh
```

Hasilnya tertulis di layar, misalnya `Backup selesai: /backup/mutu-2026-10-31_1430.sql`. Berkas itu ada di folder backup di server.

### Memulihkan ke database kosong

Pemulihan **mengganti seluruh data MutuRS** dengan isi berkas backup. Perubahan yang dibuat setelah backup itu dibuat akan hilang.

Untuk server baru (misalnya server lama rusak): lakukan langkah pemasangan 1–3, salin berkas backup dari NAS ke folder backup, lalu jalankan `docker compose up -d db`. Setelah itu ikuti langkah berikut, mulai dari langkah 2.

```bash
# 1. Bila database masih berjalan, picu backup segera supaya data saat ini masih bisa dikembalikan.
docker compose exec backup backup.sh

# 2. Hentikan aplikasi dan layanan backup supaya tidak ada yang menulis ke database.
docker compose stop app backup

# 3. Kosongkan database: hapus lalu buat ulang. SELURUH data saat ini terhapus.
docker compose exec db dropdb -U mutu --force mutu
docker compose exec db createdb -U mutu mutu

# 4. Pulihkan dari berkas backup (ganti nama berkasnya, dan `backup/` bila BACKUP_DIR diubah).
docker compose exec -T db psql -U mutu -d mutu -v ON_ERROR_STOP=1 -q < backup/mutu-2026-10-31_0100.sql

# 5. Jalankan kembali semua layanan.
docker compose up -d
```

- Langkah 4 menampilkan beberapa baris seperti `set_config` dan `setval`; itu normal. Bila muncul baris `ERROR`, pemulihan berhenti. Perbaiki penyebabnya, lalu ulangi dari langkah 3.
- Jalankan `psql` dari container `db` seperti di atas, bukan `psql` lain yang terpasang di server, karena berkas backup memakai perintah `psql` versi yang sama dengan database.
- Bila backup berasal dari versi MutuRS yang lebih lama, migrasi database berjalan otomatis saat aplikasi mulai di langkah 5.
