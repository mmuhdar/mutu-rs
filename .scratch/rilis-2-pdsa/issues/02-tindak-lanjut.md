# 02: Tindak Lanjut

**What to build:** Di halaman Analisis, penulis menambahkan Tindak Lanjut (tindakan, PIC, tenggat) dan mengubah statusnya. Menu Tindak Lanjut menampilkan semua Tindak Lanjut yang boleh dilihat, dengan yang lewat tenggat paling atas.

**Blocked by:** 01 (Analisis)

**Status:** ready-for-agent

- [ ] Tabel `tindak_lanjut`: Analisis, tindakan, PIC, tenggat (date), status (`direncanakan`, `berjalan`, `selesai`, `dibatalkan`), catatan, diubah oleh, diubah pada.
- [ ] `hariIni()` di `src/lib/bulan.ts` menurut zona waktu konfigurasi; `bulanBerjalan()` memakainya.
- [ ] `tambahTindakLanjut` (Analisis harus ada; tindakan dan PIC wajib; tenggat tanggal valid; status awal Direncanakan) dan `ubahTindakLanjut` (semua field; catatan wajib saat Selesai/Dibatalkan). Hak tulis = hak tulis Lingkup Analisis-nya. Tidak ada hapus.
- [ ] Lewat tenggat = tenggat < hari ini dan status Direncanakan/Berjalan (aturan murni di `src/lib/perbaikan.ts`).
- [ ] `daftarTindakLanjut(aktor, saringan)`: hanya Lingkup yang boleh dibaca; bawaan Direncanakan/Berjalan; saringan status dan Unit; urut lewat tenggat dulu, lalu tenggat.
- [ ] Halaman Analisis: Tindak Lanjut miliknya (tambah, ubah) dan Tindak Lanjut bulan sebelumnya (Indikator + Lingkup sama) yang masih terbuka.
- [ ] Menu "Tindak Lanjut" `/tindak-lanjut` untuk semua peran; baris menaut ke halaman Analisis-nya.
- [ ] Dicek manual di browser, termasuk 390 px.
- [ ] Tes service: aturan isian, catatan wajib, lewat tenggat dengan `sekarang` tertentu, urutan dan saringan daftar, hak akses, Tindak Lanjut terbuka bulan sebelumnya.
