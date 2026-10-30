import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { config } from "@/lib/config";
import { ServiceError } from "@/lib/errors";
import { formatCapaian, hitungCapaian, LABEL_STATUS_PENGUKURAN } from "@/lib/pengukuran";
import { ambilIsian } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { FormPengukuran } from "../form-pengukuran";
import { LabelStatus } from "../status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

const kelasKartu = "rounded-lg border border-border bg-surface shadow-xs";

const formatWaktu = (waktu: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: config.zonaWaktu }).format(waktu);

export default async function HalamanIsiPengukuran({ searchParams }: PageProps<"/pengukuran/isi">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const ambil = (nama: string) => (typeof sp[nama] === "string" ? (sp[nama] as string) : "");
  const kunci = { indikatorId: ambil("indikator"), unitId: ambil("unit"), bulan: ambil("bulan") };
  const kembali = (
    <Link
      href={`/pengukuran?${new URLSearchParams({ unit: kunci.unitId, bulan: kunci.bulan })}`}
      className="text-[13px] font-medium text-primary hover:underline pointer-coarse:py-2"
    >
      ← Daftar isian
    </Link>
  );

  // Hak akses dan aturan isian diperiksa di service; penolakannya ditampilkan sebagai pesan.
  const isian = await ambilIsian(pengguna, kunci).catch((error) => {
    if (error instanceof ServiceError) return error.message;
    throw error;
  });
  if (typeof isian === "string") {
    return (
      <section className="grid gap-3">
        <div>{kembali}</div>
        <p role="alert" className={`${kelasKartu} p-4`}>
          {isian}
        </p>
      </section>
    );
  }

  const { indikator, unit, pengukuran, riwayat } = isian;
  const bolehDiubah = !pengukuran || pengukuran.status === "draf";

  return (
    <section className="grid gap-4">
      <div>
        {kembali}
        <p className="mt-2 text-[13px] font-medium text-muted-foreground">{indikator.kode}</p>
        <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] sm:text-[22px]">{indikator.nama}</h1>
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

      <dl className={`${kelasKartu} divide-y divide-border`}>
        <div className="grid gap-1 px-4 py-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Sumber Data</dt>
          <dd className="whitespace-pre-line">{indikator.sumberData}</dd>
        </div>
        <details className="px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-medium text-primary pointer-coarse:py-1">
            Definisi operasional
          </summary>
          <p className="mt-2 whitespace-pre-line">{indikator.definisiOperasional}</p>
        </details>
      </dl>

      {bolehDiubah ? (
        <FormPengukuran
          kunci={{ indikatorId: indikator.id, unitId: unit.id, bulan: isian.bulan }}
          faktor={indikator.faktor}
          satuan={indikator.satuan}
          definisiNumerator={indikator.definisiNumerator}
          definisiDenominator={indikator.definisiDenominator}
          awal={pengukuran}
        />
      ) : (
        <div className={kelasKartu}>
          <p className="border-b border-border px-4 py-3 text-[13.5px]">
            Pengukuran ini sudah {LABEL_STATUS_PENGUKURAN[pengukuran.status]}, jadi N dan D tidak bisa diubah.
          </p>
          <dl className="divide-y divide-border">
            {(
              [
                ["Numerator (N)", indikator.definisiNumerator, pengukuran.n],
                ["Denominator (D)", indikator.definisiDenominator, pengukuran.d],
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
              <dt className="font-semibold">Capaian</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatCapaian(hitungCapaian(pengukuran.n, pengukuran.d, indikator.faktor), indikator.satuan)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3">
              <dt className="font-semibold">Catatan</dt>
              <dd className="whitespace-pre-line">{pengukuran.catatan || "–"}</dd>
            </div>
          </dl>
        </div>
      )}

      {riwayat.length > 0 && (
        <div className={kelasKartu}>
          <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">Riwayat Status</h2>
          <ol className="divide-y divide-border">
            {riwayat.map((r, i) => (
              <li key={i} className="px-4 py-3">
                <span className="font-medium">
                  {r.statusAsal ? LABEL_STATUS_PENGUKURAN[r.statusAsal] : "Belum diisi"} →{" "}
                  {LABEL_STATUS_PENGUKURAN[r.statusTujuan]}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {r.oleh}, {formatWaktu(r.waktu)}
                </span>
                {r.alasan && <span className="mt-1 block whitespace-pre-line">Alasan: {r.alasan}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
