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

import { tombolGaris, tombolUtama } from "../../form";
import { Ikon } from "../../ikon";
import { keteranganRs, keteranganUnit, Tren } from "../../monitoring/grafik";
import { formatWaktu, Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { FormTahap } from "../form-pdsa";
import { LabelTahap, TabTahap } from "../tahap";

export const metadata: Metadata = { title: "Detail PDSA" };

/** Isi satu tahap: teks tersimpan, atau form bila boleh menulis (tahap aktif terbuka, tahap lewat di "Perbaiki"). */
function IsiTahap(p: {
  tahap: TahapIsianPdsa;
  aktif: boolean;
  dicapai: boolean;
  bolehTulis: boolean;
  isi: [string, string][];
  form: React.ReactNode;
}) {
  if (!p.dicapai) return <Pesan>Belum dicapai; diisi setelah tahap sebelumnya selesai.</Pesan>;
  if (p.aktif && p.bolehTulis) return <div>{p.form}</div>;
  return (
    <div className="grid gap-4">
      <dl className="grid gap-4 md:grid-cols-2">
        {p.isi.map(([label, nilai]) => (
          <div key={label} className="min-w-0 rounded-xl border border-border bg-head px-4 py-3.5">
            <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-[15px] leading-6 break-words whitespace-pre-line">{nilai || <span className="text-muted-foreground">–</span>}</dd>
          </div>
        ))}
      </dl>
      {p.bolehTulis && (
        <details className="group rounded-xl border border-border">
          <summary className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 font-semibold text-primary-ink hover:bg-active">
            <Ikon nama="isi" className="size-[18px]" />
            Perbaiki {LABEL_TAHAP_PDSA[p.tahap]}
            <Ikon nama="bawah" className="ml-auto size-4 text-muted-foreground group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-4 pt-4 pb-4">{p.form}</div>
        </details>
      )}
    </div>
  );
}

const JUDUL: Record<TahapIsianPdsa, string> = {
  plan: "Plan: rencana perubahan",
  do: "Do: uji coba skala kecil",
  study: "Study: hasil dibanding prediksi",
  act: "Act: keputusan",
};

export default async function HalamanDetailPdsa({ params, searchParams }: PageProps<"/pdsa/[id]">) {
  const pengguna = await requireUser();
  // Hak baca Lingkup diperiksa service.
  const p = await pesanAtau(ambilPdsa(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const lingkup = labelLingkup(p.unit);
  // Tab yang dibuka: `?tahap=`, bawaannya tahap aktif (Act bila PDSA sudah Selesai).
  const diminta = teksAlamat(await searchParams, "tahap");
  const dipilih = TAHAP_ISIAN_PDSA.find((t) => t === diminta) ?? (p.tahap === "selesai" ? "act" : p.tahap);
  const { judul, masalah, tujuan, prediksi, rencana, bulanMulai, bulanAkhir, pelaksanaan, hasil, keputusan, penjelasan } = p;
  const awal = { judul, masalah, tujuan, prediksi, rencana, bulanMulai, bulanAkhir, pelaksanaan, hasil, keputusan, penjelasan };
  // Setiap simpan yang berhasil mengubah data ini, jadi semua form dibuat ulang dan pesan penolakan lama hilang.
  const versi = p.diubahPada.toISOString();
  const isi: Record<TahapIsianPdsa, [string, string][]> = {
    plan: [
      ["Masalah", p.masalah],
      ["Tujuan", p.tujuan],
      ["Prediksi", p.prediksi],
      ["Rencana perubahan", p.rencana],
      ["Periode uji coba", labelPeriode(p.bulanMulai, p.bulanAkhir)],
    ],
    do: [["Pelaksanaan", p.pelaksanaan]],
    study: [["Hasil", p.hasil]],
    act: [
      ["Keputusan", p.keputusan ? LABEL_KEPUTUSAN_PDSA[p.keputusan] : ""],
      ["Penjelasan", p.penjelasan],
    ],
  };

  return (
    <Halaman>
      <KepalaHalaman
        judul={p.judul}
        kembali={[
          { href: "/pdsa", label: "Daftar PDSA" },
          ...(p.sebelumnya ? [{ href: `/pdsa/${p.sebelumnya.id}`, label: `Siklus ke-${p.sebelumnya.siklus}` }] : []),
        ]}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <LabelTahap tahap={p.tahap} />
            <span>
              <span className="font-mono text-[13px]">{p.indikator.kode}</span> {p.indikator.nama} · {lingkup} · siklus ke-{p.siklus} · uji
              coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}
            </span>
          </span>
        }
        sub={`Terakhir diubah oleh ${p.diubahOleh}, ${formatWaktu(p.diubahPada)}.`}
        aksi={
          p.berikutnya ? (
            <Link href={`/pdsa/${p.berikutnya.id}`} className={tombolGaris}>
              Siklus ke-{p.berikutnya.siklus}
              <Ikon nama="kanan" className="size-4" />
            </Link>
          ) : (
            p.tahap === "selesai" &&
            p.bolehTulis && (
              <Link href={`/pdsa/baru?sebelumnya=${p.id}`} className={tombolUtama}>
                <Ikon nama="tambah" className="size-[18px]" />
                Mulai siklus berikutnya
              </Link>
            )
          )
        }
      />

      <TabTahap id={p.id} aktif={p.tahap} dipilih={dipilih} />

      {dipilih === "study" &&
        (p.study.length === 0 ? (
          <Pesan>Belum ada data Capaian {lingkup} dalam 12 bulan ini.</Pesan>
        ) : (
          <Tren
            judul={p.unit ? `Capaian ${lingkup}` : "Capaian RS"}
            keterangan={`12 bulan sampai ${labelBulan(p.study.at(-1)!.bulan)}; periode uji coba disorot.`}
            titik={p.study}
            satuan={p.indikator.satuan}
            catatan={p.unit ? keteranganUnit : keteranganRs}
            sorot={{ mulai: p.bulanMulai, akhir: p.bulanAkhir }}
          />
        ))}

      <Kartu judul={JUDUL[dipilih]} sub={p.tahap === dipilih ? "Tahap yang sedang diisi." : undefined}>
        <div className="px-5 pb-5">
          <IsiTahap
            tahap={dipilih}
            aktif={p.tahap === dipilih}
            dicapai={sudahDicapai(dipilih, p.tahap)}
            bolehTulis={p.bolehTulis}
            isi={isi[dipilih]}
            form={<FormTahap key={versi} id={p.id} tahap={dipilih} aktif={p.tahap === dipilih} awal={awal} />}
          />
        </div>
      </Kartu>
    </Halaman>
  );
}
