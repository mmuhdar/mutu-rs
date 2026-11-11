import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keCsv } from "@/lib/csv";

describe("CSV untuk Excel berbahasa Indonesia", () => {
  it("diawali BOM, dipisah titik koma, koma desimal tanpa pemisah ribuan, baris CRLF, kosong untuk null", () => {
    assert.equal(
      keCsv([
        ["Kode", "Capaian", "D"],
        ["INM-01", 85.9712, 12500],
        ["INM-02", null, 0],
      ]),
      "﻿Kode;Capaian;D\r\nINM-01;85,97;12500\r\nINM-02;;0\r\n",
    );
  });

  it("teks berisi pemisah, kutip, atau baris baru dikutip; kutip digandakan", () => {
    assert.equal(keCsv([["A;B", 'Kata "kutip"', "dua\nbaris"]]), '﻿"A;B";"Kata ""kutip""";"dua\nbaris"\r\n');
  });

  it("teks yang dibaca Excel sebagai rumus diberi awalan petik", () => {
    assert.equal(keCsv([["=1+1", "+62", "-x", "@SUM(A1)", "Biasa"]]), "﻿'=1+1;'+62;'-x;'@SUM(A1);Biasa\r\n");
  });
});
