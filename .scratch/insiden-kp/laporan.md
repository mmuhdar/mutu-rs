# Laporan: Pelaporan Insiden Keselamatan Pasien

Branch `insiden-kp`, dari `rilis-4-pindah` (Rilis 4 belum di-merge ke `main`). Spec: `spec.md`, tiket: `issues/01` s.d. `03`, riset: `docs/research/insiden-keselamatan-pasien.md`.

## Isi

| Tiket | Hasil |
|---|---|
| 01 Laporan Insiden | Semua Pengguna melaporkan Insiden lewat isian Formulir 1 PMK 11/2017 (menu Insiden). Pembuat Laporan bisa mengubahnya sampai digrading. |
| 02 Grading dan investigasi | Matriks grading 5×5 (KKP-RS 2008). Biru dan hijau masuk Investigasi Sederhana oleh Kepala Unit, kuning, merah, dan Kejadian Sentinel masuk RCA oleh Komite Mutu. Komite Mutu juga meninjau, menggrading ulang, dan menandai Bukan Insiden. Tanggal e-report Kemenkes dicatat untuk KTD dan Kejadian Sentinel. Ada Riwayat Status dan tenggat investigasi. |
| 03 Rekap | Dashboard (antrean per peran), Laporan Triwulan dan CSV-nya (rekap tanpa identitas), data dummy Insiden. |

## Cara mencoba

Server dev: http://localhost:3456 (sudah berjalan, migrasi `0013_insiden` sudah masuk). Sandi semua akun dummy `mutu12345`. Data dummy dev sudah berisi 9 Insiden contoh di semua status; database baru mendapatkannya dari `npx tsx --env-file=.env scripts/data-dummy.ts`.

## Yang perlu Anda cek manual

<!-- diisi setelah review -->

## Keputusan yang saya ambil sendiri

<!-- diisi setelah review -->

## Pemeriksaan

<!-- diisi setelah review -->

## Batasan

<!-- diisi setelah review -->
