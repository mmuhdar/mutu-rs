# Laporan Rilis 1 MutuRS — dikerjakan otomatis 31 Oktober 2026

## Ringkasan

- **Semua 12 tiket selesai.** Spec dan tiket berstatus `selesai`.
- Kode ada di branch **`rilis-1-siklus-data`** dan **belum di-merge ke `main`**, sengaja, supaya Anda yang memutuskan setelah mengecek.
- `npm run check` (typecheck, lint, 117 tes service) lulus dalam waktu kurang dari 1 menit.
- **Proses yang sudah dijalankan:**
  1. 12 tiket dikerjakan dengan TDD.
  2. Code review dua sisi: standar kode dan kesesuaian dengan spec.
  3. Dua batch perbaikan dari hasil review.
  4. **Dua kali uji end-to-end di browser** (Chromium headless, desktop 1280 dan HP 390×844) pada build produksi docker-compose. Uji kedua tidak menemukan cacat; tidak ada error konsol dan tidak ada horizontal overflow di semua halaman.

## Cara mencoba

### A. Demo berisi data uji (paling cepat)

Stack uji masih tersimpan, tetapi kontainernya dihentikan supaya tidak terbuka di jaringan.

```
docker start mutu-e2e-db-1 mutu-e2e-app-1 mutu-e2e-backup-1
```

Lalu buka http://localhost:3917. Nama RS di demo ini "RSUD Uji E2E".

| Akun | Sandi | Peran |
|---|---|---|
| admin | admin-e2e-123 | Admin Sistem |
| komite | sandi-e2e-123 | Komite Mutu |
| direktur | sandi-e2e-123 | Direktur |
| kepala_icu | sandi-e2e-123 | Kepala Unit (ICU + HCU) |
| kepala_ranap | sandi-baru-456 | Kepala Unit (Rawat Inap) |
| petugas_icu | sandi-e2e-123 | Petugas Input Data (ICU) |
| petugas_ranap | sandi-e2e-123 | Petugas Input Data (Rawat Inap), **nonaktif** |

Data yang paling menarik untuk dilihat ada di INM-01 bulan September 2026: Capaian RS 53,64% (ICU 9/10 + Rawat Inap 50/100), Belum Tercapai terhadap Target 85.

- Menghentikan: `docker stop mutu-e2e-app-1 mutu-e2e-backup-1 mutu-e2e-db-1`
- Menghapus permanen: `docker rm -f mutu-e2e-app-1 mutu-e2e-backup-1 mutu-e2e-db-1 && docker volume rm mutu-e2e_pgdata`

### B. Instalasi bersih (seperti di server RS)

```
cp .env.example .env    # isi NAMA_RS, POSTGRES_PASSWORD, ADMIN_PASSWORD
docker compose up -d --build
```

Lalu buka http://localhost:3000 (atau `APP_PORT`). Langkah lengkapnya, termasuk backup dan pemulihan, ada di `INSTALASI.md`. Setelah instalasi bersih, Komite Mutu perlu menetapkan Unit Pelapor untuk setiap INM; ini memang sengaja tidak di-seed.

### C. Development

- Database dev: container `mutu-rs-db` (127.0.0.1:55434, user/sandi/db `mutu`), sudah berjalan dengan restart otomatis.
- Menjalankan aplikasi: `cp .env.example .env`, lalu `npx next dev -p <port>`.
- Tes: `npm test`. Pemeriksaan lengkap: `npm run check`.
- Konvensi proyek ada di `CLAUDE.md`.

## Yang perlu Anda cek manual (urut prioritas)

1. **Alur utama di browser Anda sendiri:**
   1. Admin membuat Unit dan Pengguna.
   2. Komite Mutu menetapkan Unit Pelapor dan Target.
   3. Petugas mengisi lalu mengajukan.
   4. Kepala Unit memverifikasi atau mengembalikan.
   5. Monitoring dan Dashboard menampilkan hasilnya.
2. **HP sungguhan** (Android dan iOS). Yang sudah diuji baru emulasi Chromium 390×844.
3. **Firefox desktop.** Kolom bulan (`type="month"`) mungkin tampil sebagai kotak teks. Sudah diberi petunjuk `YYYY-MM`, tetapi belum dicoba di Firefox.
4. **Teks 13 INM** (definisi, N/D, Sumber Data, Target) dibandingkan dengan PMK 30/2022. Sumber Data dikonfirmasi dari gambar halaman PMK hal. 44–62. Tetap layak dibaca sekali oleh orang mutu RS.
5. **Pemulihan backup di server lain.** Sudah diuji: backup lalu pulih ke database kosong pada stack yang sama. Pemulihan ke server baru belum diuji.
6. **Daftar keputusan di bawah.** Koreksi yang tidak sesuai dengan keinginan Anda.

## Keputusan yang saya ambil sendiri

### Teknis dan operasional

- Next.js 16.4.3, React 19.3, PostgreSQL 17, image Docker `node:24-bookworm-slim`.
- UI memakai server component dan server action, tanpa `/api`.
- Grafik dibuat dengan SVG langsung, tanpa library.
- Kalau database belum siap saat start, proses berhenti lalu docker menjalankannya ulang.
- Konfigurasi `.env`: `NAMA_RS`, `APP_TIMEZONE` (bawaan WITA), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `APP_PORT`, `BACKUP_DIR`.
- Backup berjalan pukul 01.00 waktu RS. Nama berkas memuat tanggal dan jam (`mutu-YYYY-MM-DD_HHMM.sql`). Dump yang lebih tua dari 30 hari (plus kelonggaran 1 jam) dihapus.
- Tes dijalankan dengan `--test-force-exit`, sehingga waktunya turun dari sekitar 5 menit menjadi di bawah 1 menit.

### Akun dan keamanan

- Username tidak membedakan huruf besar/kecil dan tidak bisa diubah setelah dibuat; nama bisa diubah.
- Sandi minimal 8 karakter.
- Sesi berakhir saat browser ditutup. Di server, sesi berlaku 12 jam dan diperpanjang setiap kali dipakai.
- Login diblokir sementara setelah 8 kali gagal.
- Pesan gagal login tidak membedakan "username tidak ada" dari "sandi salah". Pesan "akun nonaktif" baru muncul kalau sandinya benar.
- Admin Sistem awal hanya dibuat kalau username-nya belum ada, jadi restart tidak menimpa sandi.
- Admin Sistem aktif yang terakhir tidak bisa dinonaktifkan atau diganti perannya.
- Reset sandi oleh Admin mengakhiri semua sesi Pengguna itu. Ganti sandi sendiri mengakhiri sesi-sesi lainnya.

### Unit dan Pengguna

- Nama Unit unik tanpa membedakan huruf besar/kecil. Unit nonaktif bisa diaktifkan kembali.
- **Unit tidak bisa dinonaktifkan selama masih menjadi Unit Pelapor** dengan periode yang belum berakhir. Pesannya menyebut Indikator yang terkait. Tanpa aturan ini, Kelengkapan akan "belum lengkap" selamanya.
- Saat data seorang Pengguna disimpan ulang, keterkaitannya dengan Unit yang sudah nonaktif dilepas.

### Indikator, Target, dan Unit Pelapor

- Kode dan kelompok Indikator tidak bisa diubah. INM tidak bisa ditambah lewat aplikasi; hanya IMP-RS dan IMP-Unit. Kode unik tanpa membedakan huruf besar/kecil.
- Target awal INM tercatat berlaku mulai Oktober 2022 (bulan terbitnya PMK). Sesuai spec, Target pertama juga berlaku untuk semua bulan sebelumnya.
- PIC untuk INM dibiarkan kosong, untuk diisi oleh RS.
- Menetapkan Target pada bulan mulai yang sudah punya Target akan mengganti nilainya (untuk koreksi salah ketik).
- Bulan berhenti Unit Pelapor dihitung **inklusif**: Unit yang berhenti Juni masih wajib melapor bulan Juni.
- Bulan berhenti tidak boleh lebih awal dari Pengukuran yang sudah ada.
- Periode Unit Pelapor untuk Unit nonaktif tidak bisa diperpanjang ke bulan berjalan atau sesudahnya.

### Pengukuran, Capaian, dan Dashboard

- Bulan bawaan di daftar isian adalah bulan lalu.
- "Ajukan" langsung menyimpan sekaligus mengajukan. Pengisi yang tercatat adalah orang yang terakhir menyimpan.
- Pengukuran yang dikembalikan tampil sebagai "Draf · dikembalikan" beserta alasannya. Statusnya tetap Draf, sesuai glosarium.
- Direktur hanya melihat Dashboard dan Monitoring, tidak bisa membuka detail Pengukuran.
- Komite Mutu dan Admin Sistem punya halaman "Status Pengukuran" untuk memantau Unit yang belum mengisi.
- Capaian dihitung N×faktor/D (dikali dulu, baru dibagi), supaya nilai yang tepat sama dengan Target tidak gagal karena pembulatan.
- Dashboard ada di `/`. Kartu Tercapai dan Belum Tercapai menyebut berapa yang "belum lengkap".
- Untuk Petugas dan Kepala Unit, Dashboard menghitung per Indikator × Unit, dan ini ditulis "dihitung per Unit". Contoh: Kepala Unit dengan 2 Unit melihat setiap Indikator dua kali.
- Bulan di masa depan atau bulan yang tidak valid di alamat URL dikembalikan ke bulan bawaan, disertai pemberitahuan.

## Batasan yang diketahui

- Menyimpan Target dengan nilai yang **persis sama** tidak menampilkan konfirmasi, dan pesan error lama di form lain pada halaman itu tetap terlihat. Ini kosmetik.
- Kalau pengguna keluar di satu tab lalu mengklik tautan di tab lain, alamat bisa berakhir di `/masuk?_rsc=…`. Kasus ini belum diuji, dan login dari sana tetap berfungsi.
- Daftar `MENU` di layout masih menuliskan peran secara langsung (hanya untuk tampilan).
- Parser bilangan bulat ada dua salinan, di form klien dan di server action.
- Migrasi kosong `0000_init` ditulis tangan (tidak berbahaya).

## Langkah berikutnya

1. Setelah dicek: `git switch main && git merge --ff-only rilis-1-siklus-data`.
2. Rilis 2 (PDSA, Tindak Lanjut, Evaluasi): mulai dengan `/mattpocock-skills:grill-with-docs`.
3. Rilis 3: Laporan dan ekspor PDF/Excel (termasuk format untuk SIMAR), notifikasi, dan audit trail lengkap.
4. Di luar MutuRS: seed indikator mutu di SIMRS rumah sakit punya kesalahan pada INM-09, INM-10, dan INM-13 (rincian di `docs/research/inm-rumah-sakit.md`). Menu itu harus dinonaktifkan sebelum SIMRS dipakai (ADR-0001).
