import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import type { StatusTindakLanjut } from "@/lib/perbaikan";
import type { Pengguna } from "@/modules/auth/service";
import { aturAktifIndikator } from "@/modules/indikator/service";
import {
  ambilAnalisis,
  daftarTindakLanjut,
  simpanAnalisis,
  tambahTindakLanjut,
  ubahTindakLanjut,
  type IsianTindakLanjut,
  type SaringanStatusTindakLanjut,
} from "@/modules/perbaikan/service";

import { indikatorBaru, komiteMutu, sebagai, unitPelapor } from "./bantuan";

let komite: Pengguna;
before(async () => {
  komite = await komiteMutu();
});

const isian = (ubahan: Partial<IsianTindakLanjut> = {}): IsianTindakLanjut => ({
  tindakan: "Sosialisasi 5 momen kebersihan tangan di setiap shift",
  pic: "Kepala Ruang ICU",
  tenggat: "2026-04-30",
  ...ubahan,
});

/** IMP-RS baru dengan satu Unit Pelapor, plus Analisis Lingkup Unit (bawaan) atau RS pada bulan itu. */
async function analisisBaru(bulan = "2026-03", lingkup: "unit" | "rs" = "unit") {
  const indikatorId = await indikatorBaru();
  const unit = await unitPelapor(indikatorId, "ICU");
  const unitId = lingkup === "unit" ? unit.id : null;
  const { id } = await simpanAnalisis(komite, { indikatorId, unitId, bulan, teks: "Analisis" });
  return { id, indikatorId, unit, unitId };
}

/** Ubah status; tindakan, PIC, dan tenggat dikirim ulang apa adanya (`asal`, bawaan `isian()`). */
const ubahStatus = (aktor: Pengguna | null, id: string, status: StatusTindakLanjut, catatan = "", asal = isian()) =>
  ubahTindakLanjut(aktor, id, { ...asal, status, catatan });

describe("menambah dan mengubah Tindak Lanjut", () => {
  it("penulis Analisis menambahkan Tindak Lanjut; status awalnya Direncanakan", async () => {
    const a = await analisisBaru();
    await tambahTindakLanjut(komite, a.id, isian({ tindakan: "  Audit kepatuhan mingguan  " }));
    const [tl] = (await ambilAnalisis(komite, { indikatorId: a.indikatorId, unitId: a.unitId, bulan: "2026-03" })).tindakLanjut;
    assert.deepEqual(
      [tl.tindakan, tl.pic, tl.tenggat, tl.status, tl.diubahOleh],
      ["Audit kepatuhan mingguan", "Kepala Ruang ICU", "2026-04-30", "direncanakan", komite.nama],
    );
  });

  it("Tindak Lanjut hanya untuk Analisis yang sudah ada", async () => {
    await assert.rejects(tambahTindakLanjut(komite, randomUUID(), isian()), { status: 404 });
    await assert.rejects(tambahTindakLanjut(komite, "bukan-uuid", isian()), { status: 404 });
    await assert.rejects(ubahStatus(komite, randomUUID(), "berjalan"), { status: 404 });
  });

  it("tindakan dan PIC wajib; tenggat harus tanggal yang valid", async () => {
    const a = await analisisBaru();
    await assert.rejects(tambahTindakLanjut(komite, a.id, isian({ tindakan: " " })), { status: 400, message: /Tindakan/ });
    await assert.rejects(tambahTindakLanjut(komite, a.id, isian({ pic: "" })), { status: 400, message: /PIC/ });
    for (const tenggat of ["", "2026-02-30", "30/04/2026"]) {
      await assert.rejects(tambahTindakLanjut(komite, a.id, isian({ tenggat })), { status: 400, message: /Tenggat/ });
    }
  });

  it("catatan hasil wajib saat Selesai dan alasan wajib saat Dibatalkan; status lain ditolak", async () => {
    const a = await analisisBaru();
    const { id } = await tambahTindakLanjut(komite, a.id, isian());
    await ubahStatus(komite, id, "berjalan");
    await assert.rejects(ubahStatus(komite, id, "selesai", "  "), { status: 400, message: /hasil/ });
    await assert.rejects(ubahStatus(komite, id, "dibatalkan"), { status: 400, message: /alasan/i });
    await assert.rejects(ubahStatus(komite, id, "dihapus" as StatusTindakLanjut), { status: 400 });
    await ubahStatus(komite, id, "selesai", "Kepatuhan naik menjadi 90%.");
    // Status boleh diubah lagi, mis. dibuka kembali karena ternyata belum tuntas.
    await ubahStatus(komite, id, "berjalan");
    const [tl] = (await ambilAnalisis(komite, { indikatorId: a.indikatorId, unitId: a.unitId, bulan: "2026-03" })).tindakLanjut;
    assert.equal(tl.status, "berjalan");
  });

  it("Tindak Lanjut tetap bisa diubah dan ditutup walau Indikator-nya kini nonaktif", async () => {
    const a = await analisisBaru();
    const { id } = await tambahTindakLanjut(komite, a.id, isian());
    await aturAktifIndikator(komite, a.indikatorId, false);
    await ubahStatus(komite, id, "dibatalkan", "Indikator diganti");
    const [tl] = (await ambilAnalisis(komite, { indikatorId: a.indikatorId, unitId: a.unitId, bulan: "2026-03" })).tindakLanjut;
    assert.equal(tl.status, "dibatalkan");
  });

  it("hak tulis mengikuti Lingkup Analisis-nya", async () => {
    const unitLingkup = await analisisBaru();
    const rs = await analisisBaru("2026-03", "rs");
    const kepala = await sebagai("kepalaUnit", [unitLingkup.unit.id]);
    const { id } = await tambahTindakLanjut(kepala, unitLingkup.id, isian());
    await ubahStatus(kepala, id, "berjalan");
    await assert.rejects(tambahTindakLanjut(kepala, rs.id, isian()), { status: 403 });
    for (const aktor of [await sebagai("petugasInputData", [unitLingkup.unit.id]), await sebagai("direktur")]) {
      await assert.rejects(tambahTindakLanjut(aktor, unitLingkup.id, isian()), { status: 403 });
      await assert.rejects(ubahStatus(aktor, id, "selesai", "x"), { status: 403 });
    }
    await assert.rejects(tambahTindakLanjut(await sebagai("kepalaUnit"), unitLingkup.id, isian()), { status: 403 });
    await assert.rejects(tambahTindakLanjut(null, unitLingkup.id, isian()), { status: 401 });
  });
});

describe("daftar Tindak Lanjut", () => {
  it("lewat tenggat bila tenggat sebelum hari ini menurut zona waktu konfigurasi dan belum Selesai/Dibatalkan", async () => {
    const a = await analisisBaru();
    const { id } = await tambahTindakLanjut(komite, a.id, isian({ tenggat: "2026-03-10" }));
    const lewat = async (sekarang: Date) =>
      (await daftarTindakLanjut(komite, { lingkup: a.unitId }, sekarang)).find((t) => t.id === id)?.lewatTenggat;
    // 10 Maret 23.30 WITA: tenggat hari ini, belum lewat. 11 Maret 00.30 WITA: lewat.
    assert.equal(await lewat(new Date("2026-03-10T15:30:00Z")), false);
    assert.equal(await lewat(new Date("2026-03-10T16:30:00Z")), true);
    await ubahStatus(komite, id, "selesai", "Selesai");
    assert.equal(
      (await daftarTindakLanjut(komite, { lingkup: a.unitId, status: "semua" }, new Date("2026-03-20T00:00:00Z")))[0]
        .lewatTenggat,
      false,
    );
  });

  it("bawaan hanya yang Direncanakan/Berjalan, lewat tenggat paling atas lalu urut tenggat; bisa disaring status", async () => {
    const a = await analisisBaru();
    const tambah = async (tindakan: string, tenggat: string) =>
      (await tambahTindakLanjut(komite, a.id, isian({ tindakan, tenggat }))).id;
    const selesai = await tambah("selesai paling awal", "2026-03-01");
    await ubahStatus(komite, selesai, "selesai", "Tuntas", isian({ tindakan: "selesai paling awal", tenggat: "2026-03-01" }));
    await tambah("akhir April", "2026-04-30");
    await tambah("lewat 2", "2026-03-12");
    await tambah("lewat 1", "2026-03-05");
    const batal = await tambah("dibatalkan", "2026-03-02");
    await ubahStatus(komite, batal, "dibatalkan", "Tidak relevan lagi", isian({ tindakan: "dibatalkan", tenggat: "2026-03-02" }));
    const sekarang = new Date("2026-03-15T04:00:00Z");
    const urutan = async (status?: SaringanStatusTindakLanjut) =>
      (await daftarTindakLanjut(komite, { lingkup: a.unitId, status }, sekarang)).map((t) => t.tindakan);

    assert.deepEqual(await urutan(), ["lewat 1", "lewat 2", "akhir April"]);
    assert.deepEqual(await urutan("semua"), ["lewat 1", "lewat 2", "selesai paling awal", "dibatalkan", "akhir April"]);
    assert.deepEqual(await urutan("dibatalkan"), ["dibatalkan"]);
    await assert.rejects(urutan("hilang" as "semua"), { status: 400 });
  });

  it("baris daftar membawa Indikator, Lingkup, dan bulan Analisis-nya", async () => {
    const a = await analisisBaru("2026-02", "rs");
    const { id } = await tambahTindakLanjut(komite, a.id, isian());
    const t = (await daftarTindakLanjut(komite, { lingkup: null })).find((t) => t.id === id);
    assert.deepEqual([t?.indikator.id, t?.unit, t?.bulan], [a.indikatorId, null, "2026-02"]);
  });

  it("Petugas Input Data dan Kepala Unit hanya melihat Tindak Lanjut Lingkup Unit-nya", async () => {
    const unitLingkup = await analisisBaru();
    const rs = await analisisBaru("2026-03", "rs");
    const milikUnit = (await tambahTindakLanjut(komite, unitLingkup.id, isian())).id;
    const milikRs = (await tambahTindakLanjut(komite, rs.id, isian())).id;
    for (const aktor of [
      await sebagai("petugasInputData", [unitLingkup.unit.id]),
      await sebagai("kepalaUnit", [unitLingkup.unit.id]),
    ]) {
      const ids = (await daftarTindakLanjut(aktor, {})).map((t) => t.id);
      assert.deepEqual(ids, [milikUnit]);
      await assert.rejects(daftarTindakLanjut(aktor, { lingkup: null }), { status: 403 });
    }
    const direktur = (await daftarTindakLanjut(await sebagai("direktur"), {})).map((t) => t.id);
    assert.ok(direktur.includes(milikUnit) && direktur.includes(milikRs));
  });
});

describe("Tindak Lanjut di halaman Analisis", () => {
  it("menampilkan Tindak Lanjut terbuka dari bulan sebelumnya untuk Indikator dan Lingkup yang sama", async () => {
    const feb = await analisisBaru("2026-02");
    const kunci = { indikatorId: feb.indikatorId, unitId: feb.unitId };
    const terbuka = (await tambahTindakLanjut(komite, feb.id, isian({ tindakan: "masih berjalan" }))).id;
    await ubahStatus(komite, terbuka, "berjalan", "", isian({ tindakan: "masih berjalan" }));
    const tuntas = (await tambahTindakLanjut(komite, feb.id, isian({ tindakan: "tuntas" }))).id;
    await ubahStatus(komite, tuntas, "selesai", "Tuntas");
    const mar = await simpanAnalisis(komite, { ...kunci, bulan: "2026-03", teks: "Maret" });
    await tambahTindakLanjut(komite, mar.id, isian({ tindakan: "milik Maret" }));
    // Lingkup RS untuk Indikator yang sama tidak ikut.
    const rsFeb = await simpanAnalisis(komite, { ...kunci, unitId: null, bulan: "2026-02", teks: "RS" });
    await tambahTindakLanjut(komite, rsFeb.id, isian({ tindakan: "milik RS" }));

    const a = await ambilAnalisis(komite, { ...kunci, bulan: "2026-03" });
    assert.deepEqual(a.tindakLanjut.map((t) => t.tindakan), ["milik Maret"]);
    assert.deepEqual(a.tindakLanjutSebelumnya.map((t) => [t.tindakan, t.bulan]), [["masih berjalan", "2026-02"]]);
    // Bulan sebelumnya tidak menampilkan Tindak Lanjut bulan sesudahnya.
    const f = await ambilAnalisis(komite, { ...kunci, bulan: "2026-02" });
    assert.deepEqual(f.tindakLanjutSebelumnya, []);
  });
});
