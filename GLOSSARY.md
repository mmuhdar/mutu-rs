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
Laporan Komite Mutu kepada Direktur (lalu diteruskan ke Dewan Pengawas) untuk satu Triwulan yang sudah selesai: Capaian Triwulan semua Indikator, Analisis dan Tindak Lanjut, PDSA, dan Rekomendasi. Selalu disusun dari data terkini; yang dikirim adalah hasil cetaknya.
_Avoid_: laporan PMKP, evaluasi triwulan

**Rekomendasi**:
Kesimpulan dan saran perbaikan Komite Mutu untuk satu Triwulan, bagian akhir Laporan Triwulan.

**Rekap SIMAR**:
Isian INM satu bulan untuk SIMAR Kemenkes, per INM: N dan D dari Capaian RS, "Analisa Capaian" dari Analisis Lingkup RS, dan "Rencana Tindak Lanjut" dari Tindak Lanjut-nya, ditandai bila belum siap; paling lambat tanggal 10 bulan berikutnya. "Analisa Capaian" dan "Rencana Tindak Lanjut" hanya dipakai sebagai nama isian SIMAR.

## Peran

**Petugas Input Data**:
Pengguna yang mengisi dan mengajukan Pengukuran untuk Unit-nya.
_Avoid_: operator, penginput

**Kepala Unit**:
Pengguna yang memverifikasi Pengukuran Unit-nya, dan boleh mengisinya sendiri.

**Komite Mutu**:
Pengguna yang mengelola Indikator dan memantau Capaian seluruh rumah sakit.
_Avoid_: Tim Mutu

**Direktur**:
Pimpinan rumah sakit yang memantau Capaian seluruh Unit.
_Avoid_: pimpinan

**Admin Sistem**:
Pengguna yang mengelola Pengguna dan Unit.
