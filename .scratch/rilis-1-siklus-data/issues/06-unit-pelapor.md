# 06: Unit Pelapor

**What to build:** Komite Mutu menetapkan Unit mana saja yang menjadi Unit Pelapor sebuah Indikator, masing-masing dengan bulan mulai dan bulan berhenti (opsional). Dengan begitu, Unit yang baru bergabung atau berhenti tidak mengubah bulan-bulan sebelumnya. Detail Indikator menampilkan Unit Pelapor beserta periodenya.

**Blocked by:** 03 (Kelola Unit), 05 (Kelola Indikator dan 13 INM awal)

**Status:** ready-for-agent

- [ ] Unit Pelapor berisi Indikator, Unit (yang aktif saat ditambahkan), bulan mulai, dan bulan berhenti (opsional). Bulan berhenti tidak boleh lebih awal dari bulan mulai.
- [ ] Periode yang tumpang tindih untuk pasangan Indikator–Unit yang sama ditolak.
- [ ] IMP-Unit hanya boleh punya satu Unit Pelapor yang aktif pada bulan mana pun.
- [ ] Komite Mutu bisa mengakhiri Unit Pelapor dengan mengisi bulan berhenti. Periode yang belum punya Pengukuran boleh dihapus untuk koreksi. Penjaga untuk periode yang sudah punya Pengukuran ditambahkan di tiket 07.
- [ ] Ada satu fungsi "Unit Pelapor aktif untuk Indikator X pada bulan M", dan fungsi ini teruji karena dipakai isian (07) dan modul Capaian (10).
- [ ] Hanya Komite Mutu dan Admin Sistem yang boleh mengelola.
- [ ] Tes service: tumpang tindih ditolak, aturan satu Unit untuk IMP-Unit, dan Unit Pelapor aktif per bulan (contoh: HCU mulai Maret tidak aktif di bulan Februari, dan Unit yang berhenti Juni tidak aktif di bulan Juli).
