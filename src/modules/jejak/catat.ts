import { db } from "@/db";
import { jejakAudit } from "@/db/schema";
import type { EntitasJejak } from "@/lib/jejak";

/*
 * Penulisan Jejak Audit, dipisah dari `./service.ts` supaya service lain (termasuk auth) bisa memanggilnya tanpa impor
 * melingkar. Setiap service yang mengubah data memanggil `catatJejak` di dalam transaksi yang sama dengan perubahannya
 * (perubahan tanpa jejak, atau jejak tanpa perubahan, tidak mungkin). Hanya percobaan masuk yang gagal yang ditulis
 * sendiri, karena tidak ada perubahan. Ringkasan ditulis untuk dibaca orang dan tidak memuat sandi, isi berkas, atau
 * identitas pasien.
 */

/** `db` atau transaksi yang sedang berjalan. */
type Penulis = Pick<typeof db, "insert">;

/** Mencatat satu perubahan oleh `aktor` (null = tanpa sesi, mis. percobaan masuk yang gagal). */
export async function catatJejak(q: Penulis, aktor: { id: string } | null, entitas: EntitasJejak, entitasId: string | null, ringkasan: string) {
  await q.insert(jejakAudit).values({ penggunaId: aktor?.id ?? null, entitas, entitasId, ringkasan });
}

/** Teks isian pengguna di ringkasan: dikutip dan dipotong 80 karakter. */
export const kutip = (teks: string) => `"${teks.length > 80 ? `${teks.slice(0, 79)}…` : teks}"`;
