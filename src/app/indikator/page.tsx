import type { Metadata } from "next";
import Link from "next/link";

import { teksAlamat } from "@/lib/form";
import { KELOMPOK, LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH } from "@/lib/indikator";
import { bolehKelolaIndikator, daftarIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Ikon } from "../ikon";
import { Pesan } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, KotakIkon, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";

export const metadata: Metadata = { title: "Indikator" };

/** Warna kotak ikon per kelompok, sama dengan Dashboard. */
const NADA_KELOMPOK = { INM: "brand", "IMP-RS": "ukur", "IMP-Unit": "pantau" } as const;

/**
 * Daftar Indikator per kelompok (INM, IMP-RS, IMP-Unit); yang nonaktif tetap tampil dengan tanda. `?q=` (juga dari
 * pencarian di bar atas) menyaring kode atau nama yang memuat teks itu, tanpa membedakan huruf besar/kecil.
 */
export default async function HalamanIndikator({ searchParams }: PageProps<"/indikator">) {
  const pengguna = await requireUser();
  const q = teksAlamat(await searchParams, "q").trim();
  const cari = q.toLowerCase();
  const daftar = (await daftarIndikator(pengguna)).filter(
    (i) => !cari || i.kode.toLowerCase().includes(cari) || i.nama.toLowerCase().includes(cari),
  );
  const kelompok = KELOMPOK.map((k) => ({ kelompok: k, baris: daftar.filter((i) => i.kelompok === k) })).filter(
    (k) => !q || k.baris.length > 0,
  );

  return (
    <Halaman>
      <KepalaHalaman
        judul="Indikator"
        sub="INM sesuai PMK 30/2022, IMP-RS, dan IMP-Unit. Indikator nonaktif tidak muncul di isian, tetapi riwayatnya tetap ada."
        aksi={
          bolehKelolaIndikator(pengguna) && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/indikator/baru">
                <Ikon nama="tambah" className="size-[18px]" />
                Tambah IMP
              </Link>
            </Button>
          )
        }
      >
        <form method="get" role="search" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
          <label className="relative block min-w-0 sm:w-[28rem]">
            <span className="sr-only">Cari Indikator</span>
            <Ikon nama="cari" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input type="search" name="q" defaultValue={q} placeholder="Kode atau nama Indikator" className="pl-10" />
          </label>
          <Button type="submit" variant="outline" size="lg">
            Cari
          </Button>
          {q && (
            <Link href="/indikator" className="col-span-2 justify-self-start text-[14px] font-semibold text-primary-ink hover:underline sm:ml-2 pointer-coarse:py-2">
              Hapus pencarian
            </Link>
          )}
        </form>
        {q && daftar.length > 0 && (
          <p role="status" className="mt-3 text-[14px] text-muted-foreground">
            {daftar.length} Indikator memuat “{q}”.
          </p>
        )}
      </KepalaHalaman>

      {q && daftar.length === 0 && <Pesan>Tidak ada Indikator yang kode atau namanya memuat “{q}”.</Pesan>}

      {kelompok.map(({ kelompok, baris }) => (
        <Kartu key={kelompok} judul={kelompok} sub={`${baris.length} Indikator`}>
          {baris.length === 0 ? (
            <p className="px-5 pb-5 text-muted-foreground">Belum ada {kelompok}.</p>
          ) : (
            <Tabel label={`Indikator ${kelompok}`} lebarMin="min-w-[46rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Indikator</TableHead>
                  <TableHead className="w-56">Arah</TableHead>
                  <TableHead className="w-32">Frekuensi</TableHead>
                  <TableHead className="w-24">Satuan</TableHead>
                  <TableHead className="w-40">PIC</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baris.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <KotakIkon nada={NADA_KELOMPOK[i.kelompok]} ikon="indikator" kecil />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link href={`/indikator/${i.id}`} className="font-semibold hover:text-primary-ink hover:underline">
                              {i.nama}
                            </Link>
                            {!i.aktif && <Pil nada="netral">Nonaktif</Pil>}
                          </span>
                          <span className="font-mono text-[12px] text-muted-foreground">{i.kode}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span aria-hidden className="mr-1.5 font-semibold">
                        {TANDA_ARAH[i.arah]}
                      </span>
                      {LABEL_ARAH[i.arah]}
                    </TableCell>
                    <TableCell>{LABEL_FREKUENSI[i.frekuensi]}</TableCell>
                    <TableCell className="whitespace-nowrap">{i.satuan}</TableCell>
                    <TableCell className="text-muted-foreground">{i.pic || "–"}</TableCell>
                    <TableCell className="text-right">
                      <TautanIkon href={`/indikator/${i.id}`} ikon="lihat" label={`Detail ${i.kode}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabel>
          )}
        </Kartu>
      ))}
    </Halaman>
  );
}
