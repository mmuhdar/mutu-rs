import type { Metadata } from "next";
import Link from "next/link";

import { labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { labelLingkup } from "@/lib/perbaikan";
import { bolehMulaiPdsa, daftarPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tombolUtama } from "../form";
import { Pesan } from "../pengukuran/status";
import { Halaman, KepalaHalaman } from "../ui";
import { JejakTahap } from "./tahap";

export const metadata: Metadata = { title: "PDSA" };

/** Daftar PDSA yang boleh dilihat: bawaan yang belum Selesai, `?status=semua` termasuk yang Selesai. */
export default async function HalamanPdsa({ searchParams }: PageProps<"/pdsa">) {
  const pengguna = await requireUser();
  const semua = teksAlamat(await searchParams, "status") === "semua";
  const daftar = await daftarPdsa(pengguna, { semua });
  const kelasPilihan = (aktif: boolean) =>
    `inline-flex min-h-10 items-center rounded-full px-4 text-[14px] font-semibold ${aktif ? "bg-pdsa text-white" : "bg-surface text-pdsa-ink hover:bg-surface/70"}`;

  return (
    <Halaman area="pdsa">
      <KepalaHalaman
        judul="PDSA"
        sub="Siklus uji coba perbaikan Plan, Do, Study, Act per Indikator dan Lingkup."
        aksi={
          bolehMulaiPdsa(pengguna) && (
            <Link href="/pdsa/baru" className={tombolUtama}>
              Mulai PDSA
            </Link>
          )
        }
      >
        <nav aria-label="Saringan status" className="mt-5 flex gap-2">
          <Link href="/pdsa" aria-current={!semua ? "page" : undefined} className={kelasPilihan(!semua)}>
            Sedang berjalan
          </Link>
          <Link href="/pdsa?status=semua" aria-current={semua ? "page" : undefined} className={kelasPilihan(semua)}>
            Semua
          </Link>
        </nav>
      </KepalaHalaman>

      {daftar.length === 0 ? (
        <Pesan>{semua ? "Belum ada PDSA." : "Tidak ada PDSA yang sedang berjalan."}</Pesan>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {daftar.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pdsa/${p.id}`}
                className="grid h-full gap-3 rounded-2xl border border-border bg-surface p-5 hover:-translate-y-0.5 hover:border-pdsa/40"
              >
                <span className="text-[13px] text-muted-foreground">
                  <span className="font-mono text-[12px]">{p.indikator.kode}</span> · {labelLingkup(p.unit)} · siklus ke-{p.siklus}
                </span>
                <span className="text-[17px] leading-6 font-bold">{p.judul}</span>
                <JejakTahap aktif={p.tahap} />
                <span className="text-[13px] text-muted-foreground">Uji coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Halaman>
  );
}
