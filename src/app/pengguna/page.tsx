import type { Metadata } from "next";

import { daftarPengguna } from "@/modules/pengguna/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../pengukuran/status";
import { tombolUtama } from "../form";
import { Ikon } from "../ikon";
import { Halaman, Kartu, KepalaHalaman, kelasTh, Tabel } from "../ui";
import { BarisPengguna, FormTambahPengguna } from "./form-pengguna";

export const metadata: Metadata = { title: "Pengguna" };

export default async function HalamanPengguna() {
  const pengguna = await requireUser();
  // Hak akses diperiksa di service; penolakannya ditampilkan sebagai pesan, bukan halaman error.
  const daftar = await pesanAtau(daftarPengguna(pengguna));
  if (typeof daftar === "string") {
    return (
      <Halaman>
        <KepalaHalaman judul="Pengguna" />
        <Pesan>{daftar}</Pesan>
      </Halaman>
    );
  }
  const unit = await pilihanUnit(pengguna);
  const aktif = daftar.filter((p) => p.aktif).length;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Pengguna"
        meta={`${aktif} Pengguna aktif${daftar.length > aktif ? ` · ${daftar.length - aktif} nonaktif` : ""}`}
        sub="Pengguna tidak dihapus, hanya dinonaktifkan: Pengguna nonaktif tidak bisa masuk, tetapi jejaknya tetap ada."
        aksi={
          <a href="#tambah-pengguna" className={tombolUtama}>
            <Ikon nama="tambah" className="size-[18px]" />
            Tambah Pengguna
          </a>
        }
      />
      <Kartu judul="Daftar Pengguna" sub={`${daftar.length} Pengguna`}>
        <Tabel label="Daftar Pengguna" lebarMin="sm:min-w-[40rem]">
          <thead className="max-sm:hidden">
            <tr>
              <th className={kelasTh}>Pengguna</th>
              <th className={kelasTh}>Peran</th>
              <th className={kelasTh}>Unit</th>
              <th className={`${kelasTh} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {daftar.map((p) => (
              <BarisPengguna key={JSON.stringify(p)} pengguna={p} unit={unit} />
            ))}
          </tbody>
        </Tabel>
      </Kartu>
      <div id="tambah-pengguna" className="scroll-mt-24">
        <Kartu judul="Tambah Pengguna">
          <FormTambahPengguna unit={unit} />
        </Kartu>
      </div>
    </Halaman>
  );
}
