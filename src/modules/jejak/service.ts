import { and, desc, eq, gte, lt, ne } from "drizzle-orm";

import { db } from "@/db";
import { jejakAudit, pengguna } from "@/db/schema";
import { dariWaktuSetempat, tambahHari, tanggalValid } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import { ENTITAS_JEJAK, type EntitasJejak } from "@/lib/jejak";
import type { Peran } from "@/lib/peran";
import { wajibPeran, type Pengguna } from "@/modules/auth/service";

/*
 * Jejak Audit: catatan siapa mengubah apa dan kapan, ditulis service lewat `catatJejak` (`./catat.ts`); di sini
 * pembacaannya.
 */

const PEMBACA: readonly Peran[] = ["adminSistem", "komiteMutu"];
/** Membaca Jejak Audit: Admin Sistem dan Komite Mutu. Juga untuk tampilan (menu). */
export const bolehBacaJejak = (aktor: Pengguna) => PEMBACA.includes(aktor.peran);

/** Paling banyak baris yang ditampilkan sekali baca. */
export const BATAS_JEJAK = 300;

/**
 * Jejak Audit terbaru lebih dulu, disaring jenis data dan rentang tanggal ("YYYY-MM-DD", keduanya termasuk, menurut
 * zona waktu RS); paling banyak `BATAS_JEJAK` baris. Admin Sistem tidak membaca jejak Insiden (Admin Sistem tidak
 * membaca Insiden).
 */
export async function daftarJejak(aktor: Pengguna | null, saringan: { entitas?: string; dari?: string; sampai?: string } = {}) {
  wajibPeran(aktor, PEMBACA, "Jejak Audit hanya untuk Admin Sistem dan Komite Mutu.");
  const { entitas, dari, sampai } = saringan;
  if (entitas && !(ENTITAS_JEJAK as readonly string[]).includes(entitas)) throw new ServiceError(400, "Jenis data tidak dikenal.");
  for (const t of [dari, sampai]) if (t && !tanggalValid(t)) throw new ServiceError(400, "Tanggal saringan tidak valid.");
  return db
    .select({
      id: jejakAudit.id,
      waktu: jejakAudit.waktu,
      entitas: jejakAudit.entitas,
      entitasId: jejakAudit.entitasId,
      ringkasan: jejakAudit.ringkasan,
      oleh: pengguna.nama,
    })
    .from(jejakAudit)
    .leftJoin(pengguna, eq(pengguna.id, jejakAudit.penggunaId))
    .where(
      and(
        entitas ? eq(jejakAudit.entitas, entitas as EntitasJejak) : undefined,
        aktor.peran === "adminSistem" ? ne(jejakAudit.entitas, "insiden") : undefined,
        dari ? gte(jejakAudit.waktu, dariWaktuSetempat(`${dari}T00:00`)!) : undefined,
        sampai ? lt(jejakAudit.waktu, dariWaktuSetempat(`${tambahHari(sampai, 1)}T00:00`)!) : undefined,
      ),
    )
    .orderBy(desc(jejakAudit.waktu))
    .limit(BATAS_JEJAK);
}
