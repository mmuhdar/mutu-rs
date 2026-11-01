import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { antreanVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Antrean Verifikasi" };

export default async function HalamanAntreanVerifikasi() {
  const pengguna = await requireUser();
  const antrean = await pesanAtau(antreanVerifikasi(pengguna));
  if (typeof antrean === "string") return <Pesan>{antrean}</Pesan>;

  return (
    <Halaman area="ukur">
      <KepalaHalaman
        judul="Antrean Verifikasi"
        sub={
          antrean.length === 0
            ? "Tidak ada Pengukuran yang menunggu Verifikasi."
            : `${antrean.length} Pengukuran Diajukan dari Unit Anda, terlama lebih dulu. Ketuk untuk memverifikasi atau mengembalikan.`
        }
      />

      {antrean.length > 0 && (
        <Kartu>
          <ul className="grid gap-2 p-3">
            {antrean.map((p) => (
              <li key={p.id}>
                <Link href={`/pengukuran/${p.id}`} className="flex min-h-16 items-center gap-4 rounded-xl px-4 py-3 hover:bg-ukur-tint">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{p.indikator.kode}</span>
                      {p.indikator.nama}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {p.unit.nama} · {labelBulan(p.bulan)} · diisi {p.pengisi}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[18px] font-bold text-ukur-ink">{formatCapaian(p.capaian, p.indikator.satuan)}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {p.n} ÷ {p.d}
                    </span>
                  </span>
                  <span aria-hidden className="text-ukur-ink">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>
      )}
    </Halaman>
  );
}
