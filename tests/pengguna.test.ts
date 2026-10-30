import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { LABEL_PERAN, PERAN } from "@/lib/peran";
import { gantiSandi, masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import { aturAktifPengguna, daftarPengguna, resetSandi, tambahPengguna, ubahPengguna } from "@/modules/pengguna/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, SANDI, unik, unitBaru } from "./bantuan";

let admin: Pengguna;
before(async () => {
  admin = await adminSistem();
});

const unitDari = async (id: string) => (await daftarPengguna(admin)).find((p) => p.id === id)?.unit.map((u) => u.id);

describe("kelola Pengguna", () => {
  it("Admin Sistem membuat Petugas Input Data untuk dua Unit, lalu Petugas itu masuk dengan peran dan Unit-nya", async () => {
    const icu = await unitBaru("ICU");
    const hcu = await unitBaru("HCU");
    const username = unik("perawat");
    const baru = await tambahPengguna(admin, {
      username: ` ${username} `,
      nama: " Ns. Sari ",
      sandi: SANDI,
      peran: "petugasInputData",
      unitIds: [icu.id, hcu.id],
    });

    const diDaftar = (await daftarPengguna(admin)).find((p) => p.id === baru.id);
    assert.deepEqual(diDaftar, {
      id: baru.id,
      username,
      nama: "Ns. Sari",
      peran: "petugasInputData",
      aktif: true,
      unit: [icu, hcu].sort((a, b) => a.nama.localeCompare(b.nama)),
    });

    const petugas = await penggunaDariToken(await masuk({ username, sandi: SANDI, ip: "10.4.0.2" }));
    assert.equal(petugas?.peran, "petugasInputData");
    assert.deepEqual(petugas?.unitIds.toSorted(), [icu.id, hcu.id].sort());
  });

  it("Petugas Input Data dan Kepala Unit wajib punya minimal satu Unit aktif", async () => {
    const icu = await unitBaru("ICU");
    const tutup = await unitBaru("Ruang Tutup");
    await aturAktifUnit(admin, tutup.id, false);
    const data = { nama: "Pegawai", sandi: SANDI };

    for (const peran of ["petugasInputData", "kepalaUnit"]) {
      await assert.rejects(tambahPengguna(admin, { ...data, username: unik("u"), peran, unitIds: [] }), {
        status: 400,
        message: /wajib terkait ke minimal satu Unit/,
      });
      for (const unitIds of [[icu.id, tutup.id], [randomUUID()], ["bukan-uuid"]]) {
        await assert.rejects(tambahPengguna(admin, { ...data, username: unik("u"), peran, unitIds }), {
          status: 400,
          message: "Pilih hanya Unit yang aktif.",
        });
      }
    }
  });

  it("peran selain Petugas Input Data dan Kepala Unit tidak punya Unit, walau Unit ikut terkirim", async () => {
    const icu = await unitBaru("ICU");
    for (const peran of ["komiteMutu", "direktur", "adminSistem"]) {
      const baru = await tambahPengguna(admin, { username: unik(peran), nama: peran, sandi: SANDI, peran, unitIds: [icu.id] });
      assert.deepEqual(await unitDari(baru.id), []);
    }
  });

  it("username dipakai ulang (tanpa membedakan huruf besar/kecil), peran tak dikenal, dan sandi pendek ditolak", async () => {
    const username = unik("Sari");
    const data = { nama: "Sari", sandi: SANDI, peran: "direktur", unitIds: [] };
    await tambahPengguna(admin, { ...data, username });
    await assert.rejects(tambahPengguna(admin, { ...data, username: username.toLowerCase() }), {
      status: 409,
      message: `Username "${username.toLowerCase()}" sudah dipakai.`,
    });
    await assert.rejects(tambahPengguna(admin, { ...data, username: unik("x"), peran: "superadmin" }), { status: 400 });
    await assert.rejects(tambahPengguna(admin, { ...data, username: unik("x"), sandi: "1234567" }), {
      status: 400,
      message: "Sandi minimal 8 karakter.",
    });
  });

  it("Admin Sistem mengubah nama, peran, dan Unit; perubahan berlaku pada sesi yang sedang berjalan", async () => {
    const [icu, hcu] = [await unitBaru("ICU"), await unitBaru("HCU")];
    const username = unik("ners");
    const { id } = await tambahPengguna(admin, {
      username,
      nama: "Ners",
      sandi: SANDI,
      peran: "petugasInputData",
      unitIds: [icu.id],
    });
    const token = await masuk({ username, sandi: SANDI, ip: "10.4.0.3" });

    await ubahPengguna(admin, id, { nama: "Ners Kepala", peran: "kepalaUnit", unitIds: [hcu.id] });
    assert.deepEqual(await unitDari(id), [hcu.id]);
    const sesi = await penggunaDariToken(token);
    assert.deepEqual([sesi?.nama, sesi?.peran, sesi?.unitIds], ["Ners Kepala", "kepalaUnit", [hcu.id]]);

    await ubahPengguna(admin, id, { nama: "Ners Kepala", peran: "komiteMutu", unitIds: [hcu.id] });
    assert.deepEqual(await unitDari(id), []);
    assert.deepEqual((await penggunaDariToken(token))?.unitIds, []);

    await assert.rejects(ubahPengguna(admin, id, { nama: "Ners", peran: "kepalaUnit", unitIds: [] }), { status: 400 });
    await assert.rejects(ubahPengguna(admin, randomUUID(), { nama: "X", peran: "direktur", unitIds: [] }), {
      status: 404,
    });
  });

  it("Pengguna nonaktif tidak bisa masuk dan sesinya yang berjalan ditolak; setelah diaktifkan kembali bisa masuk lagi", async () => {
    const username = unik("direktur");
    const { id } = await tambahPengguna(admin, { username, nama: "dr. Budi", sandi: SANDI, peran: "direktur", unitIds: [] });
    const token = await masuk({ username, sandi: SANDI, ip: "10.4.0.4" });

    await aturAktifPengguna(admin, id, false);
    assert.equal(await penggunaDariToken(token), null);
    await assert.rejects(masuk({ username, sandi: SANDI, ip: "10.4.0.4" }), {
      status: 403,
      message: "Akun Anda nonaktif. Hubungi Admin Sistem.",
    });
    assert.equal((await daftarPengguna(admin)).find((p) => p.id === id)?.aktif, false);

    await aturAktifPengguna(admin, id, true);
    assert.equal((await penggunaDariToken(await masuk({ username, sandi: SANDI, ip: "10.4.0.4" })))?.nama, "dr. Budi");
  });

  it("Admin Sistem aktif yang terakhir tidak bisa dinonaktifkan atau diganti perannya", async () => {
    // Jadikan satu Admin Sistem baru sebagai satu-satunya yang aktif, lalu pulihkan Admin lain di akhir tes.
    const username = unik("admin");
    const { id } = await tambahPengguna(admin, { username, nama: "Admin", sandi: SANDI, peran: "adminSistem", unitIds: [] });
    const terakhir = (await penggunaDariToken(await masuk({ username, sandi: SANDI, ip: "10.4.0.5" })))!;
    const adminLain = (await daftarPengguna(admin)).filter((p) => p.peran === "adminSistem" && p.aktif && p.id !== id);
    try {
      for (const p of adminLain) await aturAktifPengguna(terakhir, p.id, false);

      const ditolak = { status: 409, message: /Admin Sistem aktif yang terakhir/ };
      await assert.rejects(aturAktifPengguna(terakhir, id, false), ditolak);
      await assert.rejects(ubahPengguna(terakhir, id, { nama: "Admin", peran: "komiteMutu", unitIds: [] }), ditolak);
      await ubahPengguna(terakhir, id, { nama: "Admin Baru", peran: "adminSistem", unitIds: [] });
    } finally {
      for (const p of adminLain) await aturAktifPengguna(terakhir, p.id, true);
    }

    // Selama masih ada Admin Sistem aktif lain, Admin boleh dinonaktifkan atau diganti perannya.
    await ubahPengguna(admin, id, { nama: "Admin", peran: "komiteMutu", unitIds: [] });
    await aturAktifPengguna(admin, id, false);
  });
});

describe("sandi", () => {
  /** Pengguna baru beserta dua sesinya (mis. di komputer dan di HP). */
  async function penggunaBaru() {
    const username = unik("komite");
    const { id } = await tambahPengguna(admin, { username, nama: "Komite", sandi: SANDI, peran: "komiteMutu", unitIds: [] });
    const sesi = () => masuk({ username, sandi: SANDI, ip: "10.4.1.1" });
    return { id, username, token: [await sesi(), await sesi()] };
  }
  const salah = { status: 401, message: "Username atau sandi salah." };

  it("Admin Sistem mereset sandi: sandi lama tidak berlaku lagi dan sesi Pengguna itu diakhiri", async () => {
    const { id, username, token } = await penggunaBaru();
    await assert.rejects(resetSandi(admin, id, "pendek"), { status: 400, message: "Sandi minimal 8 karakter." });

    await resetSandi(admin, id, "sandi-sementara");
    assert.deepEqual(await Promise.all(token.map((t) => penggunaDariToken(t))), [null, null]);
    await assert.rejects(masuk({ username, sandi: SANDI, ip: "10.4.1.2" }), salah);
    await masuk({ username, sandi: "sandi-sementara", ip: "10.4.1.2" });

    await assert.rejects(resetSandi(admin, randomUUID(), "sandi-sementara"), { status: 404 });
  });

  it("Pengguna mengganti sandinya sendiri dengan sandi lama; sesi lain diakhiri, sesi yang dipakai tetap", async () => {
    const { username, token } = await penggunaBaru();
    const aktor = await penggunaDariToken(token[0]);

    await assert.rejects(gantiSandi(aktor, { sandiLama: "sandi-keliru", sandiBaru: "sandi-baru-1" }), {
      status: 400,
      message: "Sandi lama salah.",
    });
    await assert.rejects(gantiSandi(aktor, { sandiLama: SANDI, sandiBaru: "1234567" }), {
      status: 400,
      message: "Sandi minimal 8 karakter.",
    });
    await masuk({ username, sandi: SANDI, ip: "10.4.1.3" });

    await gantiSandi(aktor, { sandiLama: SANDI, sandiBaru: "sandi-baru-1" });
    assert.equal((await penggunaDariToken(token[0]))?.username, username);
    assert.equal(await penggunaDariToken(token[1]), null);
    await assert.rejects(masuk({ username, sandi: SANDI, ip: "10.4.1.3" }), salah);
    await masuk({ username, sandi: "sandi-baru-1", ip: "10.4.1.3" });

    await assert.rejects(gantiSandi(null, { sandiLama: SANDI, sandiBaru: "sandi-baru-1" }), { status: 401 });
  });
});

describe("hak kelola Pengguna", () => {
  for (const peran of PERAN.filter((p) => p !== "adminSistem")) {
    it(`${LABEL_PERAN[peran]} ditolak melihat, membuat, mengubah, mereset sandi, dan menonaktifkan Pengguna`, async () => {
      const unitIds = [(await unitBaru("IGD")).id];
      const username = unik(peran);
      await tambahPengguna(admin, { username, nama: peran, sandi: SANDI, peran, unitIds });
      const aktor = await penggunaDariToken(await masuk({ username, sandi: SANDI, ip: "10.4.2.1" }));
      const target = await tambahPengguna(admin, { username: unik("t"), nama: "T", sandi: SANDI, peran: "direktur", unitIds: [] });
      const ditolak = { status: 403, message: "Hanya Admin Sistem yang boleh mengelola Pengguna." };

      await assert.rejects(daftarPengguna(aktor), ditolak);
      await assert.rejects(tambahPengguna(aktor, { username: unik("x"), nama: "X", sandi: SANDI, peran: "adminSistem", unitIds: [] }), ditolak);
      await assert.rejects(ubahPengguna(aktor, aktor!.id, { nama: "X", peran: "adminSistem", unitIds: [] }), ditolak);
      await assert.rejects(resetSandi(aktor, target.id, "sandi-tebakan"), ditolak);
      await assert.rejects(aturAktifPengguna(aktor, target.id, false), ditolak);

      const sesudah = (await daftarPengguna(admin)).filter((p) => p.id === aktor!.id || p.id === target.id);
      assert.deepEqual(sesudah.map((p) => [p.peran, p.aktif]).sort(), [[peran, true], ["direktur", true]].sort());
    });
  }

  it("pemanggilan tanpa Pengguna ditolak", async () => {
    await assert.rejects(daftarPengguna(null), { status: 401 });
    await assert.rejects(tambahPengguna(null, { username: unik("x"), nama: "X", sandi: SANDI, peran: "direktur", unitIds: [] }), {
      status: 401,
    });
  });
});
