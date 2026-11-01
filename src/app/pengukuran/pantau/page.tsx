import type { Metadata } from "next";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_PENGUKURAN, STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { statusPengukuranBulan } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { Kolom } from "../../form";
import type { NamaIkon } from "../../ikon";
import { Halaman, Kartu, KepalaHalaman, type Nada, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon, Ubin } from "../../ui";
import { LabelStatus, Pemberitahuan, Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Status Pengukuran" };

/** Pilihan saringan status; "belum" = Unit Pelapor yang belum mengisi. Nada dan ikon ubinnya sama dengan daftar isian. */
const IKON_STATUS: Record<string, [Nada, NamaIkon]> = {
  belum: ["warn", "jam"],
  draf: ["brand", "isi"],
  diajukan: ["ukur", "kotakMasuk"],
  terverifikasi: ["pos", "verifikasi"],
};
const PILIHAN_STATUS: [string, string, Nada, NamaIkon][] = [
  ["belum", "Belum diisi", ...IKON_STATUS.belum],
  ...STATUS_PENGUKURAN.map((s): [string, string, Nada, NamaIkon] => [s, LABEL_STATUS_PENGUKURAN[s], ...IKON_STATUS[s]]),
];

/** Status semua Pengukuran pada satu bulan; ubin status sekaligus saringan (ketuk untuk menyaring). */
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
            <NativeSelect id="unit" name="unit" defaultValue={unitId} className="w-full">
              <NativeSelectOption value="">Semua Unit</NativeSelectOption>
              {pilihanUnit.map((u) => (
                <NativeSelectOption key={u.id} value={u.id}>
                  {u.nama}
                  {!u.aktif && " (nonaktif)"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Kolom>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {PILIHAN_STATUS.map(([nilai, label, nada, ikon]) => (
          <Ubin
            key={nilai}
            ikon={ikon}
            nada={status && status !== nilai ? "netral" : nada}
            href={alamat({ status: status === nilai ? "" : nilai })}
            label={status === nilai ? `${label} · tersaring` : label}
            nilai={jumlah(nilai)}
            keterangan={status === nilai ? "Ketuk lagi untuk semua" : "Ketuk untuk menyaring"}
          />
        ))}
      </div>

      <Kartu judul={`${tampil.length} Pengukuran`} sub={status ? `Hanya ${PILIHAN_STATUS.find(([n]) => n === status)?.[1] ?? status}.` : "Semua status."}>
        {tampil.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>Tidak ada Pengukuran yang cocok dengan saringan ini.</Pesan>
          </div>
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
                    <TableCell>
                      <span className="block font-semibold">{b.indikator.nama}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">{b.indikator.kode}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
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
                        <TautanIkon href={`/pengukuran/${b.id}`} ikon="lihat" label={`Lihat ${b.indikator.kode}, ${b.unit.nama}`} />
                      ) : (
                        <span className="text-muted-foreground">
                          <span aria-hidden>–</span>
                          <span className="sr-only">Belum ada Pengukuran</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
