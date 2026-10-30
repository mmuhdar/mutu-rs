import type { Metadata } from "next";

import { bolehKelolaIndikator } from "@/modules/indikator/service";

import { FormIndikator } from "../../form-indikator";
import { HanyaPengelola } from "../../hanya-pengelola";
import { muatIndikator } from "../muat";

export const metadata: Metadata = { title: "Ubah Indikator" };

export default async function HalamanUbahIndikator({ params }: PageProps<"/indikator/[id]/ubah">) {
  const { pengguna, indikator } = await muatIndikator((await params).id);
  if (!bolehKelolaIndikator(pengguna)) return <HanyaPengelola />;
  return (
    <section className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          Ubah {indikator.kode} ({indikator.kelompok})
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Kode dan kelompok tidak bisa diubah. Target ditetapkan lewat riwayat Target.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
        <FormIndikator indikator={indikator} terkunci={indikator.terkunci} />
      </div>
    </section>
  );
}
