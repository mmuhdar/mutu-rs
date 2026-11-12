# 01: Laporan Insiden

**What to build:** Setiap Pengguna melaporkan Insiden (isian Formulir 1 PMK 11/2017). Pembuat Laporan bisa mengubahnya sampai digrading. Pembaca: Pembuat Laporan, Kepala Unit dari Unit itu, Komite Mutu, dan Direktur.

**Blocked by:** –

**Status:** selesai (2026-11-12)

- [x] Aturan murni `src/lib/insiden.ts` (konstanta, label, `kelompokUmur`, `akibatSesuaiJenis`, `terlambatDilaporkan`); `waktuSetempat`/`dariWaktuSetempat` di `src/lib/bulan.ts`.
- [x] Tabel `insiden` dan `riwayat_status_insiden` + migrasi.
- [x] Service: `laporkanInsiden`, `ubahLaporan`, `ambilInsiden`, `daftarInsiden`, `bolehBacaInsiden`.
- [x] Halaman `/insiden`, `/insiden/lapor`, `/insiden/[id]` (bacaan), `/insiden/[id]/ubah`; menu "Insiden".
- [x] Glosarium: bagian Keselamatan Pasien; Komite Mutu = Tim Keselamatan Pasien.
- [x] Tes service.
