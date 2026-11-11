import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_PENGUKURAN, STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { statusPengukuranBulan } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Kolom } from "../../form";
import { PilihCari } from "../../pilih-cari";
import { BarKemajuan, Halaman, KepalaHalaman, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui";
import { LabelStatus, Pemberitahuan, Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Status Pengukuran" };

/** Pilihan saringan status; "belum" = Unit Pelapor yang belum mengisi. */
const PILIHAN_STATUS: [string, string][] = [["belum", "Belum diisi"], ...STATUS_PENGUKURAN.map((s): [string, string] => [s, LABEL_STATUS_PENGUKURAN[s]])];

/**
 * Status semua Pengukuran pada satu bulan sebagai satu papan: jumlah per status di atas (sekaligus saringan, ketuk untuk
 * menyaring), tabel Pengukuran di bawahnya, dalam satu permukaan dibagi garis rambut.
 */
export default async function HalamanStatusPengukuran({ searchParams }: PageProps<"/pengukuran/pantau">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const dariAlamat = bulanDariAlamat(sp.bulan);
  const bulan = dariAlamat.bulan ?? bulanLalu();
  const [unitId, status] = [teksAlamat(sp, "unit"), teksAlamat(sp, "status")];
  const semua = await pesanAtau(statusPengukuranBulan(pengguna, bulan));
  if (typeof semua === "string") return <Pesan>{semua}</Pesan>;

  // Saringan hanya tampilan; pilihan Unit = Unit yang muncul pada bulan itu (termasuk Unit nonaktif yang punya data).
  const pilihanUnit = [...new Map(semua.map((b) => [b.unit.id, b.unit])).values()];
  const perUnit = semua.filter((b) => !unitId || b.unit.id === unitId);
  const tampil = perUnit.filter((b) => !status || (b.status ?? "belum") === status);
  const jumlah = (s: string) => perUnit.filter((b) => (b.status ?? "belum") === s).length;
  const alamat = (ubah: Record<string, string>) => `/pengukuran/pantau?${new URLSearchParams({ bulan, unit: unitId, status, ...ubah })}`;

  return (
    <Halaman>
      <KepalaHalaman judul="Status Pengukuran" sub={`Semua Pengukuran di semua Unit pada ${labelBulan(bulan)}, termasuk Unit Pelapor yang belum mengisi.`}>
        <form method="get" className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="status" value={status} />
          <Kolom label="Bulan" htmlFor="bulan">
            <Input id="bulan" name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} />
          </Kolom>
          <Kolom label="Unit" htmlFor="unit">
            <PilihCari
              key={unitId}
              id="unit"
              nama="unit"
              nilai={unitId}
              cari="Cari Unit…"
              pilihan={[{ nilai: "", label: "Semua Unit" }, ...pilihanUnit.map((u) => ({ nilai: u.id, label: `${u.nama}${u.aktif ? "" : " (nonaktif)"}` }))]}
            />
          </Kolom>
          <Button type="submit" variant="outline" size="lg" className="w-full disabled:opacity-50 sm:w-auto">
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      <section aria-label={`Status Pengukuran ${labelBulan(bulan)}`} className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule">
        {/* Bacaan utama: berapa Pengukuran sudah Terverifikasi dari semua yang wajib bulan ini (saringan Unit ikut). */}
        <div className="grid gap-3 bg-paper-2 p-5 sm:p-6">
          <p className="text-[14px] font-medium text-ink-2">Terverifikasi, {labelBulan(bulan)}</p>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="terukur text-[48px] leading-none tracking-[-0.04em] text-ink sm:text-[56px]">
              {jumlah("terverifikasi")}
              <span className="text-ink-3">/{perUnit.length}</span>
            </span>
            {jumlah("belum") > 0 && <span className="text-[15px] text-signal">{jumlah("belum")} belum diisi</span>}
          </p>
          <BarKemajuan nada="pos" nilai={jumlah("terverifikasi")} dari={perUnit.length} />
        </div>
        <nav aria-label="Saring menurut status" className="grid grid-cols-2 gap-px md:grid-cols-4">
          {PILIHAN_STATUS.map(([nilai, label]) => {
            const dipilih = status === nilai;
            const redup = Boolean(status) && !dipilih;
            return (
              <Link
                key={nilai}
                href={alamat({ status: dipilih ? "" : nilai })}
                aria-current={dipilih ? "true" : undefined}
                className={`grid min-w-0 content-start gap-2 border-b-2 p-4 transition-colors focus-visible:-outline-offset-2 active:bg-paper-3 sm:p-5 ${dipilih ? "border-signal" : "border-transparent"} ${redup ? "bg-paper-3 hover:bg-paper-2" : "bg-paper-2 hover:bg-paper-3"}`}
              >
                <span className={`text-[14px] font-medium ${redup ? "text-ink-3" : "text-ink-2"}`}>{dipilih ? `${label}, tersaring` : label}</span>
                <span
                  className={`terukur text-[30px] leading-none tracking-[-0.04em] ${nilai === "belum" && jumlah(nilai) > 0 ? "text-signal" : redup ? "text-ink-3" : "text-ink"}`}
                >
                  {jumlah(nilai)}
                </span>
                <span className="text-[13px] text-ink-3">{dipilih ? "Ketuk lagi untuk semua" : "Ketuk untuk menyaring"}</span>
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 bg-paper-2">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[17px] leading-6 font-medium tracking-[-0.01em]">{`${tampil.length} Pengukuran`}</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {status ? `Hanya ${PILIHAN_STATUS.find(([n]) => n === status)?.[1] ?? status}.` : "Semua status."}
            </p>
          </div>
          {tampil.length === 0 ? (
            <p className="px-5 pb-5 text-[15px] text-ink-2">Tidak ada Pengukuran yang cocok dengan saringan ini.</p>
          ) : (
            // Di HP Unit dan status pindah ke bawah nama Indikator supaya tabel tidak perlu digeser.
            <Tabel label="Status Pengukuran" lebarMin="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Indikator</TableHead>
                  <TableHead className="max-sm:hidden">Unit</TableHead>
                  <TableHead className="max-sm:hidden">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tampil.map((b) => {
                  const unit = (
                    <>
                      {b.unit.nama}
                      {!b.unit.aktif && <Pil nada="netral">Nonaktif</Pil>}
                    </>
                  );
                  return (
                    <TableRow key={`${b.indikator.id}-${b.unit.id}`}>
                      <TableCell className="whitespace-normal">
                        <span className="block text-[15px] font-medium">{b.indikator.nama}</span>
                        <span className="terukur text-[12px] text-ink-3">{b.indikator.kode}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[14px] text-ink-2 sm:hidden">
                          {unit}
                          <LabelStatus status={b.status} />
                        </span>
                      </TableCell>
                      <TableCell className="max-sm:hidden">
                        <span className="flex flex-wrap items-center gap-2">{unit}</span>
                      </TableCell>
                      <TableCell className="max-sm:hidden">
                        <LabelStatus status={b.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Unit Pelapor yang belum mengisi belum punya Pengukuran untuk dibuka. */}
                        {b.id ? (
                          <Link href={`/pengukuran/${b.id}`} className="text-primary-ink text-[14px] whitespace-nowrap pointer-coarse:py-2 active:text-signal">
                            Lihat<span className="sr-only"> {`${b.indikator.kode}, ${b.unit.nama}`}</span>
                          </Link>
                        ) : (
                          <span className="text-[13px] whitespace-nowrap text-ink-3">
                            belum ada<span className="sr-only"> Pengukuran</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Tabel>
          )}
        </div>
      </section>
    </Halaman>
  );
}
