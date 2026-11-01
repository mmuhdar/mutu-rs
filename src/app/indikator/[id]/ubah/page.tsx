import type { Metadata } from "next";

import { bolehKelolaIndikator } from "@/modules/indikator/service";

import { Halaman, Kartu, KepalaHalaman } from "../../../ui";
import { FormIndikator } from "../../form-indikator";
import { HanyaPengelola } from "../../hanya-pengelola";
import { muatIndikator } from "../muat";

export const metadata: Metadata = { title: "Ubah Indikator" };

export default async function HalamanUbahIndikator({ params }: PageProps<"/indikator/[id]/ubah">) {
  const { pengguna, indikator } = await muatIndikator((await params).id);
  if (!bolehKelolaIndikator(pengguna)) return <HanyaPengelola />;
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Ubah ${indikator.nama}`}
        kembali={[{ href: `/indikator/${indikator.id}`, label: indikator.kode }]}
        meta={
          <>
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {indikator.kelompok}
          </>
        }
        sub="Kode dan kelompok tidak bisa diubah. Target ditetapkan lewat riwayat Target."
      />
      <Kartu>
        <div className="p-5">
          <FormIndikator indikator={indikator} terkunci={indikator.terkunci} />
        </div>
      </Kartu>
    </Halaman>
  );
}
