import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import { bolehKelolaIndikator } from "@/modules/indikator/service";

import { TombolAktif } from "../form-indikator";
import { muatIndikator } from "./muat";

export const metadata: Metadata = { title: "Detail Indikator" };

export default async function HalamanDetailIndikator({ params }: PageProps<"/indikator/[id]">) {
  const { pengguna, indikator } = await muatIndikator((await params).id);
  const field: [string, string][] = [
    ["Kelompok", indikator.kelompok],
    ["Definisi operasional", indikator.definisiOperasional],
    ["Definisi Numerator (N)", indikator.definisiNumerator],
    ["Definisi Denominator (D)", indikator.definisiDenominator],
    ["Sumber Data", indikator.sumberData],
    ["Cara hitung", `Capaian = N/D × ${indikator.faktor} (${indikator.satuan})`],
    ["Arah", LABEL_ARAH[indikator.arah]],
    ["Frekuensi", LABEL_FREKUENSI[indikator.frekuensi]],
    ["PIC", indikator.pic || "Belum diisi"],
  ];

  return (
    <section className="grid gap-4">
      <div>
        <Link href="/indikator" className="text-[13px] font-medium text-primary hover:underline">
          ← Daftar Indikator
        </Link>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          {indikator.kode} · {indikator.nama}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Status: <span className="font-medium text-foreground">{indikator.aktif ? "Aktif" : "Nonaktif"}</span>
          {!indikator.aktif && " (tidak muncul di isian)"}
        </p>
      </div>

      {bolehKelolaIndikator(pengguna) && (
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={`/indikator/${indikator.id}/ubah`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover pointer-coarse:h-11"
          >
            Ubah
          </Link>
          <TombolAktif key={String(indikator.aktif)} id={indikator.id} aktif={indikator.aktif} />
        </div>
      )}

      <dl className="divide-y divide-border rounded-lg border border-border bg-surface shadow-xs">
        {field.map(([label, isi]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-line">{isi}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-lg border border-border bg-surface shadow-xs">
        <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">Target</h2>
        <ul className="divide-y divide-border">
          {indikator.target.map((t) => (
            <li key={t.berlakuMulai} className="flex flex-wrap gap-x-3 px-4 py-3">
              <span className="font-semibold">
                {indikator.arah === "makinRendah" ? "≤" : "≥"} {t.nilai.toLocaleString("id-ID")} {indikator.satuan}
              </span>
              <span className="text-muted-foreground">berlaku mulai {labelBulan(t.berlakuMulai)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
