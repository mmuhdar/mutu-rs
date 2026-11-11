import type { Metadata } from "next";

import { daftarPengguna } from "@/modules/pengguna/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";

import { Pesan, pesanAtau } from "../pengukuran/status";
import { Ikon } from "../ikon";
import { Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableHead, TableHeader, TableRow } from "../ui";
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
  const nonaktif = daftar.length - aktif;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Pengguna"
        meta={
          <>
            <span className="terukur text-ink-2">{aktif}</span> Pengguna aktif
            {nonaktif > 0 && (
              <>
                , <span className="terukur text-ink-2">{nonaktif}</span> nonaktif
              </>
            )}
          </>
        }
        sub="Pengguna tidak dihapus, hanya dinonaktifkan: Pengguna nonaktif tidak bisa masuk, tetapi jejaknya tetap ada."
        aksi={
          // Lompatan ke form di bawah; tombol utama layar ini adalah kirim form Tambah Pengguna.
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href="#tambah-pengguna">
              <Ikon nama="tambah" className="size-[18px]" />
              Tambah Pengguna
            </a>
          </Button>
        }
      />
      <Kartu judul="Daftar Pengguna" sub={`${daftar.length} Pengguna`}>
        <Tabel label="Daftar Pengguna" lebarMin="sm:min-w-[40rem]">
          <TableHeader className="max-sm:hidden">
            <TableRow className="hover:bg-transparent">
              <TableHead>Pengguna</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-[15px] max-sm:block">
            {daftar.map((p) => (
              <BarisPengguna key={JSON.stringify(p)} pengguna={p} unit={unit} />
            ))}
          </TableBody>
        </Tabel>
      </Kartu>
      <div id="tambah-pengguna" className="scroll-mt-24">
        <Kartu judul="Tambah Pengguna" className="max-w-3xl">
          <FormTambahPengguna unit={unit} />
        </Kartu>
      </div>
    </Halaman>
  );
}
