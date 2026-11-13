# MutuRS

Aplikasi indikator mutu rumah sakit: mengukur Indikator setiap bulan per Unit, memverifikasinya, lalu memantau Capaian terhadap Target sebagai dasar siklus perbaikan.

## Indikator

**Indikator**:
Ukuran mutu pelayanan yang dipantau setiap bulan, dengan definisi Numerator dan Denominator, Target, dan Arah.
_Avoid_: KPI, parameter mutu

**INM (Indikator Nasional Mutu)**:
Indikator yang ditetapkan Kemenkes dan wajib diukur semua rumah sakit.
_Avoid_: IMN, Indikator Mutu Nasional

**IMP-RS (Indikator Mutu Prioritas Rumah Sakit)**:
Indikator yang dipilih rumah sakit sebagai prioritas tingkat rumah sakit.

**IMP-Unit (Indikator Mutu Prioritas Unit)**:
Indikator prioritas milik satu Unit.

**SPM (Standar Pelayanan Minimal)**:
Indikator dari Standar Pelayanan Minimal rumah sakit; dinilai seperti IMP-RS (Capaian RS dari Unit Pelapor-nya, Analisis Lingkup RS), tetapi dikelompokkan sendiri.

**Unit**:
Bagian pelayanan rumah sakit yang mengukur Indikator, seperti IGD, ICU, atau Rawat Inap; dipilih dari daftar baku, bukan diketik bebas.
_Avoid_: ruangan, bagian

**Unit Pelapor**:
Unit yang wajib mengukur suatu Indikator setiap bulan selama periode tertentu (bulan mulai, opsional bulan berhenti); IMP-Unit punya tepat satu Unit Pelapor.

**Target**:
Batas Capaian yang harus dipenuhi sebuah Indikator, berlaku mulai bulan tertentu; bulan sebelumnya tetap dinilai dengan Target lamanya.

**Arah**:
Sisi Target yang dianggap baik: makin tinggi makin baik (Capaian ≥ Target) atau makin rendah makin baik (Capaian ≤ Target).

**Sumber Data**:
Asal data N dan D sebuah Indikator, seperti rekam medis atau lembar observasi; bagian dari definisi Indikator.

**Frekuensi**:
Seberapa sering sebuah Indikator diukur: Bulanan, atau Semesteran yang diisi pada bulan Juni dan Desember untuk mewakili enam bulan sebelumnya.

**PIC**:
Nama atau jabatan penanggung jawab sebuah Indikator.

## Pengukuran

**Pengukuran**:
Numerator dan Denominator satu Indikator di satu Unit untuk satu bulan; mengisi ulang bulan yang sama mengubah Pengukuran yang sama.
_Avoid_: data monitoring, input data, data indikator

**Numerator (N)**:
Jumlah kejadian dalam sebulan yang memenuhi kriteria Indikator.
_Avoid_: pembilang

**Denominator (D)**:
Jumlah seluruh kejadian yang diamati dalam sebulan untuk Indikator itu.
_Avoid_: penyebut

**Capaian**:
Nilai Indikator untuk satu bulan: N/D × faktor (100 untuk persen, 1 untuk rata-rata, 25 untuk indeks kepuasan pasien, 1000 untuk per seribu); kosong bila D = 0.
_Avoid_: hasil, nilai, skor

**Capaian RS**:
Capaian gabungan semua Unit Pelapor: ΣN/ΣD dari Pengukuran Terverifikasi, bukan rata-rata Capaian per Unit.
_Avoid_: rata-rata capaian

**Kelengkapan**:
Jumlah Pengukuran Terverifikasi dibanding jumlah Pengukuran yang seharusnya ada pada bulan itu, mis. "3/5 Unit".

**Status Capaian**:
Tercapai atau Belum Tercapai, hasil membandingkan Capaian dengan Target menurut Arah.
_Avoid_: memenuhi target, merah/hijau

**Bukti**:
Foto atau PDF asal N dan D yang dilampirkan pengisi ke Pengukuran Draf (paling banyak 5 berkas, masing-masing 10 MB); terkunci setelah Diajukan dan dibuka Kepala Unit saat Verifikasi.
_Avoid_: lampiran, dokumen pendukung

**Validasi Data**:
Pengukuran ulang sampel data satu Indikator di satu Unit Pelapor untuk satu bulan oleh validator yang berbeda dari pengumpul data, dengan sumber data dan formulir yang sama, setiap ada pemicu PMKP 5 (Indikator baru, data akan dipublikasikan, perubahan pengukuran, hasil berubah tanpa sebab, sumber data berubah, subjek data berubah). Kesesuaian = data sesuai / sampel validator × 100%; valid bila mencapai 90%. Yang tidak valid diperbaiki lalu divalidasi ulang dengan sampel baru. Berbeda dari Verifikasi.
_Avoid_: validasi bulanan, audit data

**Verifikasi**:
Pemeriksaan Pengukuran oleh Kepala Unit; hanya Pengukuran Terverifikasi yang dihitung dalam Capaian.

**Status Pengukuran**:
Draf (sedang diisi atau dikembalikan dengan alasan), Diajukan (menunggu Verifikasi), atau Terverifikasi.

## Perbaikan

**Lingkup**:
Tingkat sebuah Analisis, Tindak Lanjut, atau PDSA: RS (Capaian RS, ditangani Komite Mutu) atau satu Unit (Capaian Unit itu, ditangani Kepala Unit-nya atau Komite Mutu).

**Analisis**:
Catatan tertulis tentang Capaian satu Indikator dalam satu Lingkup untuk satu bulan: apa yang terjadi, penyebabnya, dan apakah perlu Tindak Lanjut atau PDSA.
_Avoid_: Evaluasi, analisa capaian

**Tindak Lanjut**:
Satu tindakan perbaikan konkret hasil sebuah Analisis, dengan PIC, tenggat, status (Direncanakan, Berjalan, Selesai, Dibatalkan), dan catatan hasil; lewat tenggat bila tenggatnya sudah lewat sedangkan statusnya Direncanakan atau Berjalan, mendekati tenggat bila tenggatnya hari ini sampai 7 hari lagi dengan status yang sama.
_Avoid_: RTL, rencana tindak lanjut

**Analisis Efisiensi**:
Biaya per jenis sumber daya (tenaga, bahan, alat, waktu, lain-lain) sebelum dan sesudah perbaikan, dengan kesimpulannya, pada satu PDSA; untuk satu proyek prioritas perbaikan per tahun (PMKP 4 g).

**PDSA**:
Siklus uji coba perbaikan untuk satu Indikator dalam satu Lingkup selama periode uji coba (bulan mulai s.d. bulan akhir), diisi berurutan: Plan (rencana perubahan dan prediksinya), Do (uji coba skala kecil), Study (hasil dibandingkan dengan prediksi, berdampingan dengan Capaian sebelum dan selama uji coba), Act (adopsi, adaptasi, atau tinggalkan); siklus berikutnya bisa dimulai dari Act.
_Avoid_: PDCA

## Pelaporan

**Triwulan**:
Tiga bulan kalender: Triwulan I (Januari–Maret), II (April–Juni), III (Juli–September), IV (Oktober–Desember).
_Avoid_: kuartal

**Capaian Triwulan**:
Capaian RS satu Indikator selama satu Triwulan: ΣN/ΣD Pengukuran Terverifikasi ketiga bulannya (Semesteran: bulan Juni atau Desember saja), dinilai dengan Target yang berlaku pada bulan terakhir Triwulan.
_Avoid_: rata-rata triwulan

**Laporan Triwulan**:
Laporan Komite Mutu kepada Direktur (lalu diteruskan ke Dewan Pengawas) untuk satu Triwulan yang sudah selesai: Capaian Triwulan semua Indikator, Analisis dan Tindak Lanjut, PDSA (dengan Analisis Efisiensi), Validasi Data, rekap Insiden tanpa identitas, Rekomendasi, dan Umpan Balik Dewan Pengawas. Selalu disusun dari data terkini; yang dikirim adalah hasil cetaknya.
_Avoid_: laporan PMKP, evaluasi triwulan

**Umpan Balik Dewan Pengawas**:
Umpan balik tertulis Dewan Pengawas atas Laporan Triwulan setelah dibahas, dan tindak lanjutnya yang dievaluasi pada pertemuan Laporan Triwulan berikutnya (TKRS 1). Dewan Pengawas tidak punya akun; dicatat Komite Mutu, Direktur, atau Admin Sistem.

**Rekomendasi**:
Kesimpulan dan saran perbaikan Komite Mutu untuk satu Triwulan, bagian akhir Laporan Triwulan.

**Rekap Bulanan**:
Unduhan CSV Capaian satu bulan dari Dashboard: per Indikator, Capaian RS (kecuali IMP-Unit) lalu Capaian setiap Unit Pelapor-nya, untuk diolah di Excel.

**Rekap SIMAR**:
Isian INM satu bulan untuk SIMAR Kemenkes, per INM: N dan D dari Capaian RS, "Analisa Capaian" dari Analisis Lingkup RS, dan "Rencana Tindak Lanjut" dari Tindak Lanjut-nya, ditandai bila belum siap; paling lambat tanggal 10 bulan berikutnya. "Analisa Capaian" dan "Rencana Tindak Lanjut" hanya dipakai sebagai nama isian SIMAR.

## Keselamatan Pasien

**Insiden**:
Insiden Keselamatan Pasien: setiap kejadian tidak disengaja dan kondisi yang mengakibatkan atau berpotensi mengakibatkan cedera yang dapat dicegah pada pasien (PMK 11/2017). Di MutuRS = satu laporan internal (isian Formulir 1) beserta grading, investigasi, dan statusnya; insiden pada karyawan atau pengunjung tidak dicatat di sini (K3 RS).
_Avoid_: IKP, kejadian, laporan kejadian

**Jenis Insiden**:
KPC (Kondisi Potensial Cedera, belum terjadi insiden), KNC (Kejadian Nyaris Cedera, belum terpapar ke pasien), KTC (Kejadian Tidak Cedera), KTD (Kejadian Tidak Diharapkan, mengakibatkan cedera), atau Kejadian Sentinel (KTD dengan kematian, cedera permanen, atau cedera berat sementara yang tidak terkait perjalanan penyakit).

**Pembuat Laporan**:
Pengguna yang memasukkan laporan Insiden; bisa berbeda dari orang pertama yang melaporkan insiden (staf tanpa akun melapor ke atasannya).
_Avoid_: pelapor (bentrok dengan Unit Pelapor)

**Grading**:
Warna risiko Insiden (Biru, Hijau, Kuning, Merah) dari sel matriks dampak (1–5) × probabilitas (1–5) Pedoman KKP-RS 2008, bukan dari skornya. Grading awal oleh Kepala Unit dari Unit tempat insiden atau Komite Mutu; grading akhir oleh Komite Mutu saat meninjau atau menyelesaikan RCA.
_Avoid_: derajat insiden, band

**Investigasi Sederhana**:
Investigasi Insiden biru (paling lama 7 hari) atau hijau (14 hari) oleh Kepala Unit dari Unit tempat insiden, lalu ditinjau Komite Mutu.

**RCA**:
Root Cause Analysis: investigasi Insiden kuning, merah, dan semua Kejadian Sentinel oleh Komite Mutu, paling lama 45 hari. Isiannya sama dengan Investigasi Sederhana: tipe insiden, faktor kontributor, penyebab langsung, akar masalah, rekomendasi.

**Status Insiden**:
Dilaporkan (menunggu grading; laporan masih bisa diubah Pembuat Laporan), Investigasi Sederhana, Ditinjau (menunggu Komite Mutu), RCA, Selesai, atau Bukan Insiden (ditutup Komite Mutu dengan alasan). Lewat tenggat bila tenggat investigasi sudah lewat sedangkan statusnya Investigasi Sederhana atau RCA.

## Manajemen Risiko

**Register Risiko**:
Daftar Risiko satu Unit untuk satu tahun, diisi Petugas Input Data dan Kepala Unit dari Unit itu atau Komite Mutu; pengganti Input Risiko aplikasi v1.
_Avoid_: input risiko, daftar risiko

**Risiko**:
Satu baris Register Risiko: uraian kejadian yang mungkin terjadi, Kategori Risiko, Penilaian Awal, Perlakuan, Jadwal Pelaksanaan, Hasil Pemantauan, Simpulan, dan Dokumen Review.

**Kategori Risiko**:
Kebijakan, Reputasi, Fraud/Korupsi, Legal, Kepatuhan, atau Operasional.

**Probabilitas** dan **Dampak**:
Skala 1–5 untuk menilai Risiko; pasangan keduanya menentukan Nilai Risiko dan Bobot.

**Nilai Risiko**:
Angka 1–25 dari sel matriks Probabilitas × Dampak Input Risiko v1 (peringkat sel, bukan hasil kali). Bobot = angka kedua dari sel yang sama.
_Avoid_: skor risiko (dipakai Grading Insiden)

**Tingkat Risiko**:
Sangat Tinggi (Nilai Risiko ≥ 20), Tinggi (15–19), Sedang (10–14), Rendah (5–9), atau Sangat Rendah (1–4). Prioritas Risiko = 1 untuk Sangat Tinggi sampai 5 untuk Sangat Rendah. Berbeda dari Grading Insiden.

**Penilaian Awal**:
Probabilitas dan Dampak saat Risiko dicatat, sebelum Perlakuan.
_Avoid_: analisis risiko awal (bentrok dengan Analisis)

**Perlakuan**:
Langkah penanganan Risiko, satu per baris, dengan satu Jadwal Pelaksanaan.

**Hasil Pemantauan**:
Penilaian ulang Probabilitas dan Dampak setelah Perlakuan berjalan.

**Simpulan**:
Tingkat Risiko "ada penurunan" bila Tingkat Risiko Hasil Pemantauan lebih rendah dari Penilaian Awal (dihitung), dan Efektivitas Perlakuan Efektif atau Tidak Efektif (dinilai, setelah Hasil Pemantauan).

**Dokumen Review**:
Berkas PDF, DOC, atau DOCX hasil review satu Risiko, misalnya notulen rapat.

## Sistem

**Jejak Audit**:
Catatan siapa mengubah data apa dan kapan, ditulis setiap kali data diubah lewat aplikasi (juga percobaan masuk yang gagal); hanya ditambah, tidak pernah diubah atau dihapus. Dibaca Admin Sistem dan Komite Mutu.
_Avoid_: log, riwayat perubahan

## Peran

**Petugas Input Data**:
Pengguna yang mengisi dan mengajukan Pengukuran untuk Unit-nya.
_Avoid_: operator, penginput

**Kepala Unit**:
Pengguna yang memverifikasi Pengukuran Unit-nya, dan boleh mengisinya sendiri.

**Komite Mutu**:
Pengguna yang mengelola Indikator dan memantau Capaian seluruh rumah sakit; juga bertindak sebagai Tim Keselamatan Pasien yang meninjau Insiden dan melakukan RCA.
_Avoid_: Tim Mutu

**Direktur**:
Pimpinan rumah sakit yang memantau Capaian seluruh Unit.
_Avoid_: pimpinan

**Admin Sistem**:
Pengguna yang mengelola Pengguna dan Unit.
