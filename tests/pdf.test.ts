import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { teksPdf } from "@/lib/pdf";

describe("teks PDF", () => {
  it("simbol di luar WinAnsi diganti padanannya, emoji dan aksara lain menjadi tanda tanya, baris baru tetap", () => {
    assert.equal(teksPdf("Target ≥ 85%, “kutip” — é × 2\r\nlalu ≤ 3 → 😀 中"), "Target >= 85%, “kutip” — é × 2\nlalu <= 3 -> ? ?");
  });
});
