import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { config } from "@/lib/config";
import type { Kelompok } from "@/lib/indikator";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { masuk, penggunaDariToken } from "@/modules/auth/service";
import {
  akhiriUnitPelapor,
  ambilIndikator,
  hapusUnitPelapor,
  tambahIndikator,
  tambahUnitPelapor,
  unitPelaporAktif,
} from "@/modules/indikator/service";
import { aturAktifUnit, tambahUnit } from "@/modules/unit/service";

async function adminSistem() {
  const pengguna = await penggunaDariToken(await masuk({ ...config.adminAwal, ip: "10.6.0.1" }));
  assert.ok(pengguna);
  return pengguna;
}

/** Service Pengguna belum dipakai di sini: aktor peran lain = sesi Admin Sistem dengan peran itu. */
async function sebagai(peran: Peran) {
  return { ...(await adminSistem()), peran };
}

/** Semua tes memakai satu database: nama Unit dan kode Indikator dibuat unik. */
const unik = (awalan: string) => `${awalan} ${randomUUID().slice(0, 8)}`;

async function unitBaru(awalan: string) {
  return tambahUnit(await adminSistem(), { nama: unik(awalan) });
}

async function indikatorBaru(kelompok: Exclude<Kelompok, "INM"> = "IMP-RS") {
  return tambahIndikator(await sebagai("komiteMutu"), {
    kode: unik("IMP").replace(" ", "-"),
    kelompok,
    nama: "Kepatuhan identifikasi pasien sebelum tindakan",
    definisiOperasional: "Identifikasi dengan dua penanda sebelum setiap tindakan.",
    definisiNumerator: "Jumlah tindakan dengan identifikasi benar",
    definisiDenominator: "Jumlah tindakan yang diobservasi",
    sumberData: "Lembar observasi",
    faktor: 100,
    satuan: "%",
    arah: "makinTinggi",
    frekuensi: "bulanan",
    pic: "",
    target: { nilai: 100, berlakuMulai: "2026-01" },
  });
}

/** Nama Unit Pelapor yang aktif pada bulan itu. */
const aktifPada = async (indikatorId: string, bulan: string) =>
  (await unitPelaporAktif(await adminSistem(), indikatorId, bulan)).map((u) => u.nama);

describe("Unit Pelapor", () => {
  it("HCU mulai Maret tidak aktif di Februari; Unit yang berhenti Juni tidak aktif di Juli; detail Indikator menampilkan periodenya", async () => {
    const komite = await sebagai("komiteMutu");
    const indikatorId = await indikatorBaru();
    const icu = await unitBaru("ICU");
    const hcu = await unitBaru("HCU");
    await tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-01", bulanBerhenti: "2026-06" });
    await tambahUnitPelapor(komite, indikatorId, { unitId: hcu.id, bulanMulai: "2026-03" });

    assert.deepEqual(await aktifPada(indikatorId, "2026-02"), [icu.nama]);
    assert.deepEqual((await aktifPada(indikatorId, "2026-03")).sort(), [icu.nama, hcu.nama].sort());
    assert.deepEqual((await aktifPada(indikatorId, "2026-06")).sort(), [icu.nama, hcu.nama].sort());
    assert.deepEqual(await aktifPada(indikatorId, "2026-07"), [hcu.nama]);
    assert.deepEqual(await aktifPada(indikatorId, "2025-12"), []);

    const detail = await ambilIndikator(await sebagai("petugasInputData"), indikatorId);
    assert.deepEqual(
      detail.unitPelapor.map((u) => [u.namaUnit, u.bulanMulai, u.bulanBerhenti]).sort(),
      [
        [hcu.nama, "2026-03", null],
        [icu.nama, "2026-01", "2026-06"],
      ].sort(),
    );
  });

  it("bulan berhenti lebih awal dari bulan mulai ditolak; periode satu bulan (berhenti = mulai) boleh", async () => {
    const komite = await sebagai("komiteMutu");
    const indikatorId = await indikatorBaru();
    const icu = await unitBaru("ICU");

    await assert.rejects(
      tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-05", bulanBerhenti: "2026-04" }),
      { status: 400, message: "Bulan berhenti tidak boleh lebih awal dari bulan mulai." },
    );
    await assert.rejects(tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "" }), { status: 400 });
    await tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-05", bulanBerhenti: "2026-05" });

    assert.deepEqual(await aktifPada(indikatorId, "2026-05"), [icu.nama]);
    assert.deepEqual(await aktifPada(indikatorId, "2026-06"), []);
  });

  it("Unit nonaktif tidak bisa ditambahkan; Unit yang dinonaktifkan kemudian tetap tercatat selama periodenya", async () => {
    const admin = await adminSistem();
    const indikatorId = await indikatorBaru();
    const ditutup = await unitBaru("Perinatologi");
    await aturAktifUnit(admin, ditutup.id, false);
    await assert.rejects(tambahUnitPelapor(admin, indikatorId, { unitId: ditutup.id, bulanMulai: "2026-01" }), {
      status: 400,
      message: `Unit ${ditutup.nama} nonaktif, jadi tidak bisa menjadi Unit Pelapor.`,
    });

    const igd = await unitBaru("IGD");
    await tambahUnitPelapor(admin, indikatorId, { unitId: igd.id, bulanMulai: "2026-01" });
    await aturAktifUnit(admin, igd.id, false);
    assert.deepEqual(await unitPelaporAktif(admin, indikatorId, "2026-02"), [
      { unitId: igd.id, nama: igd.nama, unitAktif: false },
    ]);
  });

  it("periode yang tumpang tindih untuk Indikator dan Unit yang sama ditolak; periode bersambung dan Unit lain boleh", async () => {
    const komite = await sebagai("komiteMutu");
    const indikatorId = await indikatorBaru("IMP-RS");
    const ranap = await unitBaru("Rawat Inap");
    await tambahUnitPelapor(komite, indikatorId, { unitId: ranap.id, bulanMulai: "2026-03", bulanBerhenti: "2026-06" });

    const tumpangTindih = {
      status: 409,
      message: `Unit ${ranap.nama} sudah menjadi Unit Pelapor Indikator ini pada periode yang tumpang tindih (Maret 2026 – Juni 2026).`,
    };
    for (const [bulanMulai, bulanBerhenti] of [
      ["2026-01", "2026-03"],
      ["2026-06", null],
      ["2026-04", "2026-05"],
      ["2026-01", null],
    ]) {
      await assert.rejects(tambahUnitPelapor(komite, indikatorId, { unitId: ranap.id, bulanMulai, bulanBerhenti }), tumpangTindih);
    }

    await tambahUnitPelapor(komite, indikatorId, { unitId: ranap.id, bulanMulai: "2026-01", bulanBerhenti: "2026-02" });
    await tambahUnitPelapor(komite, indikatorId, { unitId: ranap.id, bulanMulai: "2026-07" });
    await assert.rejects(tambahUnitPelapor(komite, indikatorId, { unitId: ranap.id, bulanMulai: "2027-01" }), {
      status: 409,
      message: `Unit ${ranap.nama} sudah menjadi Unit Pelapor Indikator ini pada periode yang tumpang tindih (mulai Juli 2026).`,
    });
    const icu = await unitBaru("ICU");
    await tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-01" });

    for (const bulan of ["2026-01", "2026-04", "2026-07", "2030-12"]) {
      assert.deepEqual((await aktifPada(indikatorId, bulan)).sort(), [ranap.nama, icu.nama].sort(), bulan);
    }
  });

  it("IMP-Unit hanya punya satu Unit Pelapor pada bulan mana pun; setelah Unit lama diakhiri, Unit pengganti boleh mulai bulan berikutnya", async () => {
    const komite = await sebagai("komiteMutu");
    const indikatorId = await indikatorBaru("IMP-Unit");
    const lama = await unitBaru("Kamar Operasi");
    const baru = await unitBaru("IBS");
    const lamaId = await tambahUnitPelapor(komite, indikatorId, { unitId: lama.id, bulanMulai: "2026-01" });

    const satuUnit = {
      status: 409,
      message: `IMP-Unit hanya boleh punya satu Unit Pelapor pada bulan yang sama; periode ini tumpang tindih dengan Unit ${lama.nama} (mulai Januari 2026).`,
    };
    await assert.rejects(tambahUnitPelapor(komite, indikatorId, { unitId: baru.id, bulanMulai: "2026-07" }), satuUnit);

    await akhiriUnitPelapor(komite, lamaId, "2026-06");
    await assert.rejects(tambahUnitPelapor(komite, indikatorId, { unitId: baru.id, bulanMulai: "2026-06" }), {
      status: 409,
      message: satuUnit.message.replace("mulai Januari 2026", "Januari 2026 – Juni 2026"),
    });
    await tambahUnitPelapor(komite, indikatorId, { unitId: baru.id, bulanMulai: "2026-07" });

    assert.deepEqual(await aktifPada(indikatorId, "2026-06"), [lama.nama]);
    assert.deepEqual(await aktifPada(indikatorId, "2026-07"), [baru.nama]);
    // Memperpanjang periode lama sampai menabrak Unit pengganti juga ditolak.
    await assert.rejects(akhiriUnitPelapor(komite, lamaId, "2026-08"), { status: 409 });
  });

  it("mengakhiri Unit Pelapor mengisi bulan berhenti; bulan berhenti sebelum bulan mulai ditolak", async () => {
    const komite = await sebagai("komiteMutu");
    const indikatorId = await indikatorBaru();
    const icu = await unitBaru("ICU");
    const id = await tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-03" });

    await assert.rejects(akhiriUnitPelapor(komite, id, "2026-02"), {
      status: 400,
      message: "Bulan berhenti tidak boleh lebih awal dari bulan mulai.",
    });
    await assert.rejects(akhiriUnitPelapor(komite, id, ""), { status: 400, message: "Pilih bulan berhenti." });
    await akhiriUnitPelapor(komite, id, "2026-09");

    const [periode] = (await ambilIndikator(komite, indikatorId)).unitPelapor;
    assert.deepEqual([periode.bulanMulai, periode.bulanBerhenti], ["2026-03", "2026-09"]);
    assert.deepEqual(await aktifPada(indikatorId, "2026-09"), [icu.nama]);
    assert.deepEqual(await aktifPada(indikatorId, "2026-10"), []);
  });

  it("periode yang salah dimasukkan bisa dihapus untuk koreksi", async () => {
    const admin = await adminSistem();
    const indikatorId = await indikatorBaru();
    const icu = await unitBaru("ICU");
    const id = await tambahUnitPelapor(admin, indikatorId, { unitId: icu.id, bulanMulai: "2026-03" });

    await hapusUnitPelapor(admin, id);
    assert.deepEqual((await ambilIndikator(admin, indikatorId)).unitPelapor, []);
    assert.deepEqual(await aktifPada(indikatorId, "2026-04"), []);
    await assert.rejects(hapusUnitPelapor(admin, id), { status: 404 });
  });

  for (const peran of ["petugasInputData", "kepalaUnit", "direktur"] as const) {
    it(`${LABEL_PERAN[peran]} bisa melihat Unit Pelapor tetapi ditolak saat menambah, mengakhiri, atau menghapus`, async () => {
      const komite = await sebagai("komiteMutu");
      const indikatorId = await indikatorBaru();
      const icu = await unitBaru("ICU");
      const id = await tambahUnitPelapor(komite, indikatorId, { unitId: icu.id, bulanMulai: "2026-01" });
      const aktor = await sebagai(peran);

      const ditolak = { status: 403, message: "Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator." };
      const hcu = await unitBaru("HCU");
      await assert.rejects(tambahUnitPelapor(aktor, indikatorId, { unitId: hcu.id, bulanMulai: "2026-01" }), ditolak);
      await assert.rejects(akhiriUnitPelapor(aktor, id, "2026-06"), ditolak);
      await assert.rejects(hapusUnitPelapor(aktor, id), ditolak);

      assert.deepEqual(
        (await ambilIndikator(aktor, indikatorId)).unitPelapor.map((u) => [u.namaUnit, u.bulanMulai, u.bulanBerhenti]),
        [[icu.nama, "2026-01", null]],
      );
      assert.deepEqual(
        (await unitPelaporAktif(aktor, indikatorId, "2026-07")).map((u) => u.nama),
        [icu.nama],
      );
    });
  }
});
