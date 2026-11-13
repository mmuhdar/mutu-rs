/*
 * Impor pengaturan aplikasi mutu lama (modul Mutu di aplikasi kepegawaian RS) dari dump SQL MySQL/MariaDB-nya: Unit, Indikator,
 * Target, dan Unit Pelapor mulai bulan peralihan. Dijalankan saat pemasangan MutuRS, atas database MutuRS yang baru
 * (langkahnya di INSTALASI.md).
 *
 *   npx tsx --env-file=.env scripts/impor-v1.ts <dump.sql|dump.sql.gz> [--mulai YYYY-MM] [--jalankan] > daftar-periksa.md
 *
 * Tanpa --jalankan hanya pratinjau (tidak ada yang disimpan). Daftar periksa untuk Komite Mutu ditulis ke stdout,
 * ringkasan ke stderr. Bertindak sebagai Admin Sistem awal (ADMIN_USERNAME/ADMIN_PASSWORD). Tanpa top-level await:
 * tsx menjalankan .ts sebagai CJS.
 */
import { basename } from "node:path";

import { getPool } from "@/db";
import { bootstrapDatabase } from "@/db/bootstrap";
import { bulanValid } from "@/lib/bulan";
import { config } from "@/lib/config";
import { masuk, penggunaDariToken } from "@/modules/auth/service";
import { INM } from "@/modules/indikator/inm";
import { daftarIndikator } from "@/modules/indikator/service";

import { bacaDump } from "./impor-v1/dump";
import { jalankanRencana } from "./impor-v1/jalankan";
import { dariDump, daftarPeriksa, susunRencana, type HasilImpor } from "./impor-v1/rencana";

async function main() {
  const argumen = process.argv.slice(2);
  const posisiMulai = argumen.indexOf("--mulai");
  const mulai = posisiMulai < 0 ? "2027-01" : (argumen[posisiMulai + 1] ?? "");
  const berkas = argumen.find((a, j) => !a.startsWith("--") && (posisiMulai < 0 || j !== posisiMulai + 1));
  if (!berkas || !bulanValid(mulai)) {
    console.error("Pakai: npx tsx --env-file=.env scripts/impor-v1.ts <dump.sql|dump.sql.gz> [--mulai YYYY-MM] [--jalankan]");
    process.exitCode = 2;
    return;
  }

  const baris = dariDump(await bacaDump(berkas));
  // Database MutuRS yang masih kosong disiapkan dulu (migrasi, Admin Sistem awal, 13 INM); idempoten.
  await bootstrapDatabase();
  const token = await masuk({ username: config.adminAwal.username, sandi: config.adminAwal.sandi, ip: "127.0.0.1" });
  const admin = await penggunaDariToken(token);
  if (!admin) throw new Error("Sesi Admin Sistem awal tidak termuat.");

  const rencana = susunRencana(baris, { mulai, ada: await daftarIndikator(admin), targetInm: Object.fromEntries(INM.map((i) => [i.kode, i.target])) });
  let hasil: HasilImpor | undefined;
  if (argumen.includes("--jalankan")) hasil = await jalankanRencana(admin, rencana);

  process.stdout.write(daftarPeriksa(rencana, basename(berkas), hasil));
  console.error(
    `${baris.length} baris Indikator aktif dibaca: ${rencana.unit.length} Unit, ${rencana.indikator.length} Indikator. ` +
      (hasil
        ? `Dibuat ${hasil.dibuat.unit} Unit, ${hasil.dibuat.indikator} Indikator, ${hasil.dibuat.unitPelapor} Unit Pelapor; ${hasil.gagal.length} gagal.`
        : "Pratinjau saja; tambahkan --jalankan untuk menyimpan."),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
