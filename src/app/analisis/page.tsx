import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan, labelPeriode } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { TANDA_ARAH } from "@/lib/indikator";
import { labelLingkup } from "@/lib/perbaikan";
import { ambilAnalisis } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { keteranganRs, keteranganUnit } from "../monitoring/grafik";
import { LabelTahap } from "../pdsa/tahap";
import { formatWaktu, LabelCapaian, Pesan, pesanAtau } from "../pengukuran/status";
import { TabelTindakLanjut } from "../tindak-lanjut/tabel";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Ubin } from "../ui";
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
    <Halaman area="pantau">
      <KepalaHalaman
        judul={ind.nama}
        kembali={[{ href: `/monitoring?${new URLSearchParams({ indikator: ind.id, bulan: a.bulan })}`, label: "Monitoring" }]}
        meta={
          <>
            <span className="font-mono text-[13px]">{ind.kode}</span> · {ind.kelompok}
            {!ind.aktif && " · nonaktif"} · Analisis {lingkup} · {labelBulan(a.bulan)}
          </>
        }
        aksi={c && <LabelCapaian status={c.status} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Ubin
          nada={c?.status === "tercapai" ? "pos" : c?.status === "belumTercapai" ? "neg" : "netral"}
          label={unit ? "Capaian Unit" : "Capaian RS"}
          nilai={ada ? formatCapaian(c.capaian, ind.satuan) : "–"}
          keterangan={c?.status ? (c.status === "tercapai" ? "Tercapai" : "Belum Tercapai") : "belum ada Capaian"}
        />
        <Ubin nada="pantau" label="Target" nilai={c ? `${TANDA_ARAH[ind.arah]} ${formatCapaian(c.target, ind.satuan)}` : "–"} keterangan="berlaku bulan ini" />
        <div className="col-span-2 md:col-span-1">
          <Ubin
            nada="ukur"
            label="Kelengkapan"
            nilai={c ? `${c.kelengkapan.terverifikasi}/${c.kelengkapan.wajib}` : "–"}
            keterangan={catatan ?? "Capaian dari Pengukuran Terverifikasi terkini"}
          >
            {c && <BarKemajuan nada="ukur" nilai={c.kelengkapan.terverifikasi} dari={c.kelengkapan.wajib} />}
          </Ubin>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-5">
          <Kartu
            judul="Analisis"
            sub={a.analisis ? `Terakhir diubah oleh ${a.analisis.diubahOleh}, ${formatWaktu(a.analisis.diubahPada)}` : "Belum ditulis."}
          >
            <div className="px-5 pb-5">
              {a.bolehTulisAnalisis ? (
                <FormAnalisis key={versi} indikatorId={ind.id} unitId={unit?.id ?? null} bulan={a.bulan} teks={a.analisis?.teks ?? ""} />
              ) : (
                <p className="text-[16px] leading-7 whitespace-pre-line">{a.analisis?.teks ?? "Belum ada Analisis untuk bulan ini."}</p>
              )}
            </div>
          </Kartu>

          <Kartu area="tindak" judul="Tindak Lanjut" sub="Tindakan perbaikan dari Analisis ini, dengan PIC dan tenggat.">
            {a.tindakLanjut.length === 0 ? (
              <p className="px-5 pb-4 text-muted-foreground">Belum ada Tindak Lanjut.</p>
            ) : (
              <TabelTindakLanjut daftar={a.tindakLanjut} bawah={a.bolehTulis ? (t) => <FormUbahTindakLanjut key={versi} t={t} /> : undefined} />
            )}
            {a.bolehTulis && (
              <div className="m-3 rounded-2xl bg-tindak-tint p-4">
                {a.analisis ? (
                  <FormTambahTindakLanjut key={versi} analisisId={a.analisis.id} />
                ) : (
                  <p className="text-tindak-ink">Simpan Analisis dulu, lalu tambahkan Tindak Lanjut-nya di sini.</p>
                )}
              </div>
            )}
          </Kartu>
        </div>

        <div className="grid gap-5">
          <Kartu
            area="pdsa"
            judul="PDSA berjalan"
            sub="Uji coba perbaikan untuk Indikator dan Lingkup ini."
            aksi={
              a.bolehTulis && (
                <Link
                  href={`/pdsa/baru?${new URLSearchParams({ indikator: ind.id, ...(unit ? { unit: unit.id } : {}) })}`}
                  className="shrink-0 rounded-lg bg-pdsa px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-pdsa-ink"
                >
                  Mulai PDSA
                </Link>
              )
            }
          >
            {a.pdsa.length === 0 ? (
              <p className="px-5 pb-4 text-muted-foreground">Tidak ada PDSA yang sedang berjalan.</p>
            ) : (
              <ul className="grid gap-2 px-3 pb-3">
                {a.pdsa.map((p) => (
                  <li key={p.id}>
                    <Link href={`/pdsa/${p.id}`} className="grid gap-1.5 rounded-xl bg-pdsa-tint px-4 py-3 hover:-translate-y-0.5">
                      <span className="font-semibold text-pdsa-ink">{p.judul}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground/75">
                        <LabelTahap tahap={p.tahap} />
                        siklus ke-{p.siklus} · {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>

          {a.tindakLanjutSebelumnya.length > 0 && (
            <Kartu
              area="tindak"
              judul="Masih terbuka dari bulan sebelumnya"
              sub={`Tindak Lanjut Analisis ${lingkup}; statusnya diubah di Analisis bulan itu.`}
            >
              <TabelTindakLanjut
                daftar={a.tindakLanjutSebelumnya}
                atas={(t) => `Analisis ${labelBulan(t.bulan)}`}
                href={(t) => tautanAnalisis(ind.id, unit?.id ?? null, t.bulan)}
              />
            </Kartu>
          )}
        </div>
      </div>
    </Halaman>
  );
}
