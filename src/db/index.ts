import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { config } from "../lib/config";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __mutuPool?: Pool; __mutuDb?: Database };

/** Pool dibuat sekali dan dipakai ulang (aman terhadap hot reload saat development). */
export function getPool(): Pool {
  globalForDb.__mutuPool ??= new Pool({ connectionString: config.databaseUrl, idleTimeoutMillis: 30_000 });
  return globalForDb.__mutuPool;
}

globalForDb.__mutuDb ??= drizzle(getPool(), { schema });

export const db: Database = globalForDb.__mutuDb;
