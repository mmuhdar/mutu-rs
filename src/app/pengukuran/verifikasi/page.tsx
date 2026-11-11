import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { antreanVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Halaman, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui";
import { Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Antrean Verifikasi" };

export default async function HalamanAntreanVerifikasi() {
  const pengguna = await requireUser();
  const antrean = await pesanAtau(antreanVerifikasi(pengguna));
  if (typeof antrean === "string") return <Pesan>{antrean}</Pesan>;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Antrean Verifikasi"
        sub={
          antrean.length === 0
            ? "Tidak ada Pengukuran yang menunggu Verifikasi."
            : `${antrean.length} Pengukuran Diajukan dari Unit Anda, terlama lebih dulu. Buka untuk memverifikasi atau mengembalikan.`
        }
      />

      {/* Antrean sebagai satu permukaan: dua bacaan di atas, tabel antrean di bawah garis rambut. */}
      <div className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule">
        <div className="grid grid-cols-2 gap-px">
          <Bacaan label="Menunggu Verifikasi" keterangan="Pengukuran Diajukan">
            <span className="terukur text-[32px] leading-none tracking-[-0.04em] text-ink">{antrean.length}</span>
          </Bacaan>
          {/* Antrean urut bulan, jadi yang pertama = bulan terlama. */}
          <Bacaan label="Bulan terlama" keterangan="Pengukuran Diajukan paling lama">
            {antrean[0] ? (
              <span className="terukur text-[24px] leading-none tracking-[-0.03em] whitespace-nowrap text-ink">
                {labelBulan(antrean[0].bulan, { pendek: true })}
              </span>
            ) : (
              <span className="text-[15px] text-ink-3">tidak ada</span>
            )}
          </Bacaan>
        </div>

        {antrean.length > 0 && (
          <div className="min-w-0 bg-paper-2">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Pengukuran Diajukan</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">Terlama lebih dulu.</p>
            </div>
            {/* Di HP Unit, bulan, dan pengisi pindah ke bawah nama Indikator supaya tabel tidak perlu digeser. */}
            <Tabel label="Antrean Verifikasi" lebarMin="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Indikator</TableHead>
                  <TableHead className="max-sm:hidden">Unit</TableHead>
                  <TableHead className="max-sm:hidden">Bulan</TableHead>
                  <TableHead className="max-sm:hidden">Diisi oleh</TableHead>
                  <TableHead className="text-right">Capaian</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {antrean.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-normal">
                      <span className="block text-[15px] font-medium">{p.indikator.nama}</span>
                      <span className="terukur text-[12px] text-ink-3">{p.indikator.kode}</span>
                      <span className="mt-1 block text-[13px] text-ink-3 sm:hidden">
                        {p.unit.nama}, {labelBulan(p.bulan, { pendek: true })}, diisi {p.pengisi}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap max-sm:hidden">{p.unit.nama}</TableCell>
                    <TableCell className="whitespace-nowrap max-sm:hidden">{labelBulan(p.bulan)}</TableCell>
                    <TableCell className="text-ink-2 max-sm:hidden">{p.pengisi}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="block terukur text-[15px] text-ink">{formatCapaian(p.capaian, p.indikator.satuan)}</span>
                      <span className="block terukur text-[12px] text-ink-3">
                        {p.n} ÷ {p.d}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/pengukuran/${p.id}`} className="text-primary-ink text-[14px] whitespace-nowrap pointer-coarse:py-2 active:text-signal">
                        Periksa<span className="sr-only"> {`${p.indikator.kode}, ${p.unit.nama}, ${labelBulan(p.bulan)}`}</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabel>
          </div>
        )}
      </div>
    </Halaman>
  );
}

/** Satu bacaan antrean: label dan keterangan di kiri, angka di kanan (di HP angka di bawah label). */
function Bacaan({ label, keterangan, children }: { label: string; keterangan: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 bg-paper-2 p-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink-2">{label}</p>
        <p className="mt-1 text-[13px] text-ink-3">{keterangan}</p>
      </div>
      <p className="min-w-0">{children}</p>
    </div>
  );
}
