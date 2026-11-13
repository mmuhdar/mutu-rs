import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { trenCapaian } from "@/modules/capaian/service";
import { ambilIndikator, daftarIndikator, hapusUnitPelapor, unitPelaporAktif } from "@/modules/indikator/service";
import { INM } from "@/modules/indikator/inm";
import { ALASAN_IMPOR, ambilPengukuran, imporPengukuranLama } from "@/modules/pengukuran/service";

import { uraiDump } from "../scripts/impor-v1/dump";
import { jalankanRencana } from "../scripts/impor-v1/jalankan";
import {
  BELUM_DIISI,
  cocokkanInm,
  daftarPeriksa,
  dariDump,
  susunRencana,
  susunRiwayat,
  type IndikatorAda,
  type IndikatorV1,
} from "../scripts/impor-v1/rencana";

import { adminSistem, indikatorBaru, komiteMutu, unik, unitPelapor } from "./bantuan";

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
  id: unik("v1"),
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
    assert.deepEqual(hasil, { dibuat: { unit: 2, indikator: 2, unitPelapor: 4, pengukuran: 0 }, gagal: [] });

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
    assert.deepEqual(ulang, { dibuat: { unit: 0, indikator: 0, unitPelapor: 0, pengukuran: 0 }, gagal: [] });
  });
});

describe("riwayat isian aplikasi lama", () => {
  it("isian dijumlahkan per bulan per Indikator + Unit; bulan setelah batas dan baris tak dikenal diabaikan; definisi N/D belum lengkap ditunda", () => {
    const r = susunRencana(
      [
        v1({ id: "11", nama: "Linen bersih", unit: "ICU" }),
        v1({ id: "12", nama: "Linen bersih", unit: "IGD" }),
        // Baris ganda Indikator yang sama di Unit yang sama ikut dijumlahkan.
        v1({ id: "13", nama: "Linen bersih", unit: "ICU" }),
        v1({ id: "14", nama: "Tanpa definisi", unit: "ICU", definisiD: "" }),
      ],
      { mulai: "2027-01", ada: inm, targetInm },
    );
    const rw = susunRiwayat(
      r,
      [
        { indikatorId: "11", tanggal: "2026-09-01", n: 3, d: 4 },
        { indikatorId: "11", tanggal: "2026-09-02", n: 5, d: 6 },
        { indikatorId: "13", tanggal: "2026-09-30", n: 1, d: 1 },
        { indikatorId: "12", tanggal: "2026-10-31", n: 7, d: 8 },
        { indikatorId: "12", tanggal: "2026-11-05", n: 1, d: 1 },
        { indikatorId: "14", tanggal: "2026-09-30", n: 1, d: 2 },
        { indikatorId: "99", tanggal: "2026-09-30", n: 1, d: 2 },
      ],
      { sampai: "2026-10" },
    );
    const kode = r.indikator.find((i) => i.nama === "Linen bersih")!.kode;
    assert.deepEqual(rw.pengukuran, [
      { kode, unit: "ICU", bulan: "2026-09", n: 9, d: 11, isian: 3 },
      { kode, unit: "IGD", bulan: "2026-10", n: 7, d: 8, isian: 1 },
    ]);
    assert.deepEqual(rw.ditunda.map((x) => [x.nama, x.isian]), [["Tanpa definisi", 1]]);
    assert.deepEqual([rw.sampai, rw.setelahBatas, rw.tanpaIndikator], ["2026-10", 1, 1]);
    assert.match(daftarPeriksa(r, "dump.sql", undefined, rw), /2 Pengukuran dari 4 isian[\s\S]*Tanpa definisi/);
  });

  it("Admin Sistem mengimpor Pengukuran langsung Terverifikasi dengan Riwayat Status bertanda impor; yang sudah ada tidak diubah", async () => {
    const admin = await adminSistem();
    const indikatorId = await indikatorBaru();
    const u = await unitPelapor(indikatorId, "Impor", "2008-01");
    const id = await imporPengukuranLama(admin, { indikatorId, unitId: u.id, bulan: "2008-03", n: 8, d: 10 });
    const p = await ambilPengukuran(admin, id!);
    assert.deepEqual([p.status, p.n, p.d, p.capaian], ["terverifikasi", 8, 10, 80]);
    assert.deepEqual(
      p.riwayat.map((x) => [x.statusAsal, x.statusTujuan, x.alasan]),
      [[null, "terverifikasi", ALASAN_IMPOR]],
    );
    assert.equal(await imporPengukuranLama(admin, { indikatorId, unitId: u.id, bulan: "2008-03", n: 1, d: 10 }), null);
    assert.equal((await ambilPengukuran(admin, id!)).n, 8);
  });

  it("impor Pengukuran memakai aturan isian biasa, hanya untuk Admin Sistem dan bulan yang sudah lewat", async () => {
    const admin = await adminSistem();
    const indikatorId = await indikatorBaru();
    const u = await unitPelapor(indikatorId, "Impor", "2008-01");
    const sekarang = new Date("2026-11-13T10:00:00+08:00");
    const impor = (ubahan: { n?: number; bulan?: string }, aktor = admin) =>
      imporPengukuranLama(aktor, { indikatorId, unitId: u.id, bulan: "2008-04", n: 5, d: 10, ...ubahan }, sekarang);
    await assert.rejects(impor({ n: 11 }), { status: 400, message: "N tidak boleh lebih dari D pada Indikator persen." });
    await assert.rejects(impor({ bulan: "2007-12" }), { status: 400 });
    await assert.rejects(impor({ bulan: "2026-11" }), { status: 400, message: "Riwayat isian hanya untuk bulan yang sudah lewat." });
    await assert.rejects(impor({}, await komiteMutu()), { status: 403 });
  });

  it("menjalankan: Unit Pelapor mulai bulan isian pertama, Pengukuran Terverifikasi masuk tren; diulang tidak membuat apa pun lagi", async () => {
    const admin = await adminSistem();
    const nama = unik("Riwayat");
    const baris = [
      v1({ id: "21", nama: `${nama} Linen`, unit: `${nama} ICU` }),
      v1({ id: "22", nama: `${nama} Kosong`, unit: `${nama} ICU`, definisiN: "" }),
    ];
    const isian = [
      { indikatorId: "21", tanggal: "2008-05-31", n: 9, d: 10 },
      { indikatorId: "21", tanggal: "2008-06-30", n: 12, d: 10 },
      { indikatorId: "22", tanggal: "2008-05-31", n: 1, d: 2 },
    ];
    const jalankan = async () => {
      const r = susunRencana(baris, { mulai: "2008-09", ada: await daftarIndikator(admin), targetInm });
      return jalankanRencana(admin, r, susunRiwayat(r, isian, { sampai: "2008-08" }));
    };

    const hasil = await jalankan();
    assert.deepEqual(hasil.dibuat, { unit: 1, indikator: 2, unitPelapor: 2, pengukuran: 1 });
    assert.equal(hasil.gagal.length, 1);
    assert.match(hasil.gagal[0], /Juni 2008: N tidak boleh lebih dari D/);
    const daftar = await daftarIndikator(admin);
    const linen = daftar.find((i) => i.nama === `${nama} Linen`)!;
    const kosong = daftar.find((i) => i.nama === `${nama} Kosong`)!;
    assert.deepEqual((await unitPelaporAktif(admin, linen.id, "2008-05")).map((p) => p.nama), [`${nama} ICU`]);
    assert.deepEqual(await unitPelaporAktif(admin, linen.id, "2008-04"), []);
    // Riwayat ditunda: Unit Pelapor tetap mulai bulan peralihan, dan definisi N masih bisa dilengkapi.
    assert.deepEqual(await unitPelaporAktif(admin, kosong.id, "2008-08"), []);
    assert.equal((await ambilIndikator(admin, kosong.id)).terkunci, false);
    const tren = await trenCapaian(admin, linen.id, "2008-08");
    assert.equal(tren.rs!.find((t) => t.bulan === "2008-05")!.capaian, 90);

    const ulang = await jalankan();
    assert.deepEqual(ulang.dibuat, { unit: 0, indikator: 0, unitPelapor: 0, pengukuran: 0 });
    assert.equal(ulang.gagal.length, 1);
  });
});
