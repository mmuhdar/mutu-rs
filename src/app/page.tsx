import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import type { Arah } from "@/lib/indikator";
import { PERAN_BER_UNIT } from "@/lib/peran";
import { ringkasanCapaian } from "@/modules/capaian/service";
import { antreanVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasKartu, Pesan, pesanAtau } from "./pengukuran/status";

export const metadata: Metadata = { title: "Dashboard" };

/** Sisi Target yang baik menurut Arah, untuk "Target ≥ 80 %". */
const TANDA_ARAH: Record<Arah, string> = { makinTinggi: "≥", makinRendah: "≤" };

/** Kartu ringkasan: angka besar + keterangan; garis atas berwarna hanya pelengkap label. */
function Kartu(p: { label: string; nilai: React.ReactNode; keterangan: React.ReactNode; garis?: string; children?: React.ReactNode }) {
  return (
    <div className={`${kelasKartu} relative overflow-hidden px-4 pt-4 pb-3`}>
      {p.garis && <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${p.garis}`} />}
      <p className="text-[12.5px] font-medium text-muted-foreground">{p.label}</p>
      <p className="mt-1.5 text-[28px] leading-none font-semibold tracking-[-0.02em]">{p.nilai}</p>
      {p.children}
      <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">{p.keterangan}</p>
    </div>
  );
}

/** Dashboard: halaman pertama setelah masuk. Semua angka dari `ringkasanCapaian` (modul Capaian). */
export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const perUnit = PERAN_BER_UNIT.includes(pengguna.peran);
  const [ringkasan, antrean] = await Promise.all([
    pesanAtau(ringkasanCapaian(pengguna, typeof sp.bulan === "string" ? sp.bulan : undefined)),
    pengguna.peran === "kepalaUnit" ? antreanVerifikasi(pengguna) : null,
  ]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Dashboard</h1>
          <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
            {perUnit ? "Capaian Unit Anda" : "Capaian RS dari semua Unit Pelapor"}
            {typeof ringkasan !== "string" && ` pada ${labelBulan(ringkasan.bulan)}`}. Hanya Pengukuran Terverifikasi
            yang dihitung.
          </p>
        </div>
        <form method="get" className="flex w-full items-end gap-2 sm:w-auto">
          <div className="grid min-w-0 flex-1 gap-1.5">
            <label htmlFor="bulan" className="text-[13px] font-medium">
              Bulan
            </label>
            <input
              id="bulan"
              name="bulan"
              type="month"
              required
              max={bulanBerjalan()}
              defaultValue={typeof ringkasan === "string" ? undefined : ringkasan.bulan}
              className={`${kelasInput} sm:w-48`}
            />
          </div>
          <button type="submit" className="h-11 shrink-0 rounded-md border border-border bg-surface px-4 font-semibold hover:bg-background">
            Tampilkan
          </button>
        </form>
      </div>

      {antrean && (
        <Link
          href="/pengukuran/verifikasi"
          className={`${kelasKartu} flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-background ${antrean.length > 0 ? "border-primary/40" : ""}`}
        >
          <span className="text-[28px] leading-none font-semibold text-primary">{antrean.length}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Pengukuran menunggu Verifikasi</span>
            <span className="block text-[13px] text-muted-foreground">
              Diajukan dari Unit Anda, di bulan mana pun. Buka antrean Verifikasi.
            </span>
          </span>
          <span aria-hidden className="text-muted-foreground">
            ›
          </span>
        </Link>
      )}

      {typeof ringkasan === "string" ? (
        <Pesan>{ringkasan}</Pesan>
      ) : perUnit && pengguna.unitIds.length === 0 ? (
        <Pesan>Anda belum terkait ke Unit mana pun. Hubungi Admin Sistem.</Pesan>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kartu
              label="Indikator aktif dinilai"
              nilai={ringkasan.jumlah.dinilai}
              keterangan={`${ringkasan.jumlah.kosong} belum punya Capaian${perUnit ? " · dihitung per Unit" : ""}`}
            />
            <Kartu label="Tercapai" nilai={ringkasan.jumlah.tercapai} keterangan="Capaian memenuhi Target" garis="bg-success" />
            <Kartu
              label="Belum Tercapai"
              nilai={ringkasan.jumlah.belumTercapai}
              keterangan="Capaian belum memenuhi Target"
              garis="bg-danger"
            />
            <Kartu
              label="Kelengkapan"
              nilai={`${ringkasan.kelengkapan.terverifikasi}/${ringkasan.kelengkapan.wajib}`}
              keterangan="Pengukuran Terverifikasi dibanding yang seharusnya ada"
            >
              {ringkasan.kelengkapan.wajib > 0 && (
                <span aria-hidden className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-primary/15">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `calc(${ringkasan.kelengkapan.terverifikasi} / ${ringkasan.kelengkapan.wajib} * 100%)` }}
                  />
                </span>
              )}
            </Kartu>
          </div>

          <div className={kelasKartu}>
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-[15px] font-semibold">Indikator Belum Tercapai</h2>
              <Link href={`/monitoring?bulan=${ringkasan.bulan}`} className="shrink-0 text-[13px] font-medium text-primary hover:underline">
                Monitoring
              </Link>
            </div>
            {ringkasan.belumTercapai.length === 0 ? (
              <p className="p-4 text-muted-foreground">
                {ringkasan.jumlah.dinilai === 0
                  ? `Belum ada Indikator aktif yang dinilai pada ${labelBulan(ringkasan.bulan)}.`
                  : `Tidak ada Indikator Belum Tercapai pada ${labelBulan(ringkasan.bulan)}.`}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {ringkasan.belumTercapai.map(({ indikator: i, unit, capaian, target, kelengkapan: k }) => (
                  <li key={`${i.id}-${unit?.id}`}>
                    <Link
                      href={`/monitoring?${new URLSearchParams({ indikator: i.id, bulan: ringkasan.bulan })}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-background"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-medium text-muted-foreground">
                          {i.kode} · {i.kelompok}
                          {unit && ` · ${unit.nama}`}
                        </span>
                        <span className="block font-medium">{i.nama}</span>
                        {k.terverifikasi < k.wajib && (
                          <span className="block text-[12.5px] text-warning">
                            belum lengkap ({k.terverifikasi}/{k.wajib} Unit)
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block font-semibold">{formatCapaian(capaian, i.satuan)}</span>
                        <span className="block text-[13px] whitespace-nowrap text-muted-foreground">
                          Target {TANDA_ARAH[i.arah]} {formatCapaian(target, i.satuan)}
                        </span>
                      </span>
                      <span aria-hidden className="text-muted-foreground">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
