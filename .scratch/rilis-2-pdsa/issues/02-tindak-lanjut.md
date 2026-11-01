# 02: Tindak Lanjut

**What to build:** Di halaman Analisis, penulis menambahkan Tindak Lanjut (tindakan, PIC, tenggat) dan mengubah statusnya. Menu Tindak Lanjut menampilkan semua Tindak Lanjut yang boleh dilihat, dengan yang lewat tenggat paling atas.

**Blocked by:** 01 (Analisis)

**Status:** selesai (2026-11-01, branch `rilis-2-pdsa`)

- [x] Tabel `tindak_lanjut`: Analisis, tindakan, PIC, tenggat (date), status (`direncanakan`, `berjalan`, `selesai`, `dibatalkan`), catatan, diubah oleh, diubah pada.
- [x] `hariIni()` di `src/lib/bulan.ts` menurut zona waktu konfigurasi; `bulanBerjalan()` memakainya.
- [x] `tambahTindakLanjut` (Analisis harus ada; tindakan dan PIC wajib; tenggat tanggal valid; status awal Direncanakan) dan `ubahTindakLanjut` (semua field; catatan wajib saat Selesai/Dibatalkan). Hak tulis = hak tulis Lingkup Analisis-nya. Tidak ada hapus.
- [x] Lewat tenggat = tenggat < hari ini dan status Direncanakan/Berjalan (aturan murni di `src/lib/perbaikan.ts`).
- [x] `daftarTindakLanjut(aktor, saringan)`: hanya Lingkup yang boleh dibaca; bawaan Direncanakan/Berjalan; saringan status dan Unit; urut lewat tenggat dulu, lalu tenggat.
- [x] Halaman Analisis: Tindak Lanjut miliknya (tambah, ubah) dan Tindak Lanjut bulan sebelumnya (Indikator + Lingkup sama) yang masih terbuka.
- [x] Menu "Tindak Lanjut" `/tindak-lanjut` untuk semua peran; baris menaut ke halaman Analisis-nya.
- [x] Dicek manual di browser, termasuk 390 px.
- [x] Tes service: aturan isian, catatan wajib, lewat tenggat dengan `sekarang` tertentu, urutan dan saringan daftar, hak akses, Tindak Lanjut terbuka bulan sebelumnya.
