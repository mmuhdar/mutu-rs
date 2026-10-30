// Skema database (Drizzle). Setelah mengubah file ini jalankan `npm run db:generate -- --name <slug>`.
import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { PERAN, type Peran } from "../lib/peran";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const pengguna = pgTable(
  "pengguna",
  {
    id: id(),
    username: varchar("username", { length: 64 }).notNull(),
    nama: varchar("nama", { length: 120 }).notNull(),
    hashSandi: text("hash_sandi").notNull(),
    peran: varchar("peran", { length: 32 }).$type<Peran>().notNull(),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    // Username unik tanpa membedakan huruf besar/kecil.
    uniqueIndex("pengguna_username_unique").on(sql`lower(${t.username})`),
    check("pengguna_peran_check", sql`${t.peran} in (${sql.raw(PERAN.map((p) => `'${p}'`).join(", "))})`),
  ],
);

/** Sesi masuk: cookie berisi token acak, database hanya menyimpan hash SHA-256-nya. */
export const sesi = pgTable("sesi", {
  id: id(),
  penggunaId: uuid("pengguna_id")
    .notNull()
    .references(() => pengguna.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});
