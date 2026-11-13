import { labelBulan } from "@/lib/bulan";
import { formatAngka } from "@/lib/capaian";
import { KELOMPOK, TANDA_ARAH, urutKelompok, type Arah, type Kelompok } from "@/lib/indikator";
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
  /** id baris di aplikasi lama, untuk memetakan isiannya. */
  id: string;
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
      id: r.id!,
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

/** Indikator yang sudah ada di MutuRS (13 INM dan hasil impor sebelumnya); definisi N/D untuk menunda riwayat isian. */
export type IndikatorAda = { kode: string; nama: string; kelompok: Kelompok; definisiNumerator?: string; definisiDenominator?: string };

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
  /** Baris aplikasi lama (id dan Unit-nya) yang menjadi Indikator ini, untuk memetakan isiannya. */
  sumber: { id: string; unit: string }[];
  /**
   * Definisi N dan D di MutuRS sudah lengkap. Bila belum, riwayat isian ditunda: Pengukuran mengunci definisi N/D,
   * jadi Komite Mutu melengkapinya dulu lalu impor dijalankan lagi.
   */
  definisiLengkap: boolean;
};

export type Rencana = { mulai: string; unit: string[]; indikator: RencanaIndikator[] };

/** Kunci nama yang sama: huruf kecil, tanpa spasi dan tanda baca; isi kurung tetap ("Waktu Tunggu (IGD)" ≠ "(Rawat Jalan)"). */
const kunciNama = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Hanya untuk mencocokkan INM: isi kurung juga dibuang, mis. "... Diri (APD)" = "... Diri". */
const kunciInm = (s: string) => kunciNama(s.replace(/\([^)]*\)/g, " "));
const kata = (s: string) => new Set(s.toLowerCase().replace(/[()]/g, " ").split(/[^a-z0-9]+/).filter(Boolean));

/**
 * INM MutuRS untuk nama INM aplikasi lama: nama yang sama setelah dinormalkan (`kunciInm`: huruf kecil, tanpa isi kurung
 * dan tanda baca), atau bila tidak ada, kata-kata nama yang lebih pendek hampir semuanya (≥ 75%) ada di nama yang lain, mis.
 * "Kepatuhan Penggunaan APD". Yang kedua ditandai `mirip` untuk diperiksa Komite Mutu.
 */
export function cocokkanInm(nama: string, inm: IndikatorAda[]) {
  const sama = inm.find((i) => kunciInm(i.nama) === kunciInm(nama));
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
const labelTarget = (arah: Arah, nilai: number) => `${TANDA_ARAH[arah]} ${formatAngka(nilai)}`;

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
  /** Beberapa nama lama yang jatuh ke Indikator yang sama (mis. dua ejaan satu INM) digabung Unit dan catatannya. */
  const gabung = (r: RencanaIndikator) => {
    const sebelumnya = hasil.get(r.kode);
    if (!sebelumnya) return void hasil.set(r.kode, r);
    sebelumnya.unit = [...new Map([...sebelumnya.unit, ...r.unit].map((u) => [u.toLowerCase(), u])).values()];
    sebelumnya.namaV1 = [...new Set([...sebelumnya.namaV1, ...r.namaV1])];
    sebelumnya.catatan.push(...r.catatan);
    sebelumnya.sumber.push(...r.sumber);
  };
  const lengkap = (n?: string, d?: string) => n !== BELUM_DIISI && d !== BELUM_DIISI;

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

    // Arah terbanyak, lalu Target terbanyak di antara baris ber-Arah itu, supaya keduanya dari baris yang sama.
    const arah = terbanyak(grup.map((b) => b.arah)).nilai;
    const target = terbanyak(grup.filter((b) => b.arah === arah).map((b) => b.target)).nilai;
    // Dihitung per baris: aplikasi lama bisa punya beberapa baris Indikator yang sama di satu Unit.
    const varian = terbanyak(grup, (b) => `${b.arah}|${b.target}`).semua;
    const daftarVarian = (v: typeof varian) => v.map((t) => `${labelTarget(t.nilai.arah, t.nilai.target)} pada ${t.n} baris`).join(", ");
    if (varian.length > 1 && !inmCocok) {
      catatan.push(`Target aplikasi lama tidak sama (${daftarVarian(varian)}); dipakai ${labelTarget(arah, target)}.`);
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
        arah,
        frekuensi: "bulanan",
        pic: "",
      },
      target,
      unit,
      namaV1: [...new Set(grup.map((b) => b.nama))],
      catatan,
      belumDiisi: inmCocok ? [] : belumDiisi,
      sumber: grup.map((b) => ({ id: b.id, unit: b.unit })),
      definisiLengkap: inmCocok
        ? lengkap(inmCocok.definisiNumerator, inmCocok.definisiDenominator)
        : lengkap(definisiN || BELUM_DIISI, definisiD || BELUM_DIISI),
    };
    if (inmCocok) {
      // INM selalu memakai Target PMK; yang dicatat hanya Target aplikasi lama yang berbeda darinya.
      const t = opsi.targetInm[inmCocok.kode];
      const beda = t === undefined ? [] : varian.filter((v) => v.nilai.target !== t);
      if (beda.length > 0) catatan.push(`Target aplikasi lama ${daftarVarian(beda)}; MutuRS tetap memakai Target PMK ${formatAngka(t)}.`);
      gabung(r);
      continue;
    }
    // Rencana ulang atas database yang sudah diimpor: Indikator bernama sama dipakai ulang dengan kodenya.
    const ada = opsi.ada.find((i) => i.kelompok !== "INM" && kunciNama(i.nama) === kunciNama(namaMutuRs));
    if (ada) {
      gabung(Object.assign(r, { kode: ada.kode, kelompok: ada.kelompok, sudahAda: true, definisiLengkap: lengkap(ada.definisiNumerator, ada.definisiDenominator) }));
    }
    else baru.push(r);
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

  const indikator = [...hasil.values()].sort(urutKelompok);
  for (const r of indikator) r.unit.sort((a, b) => a.localeCompare(b, "id"));
  const unit = [...new Map(indikator.flatMap((r) => r.unit).map((u) => [u.toLowerCase(), u])).values()].sort((a, b) => a.localeCompare(b, "id"));
  return { mulai: opsi.mulai, unit, indikator };
}

/** Satu isian `mutu_entries` aplikasi lama: harian atau sebulan sekali, N dan D bilangan bulat. */
export type IsianV1 = { indikatorId: string; tanggal: string; n: number; d: number };

/** Isian aplikasi lama dari dump (kolom alasan tidak tercapai tidak dibaca). */
export const isianDariDump = (isi: IsiDump): IsianV1[] =>
  isi.mutu_entries.map((e) => ({ indikatorId: e.indikator_mutu_id!, tanggal: e.tanggal!, n: Number(e.numerator), d: Number(e.denominator) }));

/** Satu Pengukuran riwayat: N dan D isian satu bulan dijumlahkan (ΣN/ΣD), `isian` = jumlah isian lamanya. */
export type PengukuranRiwayat = { kode: string; unit: string; bulan: string; n: number; d: number; isian: number };
export type Riwayat = {
  sampai: string;
  pengukuran: PengukuranRiwayat[];
  /** Indikator yang riwayatnya ditunda karena definisi N/D belum lengkap, dengan jumlah isiannya. */
  ditunda: { kode: string; nama: string; isian: number }[];
  /** Isian setelah bulan `sampai` (masih diisi di aplikasi lama; diimpor dengan dump berikutnya). */
  setelahBatas: number;
  /** Isian milik baris Indikator lama yang nonaktif, terhapus, atau tanpa Unit (tidak ikut rencana). */
  tanpaIndikator: number;
};

/**
 * Riwayat isian per Indikator + Unit + bulan sampai bulan `sampai`: isian harian dan isian bulanan sama-sama
 * dijumlahkan per bulan. Aturan angka (mis. N ≤ D) diperiksa service saat dijalankan, bukan di sini.
 */
export function susunRiwayat(r: Rencana, isian: IsianV1[], opsi: { sampai: string }): Riwayat {
  const baris = new Map(r.indikator.flatMap((i) => i.sumber.map((s) => [s.id, { i, unit: s.unit }] as const)));
  const hasil = new Map<string, PengukuranRiwayat>();
  const ditunda = new Map<string, { kode: string; nama: string; isian: number }>();
  let setelahBatas = 0;
  let tanpaIndikator = 0;
  for (const e of isian) {
    const m = baris.get(e.indikatorId);
    const bulan = e.tanggal.slice(0, 7);
    if (!m) tanpaIndikator++;
    else if (bulan > opsi.sampai) setelahBatas++;
    else if (!m.i.definisiLengkap) {
      const t = ditunda.get(m.i.kode) ?? { kode: m.i.kode, nama: m.i.nama, isian: 0 };
      t.isian++;
      ditunda.set(m.i.kode, t);
    } else {
      const kunci = `${m.i.kode}|${m.unit.toLowerCase()}|${bulan}`;
      const p = hasil.get(kunci) ?? { kode: m.i.kode, unit: m.unit, bulan, n: 0, d: 0, isian: 0 };
      p.n += e.n;
      p.d += e.d;
      p.isian++;
      hasil.set(kunci, p);
    }
  }
  const pengukuran = [...hasil.values()].sort(
    (a, b) => a.kode.localeCompare(b.kode) || a.unit.localeCompare(b.unit, "id") || a.bulan.localeCompare(b.bulan),
  );
  return { sampai: opsi.sampai, pengukuran, ditunda: [...ditunda.values()], setelahBatas, tanpaIndikator };
}

/** Hasil menjalankan rencana (diisi pelaksana); tanpa hasil = pratinjau. */
export type HasilImpor = { dibuat: { unit: number; indikator: number; unitPelapor: number; pengukuran: number }; gagal: string[] };

const sel = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");

function bagianRiwayat(rw: Riwayat) {
  const isian = rw.pengukuran.reduce((n, p) => n + p.isian, 0);
  const bulan = rw.pengukuran.map((p) => p.bulan).sort();
  return [
    "",
    "## Riwayat isian aplikasi lama",
    "",
    `- Sampai ${labelBulan(rw.sampai)}: ${rw.pengukuran.length} Pengukuran dari ${isian} isian` +
      (bulan.length > 0 ? ` (${labelBulan(bulan[0])} sampai ${labelBulan(bulan.at(-1)!)})` : "") +
      ". Isian harian dijumlahkan per bulan. Langsung Terverifikasi; Riwayat Status-nya mencatat asal impor.",
    "- Unit Pelapor Indikator yang punya riwayat dimulai sejak bulan isian pertamanya.",
    ...(rw.ditunda.length > 0
      ? [
          "- Ditunda karena definisi N/D belum lengkap (Pengukuran mengunci definisi; lengkapi dulu, lalu jalankan impor lagi): " +
            rw.ditunda.map((t) => `${t.kode} ${t.nama} (${t.isian} isian)`).join("; ") + ".",
        ]
      : []),
    ...(rw.setelahBatas > 0 ? [`- ${rw.setelahBatas} isian setelah ${labelBulan(rw.sampai)} belum diimpor; jalankan lagi dengan dump yang lebih baru.`] : []),
    ...(rw.tanpaIndikator > 0 ? [`- ${rw.tanpaIndikator} isian milik Indikator aplikasi lama yang nonaktif atau terhapus tidak diimpor.`] : []),
  ];
}

/** Daftar periksa Markdown untuk Komite Mutu: ringkasan, yang harus dilengkapi, Unit, lalu Indikator per kelompok. */
export function daftarPeriksa(r: Rencana, sumber: string, hasil?: HasilImpor, riwayat?: Riwayat) {
  const jumlah = (k: Kelompok) => r.indikator.filter((i) => i.kelompok === k).length;
  const belum = r.indikator.filter((i) => i.belumDiisi.length > 0);
  const baris = [
    "# Daftar periksa impor aplikasi mutu lama",
    "",
    `Sumber: ${sumber}. Bulan peralihan (Unit Pelapor dan Target mulai berlaku): ${labelBulan(r.mulai)}.`,
    hasil
      ? `Hasil: dibuat ${hasil.dibuat.unit} Unit, ${hasil.dibuat.indikator} Indikator, ${hasil.dibuat.unitPelapor} Unit Pelapor, ${hasil.dibuat.pengukuran} Pengukuran; yang sudah ada dilewati.`
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
    ...(riwayat ? bagianRiwayat(riwayat) : []),
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
