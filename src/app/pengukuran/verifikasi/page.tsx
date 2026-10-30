import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian, hitungCapaian } from "@/lib/capaian";
import { antreanVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasKartu, Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Antrean Verifikasi" };

export default async function HalamanAntreanVerifikasi() {
  const pengguna = await requireUser();
  const antrean = await pesanAtau(antreanVerifikasi(pengguna));
  if (typeof antrean === "string") return <Pesan>{antrean}</Pesan>;

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Antrean Verifikasi</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Pengukuran Diajukan dari Unit Anda, di bulan mana pun, terlama lebih dulu. Ketuk Pengukuran untuk
          memverifikasi atau mengembalikannya ke Draf.
        </p>
      </div>

      {antrean.length === 0 ? (
        <p className={`${kelasKartu} p-4 text-muted-foreground`}>Tidak ada Pengukuran yang menunggu Verifikasi.</p>
      ) : (
        <div className={kelasKartu}>
          <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">
            {antrean.length} Pengukuran menunggu Verifikasi
          </h2>
          <ul className="divide-y divide-border">
            {antrean.map((p) => (
              <li key={p.id}>
                <Link href={`/pengukuran/${p.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-background">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-muted-foreground">
                      {p.unit.nama} · {labelBulan(p.bulan)} · {p.indikator.kode}
                    </span>
                    <span className="block font-medium">{p.indikator.nama}</span>
                    <span className="block text-[13px] text-muted-foreground">Diisi oleh {p.pengisi}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold">
                      {formatCapaian(hitungCapaian(p.n, p.d, p.indikator.faktor), p.indikator.satuan)}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {p.n}/{p.d}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
