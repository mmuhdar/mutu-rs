import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, labelBulan, labelPeriode } from "@/lib/bulan";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH } from "@/lib/indikator";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { pilihanUnit } from "@/modules/unit/service";

import { tombolUtama } from "../../form";
import { Halaman, Kartu, KepalaHalaman, Pil, Ubin } from "../../ui";
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
  const terbaru = indikator.target.at(-1);
  const definisi: [string, string][] = [
    ["Definisi operasional", indikator.definisiOperasional],
    ["Numerator (N)", indikator.definisiNumerator],
    ["Denominator (D)", indikator.definisiDenominator],
    ["Sumber Data", indikator.sumberData],
  ];

  return (
    <Halaman area="atur">
      <KepalaHalaman
        judul={indikator.nama}
        kembali={[{ href: "/indikator", label: "Indikator" }]}
        meta={
          <>
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {indikator.kelompok} · PIC {indikator.pic || "belum diisi"}
          </>
        }
        sub={indikator.aktif ? undefined : "Nonaktif: tidak muncul di isian, riwayatnya tetap ada."}
        aksi={
          bolehKelolaIndikator(pengguna) && (
            <>
              <Link href={`/indikator/${indikator.id}/ubah`} className={tombolUtama}>
                Ubah
              </Link>
              <TombolAktif key={versi} id={indikator.id} aktif={indikator.aktif} />
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Ubin
          nada="atur"
          label="Target berlaku"
          nilai={terbaru ? `${TANDA_ARAH[indikator.arah]} ${terbaru.nilai.toLocaleString("id-ID")} ${indikator.satuan}` : "–"}
          keterangan={terbaru ? `mulai ${labelBulan(terbaru.berlakuMulai)}` : undefined}
        />
        <Ubin nada="pantau" label="Cara hitung" nilai={`× ${indikator.faktor}`} keterangan={`N ÷ D × ${indikator.faktor}, satuan ${indikator.satuan}`} />
        <Ubin nada="brand" label="Arah" nilai={TANDA_ARAH[indikator.arah]} keterangan={LABEL_ARAH[indikator.arah]} />
        <Ubin
          nada="ukur"
          label="Frekuensi"
          nilai={LABEL_FREKUENSI[indikator.frekuensi]}
          keterangan={indikator.frekuensi === "semesteran" ? "diisi Juni dan Desember" : "diisi setiap bulan"}
        />
      </div>

      <Kartu judul="Definisi">
        <dl className="grid gap-3 px-5 pb-5 md:grid-cols-2">
          {definisi.map(([label, isi]) => (
            <div key={label} className="rounded-2xl bg-background p-4">
              <dt className="text-[13px] font-semibold text-atur-ink">{label}</dt>
              <dd className="mt-1 whitespace-pre-line">{isi}</dd>
            </div>
          ))}
        </dl>
      </Kartu>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Kartu judul="Target" sub="Setiap bulan dinilai dengan Target yang berlaku mulai paling akhir sebelum atau pada bulan itu.">
          <ol className="grid gap-2 px-5 pb-4">
            {indikator.target.toReversed().map((t, i, semua) => (
              <li key={t.berlakuMulai} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-background px-4 py-2.5">
                <span className="text-[17px] font-bold">
                  {TANDA_ARAH[indikator.arah]} {t.nilai.toLocaleString("id-ID")} {indikator.satuan}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  mulai {labelBulan(t.berlakuMulai)}
                  {i === semua.length - 1 && " (juga bulan-bulan sebelumnya)"}
                </span>
              </li>
            ))}
          </ol>
          {bolehKelolaIndikator(pengguna) && (
            <div className="m-3 rounded-2xl bg-atur-tint/60 p-4">
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
            <p className="px-5 pb-4 text-muted-foreground">Belum ada Unit Pelapor.</p>
          ) : (
            <ul className="grid gap-2 px-3 pb-3">
              {indikator.unitPelapor.map((p) => (
                <li key={p.id} className="grid gap-2 rounded-xl bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.namaUnit}
                      {!p.unitAktif && <Pil nada="netral">Unit nonaktif</Pil>}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">{labelPeriode(p.bulanMulai, p.bulanBerhenti)}</span>
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
            <div className="m-3 rounded-2xl bg-atur-tint/60 p-4">
              {pilihan.length === 0 ? (
                <p className="text-atur-ink">Belum ada Unit aktif. Admin Sistem menambahkannya di menu Unit.</p>
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
