import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { labelLingkup } from "@/lib/perbaikan";
import { bolehMulaiPdsa, daftarPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { kelasKartu, Pesan } from "../pengukuran/status";
import { LabelTahap } from "./tahap";

export const metadata: Metadata = { title: "PDSA" };

/** Daftar PDSA yang boleh dilihat: bawaan yang belum Selesai, `?status=semua` termasuk yang Selesai. */
export default async function HalamanPdsa({ searchParams }: PageProps<"/pdsa">) {
  const pengguna = await requireUser();
  const semua = teksAlamat(await searchParams, "status") === "semua";
  const daftar = await daftarPdsa(pengguna, { semua });
  const kelasPilihan = (aktif: boolean) =>
    `rounded-md px-3 py-1.5 text-[13px] font-medium pointer-coarse:py-2.5 ${aktif ? "bg-primary text-primary-foreground" : "border border-border bg-surface hover:bg-background"}`;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">PDSA</h1>
          <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
            Siklus uji coba perbaikan (Plan, Do, Study, Act) per Indikator dan Lingkup.
          </p>
        </div>
        {bolehMulaiPdsa(pengguna) && (
          <Link
            href="/pdsa/baru"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Mulai PDSA
          </Link>
        )}
      </div>

      <nav aria-label="Saringan status" className="flex gap-2">
        <Link href="/pdsa" aria-current={!semua ? "page" : undefined} className={kelasPilihan(!semua)}>
          Belum Selesai
        </Link>
        <Link href="/pdsa?status=semua" aria-current={semua ? "page" : undefined} className={kelasPilihan(semua)}>
          Semua
        </Link>
      </nav>

      {daftar.length === 0 ? (
        <Pesan>{semua ? "Belum ada PDSA." : "Tidak ada PDSA yang sedang berjalan."}</Pesan>
      ) : (
        <ul className={`${kelasKartu} divide-y divide-border`}>
          {daftar.map((p) => (
            <li key={p.id}>
              <Link href={`/pdsa/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background">
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="text-[12.5px] font-medium text-muted-foreground">
                    {p.indikator.kode} · {labelLingkup(p.unit)} · siklus ke-{p.siklus}
                  </span>
                  <span className="font-medium">{p.judul}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                    <LabelTahap tahap={p.tahap} />
                    Uji coba {labelBulan(p.bulanMulai, { pendek: true })} – {labelBulan(p.bulanAkhir, { pendek: true })}
                  </span>
                </span>
                <span aria-hidden className="text-muted-foreground">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
