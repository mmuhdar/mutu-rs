import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { jenisBukti, labelUkuran, MAKS_BUKTI, MAKS_UKURAN_BUKTI, namaBerkas } from "@/lib/bukti";
import type { Pengguna } from "@/modules/auth/service";
import {
  ajukanPengukuran,
  ambilBerkasBukti,
  ambilIsian,
  ambilPengukuran,
  hapusBukti,
  kembalikanPengukuran,
  simpanPengukuran,
  tambahBukti,
} from "@/modules/pengukuran/service";

import { indikatorBaru, komiteMutu, sebagai, unitPelapor } from "./bantuan";

const PDF = Buffer.from("%PDF-1.4\n% bukti observasi\n");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

describe("aturan berkas Bukti", () => {
  it("jenis dari isi berkas, bukan dari nama", () => {
    assert.equal(jenisBukti(PDF), "application/pdf");
    assert.equal(jenisBukti(PNG), "image/png");
    assert.equal(jenisBukti(JPG), "image/jpeg");
    assert.equal(jenisBukti(Buffer.from("bukan pdf")), null);
    assert.equal(jenisBukti(new Uint8Array()), null);
  });

  it("nama berkas dirapikan dan ukuran ditulis dalam KB atau MB", () => {
    assert.equal(namaBerkas("C:\\Users\\ns\\Foto  Maret\u0007.jpg"), "Foto Maret.jpg");
    assert.equal(namaBerkas("../../"), "bukti");
    assert.equal(namaBerkas("x".repeat(300)).length, 200);
    assert.equal(labelUkuran(820 * 1024), "820 KB");
    assert.equal(labelUkuran(2.4 * 1024 * 1024), "2,4 MB");
  });
});

let petugas: Pengguna;
let kepala: Pengguna;
let indikatorId: string;
let unitId: string;
before(async () => {
  indikatorId = await indikatorBaru();
  unitId = (await unitPelapor(indikatorId, "ICU")).id;
  [petugas, kepala] = [await sebagai("petugasInputData", [unitId]), await sebagai("kepalaUnit", [unitId])];
});

/** Pengukuran Draf baru pada bulan tertentu milik Unit tes. */
const draf = async (bulan: string) => (await simpanPengukuran(petugas, { indikatorId, unitId, bulan, n: 8, d: 10 })).id;

describe("melampirkan Bukti", () => {
  it("pengisi Unit sendiri melampirkan dan menghapus Bukti Draf; detail dan isian membawa daftarnya", async () => {
    const id = await draf("2026-02");
    const bukti = await tambahBukti(petugas, id, { nama: "Observasi Maret.pdf", isi: PDF });
    // Nama .pdf tetapi isinya PNG: diterima sebagai PNG.
    await tambahBukti(kepala, id, { nama: "foto.pdf", isi: PNG });

    const detail = await ambilPengukuran(petugas, id);
    assert.deepEqual(
      detail.bukti.map((b) => [b.nama, b.jenis, b.ukuran, b.diunggahOleh]),
      [
        ["Observasi Maret.pdf", "application/pdf", PDF.length, petugas.nama],
        ["foto.pdf", "image/png", PNG.length, kepala.nama],
      ],
    );
    const isian = await ambilIsian(petugas, { indikatorId, unitId, bulan: "2026-02" });
    assert.equal(isian.bukti.length, 2);

    await hapusBukti(petugas, bukti);
    assert.deepEqual((await ambilPengukuran(petugas, id)).bukti.map((b) => b.nama), ["foto.pdf"]);
  });

  it("berkas bukan PDF/JPG/PNG, kosong, atau lebih dari 10 MB ditolak; paling banyak 5 berkas", async () => {
    const id = await draf("2026-03");
    await assert.rejects(tambahBukti(petugas, id, { nama: "palsu.pdf", isi: Buffer.from("halo") }), { status: 400, message: /palsu\.pdf/ });
    await assert.rejects(tambahBukti(petugas, id, { nama: "kosong.pdf", isi: new Uint8Array() }), { status: 400 });
    const besar = Buffer.concat([PDF, Buffer.alloc(MAKS_UKURAN_BUKTI)]);
    await assert.rejects(tambahBukti(petugas, id, { nama: "besar.pdf", isi: besar }), { status: 400, message: /10 MB/ });

    for (let i = 0; i < MAKS_BUKTI; i++) await tambahBukti(petugas, id, { nama: `b${i}.jpg`, isi: JPG });
    await assert.rejects(tambahBukti(petugas, id, { nama: "keenam.jpg", isi: JPG }), { status: 400, message: /5 berkas/ });
  });

  it("hanya pengisi Unit itu; Komite Mutu dan Unit lain ditolak", async () => {
    const id = await draf("2026-04");
    const lain = await sebagai("petugasInputData");
    await assert.rejects(tambahBukti(lain, id, { nama: "a.pdf", isi: PDF }), { status: 403 });
    await assert.rejects(tambahBukti(await komiteMutu(), id, { nama: "a.pdf", isi: PDF }), { status: 403 });
    const bukti = await tambahBukti(petugas, id, { nama: "a.pdf", isi: PDF });
    await assert.rejects(hapusBukti(lain, bukti), { status: 403 });
    await assert.rejects(tambahBukti(petugas, "bukan-uuid", { nama: "a.pdf", isi: PDF }), { status: 404 });
    await assert.rejects(hapusBukti(petugas, "bukan-uuid"), { status: 404 });
  });

  it("Bukti terkunci setelah Diajukan dan bisa diubah lagi setelah dikembalikan", async () => {
    const bulan = "2026-05";
    const id = await draf(bulan);
    const bukti = await tambahBukti(petugas, id, { nama: "a.pdf", isi: PDF });
    await ajukanPengukuran(petugas, { indikatorId, unitId, bulan, n: 8, d: 10 });
    await assert.rejects(tambahBukti(petugas, id, { nama: "b.pdf", isi: PDF }), { status: 409 });
    await assert.rejects(hapusBukti(petugas, bukti), { status: 409 });

    await kembalikanPengukuran(kepala, id, "Bukti observasi belum lengkap.");
    await tambahBukti(petugas, id, { nama: "b.pdf", isi: PDF });
    await hapusBukti(petugas, bukti);
    assert.deepEqual((await ambilPengukuran(kepala, id)).bukti.map((b) => b.nama), ["b.pdf"]);
  });
});

describe("membuka berkas Bukti", () => {
  it("Unit itu, Komite Mutu, dan Admin Sistem membuka isinya; Unit lain dan Direktur ditolak", async () => {
    const id = await draf("2026-06");
    const bukti = await tambahBukti(petugas, id, { nama: "Observasi.pdf", isi: PDF });

    const berkas = await ambilBerkasBukti(kepala, bukti);
    assert.deepEqual([berkas.nama, berkas.jenis, Buffer.from(berkas.isi).equals(PDF)], ["Observasi.pdf", "application/pdf", true]);
    await ambilBerkasBukti(await komiteMutu(), bukti);
    await assert.rejects(ambilBerkasBukti(await sebagai("petugasInputData"), bukti), { status: 403 });
    await assert.rejects(ambilBerkasBukti(await sebagai("direktur"), bukti), { status: 403 });
    await assert.rejects(ambilBerkasBukti(petugas, "bukan-uuid"), { status: 404 });
  });
});
