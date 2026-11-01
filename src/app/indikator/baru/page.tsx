import type { Metadata } from "next";

import { bulanBerjalan } from "@/lib/bulan";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { FormIndikator } from "../form-indikator";
import { HanyaPengelola } from "../hanya-pengelola";

export const metadata: Metadata = { title: "Tambah IMP" };

export default async function HalamanTambahIndikator() {
  const pengguna = await requireUser();
  if (!bolehKelolaIndikator(pengguna)) return <HanyaPengelola />;
  return (
    <section className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Tambah IMP</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">IMP-RS atau IMP-Unit beserta Target awalnya.</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <FormIndikator bulanIni={bulanBerjalan()} />
      </div>
    </section>
  );
}
