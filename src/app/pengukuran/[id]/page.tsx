import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { ambilPengukuran, bolehIsiPengukuran, bolehVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";

import { Ikon } from "../../ikon";
import { Halaman, Kartu, KepalaHalaman, Ubin } from "../../ui";
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
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {unit.nama} · {labelBulan(p.bulan)}
          </>
        }
        sub={`Terakhir disimpan oleh ${p.pengisi}, ${formatWaktu(p.disimpan)}.`}
        aksi={<LabelStatus status={p.status} />}
      />

      <AlasanPengembalian status={p.status} riwayat={p.riwayat} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Ubin nada="ukur" ikon="dokumen" label="Numerator (N)" nilai={p.n} keterangan={indikator.definisiNumerator} />
        <Ubin nada="atur" ikon="indikator" label="Denominator (D)" nilai={p.d} keterangan={indikator.definisiDenominator} />
        {/* Di HP N dan D berdampingan, Capaian selebar penuh di bawahnya. */}
        <div className="col-span-2 grid sm:col-span-1">
          <Ubin
            nada="brand"
            ikon="target"
            label="Capaian"
            nilai={formatCapaian(p.capaian, indikator.satuan)}
            keterangan={`N ÷ D × ${indikator.faktor}`}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          <Kartu judul="Catatan">
            <p className="px-5 pb-5 whitespace-pre-line">{p.catatan || <span className="text-muted-foreground">Tidak ada catatan.</span>}</p>
          </Kartu>

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
