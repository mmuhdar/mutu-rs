import type { Metadata } from "next";

import { daftarPengguna } from "@/modules/pengguna/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman } from "../ui";
import { BarisPengguna, FormTambahPengguna } from "./form-pengguna";

export const metadata: Metadata = { title: "Pengguna" };

export default async function HalamanPengguna() {
  const pengguna = await requireUser();
  // Hak akses diperiksa di service; penolakannya ditampilkan sebagai pesan, bukan halaman error.
  const daftar = await pesanAtau(daftarPengguna(pengguna));
  if (typeof daftar === "string") {
    return (
      <Halaman area="atur">
        <KepalaHalaman judul="Pengguna" />
        <Pesan>{daftar}</Pesan>
      </Halaman>
    );
  }
  const unit = await pilihanUnit(pengguna);
  const aktif = daftar.filter((p) => p.aktif).length;

  return (
    <Halaman area="atur">
      <KepalaHalaman
        judul="Pengguna"
        meta={`${aktif} Pengguna aktif${daftar.length > aktif ? ` · ${daftar.length - aktif} nonaktif` : ""}`}
        sub="Pengguna tidak dihapus, hanya dinonaktifkan: Pengguna nonaktif tidak bisa masuk, tetapi jejaknya tetap ada."
      />
      <Kartu judul="Tambah Pengguna">
        <FormTambahPengguna unit={unit} />
      </Kartu>
      <Kartu judul="Daftar Pengguna">
        <ul className="divide-y divide-rule border-t border-rule">
          {daftar.map((p) => (
            <BarisPengguna key={JSON.stringify(p)} pengguna={p} unit={unit} />
          ))}
        </ul>
      </Kartu>
    </Halaman>
  );
}
