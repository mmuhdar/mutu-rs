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
  const nonaktif = daftar.length - aktif;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Unit"
        meta={
          <>
            <span className="terukur text-ink-2">{aktif}</span> Unit aktif
            {nonaktif > 0 && (
              <>
                , <span className="terukur text-ink-2">{nonaktif}</span> nonaktif
              </>
            )}
          </>
        }
        sub="Daftar baku Unit. Unit nonaktif hilang dari pilihan Unit, tetapi datanya tetap ada."
      />
      {/* Satu panel: tambah Unit di atas daftar, dipisah garis rambut. */}
      <Kartu judul="Daftar Unit" sub={`${daftar.length} Unit`} className="max-w-3xl">
        <div className="border-y border-rule px-5 py-5">
          <FormTambahUnit />
        </div>
        {daftar.length === 0 ? (
          <p className="px-5 py-5 text-[15px] text-ink-3">Belum ada Unit.</p>
        ) : (
          <Tabel label="Daftar Unit" lebarMin="min-w-[20rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[15px]">
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
