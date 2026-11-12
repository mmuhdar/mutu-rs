import { labelBulan } from "@/lib/bulan";
import { KELOMPOK, TANDA_ARAH, type Arah, type Kelompok } from "@/lib/indikator";
import type { IsianIndikator } from "@/modules/indikator/service";

import type { IsiDump } from "./dump";

/*
 * Rencana impor pengaturan aplikasi mutu lama (murni, tanpa database): Unit, Indikator, Target, dan Unit Pelapor yang
 * akan dibuat, beserta catatan untuk daftar periksa Komite Mutu. Keputusan pemetaannya ada di spec Rilis 4.
 */

/** Pengisi field yang tidak ada di aplikasi lama; dilengkapi Komite Mutu sebelum isian pertama. */
export const BELUM_DIISI = "Belum diisi (dari aplikasi lama)";

/** Satu baris `indikator_mutus` aplikasi lama yang sudah dibaca. */
export type IndikatorV1 = {
  unit: string;
  master: string | null;
  nama: string;
  jenis: string;
  definisi: string;
  inklusi: string;
  eksklusi: string;
  definisiN: string;
  definisiD: string;
  arah: Arah;
  target: number;
  satuan: string;
};

const rapi = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
/** Teks panjang: spasi di tepi dibuang, baris baru dipertahankan. */
const rapiTeks = (s: string | null | undefined) => (s ?? "").replace(/\r\n?/g, "\n").trim();

/** Baris Indikator aplikasi lama yang aktif dan tidak terhapus, dengan nama Unit dan nama master. */
export function dariDump(isi: IsiDump): IndikatorV1[] {
  const namaUnit = new Map(isi.units.map((u) => [u.id, rapi(u.nama)]));
  const namaMaster = new Map(isi.master_indikator_mutus.map((m) => [m.id, rapi(m.nama)]));
  return isi.indikator_mutus
    .filter((r) => r.is_active === "1" && !r.deleted_at && r.unit_id && namaUnit.get(r.unit_id))
    .map((r) => ({
      unit: namaUnit.get(r.unit_id!)!,
      master: (r.master_indikator_id && namaMaster.get(r.master_indikator_id)) || null,
      nama: rapi(r.nama_indikator),
      jenis: rapi(r.type) || "INM",
      definisi: rapiTeks(r.definisi_operasional),
      inklusi: rapiTeks(r.inklusi),
      eksklusi: rapiTeks(r.eksklusi),
      definisiN: rapiTeks(r.definisi_numerator),
      definisiD: rapiTeks(r.definisi_denominator),
      arah: r.operator === "<=" ? "makinRendah" : "makinTinggi",
      target: Number(r.target ?? 100),
      satuan: rapi(r.satuan) || "%",
    }));
}

/** Indikator yang sudah ada di MutuRS (13 INM dan hasil impor sebelumnya). */
export type IndikatorAda = { kode: string; nama: string; kelompok: Kelompok };

export type RencanaIndikator = {
  kode: string;
  kelompok: Kelompok;
  nama: string;
  /** Sudah ada di MutuRS (INM, atau impor sebelumnya): tidak dibuat ulang dan tidak diubah, hanya Unit Pelapor. */
  sudahAda: boolean;
  isian: IsianIndikator;
  target: number;
  unit: string[];
  namaV1: string[];
  catatan: string[];
  /** Field yang berisi `BELUM_DIISI` (selain Sumber Data, yang selalu). */
  belumDiisi: string[];
};

export type Rencana = { mulai: string; unit: string[]; indikator: RencanaIndikator[] };

const kunciNama = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]/g, "");
const kata = (s: string) => new Set(s.toLowerCase().replace(/[()]/g, " ").split(/[^a-z0-9]+/).filter(Boolean));

/**
 * INM MutuRS untuk nama INM aplikasi lama: nama yang sama setelah dinormalkan (huruf kecil, tanpa isi kurung dan tanda
 * baca), atau bila tidak ada, kata-kata nama yang lebih pendek hampir semuanya (≥ 75%) ada di nama yang lain, mis.
 * "Kepatuhan Penggunaan APD". Yang kedua ditandai `mirip` untuk diperiksa Komite Mutu.
 */
export function cocokkanInm(nama: string, inm: IndikatorAda[]) {
  const sama = inm.find((i) => kunciNama(i.nama) === kunciNama(nama));
  if (sama) return { inm: sama, mirip: false };
  const a = kata(nama);
  const skor = (i: IndikatorAda) => {
    const b = kata(i.nama);
    return [...a].filter((k) => b.has(k)).length / Math.min(a.size, b.size);
  };
  const terbaik = inm.map((i) => ({ i, s: skor(i) })).sort((x, y) => y.s - x.s)[0];
  return terbaik && terbaik.s >= 0.75 && a.size >= 2 ? { inm: terbaik.i, mirip: true } : null;
}

/** Nilai yang paling sering (seri: yang muncul lebih dulu) beserta hitungan semua nilai. */
function terbanyak<T>(nilai: T[], kunci: (x: T) => string = String) {
  const hitung = new Map<string, { nilai: T; n: number }>();
  for (const x of nilai) {
    const k = kunci(x);
    const ada = hitung.get(k);
    if (ada) ada.n++;
    else hitung.set(k, { nilai: x, n: 1 });
  }
  const urut = [...hitung.values()].sort((a, b) => b.n - a.n);
  return { nilai: urut[0].nilai, semua: urut };
}

const teksTerbanyak = (nilai: string[]) => {
  const isi = nilai.filter(Boolean);
  return isi.length > 0 ? terbanyak(isi).nilai : "";
};

const AWALAN_KODE: Record<Exclude<Kelompok, "INM">, string> = { "IMP-RS": "IMP-RS-", "IMP-Unit": "IMP-UNIT-", SPM: "SPM-" };
const labelTarget = (arah: Arah, nilai: number) => `${TANDA_ARAH[arah]} ${String(nilai).replace(".", ",")}`;

/**
 * Menyusun rencana dari baris aplikasi lama. Baris dikelompokkan per master nama (cadangan: nama yang dinormalkan).
 * Kelompok: INM yang cocok dengan INM MutuRS; IMP RS; IMP Unit di satu Unit, atau IMP-RS bila di beberapa Unit; SPM.
 * Kode baru urut nama per kelompok, melanjutkan nomor tertinggi yang sudah ada; Indikator yang namanya sudah ada di
 * MutuRS dipakai ulang, jadi rencana untuk database yang sudah diimpor tidak membuat apa pun lagi.
 */
export function susunRencana(baris: IndikatorV1[], opsi: { mulai: string; ada: IndikatorAda[]; targetInm: Record<string, number> }): Rencana {
  const inm = opsi.ada.filter((i) => i.kelompok === "INM");
  const kelompokBaris = Map.groupBy(baris, (b) => (b.master ? `m:${b.master.toLowerCase()}` : `n:${kunciNama(b.nama)}`));
  const hasil = new Map<string, RencanaIndikator>();
  const baru: RencanaIndikator[] = [];

  for (const grup of kelompokBaris.values()) {
    const nama = grup[0].master ?? terbanyak(grup.map((b) => b.nama)).nilai;
    const unit = [...new Map(grup.map((b) => [b.unit.toLowerCase(), b.unit])).values()];
    const catatan: string[] = [];
    const jenis = terbanyak(grup.map((b) => b.jenis));
    if (jenis.semua.length > 1) {
      catatan.push(`Jenis di aplikasi lama berbeda (${jenis.semua.map((j) => `${j.nilai} ${j.n}`).join(", ")}); dipakai ${jenis.nilai}.`);
    }

    let kelompok: Kelompok;
    let inmCocok: IndikatorAda | null = null;
    if (jenis.nilai === "INM") {
      const c = cocokkanInm(nama, inm);
      if (c) {
        inmCocok = c.inm;
        if (c.mirip) catatan.push(`Dicocokkan dengan ${c.inm.kode} menurut kemiripan nama; periksa.`);
      } else catatan.push("Berjenis INM di aplikasi lama tetapi tidak cocok dengan 13 INM PMK 30/2022; dijadikan IMP-RS.");
      kelompok = c ? "INM" : "IMP-RS";
    } else if (jenis.nilai === "IMP Unit") {
      kelompok = unit.length === 1 ? "IMP-Unit" : "IMP-RS";
      if (unit.length > 1) catatan.push(`IMP Unit di ${unit.length} Unit pada aplikasi lama; dijadikan IMP-RS.`);
    } else if (jenis.nilai === "SPM") kelompok = "SPM";
    else {
      kelompok = "IMP-RS";
      if (jenis.nilai !== "IMP RS") catatan.push(`Jenis "${jenis.nilai}" tidak dikenal; dijadikan IMP-RS.`);
    }

    const arah = terbanyak(grup.map((b) => b.arah));
    const target = terbanyak(grup, (b) => `${b.arah}|${b.target}`);
    if (target.semua.length > 1) {
      catatan.push(
        `Target aplikasi lama berbeda antar-Unit (${target.semua.map((t) => `${labelTarget(t.nilai.arah, t.nilai.target)} di ${t.n} Unit`).join(", ")}); dipakai yang terbanyak.`,
      );
    }
    const satuanLain = [...new Set(grup.map((b) => b.satuan).filter((s) => s !== "%"))];
    if (satuanLain.length > 0) catatan.push(`Satuan aplikasi lama ${satuanLain.join(", ")}; diimpor sebagai % (faktor 100), periksa.`);

    const definisi = teksTerbanyak(grup.map((b) => b.definisi));
    const inklusi = teksTerbanyak(grup.map((b) => b.inklusi));
    const eksklusi = teksTerbanyak(grup.map((b) => b.eksklusi));
    const definisiN = teksTerbanyak(grup.map((b) => b.definisiN));
    const definisiD = teksTerbanyak(grup.map((b) => b.definisiD));
    const belumDiisi = [!definisi && "definisi operasional", !definisiN && "definisi Numerator", !definisiD && "definisi Denominator"].filter(
      (x): x is string => Boolean(x),
    );
    let namaMutuRs = inmCocok?.nama ?? nama;
    if (namaMutuRs.length > 200) {
      catatan.push("Nama lebih dari 200 karakter; dipotong.");
      namaMutuRs = namaMutuRs.slice(0, 200).trim();
    }

    const r: RencanaIndikator = {
      kode: inmCocok?.kode ?? "",
      kelompok,
      nama: namaMutuRs,
      sudahAda: Boolean(inmCocok),
      isian: {
        nama: namaMutuRs,
        definisiOperasional: [definisi || BELUM_DIISI, inklusi && `Inklusi: ${inklusi}`, eksklusi && `Eksklusi: ${eksklusi}`].filter(Boolean).join("\n\n"),
        definisiNumerator: definisiN || BELUM_DIISI,
        definisiDenominator: definisiD || BELUM_DIISI,
        sumberData: BELUM_DIISI,
        faktor: 100,
        satuan: "%",
        arah: arah.nilai,
        frekuensi: "bulanan",
        pic: "",
      },
      target: target.nilai.target,
      unit,
      namaV1: [...new Set(grup.map((b) => b.nama))],
      catatan,
      belumDiisi: inmCocok ? [] : belumDiisi,
    };
    if (inmCocok) {
      const t = opsi.targetInm[inmCocok.kode];
      if (t !== undefined && t !== r.target) {
        catatan.push(`Target aplikasi lama ${labelTarget(target.nilai.arah, r.target)}; MutuRS tetap memakai Target PMK ${t}.`);
      }
      // Dua nama lama yang cocok ke INM yang sama digabung.
      const sebelumnya = hasil.get(inmCocok.kode);
      if (sebelumnya) {
        sebelumnya.unit = [...new Map([...sebelumnya.unit, ...unit].map((u) => [u.toLowerCase(), u])).values()];
        sebelumnya.namaV1 = [...new Set([...sebelumnya.namaV1, ...r.namaV1])];
        sebelumnya.catatan.push(...catatan);
        continue;
      }
      hasil.set(inmCocok.kode, r);
      continue;
    }
    const ada = opsi.ada.find((i) => i.kelompok !== "INM" && kunciNama(i.nama) === kunciNama(namaMutuRs));
    if (ada) {
      Object.assign(r, { kode: ada.kode, kelompok: ada.kelompok, sudahAda: true });
      hasil.set(ada.kode, r);
    } else baru.push(r);
  }

  // Kode baru: urut nama per kelompok, melanjutkan nomor tertinggi yang sudah dipakai.
  for (const [kelompok, awalan] of Object.entries(AWALAN_KODE) as [Exclude<Kelompok, "INM">, string][]) {
    const pola = new RegExp(`^${awalan}(\\d+)$`, "i");
    let nomor = Math.max(0, ...opsi.ada.map((i) => Number(pola.exec(i.kode)?.[1] ?? 0)));
    for (const r of baru.filter((x) => x.kelompok === kelompok).sort((a, b) => a.nama.localeCompare(b.nama, "id"))) {
      r.kode = `${awalan}${String(++nomor).padStart(2, "0")}`;
      hasil.set(r.kode, r);
    }
  }

  const indikator = [...hasil.values()].sort(
    (a, b) => KELOMPOK.indexOf(a.kelompok) - KELOMPOK.indexOf(b.kelompok) || a.kode.localeCompare(b.kode, "id", { numeric: true }),
  );
  for (const r of indikator) r.unit.sort((a, b) => a.localeCompare(b, "id"));
  const unit = [...new Map(indikator.flatMap((r) => r.unit).map((u) => [u.toLowerCase(), u])).values()].sort((a, b) => a.localeCompare(b, "id"));
  return { mulai: opsi.mulai, unit, indikator };
}

/** Hasil menjalankan rencana (diisi pelaksana); tanpa hasil = pratinjau. */
export type HasilImpor = { dibuat: { unit: number; indikator: number; unitPelapor: number }; gagal: string[] };

const sel = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");

/** Daftar periksa Markdown untuk Komite Mutu: ringkasan, yang harus dilengkapi, Unit, lalu Indikator per kelompok. */
export function daftarPeriksa(r: Rencana, sumber: string, hasil?: HasilImpor) {
  const jumlah = (k: Kelompok) => r.indikator.filter((i) => i.kelompok === k).length;
  const belum = r.indikator.filter((i) => i.belumDiisi.length > 0);
  const baris = [
    "# Daftar periksa impor aplikasi mutu lama",
    "",
    `Sumber: ${sumber}. Bulan peralihan (Unit Pelapor dan Target mulai berlaku): ${labelBulan(r.mulai)}.`,
    hasil
      ? `Hasil: dibuat ${hasil.dibuat.unit} Unit, ${hasil.dibuat.indikator} Indikator, ${hasil.dibuat.unitPelapor} Unit Pelapor; yang sudah ada dilewati.`
      : "Pratinjau: belum ada yang disimpan (jalankan dengan --jalankan).",
    "",
    `${r.unit.length} Unit, ${r.indikator.length} Indikator (${KELOMPOK.map((k) => `${k} ${jumlah(k)}`).join(", ")}), ` +
      `${r.indikator.reduce((n, i) => n + i.unit.length, 0)} Unit Pelapor.`,
    "",
    "## Yang harus dilengkapi Komite Mutu sebelum isian pertama",
    "",
    `- Sumber Data setiap Indikator baru masih "${BELUM_DIISI}". Definisi N dan D terkunci setelah ada Pengukuran, jadi lengkapi dulu.`,
    ...belum.map((i) => `- ${i.kode}, ${i.nama}: ${i.belumDiisi.join(", ")}.`),
    "- Periksa setiap catatan di tabel di bawah, terutama INM yang dicocokkan menurut kemiripan nama dan Target yang berbeda.",
    ...(hasil && hasil.gagal.length > 0 ? ["", "## Gagal", "", ...hasil.gagal.map((g) => `- ${g}`)] : []),
    "",
    `## Unit (${r.unit.length})`,
    "",
    r.unit.join(", ") + ".",
  ];
  for (const k of KELOMPOK) {
    const daftar = r.indikator.filter((i) => i.kelompok === k);
    if (daftar.length === 0) continue;
    baris.push("", `## ${k} (${daftar.length})`, "", "| Kode | Nama | Nama di aplikasi lama | Target | Unit Pelapor | Catatan |", "|---|---|---|---|---|---|");
    for (const i of daftar) {
      const namaLama = i.namaV1.filter((n) => n !== i.nama);
      baris.push(
        `| ${i.kode}${i.sudahAda ? " (sudah ada)" : ""} | ${sel(i.nama)} | ${sel(namaLama.join("; ")) || "sama"} | ${i.sudahAda ? "tetap" : labelTarget(i.isian.arah, i.target)} | ${i.unit.length}: ${sel(i.unit.join(", "))} | ${sel(i.catatan.join(" ")) || "tidak ada"} |`,
      );
    }
  }
  return baris.join("\n") + "\n";
}
