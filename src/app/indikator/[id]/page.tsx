import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, labelBulan, labelPeriode } from "@/lib/bulan";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH } from "@/lib/indikator";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { pilihanUnit } from "@/modules/unit/service";

import { AksiUnitPelapor, FormTarget, FormUnitPelapor, TombolAktif } from "../form-indikator";
import { muatIndikator } from "./muat";

export const metadata: Metadata = { title: "Detail Indikator" };

export default async function HalamanDetailIndikator({ params }: PageProps<"/indikator/[id]">) {
  const { pengguna, indikator } = await muatIndikator((await params).id);
  // Pilihan Unit hanya untuk pengelola (form tambah Unit Pelapor); null = tanpa aksi kelola.
  const pilihan = bolehKelolaIndikator(pengguna) ? await pilihanUnit(pengguna) : null;
  // Setiap perubahan yang berhasil mengubah data ini, jadi semua form di halaman dibuat ulang dan pesan penolakan lama
  // dari form lain hilang: setiap form hanya menampilkan hasilnya sendiri.
  const versi = JSON.stringify([indikator.aktif, indikator.target, indikator.unitPelapor]);
  const field: [string, string][] = [
    ["Kelompok", indikator.kelompok],
    ["Definisi operasional", indikator.definisiOperasional],
    ["Definisi Numerator (N)", indikator.definisiNumerator],
    ["Definisi Denominator (D)", indikator.definisiDenominator],
    ["Sumber Data", indikator.sumberData],
    ["Cara hitung", `Capaian = N/D × ${indikator.faktor} (${indikator.satuan})`],
    ["Arah", LABEL_ARAH[indikator.arah]],
    ["Frekuensi", LABEL_FREKUENSI[indikator.frekuensi]],
    ["PIC", indikator.pic || "Belum diisi"],
  ];

  return (
    <section className="grid gap-4">
      <div>
        <Link href="/indikator" className="text-[13px] font-medium text-accent hover:underline">
          ← Daftar Indikator
        </Link>
        <h1 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          {indikator.kode} · {indikator.nama}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Status: <span className="font-medium text-foreground">{indikator.aktif ? "Aktif" : "Nonaktif"}</span>
          {!indikator.aktif && " (tidak muncul di isian)"}
        </p>
      </div>

      {bolehKelolaIndikator(pengguna) && (
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={`/indikator/${indikator.id}/ubah`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover pointer-coarse:h-11"
          >
            Ubah
          </Link>
          <TombolAktif key={versi} id={indikator.id} aktif={indikator.aktif} />
        </div>
      )}

      <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
        {field.map(([label, isi]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-line">{isi}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">Target</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Setiap bulan dinilai dengan Target yang berlaku mulai paling akhir sebelum atau pada bulan itu.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {indikator.target.map((t, i) => (
            <li key={t.berlakuMulai} className="flex flex-wrap gap-x-3 px-4 py-3">
              <span className="font-semibold">
                {TANDA_ARAH[indikator.arah]} {t.nilai.toLocaleString("id-ID")} {indikator.satuan}
              </span>
              <span className="text-muted-foreground">
                berlaku mulai {labelBulan(t.berlakuMulai)}
                {i === 0 && " (juga untuk bulan-bulan sebelumnya)"}
              </span>
            </li>
          ))}
        </ul>
        {bolehKelolaIndikator(pengguna) && (
          <div className="border-t border-border p-4">
            <FormTarget key={versi} indikatorId={indikator.id} bulanIni={bulanBerjalan()} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">Unit Pelapor</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Unit yang wajib mengisi Indikator ini setiap bulan selama periodenya.
            {indikator.kelompok === "IMP-Unit" && " IMP-Unit hanya boleh punya satu Unit Pelapor pada bulan yang sama."}
          </p>
        </div>
        {indikator.unitPelapor.length === 0 ? (
          <p className="px-4 py-3 text-muted-foreground">Belum ada Unit Pelapor.</p>
        ) : (
          <ul className="divide-y divide-border">
            {indikator.unitPelapor.map((p) => (
              <li key={p.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <span className="font-semibold">{p.namaUnit}</span>
                  {!p.unitAktif && (
                    <span className="ml-2 rounded bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Unit nonaktif
                    </span>
                  )}
                  <span className="block text-muted-foreground">{labelPeriode(p.bulanMulai, p.bulanBerhenti)}</span>
                </div>
                {pilihan && (
                  // Setelah perubahan apa pun berhasil, aksi dibuat ulang sehingga form tertutup dan pesannya hilang.
                  <AksiUnitPelapor
                    key={versi}
                    id={p.id}
                    namaUnit={p.namaUnit}
                    bulanBerhenti={p.bulanBerhenti}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {pilihan && (
          <div className="border-t border-border p-4">
            {pilihan.length === 0 ? (
              <p className="text-muted-foreground">Belum ada Unit aktif. Admin Sistem menambahkannya di menu Unit.</p>
            ) : (
              <FormUnitPelapor key={versi} indikatorId={indikator.id} unit={pilihan} bulanIni={bulanBerjalan()} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
