import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/server/sesi";

import type { Area } from "../ui";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };

/** Alur kerja MutuRS dengan warna areanya: warna yang sama menandai menunya setelah masuk. */
const ALUR: { area: Area; judul: string; isi: string }[] = [
  { area: "ukur", judul: "Isi Pengukuran", isi: "Unit mengisi Numerator dan Denominator setiap bulan." },
  { area: "ukur", judul: "Verifikasi", isi: "Kepala Unit memeriksa sebelum angkanya dihitung." },
  { area: "pantau", judul: "Monitoring", isi: "Capaian dibandingkan Target, per Unit dan RS." },
  { area: "tindak", judul: "Tindak Lanjut", isi: "Capaian yang belum tercapai dianalisis dan ditindaklanjuti." },
  { area: "pdsa", judul: "PDSA", isi: "Perbaikan diuji dalam siklus Plan, Do, Study, Act." },
];

export default async function HalamanMasuk() {
  if (await getSessionUser()) redirect("/");
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-8 lg:pt-6">
      <section className="order-1 self-start rounded-3xl border border-border bg-surface p-6 sm:p-8 lg:order-2">
        <h1 className="text-[28px] leading-9 font-bold tracking-[-0.02em]">Masuk</h1>
        <p className="mt-1.5 text-muted-foreground">Gunakan username dan sandi dari Admin Sistem.</p>
        <FormMasuk />
      </section>

      <section className="order-2 rounded-3xl bg-brand-tint p-6 sm:p-8 lg:order-1">
        <h2 className="max-w-[20ch] text-[26px] leading-8 font-bold tracking-[-0.02em] text-brand-ink sm:text-[34px] sm:leading-10">
          Dari angka bulanan sampai perbaikan.
        </h2>
        <p className="mt-2 max-w-prose text-foreground/80">Indikator mutu RS dalam satu alur. Warna setiap langkah sama dengan menunya.</p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-2">
          {ALUR.map((a, i) => (
            <li key={a.judul} data-area={a.area} className="flex gap-3 rounded-2xl bg-surface p-4 sm:last:col-span-2">
              <span className="grid size-8 flex-none place-items-center rounded-full bg-area text-[14px] font-bold text-white">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-bold text-area-ink">{a.judul}</span>
                <span className="block text-[14px] leading-5 text-muted-foreground">{a.isi}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
