import type { NextRequest } from "next/server";

import { labelBulan } from "@/lib/bulan";
import { LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import { keCsv, type SelCsv } from "@/lib/csv";
import { ServiceError } from "@/lib/errors";
import { TANDA_ARAH } from "@/lib/indikator";
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

/** Unduhan CSV tabel Capaian Laporan Triwulan (`?triwulan=YYYY-T`); hak akses sama dengan halaman `/laporan`. */
export async function GET(request: NextRequest) {
  try {
    const lap = await laporanTriwulan(await getSessionUser(), request.nextUrl.searchParams.get("triwulan") || undefined);
    return new Response(keCsv(barisCsv(lap)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-triwulan-${lap.triwulan}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new Response(error.message, { status: error.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    throw error;
  }
}
