import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bootstrapDatabase } from "@/db/bootstrap";
import { config } from "@/lib/config";
import { buatAdminAwal, keluar, masuk, penggunaDariToken } from "@/modules/auth/service";

// Satu database untuk semua tes: setiap tes memakai username sendiri.
let nomor = 0;
async function adminBaru(sandi = "sandi-admin-1") {
  const username = `admin-${process.pid}-${++nomor}`;
  await buatAdminAwal({ username, sandi });
  return { username, sandi };
}

describe("masuk", () => {
  it("Admin Sistem awal masuk dengan sandi benar lalu dimuat sebagai Pengguna berperan Admin Sistem", async () => {
    const admin = await adminBaru();
    const token = await masuk({ ...admin, ip: "10.0.0.1" });
    const pengguna = await penggunaDariToken(token);
    assert.equal(pengguna?.username, admin.username);
    assert.equal(pengguna?.peran, "adminSistem");
  });

  it("username tanpa membedakan huruf besar/kecil dan spasi di tepi", async () => {
    const admin = await adminBaru();
    const token = await masuk({ username: ` ${admin.username.toUpperCase()} `, sandi: admin.sandi, ip: "10.0.0.1" });
    assert.equal((await penggunaDariToken(token))?.username, admin.username);
  });

  it("sandi salah dan username yang tidak ada ditolak dengan pesan yang sama", async () => {
    const admin = await adminBaru();
    const gagal = { status: 401, message: "Username atau sandi salah." };
    await assert.rejects(masuk({ username: admin.username, sandi: "sandi-keliru", ip: "10.0.0.2" }), gagal);
    await assert.rejects(masuk({ username: `${admin.username}-tidak-ada`, sandi: admin.sandi, ip: "10.0.0.2" }), gagal);
  });
});

describe("sesi", () => {
  it("keluar mengakhiri sesi sehingga token tidak lagi memuat Pengguna", async () => {
    const admin = await adminBaru();
    const token = await masuk({ ...admin, ip: "10.0.0.4" });
    await keluar(await penggunaDariToken(token));
    assert.equal(await penggunaDariToken(token), null);
  });

  it("pemanggilan service tanpa Pengguna ditolak", async () => {
    await assert.rejects(keluar(null), { status: 401 });
  });

  it("berakhir setelah 12 jam tidak dipakai, dan diperpanjang selama masih dipakai", async () => {
    const admin = await adminBaru();
    const jam = (n: number) => new Date(Date.UTC(2026, 10, 2, n));
    const dipakai = await masuk({ ...admin, ip: "10.0.0.5" }, jam(0));
    const ditinggal = await masuk({ ...admin, ip: "10.0.0.5" }, jam(0));

    assert.ok(await penggunaDariToken(dipakai, jam(7)));
    assert.ok(await penggunaDariToken(dipakai, jam(18)));
    assert.equal(await penggunaDariToken(ditinggal, jam(13)), null);
  });
});

describe("pembatasan percobaan masuk", () => {
  const diblokir = { status: 429 };

  it("8 kali gagal dari satu IP memblokir masuk walau sandi benar, lalu dibuka lagi setelah 10 menit", async () => {
    const admin = await adminBaru();
    const mulai = new Date("2026-11-02T08:00:00Z");
    for (let i = 0; i < 8; i++) {
      await assert.rejects(masuk({ username: admin.username, sandi: "tebakan", ip: "10.1.0.1" }, mulai), {
        status: 401,
      });
    }
    await assert.rejects(masuk({ ...admin, ip: "10.1.0.1" }, new Date("2026-11-02T08:09:00Z")), diblokir);

    await masuk({ ...admin, ip: "10.1.0.1" }, new Date("2026-11-02T08:10:01Z"));
  });

  it("berganti IP tidak menembus batas: 20 kali gagal untuk satu username memblokirnya dari IP mana pun", async () => {
    const admin = await adminBaru();
    for (let i = 0; i < 20; i++) {
      await assert.rejects(masuk({ username: admin.username, sandi: "tebakan", ip: `10.2.0.${i}` }), { status: 401 });
    }
    await assert.rejects(masuk({ ...admin, ip: "10.2.1.1" }), diblokir);
  });
});

describe("Admin Sistem awal", () => {
  it("tidak dibuat dengan sandi kurang dari 8 karakter, atau di produksi dengan sandi contoh .env.example", async () => {
    const username = `admin-lemah-${process.pid}`;
    await assert.rejects(buatAdminAwal({ username, sandi: "1234567" }), /ADMIN_PASSWORD minimal 8 karakter/);
    await assert.rejects(buatAdminAwal({ username, sandi: "ganti-sandi-admin" }, true), /ADMIN_PASSWORD masih sandi contoh/);
    await assert.rejects(masuk({ username, sandi: "ganti-sandi-admin", ip: "10.0.0.4" }), { status: 401 });

    // Di luar produksi (dev) sandi contoh boleh, supaya `cp .env.example .env` langsung jalan.
    await buatAdminAwal({ username, sandi: "ganti-sandi-admin" }, false);
    await masuk({ username, sandi: "ganti-sandi-admin", ip: "10.0.0.4" });
    // Admin yang sudah ada tidak diperiksa lagi: sandi di konfigurasi tidak dipakai setelah start pertama.
    await buatAdminAwal({ username, sandi: "x" }, true);
  });

  it("start kedua tidak membuat ulang dan tidak menimpa sandinya walau sandi di konfigurasi berbeda", async () => {
    const admin = await adminBaru("sandi-yang-dipakai");
    // Start kedua: konfigurasi kini berisi sandi lain (mis. sandi sudah diganti lewat aplikasi).
    await buatAdminAwal({ username: admin.username.toUpperCase(), sandi: "sandi-dari-konfigurasi" });

    await masuk({ ...admin, ip: "10.0.0.3" });
    await assert.rejects(masuk({ username: admin.username, sandi: "sandi-dari-konfigurasi", ip: "10.0.0.3" }), {
      status: 401,
    });
  });

  it("dibuat saat start dari username dan sandi di konfigurasi", async () => {
    await bootstrapDatabase();
    const token = await masuk({ ...config.adminAwal, ip: "10.0.0.3" });
    assert.equal((await penggunaDariToken(token))?.peran, "adminSistem");
  });
});
