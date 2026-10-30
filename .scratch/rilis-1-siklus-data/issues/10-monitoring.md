# 10: Monitoring

**What to build:** Komite Mutu, Direktur, dan Admin Sistem melihat tren 12 bulan setiap Indikator: Capaian RS dibanding Target yang berlaku setiap bulan, selisihnya, Kelengkapan, dan rincian per Unit. Petugas Input Data dan Kepala Unit melihat Capaian Unit-nya sendiri. Semua angka berasal dari satu modul Capaian yang hanya menghitung Pengukuran Terverifikasi.

**Blocked by:** 08 (Verifikasi Pengukuran), 09 (Target berlaku dan penguncian Indikator)

**Status:** selesai (2026-10-31, branch `rilis-1-siklus-data`)

- [ ] Modul Capaian adalah satu-satunya tempat aturan perhitungan. Isinya:
  - Capaian = N/D × faktor; kosong bila D = 0.
  - Capaian Unit dihitung dari Pengukuran Terverifikasi Unit itu.
  - Capaian RS = ΣN/ΣD × faktor atas Pengukuran Terverifikasi dari Unit Pelapor yang aktif bulan itu; kosong bila ΣD = 0.
  - Kelengkapan = Pengukuran Terverifikasi dibanding Unit Pelapor yang aktif bulan itu.
  - Status Capaian dinilai menurut Arah dan Target yang berlaku pada bulan itu; tidak ada status bila Capaian kosong.
  - Indikator Semesteran hanya dinilai pada bulan Juni dan Desember.
- [ ] Halaman Monitoring:
  - pilih Indikator dan bulan akhir;
  - grafik dan tabel 12 bulan berisi Capaian RS, Target, selisih, Status Capaian, dan tanda "belum lengkap (n/m Unit)" bila Kelengkapan belum penuh;
  - rincian Capaian per Unit;
  - Indikator Semesteran hanya punya titik di bulan Juni dan Desember.
- [ ] Indikator dan Unit yang nonaktif tetap tampil dalam riwayat.
- [ ] Pembatasan: Petugas Input Data dan Kepala Unit hanya melihat Capaian Unit-nya, tanpa Capaian RS. Komite Mutu, Direktur, dan Admin Sistem melihat semuanya.
- [ ] Tes service:
  - ICU 9/10 dan Rawat Inap 50/100 menghasilkan Capaian RS 53,6%.
  - Pengukuran Draf dan Diajukan tidak dihitung.
  - D = 0 dan ΣD = 0 menghasilkan Capaian kosong tanpa status.
  - Kelengkapan dengan HCU mulai Maret: Februari tetap lengkap.
  - Arah "makin rendah" (penundaan operasi elektif 4% ≤ 5% = Tercapai).
  - Target berlaku per bulan, dan titik Semesteran.
  - Pembatasan peran dan Unit.
