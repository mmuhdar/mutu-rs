import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan, labelPeriode } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { TANDA_ARAH } from "@/lib/indikator";
import { labelLingkup } from "@/lib/perbaikan";
import { ambilAnalisis } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { formatWaktu, kelasKartu, LabelCapaian, Pesan, pesanAtau } from "../pengukuran/status";
import { TabelTindakLanjut } from "../tindak-lanjut/tabel";
import { FormAnalisis } from "./form-analisis";
import { FormTambahTindakLanjut, FormUbahTindakLanjut } from "./form-tindak-lanjut";
import { keteranganRs, keteranganUnit } from "../monitoring/grafik";
import { LabelTahap } from "../pdsa/tahap";
import { tautanAnalisis } from "./tautan";

export const metadata: Metadata = { title: "Analisis" };

/**
 * Analisis satu Indikator dalam satu Lingkup untuk satu bulan (`unit` kosong = Lingkup RS): Capaian terkini dari modul
 * Capaian dan teks Analisis-nya. Satu-satunya tempat menulis Analisis.
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

  return (
    <section className="grid gap-4">
      <div>
        <Link
          href={`/monitoring?${new URLSearchParams({ indikator: ind.id, bulan: a.bulan })}`}
          className="text-[13px] font-medium text-accent hover:underline pointer-coarse:py-2"
        >
          ← Monitoring
        </Link>
<h1 className="mt-3 text-[22px] leading-7 font-semibold tracking-[-0.01em]">{ind.nama}</h1>
        <p className="mt-1 text-muted-foreground">
          <span className="font-mono text-[12px]">{ind.kode}</span> · {ind.kelompok}
          {!ind.aktif && " · nonaktif"} · Analisis {lingkup} · {labelBulan(a.bulan)}
        </p>
      </div>

      <dl className={`${kelasKartu} grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4`}>
        <div className="min-w-0">
          <dt className="text-[12.5px] font-medium text-muted-foreground">{unit ? "Capaian Unit" : "Capaian RS"}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {c && c.kelengkapan.terverifikasi > 0 ? formatCapaian(c.capaian, ind.satuan) : "–"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[12.5px] font-medium text-muted-foreground">Target</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {c ? `${TANDA_ARAH[ind.arah]} ${formatCapaian(c.target, ind.satuan)}` : "–"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[12.5px] font-medium text-muted-foreground">Status Capaian</dt>
          <dd className="mt-1">
            <LabelCapaian status={c?.status ?? null} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[12.5px] font-medium text-muted-foreground">Kelengkapan</dt>
          <dd className="font-semibold tabular-nums">
            {c ? `${c.kelengkapan.terverifikasi}/${c.kelengkapan.wajib} Unit` : "–"}
            {catatan && <span className="block text-[12.5px] font-normal text-warning">{catatan}</span>}
          </dd>
        </div>
        <p className="col-span-full text-[12.5px] text-muted-foreground">
          Angka terkini dari Pengukuran Terverifikasi; berubah bila Pengukuran bulan ini dibuka kembali.
        </p>
      </dl>

      <div className={`${kelasKartu} grid gap-2 p-4`}>
        {a.bolehTulisAnalisis ? (
          <FormAnalisis
            key={versi}
            indikatorId={ind.id}
            unitId={unit?.id ?? null}
            bulan={a.bulan}
            teks={a.analisis?.teks ?? ""}
          />
        ) : (
          <>
            <h2 className="font-semibold">Analisis</h2>
            <p className="whitespace-pre-line">{a.analisis?.teks ?? "Belum ada Analisis untuk bulan ini."}</p>
          </>
        )}
        {a.analisis && (
          <p className="text-[13px] text-muted-foreground">
            Terakhir diubah oleh {a.analisis.diubahOleh}, {formatWaktu(a.analisis.diubahPada)}
          </p>
        )}
      </div>

      <div className={kelasKartu}>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">Tindak Lanjut</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Tindakan perbaikan dari Analisis ini, dengan PIC dan tenggat.</p>
        </div>
        {a.tindakLanjut.length === 0 ? (
          <p className="px-4 py-3 text-muted-foreground">Belum ada Tindak Lanjut.</p>
        ) : (
          <TabelTindakLanjut
            daftar={a.tindakLanjut}
            bawah={a.bolehTulis ? (t) => <FormUbahTindakLanjut key={versi} t={t} /> : undefined}
          />
        )}
        {a.bolehTulis && (
          <div className="border-t border-border p-4">
            {a.analisis ? (
              <FormTambahTindakLanjut key={versi} analisisId={a.analisis.id} />
            ) : (
              <p className="text-muted-foreground">Simpan Analisis dulu, lalu tambahkan Tindak Lanjut-nya di sini.</p>
            )}
          </div>
        )}
      </div>

      <div className={kelasKartu}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">PDSA yang sedang berjalan</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Uji coba perbaikan untuk Indikator dan Lingkup ini.</p>
          </div>
          {a.bolehTulis && (
            <Link
              href={`/pdsa/baru?${new URLSearchParams({ indikator: ind.id, ...(unit ? { unit: unit.id } : {}) })}`}
              className="text-[13px] font-medium text-accent hover:underline pointer-coarse:py-2"
            >
              Mulai PDSA
            </Link>
          )}
        </div>
        {a.pdsa.length === 0 ? (
          <p className="px-4 py-3 text-muted-foreground">Tidak ada PDSA yang sedang berjalan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {a.pdsa.map((p) => (
              <li key={p.id}>
                <Link href={`/pdsa/${p.id}`} className="grid gap-1 px-4 py-3 hover:bg-background">
                  <span className="font-medium">{p.judul}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                    <LabelTahap tahap={p.tahap} />
                    siklus ke-{p.siklus} · uji coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {a.tindakLanjutSebelumnya.length > 0 && (
        <div className={kelasKartu}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Tindak Lanjut bulan sebelumnya yang masih terbuka</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Dari Analisis {lingkup} bulan-bulan sebelumnya; statusnya diubah di Analisis bulan itu.
            </p>
          </div>
          <TabelTindakLanjut
            daftar={a.tindakLanjutSebelumnya}
            atas={(t) => `Analisis ${labelBulan(t.bulan)}`}
            href={(t) => tautanAnalisis(ind.id, unit?.id ?? null, t.bulan)}
          />
        </div>
      )}
    </section>
  );
}
