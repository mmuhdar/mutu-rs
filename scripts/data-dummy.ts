// Data dummy untuk database dev, semuanya lewat service: Unit, Pengguna per peran, IMP, Unit Pelapor, Pengukuran
// 12 bulan sampai bulan lalu (berbagai status), Analisis, Tindak Lanjut, PDSA, dan Rekomendasi. Jalankan sekali:
//   npx tsx --env-file=.env scripts/data-dummy.ts
// Semua Pengguna dummy bersandi SANDI. Tanpa top-level await: tsx menjalankan .ts sebagai CJS.
import { bulanBerjalan, bulanLalu, geserBulan, triwulanLalu } from "@/lib/bulan";
import { config } from "@/lib/config";
import { diukurPadaBulan } from "@/lib/indikator";
import { getPool } from "@/db";
import { masuk, penggunaDariToken, type Pengguna } from "@/modules/auth/service";
import { daftarIndikator, tambahIndikator, tambahUnitPelapor, type IndikatorBaru } from "@/modules/indikator/service";
import { simpanRekomendasi } from "@/modules/laporan/service";
import { daftarPengguna, tambahPengguna } from "@/modules/pengguna/service";
import { ajukanPengukuran, kembalikanPengukuran, simpanPengukuran, verifikasiPengukuran } from "@/modules/pengukuran/service";
import { buatPdsa, simpanAnalisis, simpanTahapPdsa, tambahTindakLanjut, ubahTindakLanjut } from "@/modules/perbaikan/service";
import { daftarUnit, tambahUnit } from "@/modules/unit/service";

const SANDI = "mutu12345";

const UNIT = {
  icu: "ICU",
  igd: "IGD",
  mawar: "Rawat Inap Mawar",
  melati: "Rawat Inap Melati",
  ok: "Kamar Operasi",
  rajal: "Rawat Jalan",
  lab: "Laboratorium",
  farmasi: "Farmasi",
  humas: "Humas",
} as const;
type KodeUnit = keyof typeof UNIT;

/** Nama [Kepala Unit, Petugas Input Data] per Unit. */
const ORANG: Record<KodeUnit, [string, string]> = {
  icu: ["Ns. Yohanes Batara", "Ns. Fitri Handayani"],
  igd: ["dr. Andi Saputra", "Ns. Rini Pratiwi"],
  mawar: ["Ns. Maria Tandi", "Ns. Ayu Lestari"],
  melati: ["Ns. Siti Rahma", "Ns. Bayu Firmansyah"],
  ok: ["Ns. Agus Salim", "Ns. Nurul Hidayah"],
  rajal: ["Ns. Lina Marlina", "Rudi Hartono, A.Md.Kep"],
  lab: ["Wahyu Nugroho, S.Tr.AK", "Dian Puspita, A.Md.AK"],
  farmasi: ["apt. Ratna Sari", "Eko Prasetyo, A.Md.Farm"],
  humas: ["Hendra Gunawan, S.Sos", "Putri Amelia"],
};

/** Pola nilai: D per bulan [min, maks], sebaran acak, dan Capaian tiap Unit Pelapor dari bulan pertama ke terakhir. */
type Pola = { d: [number, number]; sebar?: number; unit: Partial<Record<KodeUnit, [number, number]>> };

const POLA_INM: Record<string, Pola> = {
  "INM-01": { d: [180, 240], unit: { icu: [86, 92], igd: [70, 84], mawar: [84, 90], melati: [83, 89], ok: [72, 86] } },
  "INM-02": { d: [40, 70], unit: { icu: [97, 100], igd: [92, 98], ok: [96, 100] } },
  "INM-03": { d: [150, 250], unit: { icu: [98, 100], igd: [94, 99], mawar: [96, 100], melati: [95, 99], rajal: [93, 98] } },
  "INM-04": { d: [6, 14], sebar: 4, unit: { ok: [70, 86] } },
  "INM-05": { d: [1500, 2200], unit: { rajal: [72, 83] } },
  "INM-06": { d: [80, 120], sebar: 1.5, unit: { ok: [9, 4] } },
  "INM-07": { d: [300, 420], unit: { mawar: [80, 88], melati: [70, 79] } },
  "INM-08": { d: [20, 45], unit: { lab: [96, 100] } },
  "INM-09": { d: [2500, 3500], unit: { farmasi: [82, 90] } },
  "INM-10": { d: [30, 60], unit: { mawar: [75, 86], melati: [80, 88] } },
  "INM-11": { d: [120, 200], unit: { icu: [98, 100], mawar: [94, 99], melati: [96, 100] } },
  "INM-12": { d: [15, 35], sebar: 5, unit: { humas: [70, 90] } },
  "INM-13": { d: [100, 100], sebar: 1.5, unit: { rajal: [77, 81], mawar: [74, 79] } },
};

const akhir = bulanLalu();
const BULAN = Array.from({ length: 12 }, (_, i) => geserBulan(akhir, i - 11));
const b = (geser: number) => geserBulan(akhir, geser);
const berjalan = bulanBerjalan();

const persen = { faktor: 100, satuan: "%", arah: "makinTinggi", frekuensi: "bulanan" } as const;
const IMP: (IndikatorBaru & { pola: Pola })[] = [
  {
    kode: "IMP-RS-01",
    kelompok: "IMP-RS",
    nama: "Kelengkapan Pengisian Rekam Medis 24 Jam Setelah Pasien Pulang",
    definisiOperasional: "Rekam medis pasien rawat inap terisi lengkap oleh DPJP dan PPA paling lambat 24 jam setelah pasien pulang.",
    definisiNumerator: "Jumlah rekam medis pasien pulang yang lengkap dalam 24 jam",
    definisiDenominator: "Jumlah rekam medis pasien pulang pada bulan itu",
    sumberData: "Audit rekam medis",
    ...persen,
    pic: "Kepala Instalasi Rekam Medis",
    target: { nilai: 85, berlakuMulai: BULAN[0] },
    pola: { d: [150, 300], unit: { mawar: [78, 90], melati: [72, 86], icu: [85, 92] } },
  },
  {
    kode: "IMP-UNIT-IGD-01",
    kelompok: "IMP-Unit",
    nama: "Waktu Tanggap Pelayanan Dokter di IGD ≤ 5 Menit",
    definisiOperasional: "Pasien IGD dilayani dokter paling lambat 5 menit sejak tiba di IGD.",
    definisiNumerator: "Jumlah pasien IGD yang dilayani dokter ≤ 5 menit",
    definisiDenominator: "Jumlah pasien IGD pada bulan itu",
    sumberData: "Register IGD",
    ...persen,
    pic: "Kepala IGD",
    target: { nilai: 95, berlakuMulai: BULAN[0] },
    pola: { d: [1200, 1600], unit: { igd: [88, 96] } },
  },
  {
    kode: "IMP-UNIT-MAWAR-01",
    kelompok: "IMP-Unit",
    nama: "Angka Kejadian Phlebitis",
    definisiOperasional: "Peradangan vena akibat pemasangan kateter intravena perifer, per 1.000 hari pemasangan.",
    definisiNumerator: "Jumlah kejadian phlebitis",
    definisiDenominator: "Jumlah hari pemasangan kateter intravena perifer",
    sumberData: "Surveilans PPI",
    faktor: 1000,
    satuan: "‰",
    arah: "makinRendah",
    frekuensi: "bulanan",
    pic: "Kepala Ruang Mawar",
    target: { nilai: 1.5, berlakuMulai: BULAN[0] },
    pola: { d: [600, 900], sebar: 0.6, unit: { mawar: [3.2, 1.4] } },
  },
  {
    kode: "IMP-UNIT-LAB-01",
    kelompok: "IMP-Unit",
    nama: "Waktu Tunggu Hasil Laboratorium Rutin ≤ 140 Menit",
    definisiOperasional: "Hasil pemeriksaan laboratorium rutin diterima peminta paling lambat 140 menit sejak sampel diterima.",
    definisiNumerator: "Jumlah pemeriksaan rutin dengan hasil ≤ 140 menit",
    definisiDenominator: "Jumlah pemeriksaan laboratorium rutin",
    sumberData: "LIS laboratorium",
    ...persen,
    pic: "Kepala Instalasi Laboratorium",
    target: { nilai: 90, berlakuMulai: BULAN[0] },
    pola: { d: [2000, 3000], unit: { lab: [85, 93] } },
  },
];

/** Status dummy per Pengukuran: sebagian besar Terverifikasi, bulan lalu dibuat campur untuk antrean dan pemantauan. */
type StatusDummy = "terverifikasi" | "diajukan" | "draf" | "dikembalikan" | "kosong";
function statusDummy(kode: string, u: KodeUnit, bulan: string): StatusDummy {
  if (bulan === akhir) {
    if (u === "farmasi") return "kosong";
    if (u === "rajal") return "draf";
    if (u === "melati") return "diajukan";
    if (u === "igd" && kode === "INM-01") return "dikembalikan";
  }
  if (bulan === b(-1) && kode === "INM-06") return "diajukan";
  return "terverifikasi";
}

const acak = (min: number, maks: number) => min + Math.random() * (maks - min);

/** N dan D satu bulan: Capaian bergerak lurus dari `dari` ke `ke` sepanjang 12 bulan, ditambah sebaran acak. */
function angka(pola: Pola, [dari, ke]: [number, number], i: number, faktor: number) {
  const d = Math.round(acak(...pola.d));
  const sebar = pola.sebar ?? 2.5;
  let capaian = dari + ((ke - dari) * i) / 11 + acak(-sebar, sebar);
  if (faktor === 100) capaian = Math.min(100, capaian);
  const n = Math.max(0, Math.round((Math.max(0, capaian) * d) / faktor));
  return { n: faktor === 100 ? Math.min(n, d) : n, d };
}

async function sesi(username: string, sandi: string) {
  const p = await penggunaDariToken(await masuk({ username, sandi, ip: "127.0.0.1" }));
  if (!p) throw new Error(`Sesi ${username} tidak termuat.`);
  return p;
}

async function main() {
  const admin = await sesi(config.adminAwal.username, config.adminAwal.sandi);
  if ((await daftarPengguna(admin)).some((p) => p.username === "komite")) {
    console.log("Data dummy sudah ada (Pengguna komite ditemukan); tidak ada yang diubah.");
    return;
  }

  // Unit: pakai yang sudah ada bila namanya sama (mis. ICU).
  const adaUnit = await daftarUnit(admin);
  const unitId = {} as Record<KodeUnit, string>;
  for (const [k, nama] of Object.entries(UNIT) as [KodeUnit, string][]) {
    unitId[k] = adaUnit.find((u) => u.nama.toLowerCase() === nama.toLowerCase())?.id ?? (await tambahUnit(admin, { nama })).id;
  }

  // Pengguna.
  const buat = async (username: string, nama: string, peran: Pengguna["peran"], unitIds: string[] = []) => {
    await tambahPengguna(admin, { username, nama, sandi: SANDI, peran, unitIds });
    return sesi(username, SANDI);
  };
  const komite = await buat("komite", "Ns. Dewi Anggraini", "komiteMutu");
  await buat("direktur", "dr. Bambang Sutrisno, MARS", "direktur");
  const kepala = {} as Record<KodeUnit, Pengguna>;
  const petugas = {} as Record<KodeUnit, Pengguna>;
  for (const k of Object.keys(UNIT) as KodeUnit[]) {
    kepala[k] = await buat(`kepala.${k}`, ORANG[k][0], "kepalaUnit", [unitId[k]]);
    petugas[k] = await buat(`petugas.${k}`, ORANG[k][1], "petugasInputData", [unitId[k]]);
  }

  // IMP + Unit Pelapor (semua mulai bulan pertama, masih berlangsung).
  const pola: Record<string, Pola> = { ...POLA_INM };
  for (const { pola: p, ...imp } of IMP) {
    await tambahIndikator(komite, imp);
    pola[imp.kode] = p;
  }
  const indikator = new Map((await daftarIndikator(komite)).map((i) => [i.kode, i]));
  for (const [kode, p] of Object.entries(pola)) {
    for (const u of Object.keys(p.unit) as KodeUnit[]) {
      await tambahUnitPelapor(komite, indikator.get(kode)!.id, { unitId: unitId[u], bulanMulai: BULAN[0] });
    }
  }

  // Pengukuran.
  let jumlah = 0;
  for (const [i, bulan] of BULAN.entries()) {
    for (const [kode, p] of Object.entries(pola)) {
      const ind = indikator.get(kode)!;
      if (!diukurPadaBulan(ind.frekuensi, bulan)) continue;
      for (const [u, rentang] of Object.entries(p.unit) as [KodeUnit, [number, number]][]) {
        const status = statusDummy(kode, u, bulan);
        if (status === "kosong") continue;
        const isian = { indikatorId: ind.id, unitId: unitId[u], bulan, ...angka(p, rentang, i, ind.faktor) };
        jumlah++;
        if (status === "draf") {
          await simpanPengukuran(petugas[u], isian);
          continue;
        }
        const { id } = await ajukanPengukuran(petugas[u], isian);
        if (status === "terverifikasi") await verifikasiPengukuran(kepala[u], id);
        if (status === "dikembalikan") {
          await kembalikanPengukuran(kepala[u], id, "D tidak sama dengan jumlah peluang di lembar observasi; mohon dicek ulang.");
        }
      }
    }
  }

  // Analisis + Tindak Lanjut.
  const id = (kode: string) => indikator.get(kode)!.id;
  const tl = async (
    aktor: Pengguna,
    analisisId: string,
    isian: { tindakan: string; pic: string; tenggat: string },
    ubah?: { status: "berjalan" | "selesai" | "dibatalkan"; catatan?: string },
  ) => {
    const t = await tambahTindakLanjut(aktor, analisisId, isian);
    if (ubah) await ubahTindakLanjut(aktor, t.id, { ...isian, ...ubah });
  };

  const a1 = await simpanAnalisis(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    bulan: b(-1),
    teks:
      "Kepatuhan kebersihan tangan RS masih di bawah Target 85%. Penyumbang terbesar IGD dan Kamar Operasi: " +
      "handrub tidak tersedia di setiap bed, beban kerja tinggi saat jam sibuk, dan perawat baru belum mengikuti pelatihan 5 momen.",
  });
  await tl(komite, a1.id, { tindakan: "Audit kepatuhan kebersihan tangan mingguan di IGD dan Kamar Operasi", pic: "IPCN", tenggat: `${akhir}-28` }, { status: "berjalan" });
  await tl(
    komite,
    a1.id,
    { tindakan: "Pemasangan dispenser handrub di setiap bed IGD", pic: "Instalasi Sarana Prasarana", tenggat: `${akhir}-15` },
    { status: "selesai", catatan: "24 dispenser terpasang; stok handrub dipantau farmasi." },
  );
  await tl(komite, a1.id, {
    tindakan: "Pelatihan ulang 5 momen kebersihan tangan untuk perawat baru",
    pic: "Komite PPI",
    tenggat: `${geserBulan(berjalan, 1)}-15`,
  });

  const a2 = await simpanAnalisis(komite, {
    indikatorId: id("INM-07"),
    unitId: null,
    bulan: b(-1),
    teks: "Visite dokter sebelum pukul 14.00 belum mencapai Target, terutama di Rawat Inap Melati karena DPJP praktik poliklinik pagi.",
  });
  await tl(komite, a2.id, { tindakan: "Sosialisasi jadwal visite DPJP sebelum pukul 14.00", pic: "Kepala Bidang Pelayanan Medik", tenggat: `${berjalan}-20` });

  const a3 = await simpanAnalisis(komite, {
    indikatorId: id("INM-06"),
    unitId: null,
    bulan: b(-2),
    teks: "Penundaan operasi elektif melebihi 5%. Penyebab utama: jadwal OK bentrok dengan operasi cito dan pasien belum lengkap pemeriksaan pra-operasi.",
  });
  await tl(
    komite,
    a3.id,
    { tindakan: "Penjadwalan operasi elektif lewat antrean OK terpusat", pic: "Kepala Kamar Operasi", tenggat: `${akhir}-10` },
    { status: "dibatalkan", catatan: "Digantikan PDSA penjadwalan Kamar Operasi." },
  );

  const a4 = await simpanAnalisis(kepala.mawar, {
    indikatorId: id("IMP-UNIT-MAWAR-01"),
    unitId: unitId.mawar,
    bulan: b(-1),
    teks: "Kejadian phlebitis masih di atas 1,5‰. Ditemukan kateter IV terpasang lebih dari 96 jam tanpa label tanggal pemasangan.",
  });
  await tl(kepala.mawar, a4.id, { tindakan: "Label tanggal pemasangan pada setiap kateter IV dan penggantian tiap 72–96 jam", pic: "Kepala Ruang Mawar", tenggat: `${berjalan}-30` }, { status: "berjalan" });

  await simpanAnalisis(kepala.melati, {
    indikatorId: id("INM-07"),
    unitId: unitId.melati,
    bulan: b(-1),
    teks: "Tiga DPJP penyakit dalam visite setelah pukul 14.00 karena poliklinik pagi penuh.",
  });

  // PDSA: INM-01 RS siklus 1 Selesai + siklus 2 di Study; INM-06 RS di Do; phlebitis Mawar di Act; IGD Selesai.
  const p1 = await buatPdsa(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    judul: "Handrub di titik pelayanan",
    masalah: "Kepatuhan kebersihan tangan IGD dan Kamar Operasi di bawah 80%.",
    tujuan: "Kepatuhan kebersihan tangan RS ≥ 85% dalam 3 bulan.",
    prediksi: "Handrub yang mudah dijangkau menaikkan kepatuhan momen sebelum kontak pasien.",
    rencana: "Uji coba handrub di setiap bed IGD dan pintu Kamar Operasi, observasi mingguan oleh IPCN.",
    bulanMulai: b(-7),
    bulanAkhir: b(-5),
  });
  await simpanTahapPdsa(komite, p1.id, "do", { pelaksanaan: "Handrub dipasang di 24 bed IGD dan 4 pintu OK; observasi mingguan berjalan 12 minggu." }, true);
  await simpanTahapPdsa(komite, p1.id, "study", { hasil: "Kepatuhan IGD naik sekitar 6 poin, Kamar Operasi naik 5 poin; RS belum mencapai 85%." }, true);
  await simpanTahapPdsa(komite, p1.id, "act", { keputusan: "adaptasi", penjelasan: "Handrub dipertahankan; ditambah umpan balik hasil audit ke kepala ruang setiap minggu." }, true);
  const p2 = await buatPdsa(komite, {
    indikatorId: id("INM-01"),
    unitId: null,
    sebelumnyaId: p1.id,
    judul: "",
    masalah: "Kepatuhan RS belum ≥ 85% setelah siklus 1.",
    tujuan: "Kepatuhan kebersihan tangan RS ≥ 85%.",
    prediksi: "Umpan balik mingguan ke kepala ruang menaikkan kepatuhan 3–5 poin.",
    rencana: "IPCN mengirim hasil audit mingguan ke kepala ruang dan membahasnya di apel pagi.",
    bulanMulai: b(-3),
    bulanAkhir: b(-1),
  });
  await simpanTahapPdsa(komite, p2.id, "do", { pelaksanaan: "Umpan balik mingguan berjalan di 5 Unit Pelapor; 2 minggu terlewat saat akreditasi." }, true);

  await buatPdsa(komite, {
    indikatorId: id("INM-06"),
    unitId: null,
    judul: "Kelengkapan pra-operasi H-1",
    masalah: "Operasi elektif tertunda karena pemeriksaan pra-operasi belum lengkap.",
    tujuan: "Penundaan operasi elektif ≤ 5%.",
    prediksi: "Daftar tilik pra-operasi H-1 mengurangi penundaan karena kelengkapan.",
    rencana: "Perawat ruangan mengisi daftar tilik pra-operasi H-1 dan melaporkannya ke Kamar Operasi pukul 15.00.",
    bulanMulai: akhir,
    bulanAkhir: geserBulan(berjalan, 1),
  });

  const p4 = await buatPdsa(kepala.mawar, {
    indikatorId: id("IMP-UNIT-MAWAR-01"),
    unitId: unitId.mawar,
    judul: "Label tanggal kateter IV",
    masalah: "Kateter IV terpasang lebih dari 96 jam tanpa label tanggal.",
    tujuan: "Angka phlebitis ≤ 1,5‰.",
    prediksi: "Label tanggal memudahkan penggantian tepat waktu sehingga phlebitis turun.",
    rencana: "Semua pemasangan kateter IV diberi label tanggal; ketua tim memeriksa setiap pergantian dinas.",
    bulanMulai: b(-4),
    bulanAkhir: b(-2),
  });
  await simpanTahapPdsa(kepala.mawar, p4.id, "do", { pelaksanaan: "Label dipakai sejak minggu kedua; kepatuhan pelabelan sekitar 90%." }, true);
  await simpanTahapPdsa(kepala.mawar, p4.id, "study", { hasil: "Phlebitis turun dari sekitar 2,5‰ menjadi 1,8‰, belum mencapai Target." }, true);

  const p5 = await buatPdsa(kepala.igd, {
    indikatorId: id("IMP-UNIT-IGD-01"),
    unitId: unitId.igd,
    judul: "Dokter jaga triase",
    masalah: "Pasien menunggu dokter lebih dari 5 menit saat jam sibuk sore.",
    tujuan: "Waktu tanggap ≤ 5 menit ≥ 95%.",
    prediksi: "Satu dokter khusus triase pada pukul 16.00–22.00 memangkas waktu tunggu.",
    rencana: "Uji coba dokter triase sore selama 3 bulan.",
    bulanMulai: b(-6),
    bulanAkhir: b(-4),
  });
  await simpanTahapPdsa(kepala.igd, p5.id, "do", { pelaksanaan: "Dokter triase sore berjalan penuh 3 bulan." }, true);
  await simpanTahapPdsa(kepala.igd, p5.id, "study", { hasil: "Waktu tanggap ≤ 5 menit naik dari sekitar 90% menjadi 94%." }, true);
  await simpanTahapPdsa(kepala.igd, p5.id, "act", { keputusan: "adopsi", penjelasan: "Dokter triase sore menjadi jadwal tetap IGD." }, true);

  await simpanRekomendasi(komite, {
    triwulan: triwulanLalu(),
    teks:
      "Kepatuhan kebersihan tangan mulai stabil di atas Target setelah handrub di titik pelayanan; perluas ke semua ruang rawat inap.\n" +
      "Prioritaskan Kepatuhan APD dan Identifikasi Pasien yang belum mencapai 100%: audit mingguan oleh kepala ruang.\n" +
      "Phlebitis Rawat Inap Mawar turun tetapi belum mencapai Target; lanjutkan PDSA label kateter IV.",
  });

  console.log(
    `Selesai: ${Object.keys(UNIT).length} Unit, ${2 + 2 * Object.keys(UNIT).length} Pengguna, ${IMP.length} IMP, ` +
      `${jumlah} Pengukuran (${BULAN[0]} s.d. ${akhir}), 5 Analisis, 5 PDSA. Sandi semua Pengguna dummy: ${SANDI}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
