import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, labelBulan, labelPeriode } from "@/lib/bulan";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH, targetPadaBulan } from "@/lib/indikator";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { pilihanUnit } from "@/modules/unit/service";

import { Button } from "@/components/ui/button";

import { Ikon } from "../../ikon";
import { Halaman, Kartu, KepalaHalaman, Pil } from "../../ui";
import { AksiUnitPelapor, FormTarget, FormUnitPelapor, TombolAktif } from "../form-indikator";
import { muatIndikator } from "./muat";

export const metadata: Metadata = { title: "Detail Indikator" };

/**
 * Profil Indikator: satu catatan (`<dl>`) berisi Target berlaku, cara hitung, Arah, Frekuensi, PIC, dan definisinya,
 * lalu riwayat Target sebagai jejak dan periode Unit Pelapor sebagai daftar, masing-masing dengan form kelolanya di
 * bawah garis rambut.
 */
export default async function HalamanDetailIndikator({ params }: PageProps<"/indikator/[id]">) {
  const { pengguna, indikator } = await muatIndikator((await params).id);
  // Pilihan Unit hanya untuk pengelola (form tambah Unit Pelapor); null = tanpa aksi kelola.
  const pilihan = bolehKelolaIndikator(pengguna) ? await pilihanUnit(pengguna) : null;
  // Setiap perubahan yang berhasil mengubah data ini, jadi semua form di halaman dibuat ulang dan pesan penolakan lama
  // dari form lain hilang: setiap form hanya menampilkan hasilnya sendiri.
  const versi = JSON.stringify([indikator.aktif, indikator.target, indikator.unitPelapor]);
  // Target bulan berjalan menurut satu-satunya aturan Target berlaku (Target yang mulai bulan depan belum berlaku).
  const berlaku = targetPadaBulan(indikator.target, bulanBerjalan());
  const tanda = TANDA_ARAH[indikator.arah];
  const profil: { label: string; isi: string; keterangan?: string }[] = [
    {
      label: "Cara hitung",
      isi: `N ÷ D × ${indikator.faktor}`,
      keterangan: `satuan ${indikator.satuan}`,
    },
    { label: "Arah", isi: `${tanda} ${LABEL_ARAH[indikator.arah]}` },
    {
      label: "Frekuensi",
      isi: LABEL_FREKUENSI[indikator.frekuensi],
      keterangan: indikator.frekuensi === "semesteran" ? "diisi Juni dan Desember" : "diisi setiap bulan",
    },
    { label: "PIC", isi: indikator.pic || "belum diisi" },
  ];
  const definisi: [string, string][] = [
    ["Definisi operasional", indikator.definisiOperasional],
    ["Numerator (N)", indikator.definisiNumerator],
    ["Denominator (D)", indikator.definisiDenominator],
    ["Sumber Data", indikator.sumberData],
  ];

  return (
    <Halaman>
      <KepalaHalaman
        judul={indikator.nama}
        kembali={[{ href: "/indikator", label: "Indikator" }]}
        meta={
          <>
            <span className="terukur text-ink-2">{indikator.kode}</span>, {indikator.kelompok}
          </>
        }
        sub={indikator.aktif ? undefined : "Nonaktif: tidak muncul di isian, riwayatnya tetap ada."}
        aksi={
          bolehKelolaIndikator(pengguna) && (
            <>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/indikator/${indikator.id}/ubah`}>
                  <Ikon nama="isi" className="size-[18px]" />
                  Ubah
                </Link>
              </Button>
              <TombolAktif key={versi} id={indikator.id} aktif={indikator.aktif} />
            </>
          )
        }
      />

      {/* Profil: satu permukaan dibagi garis rambut; kiri catatan ukuran, kanan definisi. */}
      <section aria-label="Profil Indikator" className="overflow-hidden rounded-card border border-rule bg-rule">
        <div className="grid gap-px lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
          <dl className="grid content-start bg-paper-2 px-5 py-2 sm:px-6">
            <div className="grid gap-1 py-4">
              <dt className="text-[14px] text-ink-3">Target berlaku</dt>
              <dd className="text-[28px] leading-tight font-medium tracking-[-0.02em] text-ink">
                {berlaku === undefined ? "belum ada" : `${tanda} ${berlaku.toLocaleString("id-ID")} ${indikator.satuan}`}
              </dd>
              <dd className="text-[13px] text-ink-3">berlaku {labelBulan(bulanBerjalan())}</dd>
            </div>
            {profil.map((p) => (
              <div key={p.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-t border-rule py-3.5">
                <dt className="text-[14px] leading-6 text-ink-3">{p.label}</dt>
                <dd className="min-w-0 text-[15px] leading-6">
                  <span className={p.isi === "belum diisi" ? "text-ink-3" : "text-ink"}>{p.isi}</span>
                  {p.keterangan && <span className="block text-[13px] leading-5 text-ink-3">{p.keterangan}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className="min-w-0 bg-paper-2 px-5 pt-5 pb-2 sm:px-6">
            <h2 className="text-[17px] font-medium tracking-[-0.01em]">Definisi</h2>
            <dl className="mt-2 grid">
              {definisi.map(([label, isi]) => (
                <div key={label} className="min-w-0 border-t border-rule py-4 first:border-0 first:pt-3">
                  <dt className="text-[14px] text-ink-3">{label}</dt>
                  <dd className="mt-1 max-w-[70ch] text-[15px] leading-6 whitespace-pre-line">{isi}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Kartu judul="Target" sub="Setiap bulan dinilai dengan Target yang berlaku mulai paling akhir sebelum atau pada bulan itu.">
          {/* Riwayat Target sebagai jejak: yang terbaru di atas, di satu garis tulang. */}
          <div className="px-5 pb-5">
            <p aria-hidden className="flex justify-between pb-2 pl-4 text-[13px] text-ink-3">
              <span>Berlaku mulai</span>
              <span>Target</span>
            </p>
            <ol aria-label="Riwayat Target" className="grid border-l border-rule-2">
              {indikator.target.toReversed().map((t, i, semua) => (
                <li key={t.berlakuMulai} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5 pl-4 first:pt-1 last:pb-1">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{labelBulan(t.berlakuMulai)}</span>
                    {i === semua.length - 1 && <span className="block text-[13px] text-ink-3">juga bulan-bulan sebelumnya</span>}
                  </span>
                  <span className="text-[16px] font-medium whitespace-nowrap">
                    {tanda} {t.nilai.toLocaleString("id-ID")} {indikator.satuan}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {bolehKelolaIndikator(pengguna) && (
            <div className="border-t border-rule px-5 py-5">
              <FormTarget key={versi} indikatorId={indikator.id} bulanIni={bulanBerjalan()} />
            </div>
          )}
        </Kartu>

        <Kartu
          judul="Unit Pelapor"
          sub={`Unit yang wajib mengisi Indikator ini setiap bulan selama periodenya.${
            indikator.kelompok === "IMP-Unit" ? " IMP-Unit hanya boleh punya satu Unit Pelapor pada bulan yang sama." : ""
          }`}
        >
          {indikator.unitPelapor.length === 0 ? (
            <p className="px-5 pb-5 text-[15px] text-ink-3">Belum ada Unit Pelapor.</p>
          ) : (
            <ul aria-label="Periode Unit Pelapor" className="divide-y divide-rule border-t border-rule px-5">
              {indikator.unitPelapor.map((p) => (
                <li key={p.id} className="grid gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                      {p.namaUnit}
                      {!p.unitAktif && <Pil nada="netral">Unit nonaktif</Pil>}
                    </span>
                    <span className="block text-[14px] text-ink-3">{labelPeriode(p.bulanMulai, p.bulanBerhenti)}</span>
                  </div>
                  {pilihan && (
                    // Setelah perubahan apa pun berhasil, aksi dibuat ulang sehingga form tertutup dan pesannya hilang.
                    <AksiUnitPelapor key={versi} id={p.id} namaUnit={p.namaUnit} bulanBerhenti={p.bulanBerhenti} />
                  )}
                </li>
              ))}
            </ul>
          )}
          {pilihan && (
            <div className="border-t border-rule px-5 py-5">
              {pilihan.length === 0 ? (
                <p className="text-[15px] text-ink-3">Belum ada Unit aktif. Admin Sistem menambahkannya di menu Unit.</p>
              ) : (
                <FormUnitPelapor key={versi} indikatorId={indikator.id} unit={pilihan} bulanIni={bulanBerjalan()} />
              )}
            </div>
          )}
        </Kartu>
      </div>
    </Halaman>
  );
}
