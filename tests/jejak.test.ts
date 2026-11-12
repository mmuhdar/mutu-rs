import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ServiceError } from "@/lib/errors";
import type { Pengguna } from "@/modules/auth/service";
import { db } from "@/db";
import { masuk } from "@/modules/auth/service";
import { catatJejak } from "@/modules/jejak/catat";
import { daftarJejak } from "@/modules/jejak/service";
import { tambahUnit } from "@/modules/unit/service";

import { adminSistem, komiteMutu, sebagai, unik } from "./bantuan";

/* Jejak Audit. Semua tes memakai satu database, jadi yang diperiksa hanya baris buatan file ini. */

let admin: Pengguna;
let komite: Pengguna;
before(async () => {
  admin = await adminSistem();
  komite = await komiteMutu();
});

describe("Jejak Audit", () => {
  it("perubahan lewat service tercatat dengan pelaku dan ringkasannya; Admin Sistem dan Komite Mutu membacanya", async () => {
    const nama = unik("Unit Jejak");
    const u = await tambahUnit(admin, { nama });
    for (const pembaca of [admin, komite]) {
      const baris = (await daftarJejak(pembaca, { entitas: "unit" })).find((j) => j.entitasId === u.id);
      assert.deepEqual([baris?.ringkasan, baris?.oleh], [`Menambah Unit ${nama}`, admin.nama]);
    }
  });

  it("menolak peran lain dan saringan yang tidak sah", async () => {
    const tolak = (status: number) => (e: unknown) => e instanceof ServiceError && e.status === status;
    await assert.rejects(daftarJejak(await sebagai("kepalaUnit")), tolak(403));
    await assert.rejects(daftarJejak(admin, { entitas: "lain" }), tolak(400));
    await assert.rejects(daftarJejak(admin, { dari: "2026-02-30" }), tolak(400));
  });

  it("Admin Sistem tidak membaca jejak Insiden; Komite Mutu membacanya", async () => {
    const ringkasan = unik("Insiden menjadi Selesai");
    await catatJejak(db, komite, "insiden", null, ringkasan);
    assert.equal((await daftarJejak(komite, { entitas: "insiden" })).some((j) => j.ringkasan === ringkasan), true);
    assert.equal((await daftarJejak(admin)).some((j) => j.ringkasan === ringkasan), false);
  });

  it("percobaan masuk yang gagal tercatat tanpa pelaku; username tidak dikenal tidak ditulis", async () => {
    const ketik = unik("mungkin-sandi");
    await assert.rejects(masuk({ username: ketik, sandi: "salah-sekali", ip: "10.1.2.3" }));
    const baris = (await daftarJejak(komite, { entitas: "sesi" })).find((j) => j.ringkasan === "Gagal masuk dengan username tidak dikenal dari 10.1.2.3");
    assert.equal(baris?.oleh, null);
    assert.equal((await daftarJejak(komite, { entitas: "sesi" })).some((j) => j.ringkasan.includes(ketik)), false);
  });
});
