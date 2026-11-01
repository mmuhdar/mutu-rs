import type { Metadata } from "next";

import { bulanBerjalan } from "@/lib/bulan";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { FormIndikator } from "../form-indikator";
import { HanyaPengelola } from "../hanya-pengelola";

export const metadata: Metadata = { title: "Tambah IMP" };

export default async function HalamanTambahIndikator() {
  const pengguna = await requireUser();
  if (!bolehKelolaIndikator(pengguna)) return <HanyaPengelola />;
  return (
    <Halaman area="atur">
      <KepalaHalaman judul="Tambah IMP" kembali={[{ href: "/indikator", label: "Indikator" }]} sub="IMP-RS atau IMP-Unit beserta Target awalnya." />
      <Kartu>
        <div className="p-5">
          <FormIndikator bulanIni={bulanBerjalan()} />
        </div>
      </Kartu>
    </Halaman>
  );
}
