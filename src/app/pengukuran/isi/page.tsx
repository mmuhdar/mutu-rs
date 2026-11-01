import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { targetBerlaku } from "@/modules/indikator/service";
import { ambilIsian } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman, KotakIkon } from "../../ui";
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
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {unit.nama} · {labelBulan(isian.bulan)}
          </>
        }
        aksi={<LabelStatus status={pengukuran?.status ?? null} />}
        sub={pengukuran ? `Terakhir disimpan oleh ${pengukuran.pengisi}, ${formatWaktu(pengukuran.disimpan)}.` : undefined}
      />

      {pengukuran && <AlasanPengembalian status={pengukuran.status} riwayat={riwayat} />}

      <Kartu>
        <dl className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex min-w-0 items-start gap-3">
            <KotakIkon nada="pantau" ikon="dokumen" kecil />
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-muted-foreground">Sumber Data</dt>
              <dd className="mt-0.5 font-medium whitespace-pre-line">{indikator.sumberData}</dd>
            </div>
          </div>
          <details className="min-w-0">
            <summary className="cursor-pointer text-[13px] font-semibold text-primary-ink pointer-coarse:py-1">Definisi operasional</summary>
            <p className="mt-2 whitespace-pre-line">{indikator.definisiOperasional}</p>
          </details>
        </dl>
      </Kartu>

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
