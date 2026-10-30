@AGENTS.md

# MutuRS — catatan proyek

- Spesifikasi: `.scratch/<fitur>/spec.md` + tiket di `issues/`. Istilah domain hanya dari `GLOSSARY.md` (tanpa sinonim). UI, pesan error, dan komentar kode memakai bahasa Indonesia; identifier domain memakai kata glosarium (`indikator`, `unitPelapor`, `pengukuran`, `capaian`), identifier teknis umum boleh bahasa Inggris.
- Stack: Next.js 16 (App Router) + Drizzle (`pg`) + PostgreSQL 17, pola dari `sistem-radiologi-digital`. Next 16 berbeda dari yang umum dikenal: baca `node_modules/next/dist/docs/` sebelum memakai API Next.
- Logika bisnis di `src/modules/<modul>/service.ts`. Setiap fungsi service menerima Pengguna yang sedang bertindak dan memeriksa peran + Unit di dalam service, bukan di halaman/action. Aturan murni bersama (konstanta, status, perhitungan) di `src/lib/`.
- Pengguna & sesi: service menerima `aktor: Pengguna | null` (tipe dari `src/modules/auth/service.ts`) dan memanggil `wajibPengguna(aktor)` lebih dulu; penolakan dilempar sebagai `ServiceError(status, pesan)` (`src/lib/errors.ts`), lalu server action mengubahnya menjadi `{ error }` untuk form. Lima peran = konstanta `PERAN`/`LABEL_PERAN` di `src/lib/peran.ts` (nilai `petugasInputData`, `kepalaUnit`, `komiteMutu`, `direktur`, `adminSistem`). Setiap halaman selain `/masuk` memanggil `requireUser()` (`src/server/sesi.ts`); action memakai `getSessionUser()` dan meneruskannya ke service. `src/proxy.ts` hanya penyaring awal (cookie ada/tidak). Tes mendapat aktor lewat `masuk(...)` lalu `penggunaDariToken(token)`; Admin Sistem awal untuk tes = `config.adminAwal`.
- Batasan peran di service: `wajibPeran(aktor, ["adminSistem", ...], pesan)` (`src/modules/auth/service.ts`) menggantikan `wajibPengguna` dan menolak peran lain dengan 403. Data master tidak pernah dihapus, hanya `aktif = false`; nama unik tanpa membedakan huruf besar/kecil = nama di-`trim()` di service + indeks unik `lower(nama)`, pelanggaran (`(e.cause ?? e).code === "23505"`) menjadi 409. Pilihan Unit di formulir mana pun memakai `pilihanUnit(aktor)` (`src/modules/unit/service.ts`, hanya Unit aktif); `daftarUnit` = daftar kelola Admin Sistem (semua Unit + status).
- Menu utama: tambah entri ke `MENU` di `src/app/layout.tsx` (`{ href, label, peran }`); disaring per peran hanya untuk tampilan. Halaman yang ditolak service menampilkan pesan `ServiceError`-nya (lihat `src/app/unit/page.tsx`), bukan halaman error.
- Gaya UI: halaman = server component yang memanggil service langsung untuk membaca; perubahan data lewat server action tipis (`actions.ts` di samping halaman, dipakai dengan `useActionState`). Tanpa `/api/*` untuk UI.
- Konfigurasi instalasi hanya dari environment lewat `src/lib/config.ts` (`NAMA_RS`, `APP_TIMEZONE` bawaan `Asia/Makassar`, `ADMIN_USERNAME`/`ADMIN_PASSWORD` untuk Admin Sistem awal). Variabel baru: tambahkan ke `.env.example` (dengan penjelasan) dan `docker-compose.yml`. Root layout memanggil `await connection()` supaya nilai env tidak terbekukan saat `next build`.
- Bulan ditulis `"YYYY-MM"`. Bulan berjalan hanya dari `bulanBerjalan()` (`src/lib/bulan.ts`, ikut zona waktu konfigurasi), jangan dari `getMonth()`/jam server. Fungsi yang bergantung pada waktu menerima `sekarang = new Date()` opsional supaya bisa dites.
- Skema DB di `src/db/schema.ts` → `npm run db:generate -- --name <slug>` (commit SQL + `drizzle/meta/`; jangan sunting `_journal.json` manual). Migrasi + data awal ada di `bootstrapDatabase()` (`src/db/bootstrap.ts`), dijalankan saat server mulai (`src/instrumentation.ts`) dan oleh harness tes; data awal harus idempoten dan tidak menimpa data yang ada. Bila gagal, proses berhenti dan docker compose menjalankannya ulang.
- Tes: `npm test` (`scripts/test.sh`) membuat database sementara di server `DATABASE_URL` (env → `.env` → bawaan `127.0.0.1:55434`), menjalankan `bootstrapDatabase()`, lalu `node:test` lewat `tsx` atas `tests/*.test.ts`, dan menghapus database itu walau tes gagal. Satu file: `npm test -- tests/<nama>.test.ts`. Seam tes = fungsi service dipanggil sebagai Pengguna tertentu; data disiapkan dan dibaca lewat service, bukan tabel. Nama tes kalimat perilaku berbahasa Indonesia. Semua file memakai satu database, jadi buat data unik per tes. Jangan `import "server-only"` di modul yang diimpor tes, dan jangan top-level `await` di `scripts/`/`tests/` (tsx = CJS).
- Tampilan: Tailwind v4, token warna di `src/app/globals.css` (komponen memakai token, bukan hex). Responsif untuk browser HP; status selalu ditulis, bukan warna saja.
- Cek sebelum selesai: `npm run check` (typecheck + lint + tes).
- Dev: `cp .env.example .env`, database dev = container `mutu-rs-db` (127.0.0.1:55434, user/sandi/db `mutu`), lalu `npx next dev -p <port>` (port 3000 sering terpakai). Deploy: `docker compose up -d --build` (membaca `.env`).
- Petunjuk untuk IT RS (pemasangan, backup harian, pemulihan) ada di `INSTALASI.md`; perbarui bila langkah deploy berubah (penjelasan variabel cukup di `.env.example`). Backup = layanan `backup` di docker-compose (`postgres:17-alpine` + `crond`, pukul 01.00 menurut `APP_TIMEZONE`) yang menjalankan `scripts/backup.sh` ke `BACKUP_DIR`, disimpan 30 hari; tabel baru otomatis ikut ter-backup.

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
