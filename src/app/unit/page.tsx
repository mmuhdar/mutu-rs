import type { Metadata } from "next";

import { daftarUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableHead, TableHeader, TableRow } from "../ui";
import { BarisUnit, FormTambahUnit } from "./form-unit";

export const metadata: Metadata = { title: "Unit" };

export default async function HalamanUnit() {
  const pengguna = await requireUser();
  // Hak akses diperiksa di service; penolakannya ditampilkan sebagai pesan, bukan halaman error.
  const daftar = await pesanAtau(daftarUnit(pengguna));
  if (typeof daftar === "string") {
    return (
      <Halaman>
        <KepalaHalaman judul="Unit" />
        <Pesan>{daftar}</Pesan>
      </Halaman>
    );
  }
  const aktif = daftar.filter((u) => u.aktif).length;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Unit"
        meta={`${aktif} Unit aktif${daftar.length > aktif ? ` · ${daftar.length - aktif} nonaktif` : ""}`}
        sub="Daftar baku Unit. Unit nonaktif hilang dari pilihan Unit, tetapi datanya tetap ada."
      >
        <FormTambahUnit />
      </KepalaHalaman>
      <Kartu judul="Daftar Unit" sub={`${daftar.length} Unit`}>
        {daftar.length === 0 ? (
          <p className="px-5 pb-5 text-muted-foreground">Belum ada Unit.</p>
        ) : (
          <Tabel label="Daftar Unit" lebarMin="min-w-[20rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((unit) => (
                <BarisUnit key={`${unit.id}:${unit.nama}`} unit={unit} />
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
