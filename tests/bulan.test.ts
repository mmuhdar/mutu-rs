import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bulanBerjalan,
  bulanDariAlamat,
  bulanLalu,
  bulanTriwulan,
  hariIni,
  labelTriwulan,
  salam,
  tambahHari,
  tanggalValid,
  triwulanDari,
  triwulanLalu,
  triwulanValid,
  wajibTriwulanSelesai,
} from "@/lib/bulan";

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

describe("hari ini", () => {
  it("mengikuti zona waktu konfigurasi: 11 Maret 00.30 WITA masih 10 Maret UTC", () => {
    assert.equal(hariIni(new Date("2026-03-10T16:30:00Z")), "2026-03-11");
    assert.equal(hariIni(new Date("2026-03-10T15:59:00Z")), "2026-03-10");
  });

  it("tanggal \"YYYY-MM-DD\" yang valid saja yang diterima", () => {
    assert.equal(tanggalValid("2026-02-28"), true);
    assert.equal(tanggalValid("2028-02-29"), true);
    for (const t of ["2026-02-29", "2026-13-01", "2026-1-05", "05/11/2026", ""]) assert.equal(tanggalValid(t), false, t);
  });
});

describe("salam", () => {
  it("mengikuti jam WITA: pagi mulai 04.00, siang 11.00, sore 15.00, malam 18.00", () => {
    const pada = (jamUtc: string) => salam(new Date(`2026-03-10T${jamUtc}:00Z`));
    assert.equal(pada("19:59"), "Selamat malam"); // 03.59 WITA
    assert.equal(pada("20:00"), "Selamat pagi"); // 04.00 WITA
    assert.equal(pada("03:00"), "Selamat siang"); // 11.00 WITA
    assert.equal(pada("07:00"), "Selamat sore"); // 15.00 WITA
    assert.equal(pada("10:00"), "Selamat malam"); // 18.00 WITA
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

describe("Triwulan", () => {
  it("ditulis \"YYYY-T\" dengan T 1–4 dan berisi tiga bulan kalender", () => {
    assert.deepEqual(bulanTriwulan("2026-1"), ["2026-01", "2026-02", "2026-03"]);
    assert.deepEqual(bulanTriwulan("2026-4"), ["2026-10", "2026-11", "2026-12"]);
    assert.equal(triwulanValid("2026-3"), true);
    for (const t of ["2026-0", "2026-5", "2026-03", "26-1", "2026", ""]) assert.equal(triwulanValid(t), false, t);
  });

  it("bulan masuk Triwulan-nya, dan labelnya memakai angka Romawi", () => {
    assert.deepEqual(["2026-01", "2026-06", "2026-07", "2026-12"].map(triwulanDari), ["2026-1", "2026-2", "2026-3", "2026-4"]);
    assert.equal(labelTriwulan("2026-3"), "Triwulan III 2026");
    assert.equal(labelTriwulan("2027-4"), "Triwulan IV 2027");
  });

  it("Triwulan lalu = Triwulan terakhir yang sudah selesai menurut zona waktu konfigurasi", () => {
    assert.equal(triwulanLalu(new Date("2026-11-11T04:00:00Z")), "2026-3");
    // 1 Oktober 00.30 WITA: TW III baru saja selesai.
    assert.equal(triwulanLalu(new Date("2026-09-30T16:30:00Z")), "2026-3");
    // 30 September 23.59 WITA: TW III belum selesai.
    assert.equal(triwulanLalu(new Date("2026-09-30T15:59:00Z")), "2026-2");
    assert.equal(triwulanLalu(new Date("2027-02-01T04:00:00Z")), "2026-4");
  });

  it("hanya Triwulan yang sudah selesai yang diterima service; yang lain ditolak 400", () => {
    const sekarang = new Date("2026-11-11T04:00:00Z");
    wajibTriwulanSelesai("2026-3", sekarang);
    wajibTriwulanSelesai("2015-1", sekarang);
    assert.throws(() => wajibTriwulanSelesai("2026-4", sekarang), { status: 400, message: "Triwulan IV 2026 belum selesai." });
    assert.throws(() => wajibTriwulanSelesai("2027-1", sekarang), { status: 400 });
    assert.throws(() => wajibTriwulanSelesai("2026-03", sekarang), { status: 400, message: "Triwulan tidak valid." });
  });
});

describe("tambah hari", () => {
  it("melewati akhir bulan, akhir tahun, dan 29 Februari", () => {
    assert.equal(tambahHari("2026-03-10", 7), "2026-03-17");
    assert.equal(tambahHari("2026-12-28", 7), "2027-01-04");
    assert.equal(tambahHari("2028-02-25", 4), "2028-02-29");
    assert.equal(tambahHari("2026-03-01", -1), "2026-02-28");
  });
});
