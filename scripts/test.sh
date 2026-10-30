#!/usr/bin/env bash
# Tes service: buat database sementara, migrasi + data awal, jalankan node:test lewat tsx,
# lalu hapus database itu (juga ketika tes gagal).
# Argumen opsional = file tes tertentu, mis. `npm test -- tests/bulan.test.ts`.
set -euo pipefail
cd "$(dirname "$0")/.."

# Urutan: environment, lalu .env (hanya DATABASE_URL; `source .env` gagal pada nilai berspasi), lalu database dev bawaan.
DATABASE_URL="${DATABASE_URL:-$(sed -n 's/^DATABASE_URL=//p' .env 2>/dev/null | tr -d '"' || true)}"
DATABASE_URL="${DATABASE_URL:-postgres://mutu:mutu@127.0.0.1:55434/mutu}"
server="${DATABASE_URL%%\?*}"
server="${server%/*}"
db="mutu_test_$$"

sql() {
  node -e 'const { Client } = require("pg"); const c = new Client({ connectionString: process.argv[1] });
    c.connect().then(() => c.query(process.argv[2])).finally(() => c.end())' "$server/postgres" "$1"
}

sql "CREATE DATABASE $db"
trap 'sql "DROP DATABASE IF EXISTS $db WITH (FORCE)"' EXIT

export DATABASE_URL="$server/$db" NODE_ENV=test APP_TIMEZONE=Asia/Makassar
npx tsx scripts/bootstrap-db.ts
if [ $# -eq 0 ]; then set -- "tests/*.test.ts"; fi
npx tsx --test --test-concurrency=1 "$@"
