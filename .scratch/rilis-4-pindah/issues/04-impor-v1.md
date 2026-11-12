# 04: Skrip impor pengaturan v1

**What to build:** `scripts/impor-v1.ts` membaca dump SQL v1 dan membuat Unit, Indikator, Target, dan Unit Pelapor mulai bulan peralihan lewat service, dengan daftar periksa untuk Komite Mutu.

**Blocked by:** 01 (kelompok SPM)

**Status:** ready-for-agent

- [ ] Pengurai dump (`scripts/impor-v1/dump.ts`): mysqldump dan phpMyAdmin, hanya tiga tabel.
- [ ] Rencana murni (`scripts/impor-v1/rencana.ts`) + daftar periksa Markdown.
- [ ] Pelaksana lewat service (`scripts/impor-v1/jalankan.ts`), aman diulang.
- [ ] Perintah `scripts/impor-v1.ts` (pratinjau / `--jalankan`, `--mulai`).
- [ ] Tes `tests/impor-v1.test.ts` (Unit Pelapor mulai 2031).
- [ ] `INSTALASI.md`: langkah impor saat pemasangan.
- [ ] Uji dengan dump asli dari user (menunggu tarball).
