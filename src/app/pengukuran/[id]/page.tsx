import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { ambilPengukuran, bolehIsiPengukuran, bolehVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";

import { Ikon } from "../../ikon";
import { Halaman, KepalaHalaman } from "../../ui";
import { DaftarBukti } from "../bukti";
import { AlasanPengembalian, formatWaktu, LabelStatus, Pesan, pesanAtau, RiwayatStatus } from "../status";
import { FormVerifikasi } from "./form-verifikasi";

export const metadata: Metadata = { title: "Detail Pengukuran" };

export default async function HalamanDetailPengukuran({ params }: PageProps<"/pengukuran/[id]">) {
  const pengguna = await requireUser();
  // Hak akses (Unit sendiri, atau Komite Mutu/Admin Sistem) diperiksa di service.
  const p = await pesanAtau(ambilPengukuran(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const { indikator, unit } = p;
  const kunci = new URLSearchParams({ unit: unit.id, bulan: p.bulan });
  const kembali = bolehIsiPengukuran(pengguna)
    ? [
        ...(bolehVerifikasi(pengguna) ? [{ href: "/pengukuran/verifikasi", label: "Antrean Verifikasi" }] : []),
        { href: `/pengukuran?${kunci}`, label: "Daftar isian" },
      ]
    : [{ href: `/pengukuran/pantau?${kunci}`, label: "Status Pengukuran" }];

  return (
    <Halaman>
      <KepalaHalaman
        judul={indikator.nama}
        kembali={kembali}
        meta={
          <>
            <span className="terukur">{indikator.kode}</span>, {unit.nama}, {labelBulan(p.bulan)}
          </>
        }
        sub={
          <>
            Terakhir disimpan oleh <span className="text-signal">{p.pengisi}</span>,{" "}
            <span className="terukur text-cool">{formatWaktu(p.disimpan)}</span>.
          </>
        }
        aksi={<LabelStatus status={p.status} />}
      />

      <AlasanPengembalian status={p.status} riwayat={p.riwayat} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          {/* Bacaan Pengukuran: N, D, dan Capaian dalam satu permukaan dibagi garis rambut, Catatan di baris bawahnya. */}
          <section aria-label="Bacaan Pengukuran" className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule">
            {/* Di HP N dan D berdampingan, Capaian selebar penuh di bawahnya. */}
            <div className="grid grid-cols-2 gap-px sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
              <Bacaan label="Numerator (N)" nilai={p.n} keterangan={indikator.definisiNumerator} />
              <Bacaan label="Denominator (D)" nilai={p.d} keterangan={indikator.definisiDenominator} />
              <div className="col-span-2 flex min-w-0 flex-col gap-3 bg-paper-2 p-5 sm:col-span-1">
                <p className="text-[14px] font-medium text-ink-2">Capaian</p>
                <p className="terukur text-[44px] leading-none tracking-[-0.04em] break-words text-ink">
                  {formatCapaian(p.capaian, indikator.satuan)}
                </p>
                <p className="mt-auto terukur text-[13px] text-ink-3">N ÷ D × {indikator.faktor}</p>
              </div>
            </div>
            <div className="bg-paper-2 p-5">
              <h2 className="text-[14px] font-medium tracking-normal text-ink-2">Catatan</h2>
              <p className="mt-2 max-w-[70ch] whitespace-pre-line">{p.catatan || <span className="text-ink-3">Tidak ada catatan.</span>}</p>
            </div>
          </section>

          {/* Sebelum aksi Verifikasi: Kepala Unit memeriksa bukti lebih dulu. */}
          <DaftarBukti bukti={p.bukti} />

          {p.status === "draf"
            ? bolehIsiPengukuran(pengguna) && (
                <Button asChild size="lg" className="w-full sm:w-auto sm:justify-self-start">
                  <Link href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan: p.bulan })}`}>
                    <Ikon nama="isi" className="size-[18px]" />
                    Ubah isian
                  </Link>
                </Button>
              )
            : bolehVerifikasi(pengguna) && <FormVerifikasi id={p.id} status={p.status} />}
        </div>

        <RiwayatStatus riwayat={p.riwayat} />
      </div>
    </Halaman>
  );
}

/** Satu bacaan N atau D: label, angka dalam huruf ukur, definisinya. */
function Bacaan({ label, nilai, keterangan }: { label: string; nilai: number; keterangan: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 bg-paper-2 p-5">
      <p className="text-[14px] font-medium text-ink-2">{label}</p>
      <p className="terukur text-[32px] leading-none tracking-[-0.04em] text-ink">{nilai}</p>
      <p className="text-[13px] leading-5 whitespace-pre-line text-ink-3">{keterangan}</p>
    </div>
  );
}
