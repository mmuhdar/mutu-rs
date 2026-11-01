import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { ambilIsian } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { FormPengukuran } from "../form-pengukuran";
import { AlasanPengembalian, formatWaktu, kelasKartu, LabelStatus, Pesan, pesanAtau, RiwayatStatus } from "../status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

export default async function HalamanIsiPengukuran({ searchParams }: PageProps<"/pengukuran/isi">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const kunci = {
    indikatorId: teksAlamat(sp, "indikator"),
    unitId: teksAlamat(sp, "unit"),
    bulan: teksAlamat(sp, "bulan"),
  };
  const kembali = (
    <Link
      href={`/pengukuran?${new URLSearchParams({ unit: kunci.unitId, bulan: kunci.bulan })}`}
      className="text-[13px] font-medium text-accent hover:underline pointer-coarse:py-2"
    >
      ← Daftar isian
    </Link>
  );

  // Hak akses dan aturan isian diperiksa di service; penolakannya ditampilkan sebagai pesan.
  const isian = await pesanAtau(ambilIsian(pengguna, kunci));
  if (typeof isian === "string") {
    return (
      <section className="grid gap-3">
        <div>{kembali}</div>
        <Pesan>{isian}</Pesan>
      </section>
    );
  }

  const { indikator, unit, pengukuran, riwayat } = isian;
  // Hanya Draf yang bisa diubah; Pengukuran lain dibuka di detail Pengukuran (tempat Verifikasi).
  if (pengukuran && pengukuran.status !== "draf") redirect(`/pengukuran/${pengukuran.id}`);

  return (
    <section className="grid gap-4">
      <div>
        {kembali}
<h1 className="mt-3 text-[22px] leading-7 font-semibold tracking-[-0.01em]">{indikator.nama}</h1>
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">{indikator.kode}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">
            {unit.nama} · {labelBulan(isian.bulan)}
          </span>
          <LabelStatus status={pengukuran?.status ?? null} />
        </p>
        {pengukuran && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            Terakhir disimpan oleh {pengukuran.pengisi}, {formatWaktu(pengukuran.disimpan)}
          </p>
        )}
      </div>

      {pengukuran && <AlasanPengembalian status={pengukuran.status} riwayat={riwayat} />}

      <dl className={`${kelasKartu} divide-y divide-border`}>
        <div className="grid gap-1 px-4 py-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Sumber Data</dt>
          <dd className="whitespace-pre-line">{indikator.sumberData}</dd>
        </div>
        <details className="px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-medium text-accent pointer-coarse:py-1">
            Definisi operasional
          </summary>
          <p className="mt-2 whitespace-pre-line">{indikator.definisiOperasional}</p>
        </details>
      </dl>

      <FormPengukuran
        kunci={{ indikatorId: indikator.id, unitId: unit.id, bulan: isian.bulan }}
        faktor={indikator.faktor}
        satuan={indikator.satuan}
        definisiNumerator={indikator.definisiNumerator}
        definisiDenominator={indikator.definisiDenominator}
        awal={pengukuran}
      />

      <RiwayatStatus riwayat={riwayat} />
    </section>
  );
}
