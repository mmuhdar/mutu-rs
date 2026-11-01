import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan, labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import {
  LABEL_KEPUTUSAN_PDSA,
  LABEL_TAHAP_PDSA,
  labelLingkup,
  sudahDicapai,
  TAHAP_ISIAN_PDSA,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";
import { ambilPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { keteranganRs, keteranganUnit, Tren } from "../../monitoring/grafik";
import { formatWaktu, kelasKartu, Pesan, pesanAtau } from "../../pengukuran/status";
import { FormTahap } from "../form-pdsa";
import { LabelTahap, TabTahap } from "../tahap";

export const metadata: Metadata = { title: "Detail PDSA" };

const kelasTautan = "text-[13px] font-medium text-accent hover:underline pointer-coarse:py-2";

/** Satu bagian tahap: isi tersimpan, atau form bila boleh menulis (tahap aktif terbuka, tahap lewat di "Perbaiki"). */
function BagianTahap(p: {
  tahap: TahapIsianPdsa;
  judul: string;
  aktif: boolean;
  dicapai: boolean;
  bolehTulis: boolean;
  isi: [string, string][];
  form: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={kelasKartu}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold">{p.judul}</h2>
        {p.aktif && <span className="text-[13px] font-medium text-accent">Tahap aktif</span>}
      </div>
      {p.children}
      {!p.dicapai ? (
        <p className="px-4 py-3 text-muted-foreground">Belum dicapai; diisi setelah tahap sebelumnya selesai.</p>
      ) : p.aktif && p.bolehTulis ? (
        <div className="p-4">{p.form}</div>
      ) : (
        <>
          <dl className="divide-y divide-border">
            {p.isi.map(([label, nilai]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
                <dd className="whitespace-pre-line">{nilai || "–"}</dd>
              </div>
            ))}
          </dl>
          {p.bolehTulis && (
            <details className="border-t border-border px-4 py-3">
              <summary className="cursor-pointer text-[13px] font-medium text-accent pointer-coarse:py-2">
                Perbaiki {LABEL_TAHAP_PDSA[p.tahap]}
              </summary>
              <div className="mt-3">{p.form}</div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export default async function HalamanDetailPdsa({ params, searchParams }: PageProps<"/pdsa/[id]">) {
  const pengguna = await requireUser();
  // Hak baca Lingkup diperiksa service.
  const p = await pesanAtau(ambilPdsa(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const lingkup = labelLingkup(p.unit);
  // Tab yang dibuka: `?tahap=`, bawaannya tahap aktif (Act bila PDSA sudah Selesai).
  const diminta = teksAlamat(await searchParams, "tahap");
  const dipilih = TAHAP_ISIAN_PDSA.find((t) => t === diminta) ?? (p.tahap === "selesai" ? "act" : p.tahap);
  const bagian = (tahap: TahapIsianPdsa) => ({
    tahap,
    aktif: p.tahap === tahap,
    dicapai: sudahDicapai(tahap, p.tahap),
    bolehTulis: p.bolehTulis,
  });
  const {
    judul,
    masalah,
    tujuan,
    prediksi,
    rencana,
    bulanMulai,
    bulanAkhir,
    pelaksanaan,
    hasil,
    keputusan,
    penjelasan,
  } = p;
  const awal = {
    judul,
    masalah,
    tujuan,
    prediksi,
    rencana,
    bulanMulai,
    bulanAkhir,
    pelaksanaan,
    hasil,
    keputusan,
    penjelasan,
  };
  // Setiap simpan yang berhasil mengubah data ini, jadi semua form dibuat ulang dan pesan penolakan lama dari form lain
  // hilang; "Terakhir diubah oleh" di bawah menjadi tanda tersimpan.
  const versi = p.diubahPada.toISOString();
  const form = (tahap: TahapIsianPdsa) => (
    <FormTahap key={versi} id={p.id} tahap={tahap} aktif={p.tahap === tahap} awal={awal} />
  );

  return (
    <section className="grid gap-4">
      <div>
        <p className="flex flex-wrap gap-x-4">
          <Link href="/pdsa" className={kelasTautan}>
            ← Daftar PDSA
          </Link>
          {p.sebelumnya && (
            <Link href={`/pdsa/${p.sebelumnya.id}`} className={kelasTautan}>
              Siklus ke-{p.sebelumnya.siklus} (sebelumnya)
            </Link>
          )}
          {p.berikutnya && (
            <Link href={`/pdsa/${p.berikutnya.id}`} className={kelasTautan}>
              Siklus ke-{p.berikutnya.siklus} (berikutnya) →
            </Link>
          )}
        </p>
<h1 className="mt-3 text-[22px] leading-7 font-semibold tracking-[-0.01em]">{p.judul}</h1>
        <p className="mt-1 text-muted-foreground">
          <span className="font-mono text-[12px]">{p.indikator.kode}</span> {p.indikator.nama} · {lingkup} · siklus ke-
          {p.siklus}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-muted-foreground">
          <LabelTahap tahap={p.tahap} />
          Uji coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}
        </p>
      </div>

      <TabTahap id={p.id} aktif={p.tahap} dipilih={dipilih} />

      {dipilih === "plan" && (
        <BagianTahap
          {...bagian("plan")}
          judul="Plan"
          isi={[
            ["Masalah", p.masalah],
            ["Tujuan", p.tujuan],
            ["Prediksi", p.prediksi],
            ["Rencana perubahan", p.rencana],
            ["Periode uji coba", labelPeriode(p.bulanMulai, p.bulanAkhir)],
          ]}
          form={form("plan")}
        />
      )}
      {dipilih === "do" && (
        <BagianTahap
          {...bagian("do")}
          judul="Do: uji coba skala kecil"
          isi={[["Pelaksanaan", p.pelaksanaan]]}
          form={form("do")}
        />
      )}
      {dipilih === "study" && (
        <BagianTahap
          {...bagian("study")}
          judul="Study: hasil dibanding prediksi"
          isi={[["Hasil", p.hasil]]}
          form={form("study")}
        >
          <div className="border-b border-border p-3 sm:p-4">
            {p.study.length === 0 ? (
              <p className="text-muted-foreground">Belum ada data Capaian {lingkup} dalam 12 bulan ini.</p>
            ) : (
              <Tren
                judul={p.unit ? `Capaian ${lingkup}` : "Capaian RS"}
                keterangan={`12 bulan sampai ${labelBulan(p.study.at(-1)!.bulan)}, dari Pengukuran Terverifikasi`}
                titik={p.study}
                satuan={p.indikator.satuan}
                catatan={p.unit ? keteranganUnit : keteranganRs}
                sorot={{ mulai: p.bulanMulai, akhir: p.bulanAkhir }}
                polos
              />
            )}
          </div>
        </BagianTahap>
      )}
      {dipilih === "act" && (
        <BagianTahap
          {...bagian("act")}
          judul="Act: keputusan"
          isi={[
            ["Keputusan", p.keputusan ? LABEL_KEPUTUSAN_PDSA[p.keputusan] : ""],
            ["Penjelasan", p.penjelasan],
          ]}
          form={form("act")}
        />
      )}

      {p.tahap === "selesai" && p.bolehTulis && !p.berikutnya && (
        <Link
          href={`/pdsa/baru?sebelumnya=${p.id}`}
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover sm:justify-self-start"
        >
          Mulai siklus berikutnya
        </Link>
      )}

      <p className="text-[13px] text-muted-foreground">
        Terakhir diubah oleh {p.diubahOleh}, {formatWaktu(p.diubahPada)}
      </p>
    </section>
  );
}
