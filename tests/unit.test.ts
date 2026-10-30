import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { config } from "@/lib/config";
import { PERAN } from "@/lib/peran";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import { aturAktifUnit, daftarUnit, gantiNamaUnit, pilihanUnit, tambahUnit } from "@/modules/unit/service";

let admin: Pengguna;
before(async () => {
  admin = (await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.3.0.1" })))!;
});

// Satu database untuk semua tes: setiap tes memakai nama Unit sendiri.
const namaBaru = (awalan: string) => `${awalan} ${randomUUID().slice(0, 8)}`;

describe("kelola Unit", () => {
  it("Admin Sistem menambah Unit, lalu Unit itu tampil aktif di daftar kelola dan di pilihan Unit", async () => {
    const nama = namaBaru("Rawat Inap");
    const unit = await tambahUnit(admin, { nama: `  ${nama} ` });
    assert.deepEqual(unit, { id: unit.id, nama, aktif: true });

    assert.deepEqual((await daftarUnit(admin)).find((u) => u.id === unit.id), unit);
    assert.ok((await pilihanUnit(admin)).some((u) => u.id === unit.id && u.nama === nama));
  });

  it('nama duplikat ditolak tanpa membedakan huruf besar/kecil dan spasi di tepi ("Rawat Inap" vs " rawat inap")', async () => {
    const nama = namaBaru("Rawat Inap");
    await tambahUnit(admin, { nama });
    await assert.rejects(tambahUnit(admin, { nama: ` ${nama.toLowerCase()}` }), {
      status: 409,
      message: `Unit "${nama.toLowerCase()}" sudah ada.`,
    });
  });

  it("ganti nama mengubah Unit yang sama; nama Unit lain ditolak, ejaan ulang nama sendiri boleh", async () => {
    const icu = await tambahUnit(admin, { nama: namaBaru("ICU") });
    const hcu = await tambahUnit(admin, { nama: namaBaru("HCU") });

    const namaIcu = namaBaru("Intensive Care Unit");
    assert.deepEqual(await gantiNamaUnit(admin, icu.id, { nama: ` ${namaIcu} ` }), { ...icu, nama: namaIcu });
    assert.equal((await daftarUnit(admin)).find((u) => u.id === icu.id)?.nama, namaIcu);

    await assert.rejects(gantiNamaUnit(admin, hcu.id, { nama: namaIcu.toUpperCase() }), { status: 409 });
    assert.equal((await gantiNamaUnit(admin, icu.id, { nama: namaIcu.toUpperCase() })).nama, namaIcu.toUpperCase());
  });

  it("Unit nonaktif hilang dari pilihan tetapi tetap di daftar kelola, lalu muncul lagi setelah diaktifkan kembali", async () => {
    const unit = await tambahUnit(admin, { nama: namaBaru("Perinatologi") });
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
    await assert.rejects(gantiNamaUnit(admin, randomUUID(), { nama: namaBaru("IGD") }), { status: 404 });
    await assert.rejects(gantiNamaUnit(admin, "bukan-uuid", { nama: namaBaru("IGD") }), { status: 404 });
  });

  it("nama kosong ditolak", async () => {
    await assert.rejects(tambahUnit(admin, { nama: "   " }), { status: 400, message: "Nama Unit wajib diisi." });
  });
});

describe("hak kelola Unit", () => {
  // Pengguna berperan lain dibentuk dari Admin Sistem awal (service Pengguna belum ada); service hanya membaca peran.
  for (const peran of PERAN.filter((p) => p !== "adminSistem")) {
    it(`${peran} ditolak menambah, mengganti nama, menonaktifkan, dan melihat daftar kelola Unit`, async () => {
      const aktor: Pengguna = { ...admin, peran };
      const unit = await tambahUnit(admin, { nama: namaBaru("IGD") });
      const ditolak = { status: 403, message: "Hanya Admin Sistem yang boleh mengelola Unit." };

      await assert.rejects(tambahUnit(aktor, { nama: namaBaru("IGD") }), ditolak);
      await assert.rejects(gantiNamaUnit(aktor, unit.id, { nama: namaBaru("IGD") }), ditolak);
      await assert.rejects(aturAktifUnit(aktor, unit.id, false), ditolak);
      await assert.rejects(daftarUnit(aktor), ditolak);

      assert.deepEqual((await daftarUnit(admin)).find((u) => u.id === unit.id), unit);
      assert.ok((await pilihanUnit(aktor)).some((u) => u.id === unit.id));
    });
  }

  it("pemanggilan tanpa Pengguna ditolak", async () => {
    await assert.rejects(tambahUnit(null, { nama: namaBaru("IGD") }), { status: 401 });
    await assert.rejects(pilihanUnit(null), { status: 401 });
  });
});
