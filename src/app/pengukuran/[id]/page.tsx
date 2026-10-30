import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { ambilPengukuran, bolehIsiPengukuran, bolehVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { AlasanPengembalian, formatWaktu, kelasKartu, LabelStatus, Pesan, pesanAtau, RiwayatStatus } from "../status";
import { FormVerifikasi } from "./form-verifikasi";

export const metadata: Metadata = { title: "Detail Pengukuran" };

const kelasTautan = "text-[13px] font-medium text-primary hover:underline pointer-coarse:py-2";

export default async function HalamanDetailPengukuran({ params }: PageProps<"/pengukuran/[id]">) {
  const pengguna = await requireUser();
  // Hak akses (Unit sendiri, atau Komite Mutu/Admin Sistem) diperiksa di service.
  const p = await pesanAtau(ambilPengukuran(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const { indikator, unit } = p;
  const kunci = new URLSearchParams({ unit: unit.id, bulan: p.bulan });
  const kembali = bolehIsiPengukuran(pengguna)
    ? [
        ...(bolehVerifikasi(pengguna) ? [["/pengukuran/verifikasi", "← Antrean Verifikasi"]] : []),
        [`/pengukuran?${kunci}`, "← Daftar isian"],
      ]
    : [[`/pengukuran/pantau?${kunci}`, "← Status Pengukuran"]];

  return (
    <section className="grid gap-4">
      <div>
        <p className="flex flex-wrap gap-x-4">
          {kembali.map(([href, label]) => (
            <Link key={href} href={href} className={kelasTautan}>
              {label}
            </Link>
          ))}
        </p>
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">{indikator.kode}</p>
        <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] sm:text-[22px]">{indikator.nama}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">
            {unit.nama} · {labelBulan(p.bulan)}
          </span>
          <LabelStatus status={p.status} />
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Terakhir disimpan oleh {p.pengisi}, {formatWaktu(p.disimpan)}
        </p>
      </div>

      <AlasanPengembalian status={p.status} riwayat={p.riwayat} />

      <dl className={`${kelasKartu} divide-y divide-border`}>
        {(
          [
            ["Numerator (N)", indikator.definisiNumerator, p.n],
            ["Denominator (D)", indikator.definisiDenominator, p.d],
          ] as const
        ).map(([label, definisi, nilai]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3">
            <dt>
              <span className="font-semibold">{label}</span>
              <span className="block text-[13px] whitespace-pre-line text-muted-foreground">{definisi}</span>
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{nilai}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3">
          <dt>
            <span className="font-semibold">Capaian</span>
            <span className="block text-[13px] text-muted-foreground">N/D × {indikator.faktor}</span>
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatCapaian(p.capaian, indikator.satuan)}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3">
          <dt className="font-semibold">Catatan</dt>
          <dd className="whitespace-pre-line">{p.catatan || "–"}</dd>
        </div>
      </dl>

      {p.status === "draf" ? (
        bolehIsiPengukuran(pengguna) && (
          <Link
            href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan: p.bulan })}`}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover sm:justify-self-start"
          >
            Ubah isian
          </Link>
        )
      ) : (
        bolehVerifikasi(pengguna) && <FormVerifikasi id={p.id} status={p.status} />
      )}

      <RiwayatStatus riwayat={p.riwayat} />
    </section>
  );
}
