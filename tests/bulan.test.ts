import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bulanBerjalan } from "@/lib/bulan";

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
