import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { LABEL_STATUS_PENGUKURAN, STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { daftarIsian, unitPengisi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasKartu, LabelStatus, Pesan, pesanAtau } from "./status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

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

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Isi Pengukuran</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Indikator yang wajib diisi Unit Anda pada bulan yang dipilih. Ketuk Indikator untuk mengisi N dan D.
        </p>
      </div>

      {!unit ? (
        <div className={`${kelasKartu} p-4`}>
          <h2 className="text-[15px] font-semibold">Pilih Unit yang sedang diisi</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {pilihan.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/pengukuran?${new URLSearchParams({ unit: u.id, bulan })}`}
                  className="flex min-h-12 items-center rounded-md border border-border px-4 font-semibold hover:bg-background"
                >
                  {u.nama}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <form method="get" className={`${kelasKartu} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
            {pilihan.length > 1 ? (
              <div className="grid gap-1.5">
                <label htmlFor="unit" className="text-[13px] font-medium">
                  Unit
                </label>
                <select id="unit" name="unit" defaultValue={unit.id} className={kelasInput}>
                  {pilihan.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="self-center">
                <span className="block text-[13px] font-medium text-muted-foreground">Unit</span>
                <span className="font-semibold">{unit.nama}</span>
              </p>
            )}
            <div className="grid gap-1.5">
              <label htmlFor="bulan" className="text-[13px] font-medium">
                Bulan
              </label>
              <input id="bulan" name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
            </div>
            <button
              type="submit"
              className="h-11 rounded-md border border-border px-4 font-semibold hover:bg-background"
            >
              Tampilkan
            </button>
          </form>

          {typeof daftar === "string" ? (
            <Pesan>{daftar}</Pesan>
          ) : (
            daftar && (
              <div className={kelasKartu}>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-[15px] font-semibold">
                    {unit.nama} · {labelBulan(bulan)}
                  </h2>
                  {daftar.length > 0 && (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {[
                        `Belum diisi ${daftar.filter((i) => !i.status).length}`,
                        ...STATUS_PENGUKURAN.map(
                          (s) => `${LABEL_STATUS_PENGUKURAN[s]} ${daftar.filter((i) => i.status === s).length}`,
                        ),
                      ].join(" · ")}
                    </p>
                  )}
                </div>
                {daftar.length === 0 ? (
                  <p className="p-4 text-muted-foreground">
                    Tidak ada Indikator yang wajib diisi Unit ini pada bulan itu. Unit Pelapor ditetapkan Komite Mutu.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {daftar.map(({ indikator, status, alasanPengembalian }) => (
                      <li key={indikator.id}>
                        <Link
                          href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan })}`}
                          className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-background"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-medium text-muted-foreground">{indikator.kode}</span>
                            <span className="block font-medium">{indikator.nama}</span>
                            {alasanPengembalian && (
                              <span className="block text-[13px] whitespace-pre-line text-warning">
                                Alasan dikembalikan: {alasanPengembalian}
                              </span>
                            )}
                          </span>
                          <LabelStatus status={status} dikembalikan={Boolean(alasanPengembalian)} />
                          <span aria-hidden className="text-muted-foreground">
                            ›
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </>
      )}
    </section>
  );
}
