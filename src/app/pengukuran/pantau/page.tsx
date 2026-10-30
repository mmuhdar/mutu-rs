import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_PENGUKURAN, STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { statusPengukuranBulan } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasKartu, LabelStatus, Pemberitahuan, Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Status Pengukuran" };

/** Pilihan saringan status; "belum" = Unit Pelapor yang belum mengisi. */
const PILIHAN_STATUS = [["belum", "Belum diisi"], ...STATUS_PENGUKURAN.map((s) => [s, LABEL_STATUS_PENGUKURAN[s]])];

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

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Status Pengukuran</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Semua Pengukuran di semua Unit pada bulan yang dipilih, termasuk Unit Pelapor yang belum mengisi.
        </p>
      </div>

      <form method="get" className={`${kelasKartu} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end`}>
        <div className="grid gap-1.5">
          <label htmlFor="bulan" className="text-[13px] font-medium">
            Bulan
          </label>
          <input id="bulan" name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="unit" className="text-[13px] font-medium">
            Unit
          </label>
          <select id="unit" name="unit" defaultValue={unitId} className={kelasInput}>
            <option value="">Semua Unit</option>
            {pilihanUnit.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
                {!u.aktif && " (nonaktif)"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="status" className="text-[13px] font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={kelasInput}>
            <option value="">Semua status</option>
            {PILIHAN_STATUS.map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-11 rounded-md border border-border px-4 font-semibold hover:bg-background">
          Tampilkan
        </button>
      </form>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      <div className={kelasKartu}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">{labelBulan(bulan)}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {PILIHAN_STATUS.map(([nilai, label]) => `${label} ${jumlah(nilai)}`).join(" · ")}
          </p>
        </div>
        {tampil.length === 0 ? (
          <p className="p-4 text-muted-foreground">Tidak ada Pengukuran yang cocok dengan saringan ini.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tampil.map((b) => {
              const isi = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-muted-foreground">
                      {b.unit.nama}
                      {!b.unit.aktif && " (nonaktif)"} · {b.indikator.kode}
                    </span>
                    <span className="block font-medium">{b.indikator.nama}</span>
                  </span>
                  <LabelStatus status={b.status} />
                </>
              );
              const kelas = "flex min-h-14 items-center gap-3 px-4 py-3";
              return (
                <li key={`${b.indikator.id}-${b.unit.id}`}>
                  {b.id ? (
                    <Link href={`/pengukuran/${b.id}`} className={`${kelas} hover:bg-background`}>
                      {isi}
                      <span aria-hidden className="text-muted-foreground">
                        ›
                      </span>
                    </Link>
                  ) : (
                    <div className={kelas}>
                      {isi}
                      <span aria-hidden className="invisible">
                        ›
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
