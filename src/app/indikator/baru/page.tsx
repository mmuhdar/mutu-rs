import type { Metadata } from "next";

import { bulanBerjalan } from "@/lib/bulan";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { FormIndikator } from "../form-indikator";
import { HanyaPengelola } from "../hanya-pengelola";

export const metadata: Metadata = { title: "Tambah Indikator" };

export default async function HalamanTambahIndikator() {
  const pengguna = await requireUser();
  if (!bolehKelolaIndikator(pengguna)) return <HanyaPengelola />;
  return (
    <Halaman>
      <KepalaHalaman judul="Tambah Indikator" kembali={[{ href: "/indikator", label: "Indikator" }]} sub="IMP-RS, IMP-Unit, atau SPM beserta Target awalnya." />
      <Kartu className="max-w-3xl">
        <div className="p-5 sm:p-7">
          <FormIndikator bulanIni={bulanBerjalan()} />
        </div>
      </Kartu>
    </Halaman>
  );
}
