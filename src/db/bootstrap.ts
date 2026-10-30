import path from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { config } from "../lib/config";
import { buatAdminAwal } from "../modules/auth/service";
import { db } from "./index";

/**
 * Menyiapkan database: migrasi skema, lalu data awal. Dijalankan saat server mulai (`src/instrumentation.ts`)
 * dan oleh harness tes (`scripts/test.sh`), jadi tes selalu memakai jalur start yang sama.
 *
 * Bila gagal, proses dihentikan: Next tetap menyala walau `register()` gagal (semua halaman jadi error 500),
 * sedangkan proses yang berhenti dijalankan ulang oleh docker compose (`restart: unless-stopped`),
 * mis. saat database belum siap setelah server RS reboot.
 */
export async function bootstrapDatabase() {
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    // Data awal ditambahkan di sini, setelah migrasi. Harus idempoten dan tidak menimpa data yang sudah ada.
    if (config.adminAwal.sandi) await buatAdminAwal(config.adminAwal);
    else console.warn("[db] ADMIN_PASSWORD kosong: Admin Sistem awal tidak dibuat.");
  } catch (error) {
    console.error("[db] Gagal menyiapkan database, proses dihentikan.", error);
    process.exit(1);
  }
}
