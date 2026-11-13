import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contentDisposition } from "@/lib/bukti";
import { jenisDokumenRisiko, nilaiRisiko, nilaiRisikoAtauNull, tingkatTurun } from "@/lib/risiko";
import { daftarJejak } from "@/modules/jejak/service";
import {
  ambilBerkasDokumenRisiko,
  ambilRisiko,
  daftarRisiko,
  hapusDokumenRisiko,
  hapusRisiko,
  simpanRisiko,
  tambahDokumenRisiko,
  type IsianRisiko,
} from "@/modules/risiko/service";
import { aturAktifUnit } from "@/modules/unit/service";

import { adminSistem, komiteMutu, sebagai, unitBaru } from "./bantuan";

const PDF = Buffer.from("%PDF-1.4\n% review risiko\n");
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const tolak = (status: number) => ({ status });
const SEKARANG = new Date("2026-11-13T10:00:00+08:00");

/** Isian Risiko Unit itu tahun 2026: Probabilitas 3, Dampak 3, belum dipantau. */
const isian = (unitId: string, ubahan: Partial<IsianRisiko> = {}): IsianRisiko => ({
  unitId,
  tahun: 2026,
  uraian: "Pasien jatuh dari tempat tidur",
  kategori: "operasional",
  probabilitas: 3,
  dampak: 3,
  perlakuan: "",
  jadwal: "",
  probabilitasPemantauan: Number.NaN,
  dampakPemantauan: Number.NaN,
  efektivitas: "",
  ...ubahan,
});

describe("Register Risiko", () => {
  it("Nilai Risiko, Bobot, Tingkat, dan Prioritas mengikuti matriks Input Risiko v1", () => {
    assert.deepEqual(nilaiRisiko(1, 1), { probabilitas: 1, dampak: 1, bobot: 1, nilai: 1, tingkat: "sangatRendah", prioritas: 5 });
    assert.deepEqual(
      [nilaiRisiko(1, 2), nilaiRisiko(2, 1), nilaiRisiko(2, 3), nilaiRisiko(3, 3), nilaiRisiko(4, 2)].map((n) => [n.nilai, n.bobot, n.tingkat]),
      [
        [3, 1.5, "sangatRendah"],
        [2, 1, "sangatRendah"],
        [11, 1.83, "sedang"],
        [13, 1.43, "sedang"],
        [10, 1.19, "sedang"],
      ],
    );
    // Batas Tingkat: 5 Rendah, 15 Tinggi, 20 Sangat Tinggi.
    assert.deepEqual([nilaiRisiko(4, 1), nilaiRisiko(2, 4), nilaiRisiko(1, 5), nilaiRisiko(5, 5)].map((n) => [n.nilai, n.tingkat, n.prioritas]), [
      [5, "rendah", 4],
      [15, "tinggi", 2],
      [20, "sangatTinggi", 1],
      [25, "sangatTinggi", 1],
    ]);
    assert.throws(() => nilaiRisiko(0, 3), RangeError);
    assert.equal(nilaiRisikoAtauNull(null, 2), null);
    assert.equal(tingkatTurun(nilaiRisiko(3, 3), nilaiRisiko(2, 2)), true);
    assert.equal(tingkatTurun(nilaiRisiko(3, 3), nilaiRisiko(3, 4)), false);
    assert.equal(tingkatTurun(nilaiRisiko(3, 3), null), null);
  });

  it("Petugas Input Data mengisi Risiko Unit-nya lengkap dengan Perlakuan dan Hasil Pemantauan; penilaiannya dihitung", async () => {
    const petugas = await sebagai("petugasInputData");
    const unitId = petugas.unitIds[0];
    const id = await simpanRisiko(
      petugas,
      isian(unitId, { perlakuan: "Pasang pagar tempat tidur\n\n  Edukasi keluarga  \n", jadwal: "2026-03-01" }),
      undefined,
      SEKARANG,
    );
    let r = await ambilRisiko(petugas, id);
    assert.deepEqual([r.awal.nilai, r.awal.tingkat, r.pemantauan, r.turun], [13, "sedang", null, null]);
    assert.deepEqual(r.daftarPerlakuan, ["Pasang pagar tempat tidur", "Edukasi keluarga"]);
    assert.equal(r.bolehTulis, true);

    await simpanRisiko(
      petugas,
      isian(unitId, { probabilitasPemantauan: 2, dampakPemantauan: 2, efektivitas: "efektif", perlakuan: r.perlakuan }),
      id,
      SEKARANG,
    );
    r = await ambilRisiko(petugas, id);
    assert.deepEqual([r.pemantauan?.nilai, r.pemantauan?.tingkat, r.turun, r.efektivitas], [7, "rendah", true, "efektif"]);

    const jejak = (await daftarJejak(await komiteMutu(), { entitas: "risiko" })).filter((j) => j.entitasId === id);
    assert.deepEqual(
      jejak.map((j) => j.ringkasan).toReversed(),
      [
        `Menambah Risiko "Pasien jatuh dari tempat tidur" Unit ${r.unit.nama} 2026: Nilai 13 (Sedang)`,
        `Mengubah Risiko "Pasien jatuh dari tempat tidur" Unit ${r.unit.nama} 2026: Nilai 13 (Sedang), pemantauan Nilai 7 (Rendah)`,
      ],
    );
  });

  it("isian yang tidak lengkap atau di luar skala ditolak", async () => {
    const komite = await komiteMutu();
    const u = await unitBaru("Risiko");
    const tolakDengan = (ubahan: Partial<IsianRisiko>, message: string) =>
      assert.rejects(simpanRisiko(komite, isian(u.id, ubahan), undefined, SEKARANG), { status: 400, message });
    await tolakDengan({ uraian: "  " }, "Uraian risiko wajib diisi.");
    await tolakDengan({ kategori: "lain" }, "Pilih Kategori Risiko.");
    await tolakDengan({ probabilitas: 6 }, "Pilih Probabilitas 1 sampai 5.");
    await tolakDengan({ dampak: Number.NaN }, "Pilih Dampak 1 sampai 5.");
    await tolakDengan({ probabilitasPemantauan: 2 }, "Pilih Dampak Hasil Pemantauan 1 sampai 5.");
    await tolakDengan({ efektivitas: "efektif" }, "Efektivitas dinilai setelah Hasil Pemantauan diisi.");
    await tolakDengan({ jadwal: "2026-02-30" }, "Jadwal pelaksanaan harus tanggal yang valid.");
    await tolakDengan({ tahun: 2028 }, "Tahun harus 2000 sampai 2027.");

    const ditutup = await unitBaru("Ditutup");
    await aturAktifUnit(await adminSistem(), ditutup.id, false);
    await assert.rejects(simpanRisiko(komite, isian(ditutup.id), undefined, SEKARANG), { status: 400, message: `Unit ${ditutup.nama} nonaktif.` });
  });

  it("Unit lain tidak bisa membaca atau mengubah; Direktur hanya membaca; Komite Mutu membaca semua Unit", async () => {
    const kepala = await sebagai("kepalaUnit");
    const unitId = kepala.unitIds[0];
    const id = await simpanRisiko(kepala, isian(unitId, { tahun: 2025 }), undefined, SEKARANG);
    const lain = await sebagai("petugasInputData");
    await assert.rejects(ambilRisiko(lain, id), tolak(403));
    await assert.rejects(daftarRisiko(lain, { tahun: 2025, unitId }), tolak(403));
    await assert.rejects(simpanRisiko(lain, isian(unitId), id, SEKARANG), tolak(403));
    await assert.rejects(simpanRisiko(lain, isian(unitId), undefined, SEKARANG), tolak(403));
    assert.ok(!(await daftarRisiko(lain, { tahun: 2025 })).some((r) => r.id === id));

    const direktur = await sebagai("direktur");
    assert.equal((await ambilRisiko(direktur, id)).bolehTulis, false);
    await assert.rejects(simpanRisiko(direktur, isian(unitId), id, SEKARANG), tolak(403));
    await assert.rejects(hapusRisiko(direktur, id), tolak(403));
    // Hak tulis diperiksa sebelum isian dan Unit, supaya penolakan tidak membuka keterangan Unit.
    const ditutup = await unitBaru("Tertutup");
    await aturAktifUnit(await adminSistem(), ditutup.id, false);
    await assert.rejects(simpanRisiko(direktur, isian(ditutup.id, { uraian: "" }), undefined, SEKARANG), tolak(403));

    const semua = await daftarRisiko(await komiteMutu(), { tahun: 2025 });
    assert.ok(semua.some((r) => r.id === id));
    await assert.rejects(ambilRisiko(kepala, "bukan-uuid"), tolak(404));
  });

  it("register satu Unit urut Nilai Risiko tertinggi dan membawa jumlah Dokumen Review", async () => {
    const komite = await komiteMutu();
    const u = await unitBaru("Urut");
    const rendah = await simpanRisiko(komite, isian(u.id, { probabilitas: 1, dampak: 1 }), undefined, SEKARANG);
    const tinggi = await simpanRisiko(komite, isian(u.id, { probabilitas: 5, dampak: 5 }), undefined, SEKARANG);
    await simpanRisiko(komite, isian(u.id, { tahun: 2024 }), undefined, SEKARANG);
    await tambahDokumenRisiko(komite, rendah, { nama: "review.pdf", isi: PDF });
    const daftar = await daftarRisiko(komite, { tahun: 2026, unitId: u.id });
    assert.deepEqual(
      daftar.map((r) => [r.id, r.awal.nilai, r.jumlahDokumen]),
      [
        [tinggi, 25, 0],
        [rendah, 1, 1],
      ],
    );
  });

  it("Dokumen Review: PDF, DOC, DOCX menurut isinya, paling banyak 5; dihapus bersama Risiko", async () => {
    assert.equal(jenisDokumenRisiko(PDF), "application/pdf");
    assert.equal(jenisDokumenRisiko(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0])), "application/msword");
    assert.equal(jenisDokumenRisiko(DOCX), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(jenisDokumenRisiko(Buffer.from([0xff, 0xd8, 0xff])), null);
    assert.equal(contentDisposition("attachment", "Notulen 'Rapat' (final)*.docx"), "attachment; filename*=UTF-8''Notulen%20%27Rapat%27%20%28final%29%2A.docx");

    const petugas = await sebagai("petugasInputData");
    const id = await simpanRisiko(petugas, isian(petugas.unitIds[0]), undefined, SEKARANG);
    await assert.rejects(tambahDokumenRisiko(petugas, id, { nama: "foto.jpg", isi: Buffer.from([0xff, 0xd8, 0xff]) }), {
      status: 400,
      message: "Berkas foto.jpg bukan PDF, DOC, atau DOCX.",
    });
    const dokumenId = await tambahDokumenRisiko(petugas, id, { nama: "../Review Maret.pdf", isi: PDF });
    for (let i = 0; i < 4; i++) await tambahDokumenRisiko(petugas, id, { nama: `r${i}.docx`, isi: DOCX });
    await assert.rejects(tambahDokumenRisiko(petugas, id, { nama: "lebih.pdf", isi: PDF }), { status: 400 });

    const berkas = await ambilBerkasDokumenRisiko(petugas, dokumenId);
    assert.deepEqual([berkas.nama, berkas.jenis, Buffer.from(berkas.isi).equals(PDF)], ["Review Maret.pdf", "application/pdf", true]);
    await assert.rejects(ambilBerkasDokumenRisiko(await sebagai("kepalaUnit"), dokumenId), tolak(403));
    await assert.rejects(tambahDokumenRisiko(await sebagai("direktur"), id, { nama: "x.pdf", isi: PDF }), tolak(403));

    await hapusDokumenRisiko(petugas, dokumenId);
    assert.equal((await ambilRisiko(petugas, id)).dokumen.length, 4);
    await hapusRisiko(petugas, id);
    await assert.rejects(ambilRisiko(petugas, id), tolak(404));
    const jejak = (await daftarJejak(await komiteMutu(), { entitas: "risiko" })).find((j) => j.entitasId === id);
    assert.match(jejak!.ringkasan, /^Menghapus Risiko "Pasien jatuh dari tempat tidur"/);
  });
});
