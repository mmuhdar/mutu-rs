import type { NextRequest } from "next/server";

import { labelBulan, waktuSetempat } from "@/lib/bulan";
import { LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import { keCsv, type SelCsv } from "@/lib/csv";
import { responsPenolakan } from "@/lib/errors";
import { TANDA_ARAH } from "@/lib/indikator";
import { LABEL_JENIS_INSIDEN, LABEL_STATUS_INSIDEN, LABEL_TIPE_INSIDEN, LABEL_WARNA_GRADING, WARNA_GRADING } from "@/lib/insiden";
import { laporanTriwulan, type LaporanTriwulan } from "@/modules/laporan/service";
import { getSessionUser } from "@/server/sesi";

/** Tabel Capaian Triwulan sebagai baris CSV; Kelengkapan dua kolom angka (teks "3/3" dibaca Excel sebagai tanggal). */
function barisCsv(lap: LaporanTriwulan): SelCsv[][] {
  return [
    [
      "Kelompok",
      "Kode",
      "Indikator",
      "Unit Pelapor",
      "Satuan",
      "Arah",
      "Target",
      ...lap.bulan.map((b) => `Capaian ${labelBulan(b, { pendek: true })}`),
      "N Triwulan",
      "D Triwulan",
      "Capaian Triwulan",
      "Status Capaian",
      "Pengukuran Terverifikasi",
      "Pengukuran wajib",
    ],
    ...lap.capaian.map(({ indikator: i, unit, bulan, triwulan: t }) => [
      i.kelompok,
      i.kode,
      i.nama,
      unit.map((u) => u.nama).join(", "),
      i.satuan,
      TANDA_ARAH[i.arah],
      t.target,
      ...lap.bulan.map((b) => {
        const m = bulan.find((x) => x.bulan === b);
        return m && m.kelengkapan.terverifikasi > 0 ? m.capaian : null;
      }),
      t.n,
      t.d,
      t.kelengkapan.terverifikasi > 0 ? t.capaian : null,
      t.status ? LABEL_STATUS_CAPAIAN[t.status] : null,
      t.kelengkapan.terverifikasi,
      t.kelengkapan.wajib,
    ]),
  ];
}

/** Rekap Insiden sebagai dua tabel di bawah tabel Capaian: jumlah per jenis × warna grading, lalu daftar RCA. */
function barisInsiden({ insiden: r }: LaporanTriwulan): SelCsv[][] {
  return [
    [],
    ["Insiden Keselamatan Pasien (menurut waktu insiden, tanpa Bukan Insiden)"],
    ["Jenis insiden", ...WARNA_GRADING.map((w) => LABEL_WARNA_GRADING[w]), "Belum digrading", "Jumlah"],
    ...r.perJenis.map((j) => [LABEL_JENIS_INSIDEN[j.jenis], ...WARNA_GRADING.map((w) => j.perWarna[w]), j.belumDigrading, j.jumlah]),
    [],
    ["Insiden yang diinvestigasi dengan RCA"],
    ["Waktu insiden", "Insiden", "Jenis", "Grading", "Unit", "Status", "Tipe insiden", "Akar masalah", "Rekomendasi"],
    ...r.rca.map((i) => [
      waktuSetempat(i.waktuInsiden).replace("T", " "),
      i.judul,
      LABEL_JENIS_INSIDEN[i.jenis],
      i.warna ? LABEL_WARNA_GRADING[i.warna] : null,
      i.unit.nama,
      LABEL_STATUS_INSIDEN[i.status],
      i.tipeInsiden ? LABEL_TIPE_INSIDEN[i.tipeInsiden] : null,
      i.akarMasalah,
      i.rekomendasi,
    ]),
  ];
}

/** Unduhan CSV Laporan Triwulan (`?triwulan=YYYY-T`): tabel Capaian lalu rekap Insiden; hak akses sama dengan halaman `/laporan`. */
export async function GET(request: NextRequest) {
  try {
    const lap = await laporanTriwulan(await getSessionUser(), request.nextUrl.searchParams.get("triwulan") || undefined);
    return new Response(keCsv([...barisCsv(lap), ...barisInsiden(lap)]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-triwulan-${lap.triwulan}.csv"`,
      },
    });
  } catch (error) {
    return responsPenolakan(error);
  }
}
