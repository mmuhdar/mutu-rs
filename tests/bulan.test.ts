import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bulanBerjalan, bulanDariAlamat, bulanLalu } from "@/lib/bulan";

// Tes dijalankan dengan zona waktu Asia/Makassar (WITA, UTC+8), lihat scripts/test.sh.
describe("bulan berjalan", () => {
  it("sudah termasuk November pada 1 November 00.30 WITA (31 Oktober 16.30 UTC)", () => {
    assert.equal(bulanBerjalan(new Date("2026-10-31T16:30:00Z")), "2026-11");
  });

  it("masih Oktober pada 31 Oktober 23.59 WITA", () => {
    assert.equal(bulanBerjalan(new Date("2026-10-31T15:59:00Z")), "2026-10");
  });

  it("sudah Januari tahun berikutnya pada 1 Januari 00.00 WITA", () => {
    assert.equal(bulanBerjalan(new Date("2026-12-31T16:00:00Z")), "2027-01");
  });
});

describe("bulan lalu", () => {
  it("Desember tahun sebelumnya pada 1 Januari 00.00 WITA, menurut zona waktu konfigurasi", () => {
    assert.equal(bulanLalu(new Date("2026-12-31T16:00:00Z")), "2026-12");
    assert.equal(bulanLalu(new Date("2027-01-15T00:00:00Z")), "2026-12");
  });

  it("bulan sebelumnya di tahun yang sama", () => {
    assert.equal(bulanLalu(new Date("2026-10-31T15:59:00Z")), "2026-09");
  });
});

describe("bulan dari alamat halaman (?bulan=)", () => {
  const sekarang = new Date("2026-10-15T12:00:00+08:00");

  it("bulan berjalan dan sebelumnya dipakai; kosong = bulan bawaan tanpa pemberitahuan", () => {
    assert.deepEqual(bulanDariAlamat("2026-10", sekarang), { bulan: "2026-10" });
    assert.deepEqual(bulanDariAlamat("2025-03", sekarang), { bulan: "2025-03" });
    assert.deepEqual(bulanDariAlamat(undefined, sekarang), {});
    assert.deepEqual(bulanDariAlamat("", sekarang), {});
  });

  it("bulan setelah bulan berjalan dan bulan tidak valid diganti bulan bawaan dengan pemberitahuan", () => {
    assert.deepEqual(bulanDariAlamat("2026-12", sekarang), {
      pemberitahuan: "Desember 2026 belum berjalan, jadi yang ditampilkan bulan bawaan.",
    });
    for (const nilai of ["abc", "2026-13", ["2026-01", "2026-02"]]) {
      assert.deepEqual(bulanDariAlamat(nilai, sekarang), {
        pemberitahuan: "Bulan pada alamat tidak valid, jadi yang ditampilkan bulan bawaan.",
      });
    }
  });
});
