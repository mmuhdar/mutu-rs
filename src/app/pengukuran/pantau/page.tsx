import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_PENGUKURAN, STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { statusPengukuranBulan } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasLabel, tombolUtama } from "../../form";
import { Halaman, Kartu, KepalaHalaman, Ubin, type Nada } from "../../ui";
import { LabelStatus, Pemberitahuan, Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Status Pengukuran" };

/** Pilihan saringan status; "belum" = Unit Pelapor yang belum mengisi. Nada ubinnya mengikuti label status. */
const PILIHAN_STATUS: [string, string, Nada][] = [
  ["belum", "Belum diisi", "warn"],
  ...STATUS_PENGUKURAN.map((s): [string, string, Nada] => [s, LABEL_STATUS_PENGUKURAN[s], s === "draf" ? "netral" : s === "diajukan" ? "ukur" : "pos"]),
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
    <Halaman area="ukur">
      <KepalaHalaman judul="Status Pengukuran" sub={`Semua Pengukuran di semua Unit pada ${labelBulan(bulan)}, termasuk Unit Pelapor yang belum mengisi.`}>
        <form method="get" className="mt-5 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="status" value={status} />
          <label className={`grid gap-1.5 ${kelasLabel}`}>
            Bulan
            <input name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
          </label>
          <label className={`grid min-w-0 gap-1.5 ${kelasLabel}`}>
            Unit
            <select name="unit" defaultValue={unitId} className={kelasInput}>
              <option value="">Semua Unit</option>
              {pilihanUnit.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama}
                  {!u.aktif && " (nonaktif)"}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={tombolUtama}>
            Tampilkan
          </button>
        </form>
      </KepalaHalaman>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PILIHAN_STATUS.map(([nilai, label, nada]) => (
          <Ubin
            key={nilai}
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
          <ul className="grid gap-1 px-3 pb-3">
            {tampil.map((b) => {
              const isi = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{b.indikator.kode}</span>
                      {b.indikator.nama}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {b.unit.nama}
                      {!b.unit.aktif && " (nonaktif)"}
                    </span>
                  </span>
                  <LabelStatus status={b.status} />
                </>
              );
              const kelas = "flex min-h-14 items-center gap-3 rounded-xl px-4 py-2.5";
              return (
                <li key={`${b.indikator.id}-${b.unit.id}`}>
                  {b.id ? (
                    <Link href={`/pengukuran/${b.id}`} className={`${kelas} hover:bg-ukur-tint`}>
                      {isi}
                      <span aria-hidden className="text-ukur-ink">
                        →
                      </span>
                    </Link>
                  ) : (
                    <div className={kelas}>
                      {isi}
                      <span aria-hidden className="invisible">
                        →
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Kartu>
    </Halaman>
  );
}
