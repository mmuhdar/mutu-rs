# 04: Pengingat: mendekati tenggat dan kesiapan SIMAR

**What to build:** Tindak Lanjut yang mendekati tenggat (≤ 7 hari) ditandai di daftar Tindak Lanjut dan dihitung di Dashboard; Dashboard Komite Mutu/Admin Sistem menampilkan kesiapan SIMAR bulan lalu dan tenggatnya.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `tambahHari` (`src/lib/bulan.ts`) dan `mendekatiTenggat` (`src/lib/perbaikan.ts`); baris Tindak Lanjut dari service membawa `mendekatiTenggat`.
- [ ] Tabel Tindak Lanjut: "· mendekati"; ubin Lewat tenggat menyebut jumlah mendekati tenggat.
- [ ] Dashboard "Perlu tindakan": Tindak Lanjut mendekati tenggat; SIMAR bulan lalu (siap/jumlah, tenggat) untuk `bolehKelolaIndikator`.
- [ ] Kartu "Lapor SIMAR" di sidebar menaut ke `/simar`.
- [ ] Glosarium: Mendekati tenggat (definisi Tindak Lanjut).
- [ ] Tes: batas 0 dan 7 hari, lewat, Selesai; `jadwalSimar`.
- [ ] Dicek manual di browser.
