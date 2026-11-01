import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, labelBulan, labelPeriode } from "@/lib/bulan";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH, targetPadaBulan } from "@/lib/indikator";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { pilihanUnit } from "@/modules/unit/service";

import { tombolUtama } from "../../form";
import { Ikon } from "../../ikon";
import { Halaman, Kartu, KepalaHalaman, kelasTd, kelasTh, KotakIkon, Pil, Tabel, Ubin } from "../../ui";
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
  // Target bulan berjalan menurut satu-satunya aturan Target berlaku (Target yang mulai bulan depan belum berlaku).
  const berlaku = targetPadaBulan(indikator.target, bulanBerjalan());
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
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {indikator.kelompok} · PIC {indikator.pic || "belum diisi"}
          </>
        }
        sub={indikator.aktif ? undefined : "Nonaktif: tidak muncul di isian, riwayatnya tetap ada."}
        aksi={
          bolehKelolaIndikator(pengguna) && (
            <>
              <Link href={`/indikator/${indikator.id}/ubah`} className={tombolUtama}>
                <Ikon nama="isi" className="size-[18px]" />
                Ubah
              </Link>
              <TombolAktif key={versi} id={indikator.id} aktif={indikator.aktif} />
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Ubin
          nada="brand"
          ikon="target"
          label="Target berlaku"
          nilai={berlaku === undefined ? "–" : `${TANDA_ARAH[indikator.arah]} ${berlaku.toLocaleString("id-ID")} ${indikator.satuan}`}
          keterangan={`berlaku ${labelBulan(bulanBerjalan())}`}
        />
        <Ubin
          nada="ukur"
          ikon="dokumen"
          label="Cara hitung"
          nilai={`× ${indikator.faktor}`}
          keterangan={`N ÷ D × ${indikator.faktor}, satuan ${indikator.satuan}`}
        />
        <Ubin nada="pantau" ikon="monitoring" label="Arah" nilai={TANDA_ARAH[indikator.arah]} keterangan={LABEL_ARAH[indikator.arah]} />
        <Ubin
          nada="tindak"
          ikon="jam"
          label="Frekuensi"
          nilai={LABEL_FREKUENSI[indikator.frekuensi]}
          keterangan={indikator.frekuensi === "semesteran" ? "diisi Juni dan Desember" : "diisi setiap bulan"}
        />
      </div>

      <Kartu judul="Definisi">
        <dl className="grid gap-x-8 px-5 pb-2 md:grid-cols-2">
          {definisi.map(([label, isi]) => (
            <div key={label} className="min-w-0 border-t border-rule py-4">
              <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-line">{isi}</dd>
            </div>
          ))}
        </dl>
      </Kartu>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Kartu judul="Target" sub="Setiap bulan dinilai dengan Target yang berlaku mulai paling akhir sebelum atau pada bulan itu.">
          <Tabel label="Riwayat Target" lebarMin="min-w-[18rem]">
            <thead>
              <tr>
                <th className={kelasTh}>Berlaku mulai</th>
                <th className={`${kelasTh} text-right`}>Target</th>
              </tr>
            </thead>
            <tbody>
              {indikator.target.toReversed().map((t, i, semua) => (
                <tr key={t.berlakuMulai}>
                  <td className={kelasTd}>
                    <span className="block font-medium">{labelBulan(t.berlakuMulai)}</span>
                    {i === semua.length - 1 && <span className="text-[13px] text-muted-foreground">juga bulan-bulan sebelumnya</span>}
                  </td>
                  <td className={`${kelasTd} text-right text-[16px] font-bold whitespace-nowrap`}>
                    {TANDA_ARAH[indikator.arah]} {t.nilai.toLocaleString("id-ID")} {indikator.satuan}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabel>
          {bolehKelolaIndikator(pengguna) && (
            <div className="m-3 mt-2 rounded-xl border border-border bg-head p-4">
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
            <ul className="divide-y divide-rule border-t border-rule px-5">
              {indikator.unitPelapor.map((p) => (
                <li key={p.id} className="grid gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="flex min-w-0 items-center gap-3">
                    <KotakIkon nada="atur" ikon="unit" kecil />
                    <div className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.namaUnit}
                        {!p.unitAktif && <Pil nada="netral">Unit nonaktif</Pil>}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">{labelPeriode(p.bulanMulai, p.bulanBerhenti)}</span>
                    </div>
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
            <div className="m-3 mt-2 rounded-xl border border-border bg-head p-4">
              {pilihan.length === 0 ? (
                <p className="text-muted-foreground">Belum ada Unit aktif. Admin Sistem menambahkannya di menu Unit.</p>
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
