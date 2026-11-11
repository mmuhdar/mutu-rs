import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelBulan, labelPeriode } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { TANDA_ARAH } from "@/lib/indikator";
import { labelLingkup } from "@/lib/perbaikan";
import { ambilAnalisis } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { formatSelisih, keteranganRs, keteranganUnit } from "../monitoring/grafik";
import { LabelTahap } from "../pdsa/tahap";
import { formatWaktu, LabelCapaian, Pesan, pesanAtau } from "../pengukuran/status";
import { TabelTindakLanjut } from "../tindak-lanjut/tabel";
import { Ikon } from "../ikon";
import { AngkaBesar, BarKemajuan, Halaman, KepalaHalaman } from "../ui";
import { FormAnalisis } from "./form-analisis";
import { FormTambahTindakLanjut, FormUbahTindakLanjut } from "./form-tindak-lanjut";
import { tautanAnalisis } from "./tautan";

export const metadata: Metadata = { title: "Analisis" };

/**
 * Analisis satu Indikator dalam satu Lingkup untuk satu bulan (`unit` kosong = Lingkup RS): Capaian terkini dari modul
 * Capaian, teks Analisis, Tindak Lanjut-nya, dan PDSA yang berjalan. Satu-satunya tempat menulis Analisis.
 */
export default async function HalamanAnalisis({ searchParams }: PageProps<"/analisis">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const kunci = {
    indikatorId: teksAlamat(sp, "indikator"),
    unitId: teksAlamat(sp, "unit") || null,
    bulan: teksAlamat(sp, "bulan"),
  };
  // Hak baca Lingkup dan bulan yang bisa dianalisis diperiksa service.
  const a = await pesanAtau(ambilAnalisis(pengguna, kunci));
  if (typeof a === "string") return <Pesan>{a}</Pesan>;

  const { indikator: ind, unit, capaian: c } = a;
  const lingkup = labelLingkup(unit);
  // Setiap perubahan yang berhasil mengubah data ini, jadi semua form dibuat ulang dan pesan penolakan lama dari form
  // lain hilang. Tanda tersimpan = "Terakhir diubah oleh" dan daftar Tindak Lanjut yang ikut berubah.
  const versi = JSON.stringify([a.analisis?.diubahPada, a.tindakLanjut.map((t) => [t.id, t.diubahPada])]);
  const catatan = c && (unit ? keteranganUnit : keteranganRs)(c);
  const ada = c !== null && c.kelengkapan.terverifikasi > 0;

  return (
    <Halaman>
      <KepalaHalaman
        judul={ind.nama}
        kembali={[{ href: `/monitoring?${new URLSearchParams({ indikator: ind.id, bulan: a.bulan })}`, label: "Monitoring" }]}
        meta={
          <>
            <span className="terukur text-ink-2">{ind.kode}</span>, {ind.kelompok}
            {!ind.aktif && ", nonaktif"}, Analisis {lingkup}, {labelBulan(a.bulan)}
          </>
        }
      />

      {/* Bacaan Capaian bulan ini: satu permukaan dibagi garis rambut; Capaian dalam huruf ukur ukuran tampilan. */}
      <section
        aria-label={`${unit ? "Capaian Unit" : "Capaian RS"} ${labelBulan(a.bulan)}`}
        className="overflow-hidden rounded-card border border-rule bg-rule"
      >
        <div className="grid grid-cols-2 gap-px md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="col-span-2 grid content-between gap-4 bg-paper-2 p-5 sm:p-6 md:col-span-1">
            <p className="text-[14px] font-medium text-ink-2">{unit ? "Capaian Unit" : "Capaian RS"}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {ada ? (
                <AngkaBesar teks={formatCapaian(c.capaian, ind.satuan)} satuan={ind.satuan} className="text-[52px] tracking-[-0.04em] sm:text-[64px]" />
              ) : (
                <span className="text-[22px] leading-none text-ink-3">belum ada</span>
              )}
              {c?.status && <LabelCapaian status={c.status} />}
            </p>
            <p className="text-[13px] text-ink-3">
              {!c?.status
                ? "belum ada Capaian"
                : c.selisih === null
                  ? "selisih belum ada"
                  : `selisih ${formatSelisih(c.selisih)} ${ind.satuan} dari Target`}
            </p>
          </div>
          <div className="grid content-between gap-4 bg-paper-2 p-5">
            <p className="text-[14px] font-medium text-ink-2">Target</p>
            {c ? (
              <p className="text-[28px] leading-none tracking-[-0.03em] text-ink">
                {TANDA_ARAH[ind.arah]} {formatCapaian(c.target, ind.satuan)}
              </p>
            ) : (
              <p className="text-[18px] leading-none text-ink-3">belum ada</p>
            )}
            <p className="text-[13px] text-ink-3">berlaku bulan ini</p>
          </div>
          <div className="grid content-between gap-4 bg-paper-2 p-5">
            <p className="text-[14px] font-medium text-ink-2">Kelengkapan</p>
            {c ? (
              <p className="terukur text-[28px] leading-none tracking-[-0.04em] text-ink">
                {c.kelengkapan.terverifikasi}/{c.kelengkapan.wajib}
              </p>
            ) : (
              <p className="text-[18px] leading-none text-ink-3">belum ada</p>
            )}
            <div>
              <p className={`text-[13px] ${catatan && c && c.kelengkapan.wajib > 0 ? "text-signal" : "text-ink-3"}`}>
                {catatan ?? "Capaian dari Pengukuran Terverifikasi terkini"}
              </p>
              {c && <BarKemajuan nada="ukur" nilai={c.kelengkapan.terverifikasi} dari={c.kelengkapan.wajib} />}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
        {/* Analisis dan Tindak Lanjut-nya: satu permukaan dibagi garis rambut. */}
        <div className="grid min-w-0 gap-px overflow-hidden rounded-card border border-rule bg-rule">
          <Bagian
            judul="Analisis"
            sub={
              a.analisis ? (
                <>
                  Terakhir diubah oleh <span className="text-signal">{a.analisis.diubahOleh}</span>,{" "}
                  <span className="terukur text-cool">{formatWaktu(a.analisis.diubahPada)}</span>
                </>
              ) : (
                "Belum ditulis."
              )
            }
          >
            <div className="px-5 pb-6 sm:px-6">
              {a.bolehTulisAnalisis ? (
                <FormAnalisis key={versi} indikatorId={ind.id} unitId={unit?.id ?? null} bulan={a.bulan} teks={a.analisis?.teks ?? ""} />
              ) : (
                <p className="max-w-[70ch] text-[16px] leading-7 whitespace-pre-line">{a.analisis?.teks ?? "Belum ada Analisis untuk bulan ini."}</p>
              )}
            </div>
          </Bagian>

          <Bagian judul="Tindak Lanjut" sub="Tindakan perbaikan dari Analisis ini, dengan PIC dan tenggat.">
            {a.tindakLanjut.length === 0 ? (
              <p className="px-5 pb-5 text-[15px] text-ink-3 sm:px-6">Belum ada Tindak Lanjut.</p>
            ) : (
              <TabelTindakLanjut daftar={a.tindakLanjut} bawah={a.bolehTulis ? (t) => <FormUbahTindakLanjut key={versi} t={t} /> : undefined} />
            )}
          </Bagian>

          {a.bolehTulis && (
            <div className="bg-paper-2 px-5 py-5 sm:px-6">
              {a.analisis ? (
                <FormTambahTindakLanjut key={versi} analisisId={a.analisis.id} />
              ) : (
                <p className="text-[15px] text-ink-3">Simpan Analisis dulu, lalu tambahkan Tindak Lanjut-nya di sini.</p>
              )}
            </div>
          )}
        </div>

        {/* PDSA dan Tindak Lanjut yang masih terbuka: satu permukaan di samping. */}
        <div className="grid min-w-0 gap-px overflow-hidden rounded-card border border-rule bg-rule">
          <Bagian
            judul="PDSA berjalan"
            sub="Uji coba perbaikan untuk Indikator dan Lingkup ini."
            aksi={
              a.bolehTulis && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/pdsa/baru?${new URLSearchParams({ indikator: ind.id, ...(unit ? { unit: unit.id } : {}) })}`}>
                    <Ikon nama="tambah" className="size-4" />
                    Mulai PDSA
                  </Link>
                </Button>
              )
            }
          >
            {a.pdsa.length === 0 ? (
              <p className="px-5 pb-5 text-[15px] text-ink-3">Tidak ada PDSA yang sedang berjalan.</p>
            ) : (
              <ul className="grid px-2 pb-2 sm:px-3">
                {a.pdsa.map((p) => (
                  <li key={p.id} className="border-t border-rule first:border-0">
                    <Link href={`/pdsa/${p.id}`} className="grid gap-1.5 rounded-md px-3 py-3 transition-colors hover:bg-paper-3">
                      <span className="font-medium">{p.judul}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
                        <LabelTahap tahap={p.tahap} />
                        siklus ke-{p.siklus}, {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Bagian>

          {a.tindakLanjutSebelumnya.length > 0 && (
            <Bagian judul="Masih terbuka dari bulan sebelumnya" sub={`Tindak Lanjut Analisis ${lingkup}; statusnya diubah di Analisis bulan itu.`}>
              <TabelTindakLanjut
                daftar={a.tindakLanjutSebelumnya}
                atas={(t) => `Analisis ${labelBulan(t.bulan)}`}
                href={(t) => tautanAnalisis(ind.id, unit?.id ?? null, t.bulan)}
              />
            </Bagian>
          )}
        </div>
      </div>
    </Halaman>
  );
}

/** Satu bagian di dalam permukaan bergaris rambut: judul (h2), keterangan, dan aksi di kanan, lalu isinya. */
function Bagian(p: { judul: string; sub: React.ReactNode; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 bg-paper-2">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] leading-6 font-medium tracking-[-0.01em]">{p.judul}</h2>
          <p className="mt-1 text-[13px] text-ink-3">{p.sub}</p>
        </div>
        {p.aksi}
      </div>
      {p.children}
    </section>
  );
}
