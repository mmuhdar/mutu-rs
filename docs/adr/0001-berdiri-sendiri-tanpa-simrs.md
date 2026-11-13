# MutuRS berdiri sendiri, tanpa integrasi SIMRS

MutuRS punya akun, Unit, dan Indikator sendiri dan tidak terhubung ke SIMRS rumah sakit, walaupun SIMRS sudah memiliki modul mutu (`QualityIndicator`, `QualityMeasurement`) dan aplikasi satelit lain (mis. logistik-rs) login lewat SIMRS. Alasannya: SIMRS masih dalam pengembangan. MutuRS adalah sumber resmi indikator mutu; menu indikator mutu di SIMRS harus dinonaktifkan sebelum SIMRS dipakai, supaya tidak ada dua tempat input yang menghasilkan dua angka berbeda untuk Indikator yang sama.
