import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { labelBulan, labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { formatAngka } from "@/lib/capaian";
import {
  formatRupiah,
  LABEL_KEPUTUSAN_PDSA,
  LABEL_SUMBER_DAYA,
  LABEL_TAHAP_PDSA,
  labelLingkup,
  sudahDicapai,
  TAHAP_ISIAN_PDSA,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";
import { ambilPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../../ikon";
import { keteranganRs, keteranganUnit, Tren } from "../../monitoring/grafik";
import { formatWaktu, Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui";
import { FormEfisiensi, FormTahap } from "../form-pdsa";
import { keadaan, LabelTahap, WARNA_KEADAAN } from "../tahap";

export const metadata: Metadata = { title: "Detail PDSA" };

/**
 * Isi satu tahap di jejak: belum dicapai, isian tersimpan (baris label dan teks), atau form bila tahap ini dibuka dan
 * boleh ditulis (tahap aktif langsung berupa form, tahap lewat lewat "Perbaiki").
 */
function IsiTahap(p: {
  tahap: TahapIsianPdsa;
  aktif: boolean;
  dicapai: boolean;
  bolehTulis: boolean;
  isi: [string, string][];
  form: React.ReactNode;
}) {
  if (!p.dicapai) return <p className="text-[15px] text-ink-3">Belum dicapai; diisi setelah tahap sebelumnya selesai.</p>;
  if (p.aktif && p.bolehTulis && p.form) return <div className="rounded-card border border-rule bg-card p-5 sm:p-6">{p.form}</div>;
  return (
    <div className="grid gap-4">
      <dl className="grid border-t border-rule">
        {p.isi.map(([label, nilai]) => (
          <div key={label} className="grid min-w-0 gap-1 border-b border-rule py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-[14px] text-ink-3">{label}</dt>
            <dd className="max-w-[72ch] text-[15px] leading-6 break-words whitespace-pre-line">
              {nilai || <span className="text-ink-3">belum diisi</span>}
            </dd>
          </div>
        ))}
      </dl>
      {p.bolehTulis && p.form && (
        <Collapsible className="group/perbaiki grid gap-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-self-start sm:w-auto">
              <Ikon nama="isi" className="size-4" />
              Perbaiki {LABEL_TAHAP_PDSA[p.tahap]}
              <Ikon nama="bawah" className="size-4 text-ink-3 group-data-[state=open]/perbaiki:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="rounded-card border border-rule bg-card p-5 sm:p-6">{p.form}</CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/** Keterangan tiap tahap di samping namanya. */
const JUDUL: Record<TahapIsianPdsa, string> = {
  plan: "rencana perubahan",
  do: "uji coba skala kecil",
  study: "hasil dibanding prediksi",
  act: "keputusan",
};

/**
 * Detail PDSA: empat tahap sebagai jejak di satu garis tulang (tahap yang sedang diisi beramber), isian setiap tahap
 * yang sudah dicapai terbaca berurutan. Tahap yang dibuka (`?tahap=`, bawaannya tahap aktif) membawa form-nya, dan
 * Study membawa grafik Capaian dengan periode uji coba disorot.
 */
export default async function HalamanDetailPdsa({ params, searchParams }: PageProps<"/pdsa/[id]">) {
  const pengguna = await requireUser();
  // Hak baca Lingkup diperiksa service.
  const p = await pesanAtau(ambilPdsa(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const lingkup = labelLingkup(p.unit);
  // Tahap yang dibuka: `?tahap=`, bawaannya tahap aktif (Act bila PDSA sudah Selesai).
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
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <LabelTahap tahap={p.tahap} />
            <span>
              <span className="terukur text-[13px] text-ink-2">{p.indikator.kode}</span> {p.indikator.nama}, {lingkup}, siklus ke-{p.siklus},
              uji coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}
            </span>
          </span>
        }
        sub={
          <>
            Terakhir diubah oleh <span className="text-signal">{p.diubahOleh}</span>,{" "}
            <span className="terukur text-[14px] text-cool">{formatWaktu(p.diubahPada)}</span>.
          </>
        }
        aksi={
          p.berikutnya ? (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href={`/pdsa/${p.berikutnya.id}`}>Siklus ke-{p.berikutnya.siklus}</Link>
            </Button>
          ) : (
            p.tahap === "selesai" &&
            p.bolehTulis && (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/pdsa/baru?sebelumnya=${p.id}`}>
                  <Ikon nama="tambah" className="size-[18px]" />
                  Mulai siklus berikutnya
                </Link>
              </Button>
            )
          )
        }
      />

      <section aria-label="Tahap PDSA">
        <ol className="grid border-l border-rule-2">
          {TAHAP_ISIAN_PDSA.map((t) => {
            const k = keadaan(t, p.tahap);
            const dibuka = t === dipilih;
            return (
              <li
                key={t}
                className={`relative grid min-w-0 gap-4 pb-10 pl-5 last:pb-1 sm:pl-7 ${
                  k === "sedang diisi" ? "before:absolute before:inset-y-0 before:-left-px before:w-0.5 before:bg-signal" : ""
                }`}
              >
                <h2 className="flex max-w-none flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={`/pdsa/${p.id}?tahap=${t}`}
                    aria-current={dibuka ? "page" : undefined}
                    className={`font-display text-[22px] leading-7 font-medium tracking-[-0.02em] aria-[current=page]:no-underline ${
                      k === "sedang diisi" ? "text-signal underline decoration-signal-rule" : "text-primary-ink"
                    }`}
                  >
                    {LABEL_TAHAP_PDSA[t]}
                  </Link>
                  <span className="text-[15px] text-ink-3">{JUDUL[t]}</span>
                  <span className={`ml-auto text-[14px] ${WARNA_KEADAAN[k]}`}>{k}</span>
                </h2>

                {dibuka &&
                  t === "study" &&
                  (p.study.length === 0 ? (
                    <p className="text-[15px] text-ink-3">Belum ada data Capaian {lingkup} dalam 12 bulan ini.</p>
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

                <IsiTahap
                  tahap={t}
                  aktif={p.tahap === t}
                  dicapai={sudahDicapai(t, p.tahap)}
                  bolehTulis={p.bolehTulis}
                  isi={isi[t]}
                  form={dibuka && <FormTahap key={versi} id={p.id} tahap={t} aktif={p.tahap === t} awal={awal} />}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <Efisiensi p={p} versi={versi} />
    </Halaman>
  );
}

/**
 * Analisis Efisiensi PDSA (KMK 1596/2024 PMKP 4 EP g): biaya per jenis sumber daya sebelum dan sesudah perbaikan,
 * penghematannya, dan kesimpulan; form di balik "Isi" / "Perbaiki" untuk yang boleh menulis Lingkup ini.
 */
function Efisiensi({ p, versi }: { p: Awaited<ReturnType<typeof ambilPdsa>>; versi: string }) {
  const e = p.efisiensi;
  if (!e && !p.bolehTulis) return null;
  const awal: Record<string, string> = { kesimpulan: e?.kesimpulan ?? "" };
  for (const b of e?.baris ?? []) {
    Object.assign(awal, { [`sebelum-${b.jenis}`]: String(b.sebelum), [`sesudah-${b.jenis}`]: String(b.sesudah), [`keterangan-${b.jenis}`]: b.keterangan });
  }
  const selisih = (n: number) => (n === 0 ? "tetap" : `${n > 0 ? "hemat" : "bertambah"} ${formatRupiah(Math.abs(n))}`);
  return (
    <Kartu judul="Analisis Efisiensi" sub="Biaya dan jenis sumber daya sebelum dan sesudah perbaikan (PMKP 4 g; satu proyek prioritas per tahun).">
      {e ? (
        <>
          <Tabel label="Biaya sebelum dan sesudah perbaikan" lebarMin="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Sumber daya</TableHead>
                <TableHead className="text-right">Sebelum</TableHead>
                <TableHead className="text-right">Sesudah</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {e.baris.map((b) => (
                <TableRow key={b.jenis}>
                  <TableCell className="font-medium">{LABEL_SUMBER_DAYA[b.jenis]}</TableCell>
                  <TableCell className="terukur text-right whitespace-nowrap">{formatRupiah(b.sebelum)}</TableCell>
                  <TableCell className="terukur text-right whitespace-nowrap">{formatRupiah(b.sesudah)}</TableCell>
                  <TableCell className="text-right text-[14px] whitespace-nowrap">{selisih(b.sebelum - b.sesudah)}</TableCell>
                  <TableCell className="min-w-48 text-[14px] whitespace-normal text-ink-2">{b.keterangan}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Jumlah</TableCell>
                <TableCell className="terukur text-right whitespace-nowrap text-ink">{formatRupiah(e.ringkasan.sebelum)}</TableCell>
                <TableCell className="terukur text-right whitespace-nowrap text-ink">{formatRupiah(e.ringkasan.sesudah)}</TableCell>
                <TableCell
                  className={`text-right text-[14px] whitespace-nowrap ${e.ringkasan.hemat > 0 ? "text-ok" : e.ringkasan.hemat < 0 ? "text-bad" : ""}`}
                >
                  {selisih(e.ringkasan.hemat)}
                  {e.ringkasan.persen !== null && (
                    <span className="terukur ml-1">({formatAngka(Math.round(e.ringkasan.persen * 10) / 10)}%)</span>
                  )}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Tabel>
          <dl className="grid gap-1 px-5 pb-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-[14px] text-ink-3">Kesimpulan</dt>
            <dd className="max-w-[72ch] text-[15px] leading-6 whitespace-pre-line">{e.kesimpulan}</dd>
          </dl>
        </>
      ) : (
        <p className="px-5 pb-4 text-[15px] text-ink-3">Belum ada Analisis Efisiensi untuk PDSA ini.</p>
      )}
      {p.bolehTulis && (
        <Collapsible className="group/efisiensi grid gap-4 border-t border-rule px-5 py-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-self-start sm:w-auto">
              <Ikon nama="isi" className="size-4" />
              {e ? "Perbaiki Analisis Efisiensi" : "Isi Analisis Efisiensi"}
              <Ikon nama="bawah" className="size-4 text-ink-3 group-data-[state=open]/efisiensi:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FormEfisiensi key={versi} id={p.id} awal={awal} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </Kartu>
  );
}
