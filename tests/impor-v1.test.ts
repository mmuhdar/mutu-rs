import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { ambilIndikator, daftarIndikator, hapusUnitPelapor, unitPelaporAktif } from "@/modules/indikator/service";
import { INM } from "@/modules/indikator/inm";

import { uraiDump } from "../scripts/impor-v1/dump";
import { jalankanRencana } from "../scripts/impor-v1/jalankan";
import { BELUM_DIISI, cocokkanInm, daftarPeriksa, dariDump, susunRencana, type IndikatorAda, type IndikatorV1 } from "../scripts/impor-v1/rencana";

import { adminSistem, unik } from "./bantuan";

describe("membaca dump aplikasi lama", () => {
  it("mysqldump: urutan kolom dari CREATE TABLE, escape dan NULL, tabel lain dilewati", () => {
    const isi = uraiDump(
      [
        "CREATE TABLE `pegawais` (",
        "  `id` bigint unsigned NOT NULL,",
        "  `nik` varchar(16) NOT NULL",
        ") ENGINE=InnoDB;",
        "INSERT INTO `pegawais` VALUES (1,'7371000000000001');",
        "CREATE TABLE `units` (",
        "  `id` bigint unsigned NOT NULL AUTO_INCREMENT,",
        "  `nama` varchar(255) NOT NULL,",
        "  PRIMARY KEY (`id`)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",
        "INSERT INTO `units` VALUES (1,'IGD'),(2,'Ruang Anak\\'s; \\\\ \\nLt 2'),(3,NULL);",
      ].join("\n"),
    );
    assert.deepEqual(isi.units, [
      { id: "1", nama: "IGD" },
      { id: "2", nama: "Ruang Anak's; \\ \nLt 2" },
      { id: "3", nama: null },
    ]);
    assert.deepEqual(isi.indikator_mutus, []);
  });

  it("phpMyAdmin: daftar kolom di INSERT, nilai beberapa baris, petik ganda", () => {
    const isi = uraiDump(
      [
        "INSERT INTO `master_indikator_mutus` (`id`, `nama`, `slug`) VALUES",
        "(1, 'Kepatuhan Identifikasi Pasien', 'kepatuhan-identifikasi-pasien'),",
        "(2, 'Tulis ''Baca'' Konfirmasi', 'tbak');",
      ].join("\r\n"),
    );
    assert.deepEqual(
      isi.master_indikator_mutus.map((m) => m.nama),
      ["Kepatuhan Identifikasi Pasien", "Tulis 'Baca' Konfirmasi"],
    );
  });

  it("baris nonaktif, terhapus, atau tanpa Unit tidak dibaca", () => {
    const kolom = "`id`, `unit_id`, `master_indikator_id`, `nama_indikator`, `type`, `target`, `operator`, `satuan`, `is_active`, `deleted_at`";
    const baris = dariDump(
      uraiDump(
        [
          "INSERT INTO `units` (`id`, `nama`) VALUES (1, '  Rawat   Inap  ');",
          `INSERT INTO \`indikator_mutus\` (${kolom}) VALUES`,
          "(1, 1, NULL, 'A', 'IMP RS', '100.00', '>=', '%', 1, NULL),",
          "(2, 1, NULL, 'B', 'IMP RS', '100.00', '>=', '%', 0, NULL),",
          "(3, 1, NULL, 'C', 'IMP RS', '100.00', '>=', '%', 1, '2026-06-01 10:00:00'),",
          "(4, 9, NULL, 'D', 'IMP RS', '100.00', '<=', '%', 1, NULL);",
        ].join("\n"),
      ),
    );
    assert.deepEqual(
      baris.map((b) => [b.nama, b.unit, b.arah, b.target]),
      [["A", "Rawat Inap", "makinTinggi", 100]],
    );
  });
});

/** Baris Indikator aplikasi lama untuk tes rencana. */
const v1 = (ubahan: Partial<IndikatorV1>): IndikatorV1 => ({
  unit: "ICU",
  master: null,
  nama: "Indikator",
  jenis: "IMP RS",
  definisi: "Definisi lama.",
  inklusi: "",
  eksklusi: "",
  definisiN: "Jumlah N",
  definisiD: "Jumlah D",
  arah: "makinTinggi",
  target: 100,
  satuan: "%",
  ...ubahan,
});

const inm: IndikatorAda[] = INM.map((i) => ({ kode: i.kode, nama: i.nama, kelompok: "INM" }));
const targetInm = Object.fromEntries(INM.map((i) => [i.kode, i.target]));

describe("rencana impor", () => {
  it("INM dicocokkan menurut nama; yang mirip ditandai; yang tidak cocok menjadi IMP-RS", () => {
    assert.equal(cocokkanInm("kepatuhan  identifikasi pasien", inm)?.inm.kode, "INM-03");
    assert.deepEqual(cocokkanInm("Kepatuhan Penggunaan APD", inm), { inm: inm[1], mirip: true });
    assert.equal(cocokkanInm("Angka Kejadian Phlebitis", inm), null);

    const r = susunRencana(
      [
        v1({ master: "Kepatuhan Identifikasi Pasien", jenis: "INM", unit: "ICU", target: 90 }),
        v1({ master: "Kepatuhan Identifikasi Pasien", jenis: "INM", unit: "IGD", target: 90 }),
        v1({ master: "Kepatuhan Penggunaan APD", jenis: "INM", unit: "ICU" }),
        v1({ master: "Angka Kejadian Phlebitis", jenis: "INM", unit: "ICU" }),
      ],
      { mulai: "2027-01", ada: inm, targetInm },
    );
    const [a, b, c] = r.indikator;
    assert.deepEqual([a.kode, a.kelompok, a.sudahAda, a.unit], ["INM-02", "INM", true, ["ICU"]]);
    assert.match(a.catatan.join(), /kemiripan nama/);
    assert.deepEqual([b.kode, b.unit, b.belumDiisi], ["INM-03", ["ICU", "IGD"], []]);
    assert.match(b.catatan.join(), /≥ 90 pada 2 baris; MutuRS tetap memakai Target PMK 100/);
    assert.deepEqual([c.kode, c.kelompok], ["IMP-RS-01", "IMP-RS"]);
    assert.match(c.catatan.join(), /tidak cocok dengan 13 INM/);
  });

  it("kelompok, kode urut nama melanjutkan nomor yang ada, Target terbanyak, field kosong, inklusi dan eksklusi", () => {
    const ada: IndikatorAda[] = [...inm, { kode: "IMP-RS-07", nama: "Sudah Ada di MutuRS", kelompok: "IMP-RS" }];
    const r = susunRencana(
      [
        v1({ nama: "Zeta Kepatuhan SBAR", unit: "ICU", target: 100 }),
        v1({ nama: "Zeta Kepatuhan SBAR", unit: "IGD", target: 100 }),
        v1({ nama: "Zeta kepatuhan  SBAR", unit: "Lab", target: 90, definisiN: "" }),
        v1({ nama: "Alfa Cuci Tangan", unit: "ICU", definisi: "", definisiN: "", inklusi: "Semua ruangan", eksklusi: "Ruang isolasi" }),
        v1({ nama: "Edukasi Obat Injeksi", jenis: "IMP Unit", unit: "ICU" }),
        v1({ nama: "Edukasi Obat Injeksi", jenis: "IMP Unit", unit: "IGD" }),
        v1({ nama: "Linen Hilang", jenis: "IMP Unit", unit: "Laundry", arah: "makinRendah", target: 0 }),
        v1({ nama: "Waktu Tanggap IGD", jenis: "SPM", unit: "IGD" }),
        v1({ nama: "sudah ada di mutuRS", unit: "ICU" }),
      ],
      { mulai: "2027-01", ada, targetInm },
    );
    const per = Object.fromEntries(r.indikator.map((i) => [i.nama, i]));

    assert.deepEqual(
      r.indikator.map((i) => [i.kode, i.kelompok]),
      [
        ["IMP-RS-07", "IMP-RS"],
        ["IMP-RS-08", "IMP-RS"],
        ["IMP-RS-09", "IMP-RS"],
        ["IMP-RS-10", "IMP-RS"],
        ["IMP-UNIT-01", "IMP-Unit"],
        ["SPM-01", "SPM"],
      ],
    );
    assert.deepEqual([per["Alfa Cuci Tangan"].kode, per["Edukasi Obat Injeksi"].kode, per["Zeta Kepatuhan SBAR"].kode], ["IMP-RS-08", "IMP-RS-09", "IMP-RS-10"]);
    assert.deepEqual([per["sudah ada di mutuRS"].kode, per["sudah ada di mutuRS"].sudahAda], ["IMP-RS-07", true]);

    const sbar = per["Zeta Kepatuhan SBAR"];
    assert.deepEqual([sbar.target, sbar.unit, sbar.isian.definisiNumerator, sbar.belumDiisi], [100, ["ICU", "IGD", "Lab"], "Jumlah N", []]);
    assert.match(sbar.catatan.join(), /≥ 100 pada 2 baris, ≥ 90 pada 1 baris/);

    const alfa = per["Alfa Cuci Tangan"];
    assert.equal(alfa.isian.definisiOperasional, `${BELUM_DIISI}\n\nInklusi: Semua ruangan\n\nEksklusi: Ruang isolasi`);
    assert.deepEqual([alfa.isian.definisiNumerator, alfa.isian.sumberData], [BELUM_DIISI, BELUM_DIISI]);
    assert.deepEqual(alfa.belumDiisi, ["definisi operasional", "definisi Numerator"]);

    assert.match(per["Edukasi Obat Injeksi"].catatan.join(), /IMP Unit di 2 Unit/);
    assert.deepEqual([per["Linen Hilang"].isian.arah, per["Linen Hilang"].target], ["makinRendah", 0]);
    assert.deepEqual(r.unit, ["ICU", "IGD", "Lab", "Laundry"]);

    const md = daftarPeriksa(r, "dump.sql");
    assert.match(md, /Alfa Cuci Tangan: definisi operasional, definisi Numerator/);
    assert.match(md, /\| IMP-RS-07 \(sudah ada\) \|/);
  });
});

describe("rencana impor: nama yang hanya berbeda di dalam kurung", () => {
  it("tetap dua Indikator, dan rencana ulang memetakan masing-masing ke kodenya sendiri", () => {
    const baris = [
      v1({ master: "Waktu Tunggu (IGD)", unit: "IGD" }),
      v1({ master: "Waktu Tunggu (Rawat Jalan)", unit: "Poli Anak" }),
      v1({ nama: "Kepatuhan Hand Hygiene (ICU)", unit: "ICU" }),
      v1({ nama: "Kepatuhan Hand Hygiene (IGD)", unit: "IGD" }),
    ];
    const pertama = susunRencana(baris, { mulai: "2027-01", ada: inm, targetInm });
    const kode = Object.fromEntries(pertama.indikator.map((i) => [i.nama, i.kode]));
    assert.equal(pertama.indikator.length, 4);

    const ada = [...inm, ...pertama.indikator.map((i) => ({ kode: i.kode, nama: i.nama, kelompok: i.kelompok }))];
    const ulang = susunRencana(baris, { mulai: "2027-01", ada, targetInm });
    assert.deepEqual(
      ulang.indikator.map((i) => [i.kode, i.sudahAda, i.unit]),
      pertama.indikator.map((i) => [kode[i.nama], true, i.unit]),
    );
  });

  it("Arah dan Target dari baris yang sama: Target terbanyak di antara baris ber-Arah terbanyak", () => {
    const r = susunRencana(
      [
        v1({ nama: "Insiden", unit: "A", arah: "makinRendah", target: 0 }),
        v1({ nama: "Insiden", unit: "B", arah: "makinRendah", target: 5 }),
        v1({ nama: "Insiden", unit: "C", arah: "makinRendah", target: 0 }),
        v1({ nama: "Insiden", unit: "D", arah: "makinTinggi", target: 100 }),
        v1({ nama: "Insiden", unit: "E", arah: "makinTinggi", target: 100 }),
      ],
      { mulai: "2027-01", ada: inm, targetInm },
    );
    const [i] = r.indikator;
    assert.deepEqual([i.isian.arah, i.target], ["makinRendah", 0]);
    assert.match(i.catatan.join(), /dipakai ≤ 0/);
  });
});

describe("menjalankan impor", () => {
  const nama = unik("Impor");
  const unitIcu = `${nama} ICU`;
  const unitIgd = `${nama} IGD`;
  let unitPelaporInm: string[] = [];

  after(async () => {
    // Unit Pelapor INM buatan tes dihapus lagi supaya INM bersama kembali seperti semula.
    const admin = await adminSistem();
    const inm03 = (await daftarIndikator(admin)).find((i) => i.kode === "INM-03")!;
    for (const p of (await ambilIndikator(admin, inm03.id)).unitPelapor) {
      if (unitPelaporInm.includes(p.namaUnit)) await hapusUnitPelapor(admin, p.id);
    }
  });

  it("membuat Unit, Indikator, Target, dan Unit Pelapor mulai bulan peralihan; diulang tidak membuat apa pun lagi", async () => {
    const admin = await adminSistem();
    const baris = [
      v1({ master: "Kepatuhan Identifikasi Pasien", jenis: "INM", unit: unitIcu }),
      v1({ nama: `${nama} SBAR`, unit: unitIcu }),
      v1({ nama: `${nama} SBAR`, unit: unitIgd, definisiN: "" }),
      v1({ nama: `${nama} Linen`, jenis: "IMP Unit", unit: unitIgd, target: 95 }),
    ];
    const rencanaUntuk = async () =>
      susunRencana(baris, {
        mulai: "2031-01",
        ada: await daftarIndikator(admin),
        targetInm,
      });

    const r = await rencanaUntuk();
    unitPelaporInm = [unitIcu];
    const hasil = await jalankanRencana(admin, r);
    assert.deepEqual(hasil, { dibuat: { unit: 2, indikator: 2, unitPelapor: 4 }, gagal: [] });

    const daftar = await daftarIndikator(admin);
    const sbar = daftar.find((i) => i.nama === `${nama} SBAR`)!;
    const linen = daftar.find((i) => i.nama === `${nama} Linen`)!;
    assert.deepEqual([sbar.kelompok, sbar.sumberData, sbar.definisiNumerator], ["IMP-RS", BELUM_DIISI, "Jumlah N"]);
    assert.equal(linen.kelompok, "IMP-Unit");
    assert.deepEqual((await unitPelaporAktif(admin, sbar.id, "2031-01")).map((p) => p.nama), [unitIgd, unitIcu].sort());
    assert.deepEqual(await unitPelaporAktif(admin, sbar.id, "2030-12"), []);
    const inm03 = daftar.find((i) => i.kode === "INM-03")!;
    assert.ok((await unitPelaporAktif(admin, inm03.id, "2031-01")).some((p) => p.nama === unitIcu));

    const ulang = await jalankanRencana(admin, await rencanaUntuk());
    assert.deepEqual(ulang, { dibuat: { unit: 0, indikator: 0, unitPelapor: 0 }, gagal: [] });
  });
});
