// Migrasi + data awal di luar server Next (dipakai scripts/test.sh). Tanpa top-level await: tsx menjalankan .ts sebagai CJS.
import { getPool } from "../src/db";
import { bootstrapDatabase } from "../src/db/bootstrap";

bootstrapDatabase().then(() => getPool().end());
