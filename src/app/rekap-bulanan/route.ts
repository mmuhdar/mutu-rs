import type { NextRequest } from "next/server";

import { LABEL_STATUS_CAPAIAN } from "@/lib/capaian";
import { keCsv, type SelCsv } from "@/lib/csv";
import { ServiceError } from "@/lib/errors";
import { TANDA_ARAH } from "@/lib/indikator";
import { rekapBulanan, type RekapBulanan } from "@/modules/capaian/service";
import { getSessionUser } from "@/server/sesi";

/** Rekap Bulanan sebagai baris CSV; Kelengkapan dua kolom angka (teks "3/3" dibaca Excel sebagai tanggal). */
function barisCsv(rekap: RekapBulanan): SelCsv[][] {
  return [
    [
      "Kelompok",
      "Kode",
      "Indikator",
      "Lingkup",
      "Satuan",
      "Arah",
      "Target",
      "N",
      "D",
      "Capaian",
      "Status Capaian",
      "Pengukuran Terverifikasi",
      "Pengukuran wajib",
    ],
    ...rekap.baris.map(({ indikator: i, unit, ...c }) => [
      i.kelompok,
      i.kode,
      i.nama,
      unit?.nama ?? "RS",
      i.satuan,
      TANDA_ARAH[i.arah],
      c.target,
      c.n,
      c.d,
      c.capaian,
      c.status ? LABEL_STATUS_CAPAIAN[c.status] : null,
      c.kelengkapan.terverifikasi,
      c.kelengkapan.wajib,
    ]),
  ];
}

/** Unduhan CSV Rekap Bulanan (`?bulan=YYYY-MM`, tanpa bulan = bulan lalu) dari Dashboard; hak akses di service. */
export async function GET(request: NextRequest) {
  try {
    const rekap = await rekapBulanan(await getSessionUser(), request.nextUrl.searchParams.get("bulan") || undefined);
    return new Response(keCsv(barisCsv(rekap)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-bulanan-${rekap.bulan}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return new Response(error.message, { status: error.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    throw error;
  }
}
