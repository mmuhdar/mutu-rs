import type { Metadata } from "next";
import Link from "next/link";

import { KELOMPOK, LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import { bolehKelolaIndikator, daftarIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { tombolUtama } from "../form";
import { Halaman, Kartu, KepalaHalaman, Pil } from "../ui";

export const metadata: Metadata = { title: "Indikator" };

/** Daftar Indikator per kelompok (INM, IMP-RS, IMP-Unit); yang nonaktif tetap tampil dengan tanda. */
export default async function HalamanIndikator() {
  const pengguna = await requireUser();
  const daftar = await daftarIndikator(pengguna);

  return (
    <Halaman area="atur">
      <KepalaHalaman
        judul="Indikator"
        sub="INM sesuai PMK 30/2022, IMP-RS, dan IMP-Unit. Indikator nonaktif tidak muncul di isian, tetapi riwayatnya tetap ada."
        aksi={
          bolehKelolaIndikator(pengguna) && (
            <Link href="/indikator/baru" className={tombolUtama}>
              Tambah IMP
            </Link>
          )
        }
      />

      {KELOMPOK.map((kelompok) => {
        const baris = daftar.filter((i) => i.kelompok === kelompok);
        return (
          <Kartu key={kelompok} judul={`${kelompok} · ${baris.length} Indikator`}>
            {baris.length === 0 ? (
              <p className="px-5 pb-4 text-muted-foreground">Belum ada {kelompok}.</p>
            ) : (
              <ul className="grid gap-1 px-3 pb-3 md:grid-cols-2">
                {baris.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/indikator/${i.id}`}
                      className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 hover:bg-atur-tint ${i.aktif ? "" : "opacity-70"}`}
                    >
                      <span className="w-20 shrink-0 font-mono text-[13px] font-medium text-atur-ink">{i.kode}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{i.nama}</span>
                        <span className="block text-[13px] text-muted-foreground">
                          {LABEL_FREKUENSI[i.frekuensi]} · {LABEL_ARAH[i.arah].toLowerCase()}
                        </span>
                      </span>
                      {!i.aktif && <Pil nada="netral">Nonaktif</Pil>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        );
      })}
    </Halaman>
  );
}
