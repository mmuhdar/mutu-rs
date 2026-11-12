# 03: Bukti Pengukuran

**What to build:** Pengisi melampirkan PDF/JPG/PNG ke Pengukuran Draf; Kepala Unit, Komite Mutu, dan Admin Sistem membukanya di detail Pengukuran.

**Blocked by:** –

**Status:** ready-for-agent

- [ ] Tabel `bukti_pengukuran` (bytea) + migrasi.
- [ ] Aturan murni `src/lib/bukti.ts`: `jenisBukti` dari tanda awal berkas, `MAKS_UKURAN_BUKTI`, `MAKS_BUKTI`, nama berkas dirapikan.
- [ ] Service: `tambahBukti`, `hapusBukti`, `ambilBerkasBukti`; daftar bukti di `ambilIsian` dan `ambilPengukuran`.
- [ ] Batas body server action dan proxy 52 MB.
- [ ] `/pengukuran/isi`: bagian Bukti (unggah banyak, hapus); `/pengukuran/[id]`: daftar baca-saja; route `/pengukuran/bukti/[id]`.
- [ ] Glosarium: Bukti. `INSTALASI.md`: ukuran backup.
- [ ] Tes `tests/bukti.test.ts`.
- [ ] Dicek manual di browser (unggah, hapus, buka, 390 px).
