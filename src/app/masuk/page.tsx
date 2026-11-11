import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { config } from "@/lib/config";
import { getSessionUser } from "@/server/sesi";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

import { Merek } from "../nav-samping";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };

/** Alur kerja MutuRS, sama dengan urutan menunya. */
const ALUR = [
  { judul: "Isi Pengukuran", isi: "Unit mengisi Numerator dan Denominator setiap bulan." },
  { judul: "Verifikasi", isi: "Kepala Unit memeriksa sebelum angkanya dihitung." },
  { judul: "Monitoring", isi: "Capaian dibandingkan Target, per Unit dan RS." },
  { judul: "Tindak Lanjut", isi: "Capaian yang belum tercapai dianalisis dan ditindaklanjuti." },
  { judul: "PDSA", isi: "Perbaikan diuji dalam siklus Plan, Do, Study, Act." },
];

export default async function HalamanMasuk() {
  if (await getSessionUser()) redirect("/");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="border-b border-rule bg-paper-3 px-6 py-6 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-b-0 lg:py-10">
        <Merek />
        <div className="hidden max-w-lg lg:block">
          <h2 className="font-display text-[34px] leading-[1.05] font-medium tracking-[-0.03em] text-ink">Dari angka bulanan sampai perbaikan.</h2>
          <p className="mt-3 text-ink-3">Indikator mutu {config.namaRs} dalam satu alur kerja.</p>
          {/* Alur sebagai jejak: satu garis tulang rule-2, setiap langkah satu entri. */}
          <ol className="mt-8 grid border-l border-rule-2">
            {ALUR.map((a, i) => (
              <li key={a.judul} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] py-3">
                <span className="terukur pl-4 text-[14px] text-ink-3">{i + 1}</span>
                <span>
                  <span className="block font-medium text-ink">{a.judul}</span>
                  <span className="block text-[14px] text-ink-3">{a.isi}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="hidden text-[13px] text-ink-3 lg:block">{config.namaRs}</p>
      </section>

      <section className="grid place-items-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md gap-6 px-6 py-7 sm:px-8 sm:py-9">
          <CardHeader className="px-0">
            <h1 className="font-display text-[28px] leading-9 font-medium tracking-[-0.03em]">Masuk ke MutuRS</h1>
            <CardDescription className="text-[15px] text-ink-3">Masuk dengan username dan sandi dari Admin Sistem.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <FormMasuk />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
