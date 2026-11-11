import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { targetBerlaku } from "@/modules/indikator/service";
import { ambilIsian } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Ikon } from "../../ikon";
import { Halaman, KepalaHalaman } from "../../ui";
import { FormPengukuran } from "../form-pengukuran";
import { AlasanPengembalian, formatWaktu, LabelStatus, Pesan, pesanAtau, RiwayatStatus } from "../status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

export default async function HalamanIsiPengukuran({ searchParams }: PageProps<"/pengukuran/isi">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const kunci = {
    indikatorId: teksAlamat(sp, "indikator"),
    unitId: teksAlamat(sp, "unit"),
    bulan: teksAlamat(sp, "bulan"),
  };
  const kembali = [{ href: `/pengukuran?${new URLSearchParams({ unit: kunci.unitId, bulan: kunci.bulan })}`, label: "Daftar isian" }];

  // Hak akses dan aturan isian diperiksa di service; penolakannya ditampilkan sebagai pesan.
  const isian = await pesanAtau(ambilIsian(pengguna, kunci));
  if (typeof isian === "string") {
    return (
      <Halaman>
        <KepalaHalaman judul="Isi Pengukuran" kembali={kembali} />
        <Pesan>{isian}</Pesan>
      </Halaman>
    );
  }

  const { indikator, unit, pengukuran, riwayat } = isian;
  // Hanya Draf yang bisa diubah; Pengukuran lain dibuka di detail Pengukuran (tempat Verifikasi).
  if (pengukuran && pengukuran.status !== "draf") redirect(`/pengukuran/${pengukuran.id}`);
  const target = await targetBerlaku(pengguna, indikator.id, isian.bulan);

  return (
    <Halaman>
      <KepalaHalaman
        judul={indikator.nama}
        kembali={kembali}
        meta={
          <>
            <span className="terukur">{indikator.kode}</span>, {unit.nama}, {labelBulan(isian.bulan)}
          </>
        }
        aksi={<LabelStatus status={pengukuran?.status ?? null} />}
        sub={
          pengukuran ? (
            <>
              Terakhir disimpan oleh <span className="text-signal">{pengukuran.pengisi}</span>,{" "}
              <span className="terukur text-cool">{formatWaktu(pengukuran.disimpan)}</span>.
            </>
          ) : undefined
        }
      />

      {pengukuran && <AlasanPengembalian status={pengukuran.status} riwayat={riwayat} />}

      {/* Bahan isian: Sumber Data dan Definisi operasional dalam satu permukaan dibagi garis rambut. */}
      <dl className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0 bg-paper-2 px-5 py-4">
          <dt className="text-[13px] text-ink-3">Sumber Data</dt>
          <dd className="mt-1 whitespace-pre-line">{indikator.sumberData}</dd>
        </div>
        <Collapsible className="min-w-0 bg-paper-2 px-5 py-4">
          <dt>
            <CollapsibleTrigger asChild>
              <Button
                variant="link"
                size="sm"
                className="group/definisi h-auto gap-1.5 px-0 text-[14px] text-ink-2 hover:text-signal focus-visible:text-signal active:text-signal disabled:opacity-50 pointer-coarse:py-1"
              >
                <Ikon nama="kanan" className="size-4 group-data-[state=open]/definisi:rotate-90" />
                Definisi operasional
              </Button>
            </CollapsibleTrigger>
          </dt>
          <CollapsibleContent asChild>
            <dd className="mt-2 max-w-[75ch] whitespace-pre-line">{indikator.definisiOperasional}</dd>
          </CollapsibleContent>
        </Collapsible>
      </dl>

      <FormPengukuran
        kunci={{ indikatorId: indikator.id, unitId: unit.id, bulan: isian.bulan }}
        faktor={indikator.faktor}
        satuan={indikator.satuan}
        arah={indikator.arah}
        target={target}
        definisiNumerator={indikator.definisiNumerator}
        definisiDenominator={indikator.definisiDenominator}
        awal={pengukuran}
      />

      <RiwayatStatus riwayat={riwayat} />
    </Halaman>
  );
}
