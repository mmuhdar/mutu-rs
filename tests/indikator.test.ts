import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { bootstrapDatabase } from "@/db/bootstrap";
import { config } from "@/lib/config";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { masuk, penggunaDariToken } from "@/modules/auth/service";
import {
  aturAktifIndikator,
  ambilIndikator,
  daftarIndikator,
  tambahIndikator,
  ubahIndikator,
  type Indikator,
  type IndikatorBaru,
  type IsianIndikator,
} from "@/modules/indikator/service";

async function adminSistem() {
  const pengguna = await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.5.0.1" }));
  assert.ok(pengguna);
  return pengguna;
}

/** Service Pengguna belum ada (tiket 04): aktor peran lain = sesi Admin Sistem dengan peran itu. */
async function sebagai(peran: Peran) {
  return { ...(await adminSistem()), peran };
}

/** IMP baru dengan kode unik per tes (semua tes memakai satu database). */
function impBaru(ubahan: Partial<IndikatorBaru> = {}): IndikatorBaru {
  return {
    kode: `IMP-ICU-${randomUUID().slice(0, 8)}`,
    kelompok: "IMP-Unit",
    nama: "Kelengkapan asesmen awal keperawatan ICU",
    definisiOperasional: "Asesmen awal keperawatan lengkap dalam 24 jam sejak pasien masuk ICU.",
    definisiNumerator: "Jumlah pasien ICU dengan asesmen awal keperawatan lengkap dalam 24 jam",
    definisiDenominator: "Jumlah pasien baru ICU",
    sumberData: "Rekam medis",
    faktor: 100,
    satuan: "%",
    arah: "makinTinggi",
    frekuensi: "bulanan",
    pic: "Kepala Ruang ICU",
    target: { nilai: 92.5, berlakuMulai: "2026-11" },
    ...ubahan,
  };
}

/** Field yang bisa diubah, diambil dari Indikator yang ada. */
const isianDari = (i: Indikator): IsianIndikator => ({
  nama: i.nama,
  definisiOperasional: i.definisiOperasional,
  definisiNumerator: i.definisiNumerator,
  definisiDenominator: i.definisiDenominator,
  sumberData: i.sumberData,
  faktor: i.faktor,
  satuan: i.satuan,
  arah: i.arah,
  frekuensi: i.frekuensi,
  pic: i.pic,
});

describe("13 INM awal", () => {
  it("tersedia sejak start sesuai PMK 30/2022, masing-masing dengan Sumber Data dan satu Target awal", async () => {
    const aktor = await adminSistem();
    const inm = (await daftarIndikator(aktor)).filter((i) => i.kelompok === "INM");
    assert.deepEqual(
      inm.map((i) => i.kode),
      Array.from({ length: 13 }, (_, n) => `INM-${String(n + 1).padStart(2, "0")}`),
    );

    const target: Record<string, number> = {};
    for (const i of inm) {
      assert.ok(i.aktif && i.sumberData && i.definisiOperasional, i.kode);
      const detail = await ambilIndikator(aktor, i.id);
      assert.equal(detail.target.length, 1, i.kode);
      target[i.kode] = detail.target[0].nilai;
    }
    assert.deepEqual(Object.values(target), [85, 100, 100, 80, 80, 5, 80, 100, 80, 80, 100, 80, 76.61]);

    for (const i of inm.slice(0, 12)) {
      assert.deepEqual([i.faktor, i.satuan, i.frekuensi], [100, "%", "bulanan"], i.kode);
    }
    const kode = (k: string) => inm.find((i) => i.kode === k)!;
    assert.deepEqual(
      inm.filter((i) => i.arah === "makinRendah").map((i) => i.kode),
      ["INM-06"],
    );
    assert.match(kode("INM-09").definisiNumerator, /R\/ recipe/);
    assert.match(kode("INM-09").definisiDenominator, /R\/ recipe/);
    assert.match(kode("INM-10").definisiNumerator, /pelayanan oleh PPA/);
    assert.match(kode("INM-10").definisiDenominator, /pelayanan oleh PPA/);
    const inm13 = kode("INM-13");
    assert.deepEqual([inm13.faktor, inm13.satuan, inm13.frekuensi], [25, "indeks", "semesteran"]);
    assert.match(inm13.definisiNumerator, /nilai persepsi/);
    assert.match(inm13.definisiDenominator, /unsur yang terisi/);
  });
});

describe("data awal saat restart", () => {
  it("tidak menimpa perubahan Komite Mutu pada INM dan tidak menggandakan Target", async () => {
    const komite = await sebagai("komiteMutu");
    const asli = (await daftarIndikator(komite)).find((i) => i.kode === "INM-05")!;
    await ubahIndikator(komite, asli.id, {
      ...isianDari(asli),
      nama: "Waktu Tunggu Rawat Jalan (poliklinik)",
      pic: "Kepala Instalasi Rawat Jalan",
    });
    await aturAktifIndikator(komite, asli.id, false);

    await bootstrapDatabase();

    const sesudah = await ambilIndikator(komite, asli.id);
    assert.deepEqual(
      [sesudah.nama, sesudah.pic, sesudah.aktif, sesudah.target.length],
      ["Waktu Tunggu Rawat Jalan (poliklinik)", "Kepala Instalasi Rawat Jalan", false, 1],
    );
    assert.equal((await daftarIndikator(komite)).filter((i) => i.kelompok === "INM").length, 13);

    await ubahIndikator(komite, asli.id, isianDari(asli));
    await aturAktifIndikator(komite, asli.id, true);
  });
});

describe("kelola IMP", () => {
  it("Komite Mutu menambah IMP-Unit beserta Target awalnya, lalu semua peran melihatnya di daftar", async () => {
    const komite = await sebagai("komiteMutu");
    const { target, ...isian } = impBaru();
    const id = await tambahIndikator(komite, { ...isian, kode: ` ${isian.kode} `, target });

    const detail = await ambilIndikator(komite, id);
    assert.deepEqual({ kode: detail.kode, kelompok: detail.kelompok, ...isianDari(detail) }, isian);
    assert.equal(detail.aktif, true);
    assert.deepEqual(detail.target, [{ nilai: 92.5, berlakuMulai: "2026-11" }]);
    assert.ok((await daftarIndikator(await sebagai("petugasInputData"))).some((i) => i.id === id));
  });

  it("kode duplikat ditolak tanpa membedakan huruf besar/kecil, termasuk kode INM", async () => {
    const komite = await sebagai("komiteMutu");
    const pertama = impBaru();
    await tambahIndikator(komite, pertama);

    const duplikat = { status: 409 };
    await assert.rejects(tambahIndikator(komite, impBaru({ kode: pertama.kode.toLowerCase() })), duplikat);
    await assert.rejects(tambahIndikator(komite, impBaru({ kode: "inm-01", kelompok: "IMP-RS" })), duplikat);
  });

  it("isian yang tidak sah ditolak: kelompok INM, faktor bukan bilangan bulat positif, field wajib kosong", async () => {
    const admin = await adminSistem();
    const ditolak = { status: 400 };
    await assert.rejects(tambahIndikator(admin, { ...impBaru(), kelompok: "INM" as "IMP-RS" }), ditolak);
    await assert.rejects(tambahIndikator(admin, impBaru({ faktor: 0 })), ditolak);
    await assert.rejects(tambahIndikator(admin, impBaru({ faktor: 2.5 })), ditolak);
    await assert.rejects(tambahIndikator(admin, impBaru({ sumberData: "  " })), ditolak);
    await assert.rejects(tambahIndikator(admin, impBaru({ target: { nilai: Number.NaN, berlakuMulai: "2026-11" } })), ditolak);
  });

  it("Admin Sistem mengubah, menonaktifkan, dan mengaktifkan kembali; Indikator nonaktif tetap di daftar", async () => {
    const admin = await adminSistem();
    const id = await tambahIndikator(admin, impBaru({ kelompok: "IMP-RS" }));
    const isian = isianDari(await ambilIndikator(admin, id));
    await ubahIndikator(admin, id, { ...isian, faktor: 1000, satuan: "‰", arah: "makinRendah", pic: "" });
    await aturAktifIndikator(admin, id, false);

    const nonaktif = (await daftarIndikator(admin)).find((i) => i.id === id);
    assert.deepEqual(
      [nonaktif?.aktif, nonaktif?.faktor, nonaktif?.satuan, nonaktif?.arah, nonaktif?.pic],
      [false, 1000, "‰", "makinRendah", ""],
    );
    await aturAktifIndikator(admin, id, true);
    assert.equal((await ambilIndikator(admin, id)).aktif, true);
  });

  for (const peran of ["petugasInputData", "kepalaUnit", "direktur"] as const) {
    it(`${LABEL_PERAN[peran]} bisa melihat daftar dan detail tetapi ditolak saat menambah, mengubah, atau menonaktifkan`, async () => {
      const id = await tambahIndikator(await sebagai("komiteMutu"), impBaru());
      const aktor = await sebagai(peran);
      const detail = await ambilIndikator(aktor, id);
      assert.ok((await daftarIndikator(aktor)).some((i) => i.id === id));

      const ditolak = { status: 403 };
      await assert.rejects(tambahIndikator(aktor, impBaru()), ditolak);
      await assert.rejects(ubahIndikator(aktor, id, { ...isianDari(detail), nama: "Diubah" }), ditolak);
      await assert.rejects(aturAktifIndikator(aktor, id, false), ditolak);
      assert.deepEqual(await ambilIndikator(aktor, id), detail);
    });
  }
});
