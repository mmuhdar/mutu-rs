import type { Metadata } from "next";
import Link from "next/link";

import { KELOMPOK, LABEL_FREKUENSI } from "@/lib/indikator";
import { bolehKelolaIndikator, daftarIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

export const metadata: Metadata = { title: "Indikator" };

const kelasKartu = "rounded-lg border border-border bg-surface shadow-xs";
const kelasTh = "h-9 px-3 text-left text-[11.5px] font-semibold tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase";

export default async function HalamanIndikator() {
  const pengguna = await requireUser();
  const daftar = await daftarIndikator(pengguna);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Indikator</h1>
          <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
            INM sesuai PMK 30/2022, IMP-RS, dan IMP-Unit. Indikator nonaktif tidak muncul di isian, tetapi riwayatnya
            tetap ada.
          </p>
        </div>
        {bolehKelolaIndikator(pengguna) && (
          <Link
            href="/indikator/baru"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover pointer-coarse:h-11"
          >
            Tambah IMP
          </Link>
        )}
      </div>

      {KELOMPOK.map((kelompok) => {
        const baris = daftar.filter((i) => i.kelompok === kelompok);
        return (
          <div key={kelompok} className={kelasKartu}>
            <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">
              {kelompok} <span className="font-normal text-muted-foreground">({baris.length})</span>
            </h2>
            {baris.length === 0 ? (
              <p className="p-4 text-muted-foreground">Belum ada {kelompok}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={kelasTh}>Kode</th>
                      <th className={kelasTh}>Nama</th>
                      <th className={kelasTh}>Frekuensi</th>
                      <th className={kelasTh}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {baris.map((i) => (
                      <tr key={i.id} className={i.aktif ? undefined : "text-muted-foreground"}>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Link href={`/indikator/${i.id}`} className="font-medium text-primary hover:underline">
                            {i.kode}
                          </Link>
                        </td>
                        <td className="min-w-56 px-3 py-2.5">{i.nama}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{LABEL_FREKUENSI[i.frekuensi]}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{i.aktif ? "Aktif" : "Nonaktif"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
