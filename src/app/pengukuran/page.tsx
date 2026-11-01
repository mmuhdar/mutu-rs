import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { daftarIsian, unitPengisi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasLabel, Segmen, tombolUtama } from "../form";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Ubin } from "../ui";
import { LabelStatus, Pesan, pesanAtau } from "./status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

/** Daftar isian satu Unit pada satu bulan: Indikator yang wajib diisi beserta statusnya, belum diisi di atas. */
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

  return (
    <Halaman area="ukur">
      <KepalaHalaman
        judul="Isi Pengukuran"
        sub={unit ? `${unit.nama} · ${labelBulan(bulan)}. Ketuk Indikator untuk mengisi Numerator dan Denominator.` : "Pilih Unit yang sedang Anda isi."}
      >
        {unit && (
          <form method="get" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end">
            {pilihan.length > 1 ? (
              <Segmen key={unit.id} nama="unit" label="Unit" pilihan={pilihan.map((u) => ({ nilai: u.id, label: u.nama }))} nilai={unit.id} />
            ) : (
              <input type="hidden" name="unit" value={unit.id} />
            )}
            <label className={`grid gap-1.5 ${kelasLabel} ${pilihan.length > 1 ? "" : "sm:col-start-2"}`}>
              Bulan
              <input name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
            </label>
            <button type="submit" className={tombolUtama}>
              Tampilkan
            </button>
          </form>
        )}
      </KepalaHalaman>

      {!unit ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pilihan.map((u) => (
            <Link
              key={u.id}
              href={`/pengukuran?${new URLSearchParams({ unit: u.id, bulan })}`}
              className="flex min-h-20 items-center justify-between rounded-2xl bg-ukur-tint px-5 text-[18px] font-bold text-ukur-ink hover:-translate-y-0.5"
            >
              {u.nama}
              <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      ) : typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : (
        daftar && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Ubin nada={jumlah((s) => !s) > 0 ? "warn" : "netral"} label="Belum diisi" nilai={jumlah((s) => !s)} />
              <Ubin nada="netral" label="Draf" nilai={jumlah((s) => s === "draf")} />
              <Ubin nada="ukur" label="Diajukan" nilai={jumlah((s) => s === "diajukan")} />
              <Ubin nada="pos" label="Terverifikasi" nilai={`${jumlah((s) => s === "terverifikasi")}/${daftar.length}`}>
                <BarKemajuan nada="pos" nilai={jumlah((s) => s === "terverifikasi")} dari={daftar.length} />
              </Ubin>
            </div>
            <Kartu judul={`${daftar.length} Indikator wajib diisi`} sub="Belum diisi dan yang dikembalikan di atas.">
              {daftar.length === 0 ? (
                <div className="px-5 pb-5">
                  <Pesan>Tidak ada Indikator yang wajib diisi Unit ini pada bulan itu. Unit Pelapor ditetapkan Komite Mutu.</Pesan>
                </div>
              ) : (
                <ul className="grid gap-2 px-3 pb-3">
                  {urut.map(({ indikator, status, alasanPengembalian }) => (
                    <li key={indikator.id}>
                      <Link
                        href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan })}`}
                        className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 hover:bg-ukur-tint ${status ? "" : "bg-background"}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">
                            <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{indikator.kode}</span>
                            {indikator.nama}
                          </span>
                          {alasanPengembalian && (
                            <span className="mt-0.5 block text-[13px] whitespace-pre-line text-warning">Dikembalikan: {alasanPengembalian}</span>
                          )}
                        </span>
                        <LabelStatus status={status} dikembalikan={Boolean(alasanPengembalian)} />
                        <span aria-hidden className="text-ukur-ink">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Kartu>
          </>
        )
      )}
    </Halaman>
  );
}
