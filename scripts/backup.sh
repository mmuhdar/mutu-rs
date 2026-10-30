#!/bin/sh
# Backup database MutuRS ke /backup, dijalankan oleh layanan `backup` di docker-compose.yml:
# otomatis tiap hari pukul 01.00 (zona waktu APP_TIMEZONE), atau segera lewat
#   docker compose exec backup backup.sh
# Koneksi diambil dari PGHOST/PGUSER/PGPASSWORD/PGDATABASE. Petunjuk pemulihan: INSTALASI.md.
set -eu

berkas="/backup/mutu-$(date +%Y-%m-%d_%H%M).sql"
# Ditulis ke berkas sementara dulu supaya dump yang gagal/terpotong tidak terlihat seperti backup utuh.
trap 'rm -f "$berkas.tmp"' EXIT
pg_dump --clean --if-exists -f "$berkas.tmp"
mv "$berkas.tmp" "$berkas"
echo "Backup selesai: $berkas"

# Simpan 30 hari. Kelonggaran 1 jam supaya dump 30 hari lalu tidak ikut terhapus hanya karena selisih detik.
find /backup -maxdepth 1 -name 'mutu-*.sql' -mmin +$((30 * 24 * 60 + 60)) -delete
