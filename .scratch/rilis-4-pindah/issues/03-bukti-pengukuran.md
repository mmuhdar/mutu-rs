# 03: Bukti Pengukuran

**What to build:** Pengisi melampirkan PDF/JPG/PNG ke Pengukuran Draf; Kepala Unit, Komite Mutu, dan Admin Sistem membukanya di detail Pengukuran.

**Blocked by:** –

**Status:** selesai (2026-11-12)

- [x] Tabel `bukti_pengukuran` (bytea) + migrasi.
- [x] Aturan murni `src/lib/bukti.ts`: `jenisBukti` dari tanda awal berkas, `MAKS_UKURAN_BUKTI`, `MAKS_BUKTI`, nama berkas dirapikan.
- [x] Service: `tambahBukti`, `hapusBukti`, `ambilBerkasBukti`; daftar bukti di `ambilIsian` dan `ambilPengukuran`.
- [x] Batas body server action dan proxy 52 MB.
- [x] `/pengukuran/isi`: bagian Bukti (unggah banyak, hapus); `/pengukuran/[id]`: daftar baca-saja; route `/pengukuran/bukti/[id]`.
- [x] Glosarium: Bukti. `INSTALASI.md`: ukuran backup.
- [x] Tes `tests/bukti.test.ts`.
- [x] Dicek manual di browser (unggah, hapus, buka, 390 px).
