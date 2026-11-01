# 04: PDSA — tahap Do, Study, Act, dan siklus berikutnya

**What to build:** Pelaksana PDSA mengisi Do, Study (dengan grafik Capaian otomatis), dan Act berurutan, memperbaiki teks tahap yang sudah lewat, lalu bisa memulai siklus berikutnya yang tertaut.

**Blocked by:** 03 (PDSA — Plan dan daftar)

**Status:** selesai (2026-11-01, branch `rilis-2-pdsa`)

- [ ] `simpanTahapPdsa(aktor, id, tahap, isian, lanjut)`: tahap ≤ tahap aktif (tahap yang belum dicapai ditolak); `lanjut` hanya untuk tahap aktif dan memeriksa syarat tahap itu (lihat tabel di spec); baris dikunci `for update`.
- [ ] Plan tetap bisa diperbaiki (termasuk bulan mulai/akhir, bulan akhir ≥ bulan mulai).
- [ ] Siklus berikutnya: `buatPdsa` dengan `sebelumnyaId` dari PDSA `selesai` (Indikator, Lingkup, judul disalin, siklus + 1); siklus kedua dari sumber yang sama ditolak 409.
- [ ] `ambilPdsa` membawa deret Study dari `trenCapaian` (12 bulan sampai min(bulan akhir, bulan berjalan), deret RS atau Unit Lingkup itu) dan tautan siklus sebelum/sesudah.
- [ ] Halaman `/pdsa/[id]`: semua tahap, form tahap aktif ("Simpan" dan "Simpan dan lanjut"), perbaikan tahap lalu, grafik + tabel Study dengan periode uji coba ditandai, tombol "Mulai siklus berikutnya".
- [ ] Dicek manual di browser, termasuk 390 px.
- [ ] Tes service: urutan tahap, syarat lanjut, perbaikan tahap lalu, tahap belum dicapai ditolak, siklus berikutnya, deret Study RS dan Unit, hak akses.
