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

## Impor pengaturan dari aplikasi mutu lama (sekali, saat pemasangan)

Dari modul Mutu aplikasi kepegawaian lama, yang bisa dipindahkan adalah Unit, Indikator (beserta definisi dan Target), Unit Pelapor, dan **riwayat isiannya**, supaya Komite Mutu tidak mengetik ulang dan tren langsung terisi. Bukti dan akun pengguna lama tidak ikut. Impor dikerjakan di komputer yang punya kode MutuRS dan Node.js, bukan di server (image server tidak berisi skrip), lalu hasilnya dipasang di server sebagai database awal.

Riwayat isian diimpor dengan aturan berikut:
- N dan D isian harian maupun bulanan dijumlahkan per bulan, lalu menjadi Pengukuran **Terverifikasi** sampai bulan sebelum peralihan (bawaan: bulan lalu; ganti dengan `--riwayat-sampai YYYY-MM`). Riwayat Status-nya mencatat "Diimpor dari aplikasi lama".
- Unit Pelapor dimulai sejak bulan isian pertama.
- Isian yang melanggar aturan MutuRS (mis. N > D) tidak diimpor dan tercantum di daftar periksa.
- Indikator yang definisi N atau D-nya masih kosong ditunda, karena Pengukuran mengunci definisi. Setelah Komite Mutu melengkapinya, jalankan impor lagi.
- Setelah bulan peralihan, jalankan impor sekali lagi dengan dump terbaru, supaya isian bulan-bulan terakhir di aplikasi lama ikut masuk. Yang sudah diimpor dilewati.

1. Unduh dump database aplikasi lama dari Hostinger (phpMyAdmin, Ekspor, format SQL; `.sql` atau `.sql.gz`). Dump ini berisi data kepegawaian: simpan di luar folder MutuRS dan hapus setelah selesai.
2. Siapkan database MutuRS kosong di komputer itu, lalu buat `.env.impor` dari `.env.example` dengan `DATABASE_URL=postgres://mutu:impor@127.0.0.1:55499/mutu` dan `ADMIN_USERNAME`/`ADMIN_PASSWORD` **sama dengan `.env` server** (Admin Sistem awal ikut pindah):

   ```bash
   docker run -d --name mutu-impor -e POSTGRES_USER=mutu -e POSTGRES_PASSWORD=impor -e POSTGRES_DB=mutu \
     -p 127.0.0.1:55499:5432 postgres:17-alpine
   ```

3. Pratinjau (tidak ada yang disimpan), lalu serahkan `daftar-periksa.md` ke Komite Mutu. Bulan peralihan bawaan Januari 2027; ganti dengan `--mulai YYYY-MM`.

   ```bash
   npx tsx --env-file=.env.impor scripts/impor-v1.ts /path/dump.sql > daftar-periksa.md
   ```

4. Setelah disetujui, jalankan dengan `--jalankan` (aman diulang: yang sudah ada dilewati):

   ```bash
   npx tsx --env-file=.env.impor scripts/impor-v1.ts /path/dump.sql --jalankan > daftar-periksa.md
   ```

5. Pindahkan hasilnya ke server sebagai database awal, lalu hapus database sementara:

   ```bash
   docker exec mutu-impor pg_dump -U mutu --clean --if-exists mutu > mutu-awal.sql
   docker rm -f mutu-impor
   ```

   Salin `mutu-awal.sql` ke folder backup server, lalu ikuti [Memulihkan ke database kosong](#memulihkan-ke-database-kosong) dengan berkas itu.

**Server Windows (tanpa Docker):** impor bisa langsung ke database server lewat terowongan SSH, tanpa database sementara. Picu backup dulu, lalu dari komputer yang punya kode MutuRS:

```bash
ssh -f -N -L 127.0.0.1:55444:127.0.0.1:5432 administrator@<ip-server>
DATABASE_URL='postgres://mutu:<sandi database dari .env server>@127.0.0.1:55444/mutu' APP_TIMEZONE=Asia/Makassar \
  ADMIN_USERNAME=admin ADMIN_PASSWORD='<sandi admin saat ini>' \
  npx tsx scripts/impor-v1.ts /path/dump.sql.gz --jalankan > daftar-periksa.md
```

6. Komite Mutu melengkapi yang ditandai "Belum diisi (dari aplikasi lama)" (Sumber Data, dan definisi yang kosong) di halaman Indikator sebelum isian pertama bulan peralihan, karena definisi N dan D terkunci setelah ada Pengukuran.

## Listrik padam dan server rusak

- **Setelah listrik kembali**, aplikasi hidup sendiri:
  - semua layanan memakai `restart: unless-stopped`, asalkan Docker ikut menyala saat server boot (`sudo systemctl enable docker`);
  - bila MutuRS berjalan di VM Proxmox, aktifkan juga **Start at boot** pada VM itu.

  PostgreSQL memulihkan dirinya sendiri setelah mati mendadak; transaksi yang sudah tersimpan tidak hilang.
- **Kurangi risiko kerusakan disk:**
  - pasang UPS untuk server;
  - bila ada, pakai NUT supaya server dimatikan dengan rapi saat baterai UPS hampir habis.
- **Bila server rusak total:**
  1. Pasang Docker di server baru.
  2. Salin folder aplikasi dan `.env`.
  3. Pulihkan dump terakhir dari NAS (lihat "Memulihkan ke database kosong" di bawah).

  Karena itu simpan salinan `.env` di tempat aman di luar server (isinya sandi database dan Admin Sistem), dan pastikan folder backup tersalin ke NAS setiap hari.
- **Uji pemulihan** sesekali di komputer lain. Backup yang belum pernah dipulihkan belum terbukti bisa dipakai.

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

## Windows Server tanpa Docker

Bila server RS hanya Windows (diuji di Windows Server 2019), MutuRS dipasang langsung tanpa Docker:
- **PostgreSQL 17** berjalan sebagai Windows Service `mutu-rs-postgresql`, hanya bisa diakses dari server itu sendiri.
- **Aplikasi** dijalankan tugas Task Scheduler `MutuRS` saat Windows mulai, tanpa perlu ada yang login, sebagai akun NetworkService. Bila aplikasi berhenti, ia dijalankan lagi 10 detik kemudian.
- **Backup** dijalankan tugas `MutuRS Backup` setiap hari pukul 01.00 waktu RS.

Semua bagian ada di `C:\mutu-rs`:

| Isi | Lokasi |
|---|---|
| Konfigurasi dan sandi | `.env` (dibuat otomatis dengan sandi acak; hanya terbaca Administrators) |
| Kode sumber dan hasil build | `sumber\` |
| Aplikasi yang berjalan | `app\` |
| PostgreSQL | `pgsql\` (program), `pgdata\` (data) |
| Log | `log\app.log`, `log\backup.log`, `log\pasang.log` |

### Pemasangan dan pembaruan

1. Server perlu akses internet untuk mengunduh Node.js, PostgreSQL, dan paket npm. Port aplikasi (bawaan 3000; ganti dengan `-Port 4545`, misalnya) dan port 5432 harus belum dipakai aplikasi lain.
2. Salin kode MutuRS ke `C:\mutu-rs\sumber`.
3. Buka PowerShell sebagai Administrator, lalu jalankan (sesuaikan nama RS dan folder backup; sebaiknya di disk lain):

   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\mutu-rs\sumber\scripts\windows\pasang.ps1 -NamaRs "RSUD Contoh" -FolderBackup E:\mutu-rs-backup
   ```

   Zona waktu bawaan WITA. Untuk WIB tambahkan `-ZonaWaktu Asia/Jakarta -OffsetBackup +07:00`; untuk WIT `-ZonaWaktu Asia/Jayapura -OffsetBackup +09:00`.
4. Buka `http://<ip-server>:<port>`, lalu masuk dengan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `C:\mutu-rs\.env`. Ganti sandi setelah masuk pertama.

**Pembaruan versi:**
1. Picu backup segera (lihat di bawah).
2. Ganti isi `C:\mutu-rs\sumber` dengan kode versi baru.
3. Jalankan lagi `pasang.ps1` dengan perintah yang sama. Node.js, PostgreSQL, database, dan `.env` yang sudah ada tidak ditimpa; hanya aplikasi yang dibangun ulang.

**Mengganti port** setelah terpasang: ubah `PORT` di `C:\mutu-rs\.env`, lalu jalankan lagi `pasang.ps1`. Aturan firewall `MutuRS` ikut disesuaikan.

Simpan salinan `C:\mutu-rs\.env` di tempat aman di luar server, karena isinya sandi database dan Admin Sistem.

Sebaiknya zona waktu Windows disamakan dengan waktu RS (WITA = "(UTC+08:00) Kuala Lumpur, Singapore"), supaya jam di nama berkas backup dan log cocok dengan jam setempat. Jadwal backup tetap pukul 01.00 waktu RS walau zona waktunya belum disamakan.

### Listrik padam

PostgreSQL (layanan otomatis) dan aplikasi (tugas saat Windows mulai) hidup sendiri setelah server menyala. Bila aplikasi belum bisa dibuka, periksa:

```powershell
Get-Service mutu-rs-postgresql
Get-ScheduledTask -TaskName MutuRS | Get-ScheduledTaskInfo
Get-Content C:\mutu-rs\log\app.log -Tail 50
```

### Backup

- **Isi dan nama berkas:** sama dengan versi Docker, berupa berkas `mutu-TAHUN-BULAN-TANGGAL_JAMMENIT.sql` di `BACKUP_DIR` (`.env`), disimpan 30 hari. Hasil setiap backup tercatat di `C:\mutu-rs\log\backup.log`.
- **Memicu backup segera:** `Start-ScheduledTask -TaskName 'MutuRS Backup'`.
- **Menyalin ke NAS** tetap tanggung jawab IT RS. Contoh tugas Task Scheduler harian pukul 02.00: `robocopy E:\mutu-rs-backup \\nas\mutu-rs /E /XO`.

### Memulihkan di Windows

Pemulihan **mengganti seluruh data MutuRS** dengan isi berkas backup. Jalankan di PowerShell sebagai Administrator. Sandi database adalah bagian di antara `mutu:` dan `@` pada `DATABASE_URL` di `.env`.

```powershell
# 1. Picu backup segera bila database masih berjalan, lalu hentikan aplikasi.
Start-ScheduledTask -TaskName 'MutuRS Backup'
Stop-ScheduledTask -TaskName MutuRS
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object CommandLine -like '*C:\mutu-rs*' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2. Kosongkan database lalu pulihkan (ganti nama berkasnya). SELURUH data saat ini terhapus.
$env:PGPASSWORD = '<sandi database>'
$pg = 'C:\mutu-rs\pgsql\bin'
& "$pg\dropdb.exe" -h 127.0.0.1 -U mutu --force mutu
& "$pg\createdb.exe" -h 127.0.0.1 -U mutu mutu
& "$pg\psql.exe" -h 127.0.0.1 -U mutu -d mutu -v ON_ERROR_STOP=1 -q -f E:\mutu-rs-backup\mutu-2026-10-31_0100.sql

# 3. Jalankan kembali aplikasi.
Start-ScheduledTask -TaskName MutuRS
```

Cara yang sama dipakai untuk memasang `mutu-awal.sql` hasil impor pengaturan dari aplikasi lama.
