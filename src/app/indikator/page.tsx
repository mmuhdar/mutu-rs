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
import { Halaman, KepalaHalaman, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";

export const metadata: Metadata = { title: "Indikator" };

/**
 * Katalog Indikator: satu buku daftar dengan bagian per kelompok (INM, IMP-RS, IMP-Unit), kode dalam huruf ukur sebagai
 * tautan baris; yang nonaktif tetap tampil dengan tanda. `?q=` (juga dari pencarian di bar atas) menyaring kode atau
 * nama yang memuat teks itu, tanpa membedakan huruf besar/kecil.
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
      />

      {/* Satu permukaan: baris cari di atas, buku daftar di bawahnya, dipisah garis rambut. */}
      <section aria-label="Katalog Indikator" className="min-w-0 overflow-hidden rounded-card border border-rule bg-card">
        <div className="grid gap-3 px-4 py-4 sm:px-5">
          <form method="get" role="search" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
            <label className="relative block min-w-0 sm:w-[28rem]">
              <span className="sr-only">Cari Indikator</span>
              <Ikon nama="cari" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-3" />
              <Input type="search" name="q" defaultValue={q} placeholder="Kode atau nama Indikator" className="pl-10" />
            </label>
            <Button type="submit" variant="outline" size="lg">
              Cari
            </Button>
            {q && (
              <Link href="/indikator" className="text-primary-ink col-span-2 justify-self-start text-[14px] sm:ml-2 pointer-coarse:py-2">
                Hapus pencarian
              </Link>
            )}
          </form>
          {q && daftar.length > 0 && (
            <p role="status" className="text-[14px] text-ink-3">
              <span className="terukur text-ink-2">{daftar.length}</span> Indikator memuat “{q}”.
            </p>
          )}
        </div>

        {kelompok.length > 0 && (
          <div className="border-t border-rule">
            <Tabel label="Katalog Indikator" lebarMin="min-w-[46rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Indikator</TableHead>
                  <TableHead className="w-56">Arah</TableHead>
                  <TableHead className="w-32">Frekuensi</TableHead>
                  <TableHead className="w-24">Satuan</TableHead>
                  <TableHead className="w-40">PIC</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              {kelompok.map(({ kelompok, baris }) => (
                <TableBody key={kelompok} className="text-[15px]">
                  {/* Kepala bagian: sel pertama ikut tersemat saat tabel digeser, jadi nama kelompok tetap terlihat. */}
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="rowgroup" className="h-auto border-rule-2 px-4 pt-6 pb-2.5">
                      <span className="text-[16px] font-medium text-ink">{kelompok}</span>
                      <span className="ml-2.5 text-[13px] text-ink-3">
                        <span className="terukur">{baris.length}</span> Indikator
                      </span>
                    </TableHead>
                    <TableCell colSpan={5} className="border-b border-rule-2 p-0" />
                  </TableRow>
                  {baris.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="text-ink-3">
                        Belum ada {kelompok}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    baris.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="min-w-[11rem] whitespace-normal sm:min-w-[18rem]">
                          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <Link href={`/indikator/${i.id}`} className="terukur text-primary-ink text-[13px] whitespace-nowrap">
                              {i.kode}
                            </Link>
                            {!i.aktif && <Pil nada="netral">Nonaktif</Pil>}
                          </span>
                          <span className="mt-1 block leading-snug font-medium">{i.nama}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink-2">
                          <span aria-hidden className="mr-1.5 text-ink">
                            {TANDA_ARAH[i.arah]}
                          </span>
                          {LABEL_ARAH[i.arah]}
                        </TableCell>
                        <TableCell className="text-ink-2">{LABEL_FREKUENSI[i.frekuensi]}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink-2">{i.satuan}</TableCell>
                        <TableCell className={i.pic ? "text-ink-2" : "text-ink-3"}>{i.pic || "belum diisi"}</TableCell>
                        <TableCell className="text-right">
                          <TautanIkon href={`/indikator/${i.id}`} ikon="lihat" label={`Detail ${i.kode}`} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              ))}
            </Tabel>
          </div>
        )}
      </section>

      {q && daftar.length === 0 && <Pesan>Tidak ada Indikator yang kode atau namanya memuat “{q}”.</Pesan>}
    </Halaman>
  );
}
