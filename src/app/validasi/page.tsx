import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelBulan, labelTanggal } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_PEMICU_VALIDASI } from "@/lib/validasi";
import { bolehCatatValidasi, daftarValidasi } from "@/modules/validasi/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../ikon";
import { Pesan } from "../pengukuran/status";
import { Halaman, Kartu, KELAS_SEGMEN_TAUTAN, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";
import { Kesesuaian, LabelHasilValidasi } from "./label";

export const metadata: Metadata = { title: "Validasi Data" };

/**
 * Daftar Validasi Data yang boleh dibaca (Lingkup Unit), terbaru di atas; `?status=belum` = hanya yang belum valid
 * (tidak valid dan belum divalidasi ulang dengan hasil valid).
 */
export default async function HalamanValidasi({ searchParams }: PageProps<"/validasi">) {
  const pengguna = await requireUser();
  const belum = teksAlamat(await searchParams, "status") === "belum";
  const daftar = await daftarValidasi(pengguna, { belumValid: belum });
  return (
    <Halaman>
      <KepalaHalaman
        judul="Validasi Data"
        sub="Pengukuran ulang sampel data oleh orang lain setiap ada pemicu (PMKP 5). Valid bila kesesuaian mencapai 90%."
        aksi={
          <>
            <nav aria-label="Saringan status" className="grid w-full grid-cols-2 gap-0.5 rounded-md border border-rule bg-paper-3 p-0.5 sm:flex sm:w-auto">
              <Button asChild variant="ghost" size="sm" className={KELAS_SEGMEN_TAUTAN}>
                <Link href="/validasi" aria-current={!belum ? "page" : undefined}>
                  Semua
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className={KELAS_SEGMEN_TAUTAN}>
                <Link href="/validasi?status=belum" aria-current={belum ? "page" : undefined}>
                  Belum valid
                </Link>
              </Button>
            </nav>
            {bolehCatatValidasi(pengguna) && (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/validasi/baru">
                  <Ikon nama="tambah" className="size-[18px]" />
                  Catat Validasi
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Kartu judul={belum ? "Belum valid" : "Semua validasi"} sub={`${daftar.length} validasi.`}>
        {daftar.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>{belum ? "Tidak ada validasi yang belum valid." : "Belum ada validasi yang tercatat."}</Pesan>
          </div>
        ) : (
          <Tabel label="Daftar Validasi Data" lebarMin="min-w-[56rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Indikator</TableHead>
                <TableHead>Unit dan bulan data</TableHead>
                <TableHead>Pemicu</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Kesesuaian</TableHead>
                <TableHead>Hasil</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="min-w-56 whitespace-normal">
                    <span className="block text-[14px]">{v.indikator.nama}</span>
                    <span className="terukur text-[12px] text-ink-3">{v.indikator.kode}</span>
                  </TableCell>
                  <TableCell className="text-[14px] whitespace-nowrap">
                    <span className="block">{v.unit.nama}</span>
                    <span className="text-ink-3">{labelBulan(v.bulan)}</span>
                  </TableCell>
                  <TableCell className="min-w-44 text-[14px] whitespace-normal text-ink-2">{LABEL_PEMICU_VALIDASI[v.pemicu]}</TableCell>
                  <TableCell className="text-[14px] whitespace-nowrap">{labelTanggal(v.tanggal)}</TableCell>
                  <TableCell className="text-right">
                    <Kesesuaian persen={v.kesesuaian} sesuai={v.sesuai} sampel={v.sampel} />
                  </TableCell>
                  <TableCell>
                    <LabelHasilValidasi valid={v.valid} belumValid={v.belumValid} />
                  </TableCell>
                  <TableCell className="text-right">
                    <TautanIkon href={`/validasi/${v.id}`} ikon="lihat" label={`Buka validasi ${v.indikator.kode} ${v.unit.nama}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
