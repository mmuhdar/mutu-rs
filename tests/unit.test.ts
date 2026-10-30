import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { LABEL_PERAN, PERAN } from "@/lib/peran";
import type { Pengguna } from "@/modules/auth/service";
import { aturAktifUnit, daftarUnit, gantiNamaUnit, pilihanUnit, tambahUnit } from "@/modules/unit/service";

import { adminSistem, sebagai, unik } from "./bantuan";

let admin: Pengguna;
before(async () => {
  admin = await adminSistem();
});

describe("kelola Unit", () => {
  it("Admin Sistem menambah Unit, lalu Unit itu tampil aktif di daftar kelola dan di pilihan Unit", async () => {
    const nama = unik("Rawat Inap");
    const unit = await tambahUnit(admin, { nama: `  ${nama} ` });
    assert.deepEqual(unit, { id: unit.id, nama, aktif: true });

    assert.deepEqual((await daftarUnit(admin)).find((u) => u.id === unit.id), unit);
    assert.ok((await pilihanUnit(admin)).some((u) => u.id === unit.id && u.nama === nama));
  });

  it('nama duplikat ditolak tanpa membedakan huruf besar/kecil dan spasi di tepi ("Rawat Inap" vs " rawat inap")', async () => {
    const nama = unik("Rawat Inap");
    await tambahUnit(admin, { nama });
    await assert.rejects(tambahUnit(admin, { nama: ` ${nama.toLowerCase()}` }), {
      status: 409,
      message: `Unit "${nama.toLowerCase()}" sudah ada.`,
    });
  });

  it("ganti nama mengubah Unit yang sama; nama Unit lain ditolak, ejaan ulang nama sendiri boleh", async () => {
    const icu = await tambahUnit(admin, { nama: unik("ICU") });
    const hcu = await tambahUnit(admin, { nama: unik("HCU") });

    const namaIcu = unik("Intensive Care Unit");
    assert.deepEqual(await gantiNamaUnit(admin, icu.id, { nama: ` ${namaIcu} ` }), { ...icu, nama: namaIcu });
    assert.equal((await daftarUnit(admin)).find((u) => u.id === icu.id)?.nama, namaIcu);

    await assert.rejects(gantiNamaUnit(admin, hcu.id, { nama: namaIcu.toUpperCase() }), { status: 409 });
    assert.equal((await gantiNamaUnit(admin, icu.id, { nama: namaIcu.toUpperCase() })).nama, namaIcu.toUpperCase());
  });

  it("Unit nonaktif hilang dari pilihan tetapi tetap di daftar kelola, lalu muncul lagi setelah diaktifkan kembali", async () => {
    const unit = await tambahUnit(admin, { nama: unik("Perinatologi") });
    const diPilihan = async () => (await pilihanUnit(admin)).some((u) => u.id === unit.id);
    const diDaftar = async () => (await daftarUnit(admin)).find((u) => u.id === unit.id);

    assert.deepEqual(await aturAktifUnit(admin, unit.id, false), { ...unit, aktif: false });
    assert.equal(await diPilihan(), false);
    assert.deepEqual(await diDaftar(), { ...unit, aktif: false });

    assert.deepEqual(await aturAktifUnit(admin, unit.id, true), unit);
    assert.equal(await diPilihan(), true);
    assert.deepEqual(await diDaftar(), unit);
  });

  it("Unit yang tidak ada ditolak", async () => {
    await assert.rejects(aturAktifUnit(admin, randomUUID(), false), { status: 404 });
    await assert.rejects(gantiNamaUnit(admin, randomUUID(), { nama: unik("IGD") }), { status: 404 });
    await assert.rejects(gantiNamaUnit(admin, "bukan-uuid", { nama: unik("IGD") }), { status: 404 });
  });

  it("nama kosong ditolak", async () => {
    await assert.rejects(tambahUnit(admin, { nama: "   " }), { status: 400, message: "Nama Unit wajib diisi." });
  });
});

describe("hak kelola Unit", () => {
  for (const peran of PERAN.filter((p) => p !== "adminSistem")) {
    it(`${LABEL_PERAN[peran]} ditolak menambah, mengganti nama, menonaktifkan, dan melihat daftar kelola Unit`, async () => {
      const aktor = await sebagai(peran);
      const unit = await tambahUnit(admin, { nama: unik("IGD") });
      const ditolak = { status: 403, message: "Hanya Admin Sistem yang boleh mengelola Unit." };

      await assert.rejects(tambahUnit(aktor, { nama: unik("IGD") }), ditolak);
      await assert.rejects(gantiNamaUnit(aktor, unit.id, { nama: unik("IGD") }), ditolak);
      await assert.rejects(aturAktifUnit(aktor, unit.id, false), ditolak);
      await assert.rejects(daftarUnit(aktor), ditolak);

      assert.deepEqual((await daftarUnit(admin)).find((u) => u.id === unit.id), unit);
      assert.ok((await pilihanUnit(aktor)).some((u) => u.id === unit.id));
    });
  }

  it("pemanggilan tanpa Pengguna ditolak", async () => {
    await assert.rejects(tambahUnit(null, { nama: unik("IGD") }), { status: 401 });
    await assert.rejects(pilihanUnit(null), { status: 401 });
  });
});
