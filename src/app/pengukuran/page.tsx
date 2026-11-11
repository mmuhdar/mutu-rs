import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { daftarIsian, unitPengisi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Kolom, Segmen } from "../form";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui";
import { LabelStatus, Pesan, pesanAtau } from "./status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

/**
 * Daftar isian satu Unit pada satu bulan: Indikator yang wajib diisi beserta statusnya, belum diisi di atas. Daftar
 * kerja memimpin; kemajuan isian (jumlah per status) di kolom samping, di HP di atas daftar.
 */
export default async function HalamanIsian({ searchParams }: PageProps<"/pengukuran">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const bulan = typeof sp.bulan === "string" ? sp.bulan : bulanLalu();
  const pilihan = await pesanAtau(unitPengisi(pengguna));
  if (typeof pilihan === "string") return <Pesan>{pilihan}</Pesan>;
  if (pilihan.length === 0) return <Pesan>Anda belum terkait ke Unit aktif. Hubungi Admin Sistem.</Pesan>;
  // Satu Unit langsung terpilih; lebih dari satu Unit harus dipilih lebih dulu.
  const unit = pilihan.length === 1 ? pilihan[0] : pilihan.find((u) => u.id === sp.unit);
  const daftar = unit ? await pesanAtau(daftarIsian(pengguna, { unitId: unit.id, bulan })) : null;
  const jumlah = (cocok: (s: string | null) => boolean) => (Array.isArray(daftar) ? daftar.filter((i) => cocok(i.status)).length : 0);
  const urut = Array.isArray(daftar)
    ? daftar.toSorted((a, b) => Number(Boolean(a.status)) - Number(Boolean(b.status)) || Number(!a.alasanPengembalian) - Number(!b.alasanPengembalian))
    : [];
  const belumDiisi = jumlah((s) => !s);

  // Satu Unit: hanya pilihan bulan, di samping judul. Beberapa Unit: Unit dan bulan di panel saringan.
  const saringan = unit && (
    <form
      method="get"
      className={
        pilihan.length > 1
          ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
          : "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none"
      }
    >
      {pilihan.length > 1 ? (
        <Segmen key={unit.id} nama="unit" label="Unit" pilihan={pilihan.map((u) => ({ nilai: u.id, label: u.nama }))} nilai={unit.id} />
      ) : (
        <input type="hidden" name="unit" value={unit.id} />
      )}
      <Kolom label="Bulan" htmlFor="bulan">
        <Input
          id="bulan"
          name="bulan"
          {...INPUT_BULAN}
          required
          max={bulanBerjalan()}
          defaultValue={bulan}
          className={pilihan.length > 1 ? undefined : "sm:w-44"}
        />
      </Kolom>
      <Button type="submit" variant="outline" size="lg" className="w-full sm:w-auto">
        Tampilkan
      </Button>
    </form>
  );

  return (
    <Halaman>
      <KepalaHalaman
        judul="Isi Pengukuran"
        sub={unit ? `${unit.nama}, ${labelBulan(bulan)}. Isi Numerator dan Denominator setiap Indikator yang wajib diisi.` : "Pilih Unit yang sedang Anda isi."}
        aksi={pilihan.length === 1 && saringan}
      >
        {pilihan.length > 1 && saringan}
      </KepalaHalaman>

      {!unit ? (
        <nav aria-label="Pilih Unit" className="max-w-xl overflow-hidden rounded-card border border-rule bg-paper-2">
          <ul className="divide-y divide-rule">
            {pilihan.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/pengukuran?${new URLSearchParams({ unit: u.id, bulan })}`}
                  className="flex min-h-14 items-center px-5 py-3 text-[16px] font-medium transition-colors hover:bg-paper-3 hover:text-signal focus-visible:-outline-offset-2 active:bg-paper-3"
                >
                  {u.nama}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : (
        daftar && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
            {/* Kemajuan isian: satu permukaan dibagi garis rambut; Terverifikasi dari yang wajib sebagai bacaan utama. */}
            <section
              aria-label={`Kemajuan isian ${labelBulan(bulan)}`}
              className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule lg:col-start-2 lg:row-start-1"
            >
              <div className="bg-paper-2 p-5">
                <p className="text-[14px] font-medium text-ink-2">Terverifikasi</p>
                <p className="mt-3 terukur text-[44px] leading-none tracking-[-0.04em] text-ink">
                  {jumlah((s) => s === "terverifikasi")}
                  <span className="text-ink-3">/{daftar.length}</span>
                </p>
                <BarKemajuan nada="pos" nilai={jumlah((s) => s === "terverifikasi")} dari={daftar.length} />
              </div>
              <dl className="grid grid-cols-3 gap-px lg:grid-cols-1">
                <Hitungan label="Belum diisi" nilai={belumDiisi} perluTindakan={belumDiisi > 0} />
                <Hitungan label="Draf" nilai={jumlah((s) => s === "draf")} />
                <Hitungan label="Diajukan" nilai={jumlah((s) => s === "diajukan")} />
              </dl>
            </section>

            <Kartu judul={`${daftar.length} Indikator wajib diisi`} sub="Belum diisi dan yang dikembalikan di atas.">
              {daftar.length === 0 ? (
                <p className="px-5 pb-5 text-[15px] text-ink-2">
                  Tidak ada Indikator yang wajib diisi Unit ini pada bulan itu. Unit Pelapor ditetapkan Komite Mutu.
                </p>
              ) : (
                // Di HP kolom Status pindah ke bawah nama Indikator supaya tabel tidak perlu digeser.
                <Tabel label="Indikator wajib diisi" lebarMin="min-w-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indikator</TableHead>
                      <TableHead className="max-sm:hidden">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urut.map(({ indikator, status, alasanPengembalian }) => {
                      const label = <LabelStatus status={status} dikembalikan={Boolean(alasanPengembalian)} />;
                      const bisaDiisi = status === null || status === "draf";
                      return (
                        <TableRow key={indikator.id}>
                          <TableCell className="whitespace-normal">
                            <span className="block text-[15px] font-medium">{indikator.nama}</span>
                            <span className="terukur text-[12px] text-ink-3">{indikator.kode}</span>
                            {alasanPengembalian && (
                              <span className="mt-1.5 block max-w-[60ch] text-[14px] whitespace-pre-line text-signal">
                                Dikembalikan: {alasanPengembalian}
                              </span>
                            )}
                            <span className="mt-2 block sm:hidden">{label}</span>
                          </TableCell>
                          <TableCell className="max-sm:hidden">{label}</TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan })}`}
                              className="text-primary-ink text-[14px] whitespace-nowrap pointer-coarse:py-2 active:text-signal"
                            >
                              {bisaDiisi ? "Isi" : "Lihat"}
                              <span className="sr-only"> {indikator.kode}</span>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Tabel>
              )}
            </Kartu>
          </div>
        )
      )}
    </Halaman>
  );
}

/** Satu jumlah status di panel kemajuan: label di atas angka (HP), sebaris di kolom samping (layar lebar). */
function Hitungan({ label, nilai, perluTindakan = false }: { label: string; nilai: number; perluTindakan?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-paper-2 px-4 py-3.5 lg:flex-row lg:items-baseline lg:justify-between lg:px-5">
      <dt className="text-[14px] text-ink-3">{label}</dt>
      <dd className={`terukur text-[22px] leading-none ${perluTindakan ? "text-signal" : "text-ink"}`}>{nilai}</dd>
    </div>
  );
}
