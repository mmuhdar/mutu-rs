/*
 * Impor aplikasi mutu lama (modul Mutu di aplikasi kepegawaian RS) dari dump SQL MySQL/MariaDB-nya: Unit, Indikator,
 * Target, dan Unit Pelapor mulai bulan peralihan, ditambah riwayat isiannya sampai bulan `--riwayat-sampai` (bawaan:
 * bulan lalu, paling akhir bulan sebelum peralihan) sebagai Pengukuran Terverifikasi. Langkahnya di INSTALASI.md.
 *
 *   npx tsx --env-file=.env scripts/impor-v1.ts <dump.sql|dump.sql.gz> [--mulai YYYY-MM] [--riwayat-sampai YYYY-MM] [--jalankan] > daftar-periksa.md
 *
 * Tanpa --jalankan hanya pratinjau (tidak ada yang disimpan). Daftar periksa untuk Komite Mutu ditulis ke stdout,
 * ringkasan ke stderr. Bertindak sebagai Admin Sistem awal (ADMIN_USERNAME/ADMIN_PASSWORD). Tanpa top-level await:
 * tsx menjalankan .ts sebagai CJS.
 */
import { basename } from "node:path";

import { getPool } from "@/db";
import { bootstrapDatabase } from "@/db/bootstrap";
import { bulanLalu, bulanValid, geserBulan } from "@/lib/bulan";
import { config } from "@/lib/config";
import { masuk, penggunaDariToken } from "@/modules/auth/service";
import { INM } from "@/modules/indikator/inm";
import { daftarIndikator } from "@/modules/indikator/service";

import { bacaDump } from "./impor-v1/dump";
import { jalankanRencana } from "./impor-v1/jalankan";
import { dariDump, daftarPeriksa, isianDariDump, susunRencana, susunRiwayat, type HasilImpor } from "./impor-v1/rencana";

async function main() {
  const argumen = process.argv.slice(2);
  const nilai = (opsi: string) => {
    const j = argumen.indexOf(opsi);
    return j < 0 ? undefined : (argumen[j + 1] ?? "");
  };
  const posisiNilai = ["--mulai", "--riwayat-sampai"].map((o) => argumen.indexOf(o) + 1).filter((j) => j > 0);
  const mulai = nilai("--mulai") ?? "2027-01";
  // Isian bulan peralihan dan sesudahnya dibuat di MutuRS; bulan berjalan belum lengkap.
  const sampai = nilai("--riwayat-sampai") ?? [bulanLalu(), geserBulan(mulai, -1)].sort()[0];
  const berkas = argumen.find((a, j) => !a.startsWith("--") && !posisiNilai.includes(j));
  if (!berkas || !bulanValid(mulai) || !bulanValid(sampai) || sampai >= mulai) {
    console.error(
      "Pakai: npx tsx --env-file=.env scripts/impor-v1.ts <dump.sql|dump.sql.gz> [--mulai YYYY-MM] [--riwayat-sampai YYYY-MM] [--jalankan]\n" +
        "--riwayat-sampai harus sebelum bulan peralihan (--mulai).",
    );
    process.exitCode = 2;
    return;
  }

  const isiDump = await bacaDump(berkas);
  const baris = dariDump(isiDump);
  // Database MutuRS yang masih kosong disiapkan dulu (migrasi, Admin Sistem awal, 13 INM); idempoten.
  await bootstrapDatabase();
  const token = await masuk({ username: config.adminAwal.username, sandi: config.adminAwal.sandi, ip: "127.0.0.1" });
  const admin = await penggunaDariToken(token);
  if (!admin) throw new Error("Sesi Admin Sistem awal tidak termuat.");

  const rencana = susunRencana(baris, { mulai, ada: await daftarIndikator(admin), targetInm: Object.fromEntries(INM.map((i) => [i.kode, i.target])) });
  const riwayat = susunRiwayat(rencana, isianDariDump(isiDump), { sampai });
  let hasil: HasilImpor | undefined;
  if (argumen.includes("--jalankan")) hasil = await jalankanRencana(admin, rencana, riwayat);

  process.stdout.write(daftarPeriksa(rencana, basename(berkas), hasil, riwayat));
  console.error(
    `${baris.length} baris Indikator aktif dibaca: ${rencana.unit.length} Unit, ${rencana.indikator.length} Indikator, ` +
      `${riwayat.pengukuran.length} Pengukuran riwayat sampai ${sampai}. ` +
      (hasil
        ? `Dibuat ${hasil.dibuat.unit} Unit, ${hasil.dibuat.indikator} Indikator, ${hasil.dibuat.unitPelapor} Unit Pelapor, ${hasil.dibuat.pengukuran} Pengukuran; ${hasil.gagal.length} gagal.`
        : "Pratinjau saja; tambahkan --jalankan untuk menyimpan."),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
