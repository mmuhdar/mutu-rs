# 04: Pengingat: mendekati tenggat dan kesiapan SIMAR

**What to build:** Tindak Lanjut yang mendekati tenggat (≤ 7 hari) ditandai di daftar Tindak Lanjut dan dihitung di Dashboard; Dashboard Komite Mutu/Admin Sistem menampilkan kesiapan SIMAR bulan lalu dan tenggatnya.

**Blocked by:** 03

**Status:** selesai (2026-11-11, branch `rilis-3-laporan`)

- [x] `tambahHari` (`src/lib/bulan.ts`) dan `mendekatiTenggat` (`src/lib/perbaikan.ts`); baris Tindak Lanjut dari service membawa `mendekatiTenggat`.
- [x] Tabel Tindak Lanjut: "· mendekati"; ubin Lewat tenggat menyebut jumlah mendekati tenggat.
- [x] Dashboard "Perlu tindakan": Tindak Lanjut mendekati tenggat; SIMAR bulan lalu (siap/jumlah, tenggat) untuk `bolehKelolaIndikator`.
- [x] Kartu "Lapor SIMAR" di sidebar menaut ke `/simar`.
- [x] Glosarium: Mendekati tenggat (definisi Tindak Lanjut).
- [x] Tes: batas 0 dan 7 hari, lewat, Selesai; `tambahHari`; `tenggatSimar` (tiket 03).
- [x] Dicek manual di browser.
