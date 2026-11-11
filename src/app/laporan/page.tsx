import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  bulanTriwulan,
  geserBulan,
  hariIni,
  labelBulan,
  labelPeriode,
  labelTanggal,
  labelTriwulan,
  triwulanDari,
  triwulanDariAlamat,
  triwulanLalu,
} from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { config } from "@/lib/config";
import { KELOMPOK, TANDA_ARAH } from "@/lib/indikator";
import { LABEL_KEPUTUSAN_PDSA, labelLingkup } from "@/lib/perbaikan";
import { laporanTriwulan, type LaporanTriwulan } from "@/modules/laporan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { Kolom } from "../form";
import { Ikon } from "../ikon";
import { LabelTahap } from "../pdsa/tahap";
import { PilihCari } from "../pilih-cari";
import { formatWaktu, LabelCapaian, LabelTindakLanjut, Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Pil, Rincian, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, Ubin } from "../ui";
import { FormRekomendasi, TombolCetak } from "./klien";

export const metadata: Metadata = { title: "Laporan Triwulan" };

/**
 * Laporan Triwulan Komite Mutu ke Direktur (`?triwulan=YYYY-T`, bawaan Triwulan lalu): ringkasan, Capaian Triwulan per
 * kelompok, Analisis dan Tindak Lanjut, PDSA, Rekomendasi. Semua dari `laporanTriwulan`; dicetak / disimpan PDF lewat
 * browser (tampilan cetak di `globals.css`, bagian layar saja diberi `print:hidden`).
 */
export default async function HalamanLaporan({ searchParams }: PageProps<"/laporan">) {
  const pengguna = await requireUser();
  // Triwulan tidak valid atau belum selesai diganti Triwulan bawaan (ditentukan service) dengan pemberitahuan.
  const { triwulan: diminta, pemberitahuan } = triwulanDariAlamat((await searchParams).triwulan);
  const lap = await pesanAtau(laporanTriwulan(pengguna, diminta));
  const triwulan = typeof lap === "string" ? diminta : lap.triwulan;
  // Delapan Triwulan selesai terakhir, ditambah Triwulan yang sedang dibuka bila lebih lama.
  const awal = bulanTriwulan(triwulanLalu())[0];
  const pilihan = Array.from({ length: 8 }, (_, i) => triwulanDari(geserBulan(awal, -3 * i)));
  if (triwulan && !pilihan.includes(triwulan)) pilihan.push(triwulan);

  const saringan = (
    <form method="get" className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none print:hidden">
      <div className="sm:w-52">
        <Kolom label="Triwulan" htmlFor="triwulan">
          <PilihCari
            key={triwulan}
            id="triwulan"
            nama="triwulan"
            nilai={triwulan}
            wajib
            cari="Cari Triwulan…"
            pilihan={pilihan.map((t) => ({ nilai: t, label: labelTriwulan(t) }))}
          />
        </Kolom>
      </div>
      <Button type="submit" variant="outline" size="lg">
        Tampilkan
      </Button>
    </form>
  );

  if (typeof lap === "string") {
    return (
      <Halaman>
        <KepalaHalaman judul="Laporan Triwulan" sub="Laporan Komite Mutu kepada Direktur." aksi={saringan} />
        <Pemberitahuan>{pemberitahuan}</Pemberitahuan>
        <Pesan>{lap}</Pesan>
      </Halaman>
    );
  }

  const { ringkasan: r } = lap;
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Laporan ${labelTriwulan(lap.triwulan)}`}
        meta={`${config.namaRs} · Komite Mutu kepada Direktur`}
        sub={`${labelPeriode(lap.bulan[0], lap.bulan[2])} · data per ${formatWaktu(new Date())}`}
        aksi={
          <>
            {saringan}
            <span className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto print:hidden">
              {/* Tautan biasa, bukan `Link`: tujuannya route handler yang mengunduh berkas. */}
              <Button asChild variant="outline" size="lg">
                <a href={`/laporan/unduh?triwulan=${lap.triwulan}`} download>
                  <Ikon nama="unduh" className="size-[18px]" />
                  Unduh CSV
                </a>
              </Button>
              <TombolCetak />
            </span>
          </>
        }
      />

      <div className="print:hidden">
        <Pemberitahuan>{pemberitahuan}</Pemberitahuan>
      </div>

      <section aria-labelledby="ringkasan" className="grid gap-4">
        <h2 id="ringkasan" className="sr-only">
          Ringkasan
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 print:grid-cols-4">
          <Ubin nada="brand" ikon="indikator" label="Indikator dinilai" nilai={r.dinilai}>
            <Rincian
              isi={[
                { nada: "brand", nilai: r.dinilai - r.kosong, label: "punya Capaian" },
                { nada: "netral", nilai: r.kosong, label: "belum" },
              ]}
            />
          </Ubin>
          <Ubin nada="pos" ikon="centang" label="Tercapai" nilai={r.tercapai} keterangan="Capaian Triwulan menurut Target dan Arah" />
          <Ubin nada="neg" ikon="peringatan" label="Belum Tercapai" nilai={r.belumTercapai} keterangan="Capaian Triwulan menurut Target dan Arah" />
          <Ubin
            nada="ukur"
            ikon="verifikasi"
            label="Kelengkapan"
            nilai={`${r.kelengkapan.terverifikasi}/${r.kelengkapan.wajib}`}
            keterangan="Pengukuran Terverifikasi dari yang wajib"
          >
            <BarKemajuan nada="ukur" nilai={r.kelengkapan.terverifikasi} dari={r.kelengkapan.wajib} />
          </Ubin>
        </div>
      </section>

      {lap.capaian.length === 0 ? (
        <Pesan>Belum ada Indikator yang dinilai pada {labelTriwulan(lap.triwulan)}.</Pesan>
      ) : (
        KELOMPOK.map((k) => <TabelCapaian key={k} kelompok={k} lap={lap} />)
      )}

      <AnalisisDanTindakLanjut lap={lap} />

      <Kartu judul="PDSA" sub="Uji coba perbaikan yang periodenya bersinggungan dengan Triwulan ini, semua Lingkup.">
        {lap.pdsa.length === 0 ? (
          <p className="px-5 pb-5 text-[14px] text-muted-foreground">Tidak ada PDSA pada {labelTriwulan(lap.triwulan)}.</p>
        ) : (
          <ul className="grid px-5 pb-3">
            {lap.pdsa.map((p) => (
              <li key={p.id} className="grid gap-1.5 border-t border-rule py-4 first:border-0 first:pt-0 print:break-inside-avoid">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/pdsa/${p.id}`} className="font-semibold hover:underline">
                    {p.judul}
                  </Link>
                  <LabelTahap tahap={p.tahap} />
                </span>
                <span className="text-[13px] text-muted-foreground">
                  <span className="font-mono">{p.indikator.kode}</span> · {labelLingkup(p.unit)} · siklus ke-{p.siklus} ·{" "}
                  {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                </span>
                {p.hasil && <Teks label="Hasil (Study)">{p.hasil}</Teks>}
                {p.keputusan && <Teks label={`Keputusan (Act): ${LABEL_KEPUTUSAN_PDSA[p.keputusan]}`}>{p.penjelasan}</Teks>}
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      <Kartu judul="Rekomendasi" sub={`Kesimpulan dan saran perbaikan Komite Mutu untuk ${labelTriwulan(lap.triwulan)}.`}>
        <div className="grid gap-3 px-5 pb-5">
          {lap.bolehTulis && (
            <div className="print:hidden">
              <FormRekomendasi key={lap.rekomendasi?.teks} triwulan={lap.triwulan} teks={lap.rekomendasi?.teks ?? ""} />
            </div>
          )}
          <div className={lap.bolehTulis ? "hidden print:block" : undefined}>
            {lap.rekomendasi ? (
              <p className="whitespace-pre-line">{lap.rekomendasi.teks}</p>
            ) : (
              <p className="text-muted-foreground">Rekomendasi belum ditulis.</p>
            )}
          </div>
          {lap.rekomendasi && (
            <p className="text-[13px] text-muted-foreground">
              Terakhir diubah oleh {lap.rekomendasi.diubahOleh}, {formatWaktu(lap.rekomendasi.diubahPada)}
            </p>
          )}
        </div>
      </Kartu>

      {/* Kolom tanda tangan, hanya di hasil cetak. */}
      <div className="hidden grid-cols-2 gap-8 pt-4 text-center print:grid print:break-inside-avoid">
        <div>
          <p>Mengetahui,</p>
          <p>Direktur</p>
          <p className="mt-20">(..............................................)</p>
        </div>
        <div>
          <p>{labelTanggal(hariIni())}</p>
          <p>Ketua Komite Mutu</p>
          <p className="mt-20">(..............................................)</p>
        </div>
      </div>
    </Halaman>
  );
}

/** Teks panjang berlabel (isian PDSA). */
function Teks({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-[14px] whitespace-pre-line">
      <span className="font-semibold">{label}:</span> {children}
    </p>
  );
}

/** Tabel Capaian Triwulan satu kelompok Indikator; kosong = tidak tampil. */
function TabelCapaian({ kelompok, lap }: { kelompok: (typeof KELOMPOK)[number]; lap: LaporanTriwulan }) {
  const baris = lap.capaian.filter((c) => c.indikator.kelompok === kelompok);
  if (baris.length === 0) return null;
  const perUnit = kelompok === "IMP-Unit";
  return (
    <Kartu judul={`Capaian ${kelompok}`} sub="Capaian RS (ΣN/ΣD Pengukuran Terverifikasi); Status Capaian dari Capaian Triwulan dengan Target bulan terakhir.">
      <Tabel label={`Capaian ${kelompok}`} lebarMin="min-w-[56rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Indikator</TableHead>
            {perUnit && <TableHead>Unit</TableHead>}
            <TableHead className="text-right">Target</TableHead>
            {lap.bulan.map((b) => (
              <TableHead key={b} className="text-right">
                {labelBulan(b, { pendek: true, tahun: false })}
              </TableHead>
            ))}
            <TableHead className="text-right">Triwulan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Kelengkapan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map(({ indikator: i, unit, bulan, triwulan: t }) => (
            <TableRow key={i.id} className="print:break-inside-avoid">
              <TableCell>
                <span className="block font-semibold">
                  {i.nama}
                  {!i.aktif && <span className="font-normal text-muted-foreground"> (nonaktif)</span>}
                </span>
                <span className="font-mono text-[12px] text-muted-foreground">{i.kode}</span>
              </TableCell>
              {perUnit && <TableCell>{unit.map((u) => u.nama).join(", ")}</TableCell>}
              <TableCell className="text-right whitespace-nowrap">
                {TANDA_ARAH[i.arah]} {formatCapaian(t.target, i.satuan)}
              </TableCell>
              {lap.bulan.map((b) => {
                const m = bulan.find((x) => x.bulan === b);
                return (
                  <TableCell key={b} className="text-right whitespace-nowrap">
                    {!m || m.kelengkapan.terverifikasi === 0 ? <Kosong /> : formatCapaian(m.capaian, i.satuan)}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-bold whitespace-nowrap">
                {t.kelengkapan.terverifikasi === 0 ? <Kosong /> : formatCapaian(t.capaian, i.satuan)}
              </TableCell>
              <TableCell>
                <LabelCapaian status={t.status} />
              </TableCell>
              <TableCell className={`text-right whitespace-nowrap ${t.kelengkapan.terverifikasi < t.kelengkapan.wajib ? "text-warning" : ""}`}>
                {t.kelengkapan.terverifikasi}/{t.kelengkapan.wajib}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Tabel>
    </Kartu>
  );
}

/** Sel tanpa Capaian (tidak diukur, bukan Unit Pelapor, atau belum ada Pengukuran Terverifikasi). */
function Kosong() {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden>–</span>
      <span className="sr-only">tanpa Capaian</span>
    </span>
  );
}

/** Analisis setiap bulan per Indikator + Lingkup, dengan Tindak Lanjut-nya di bawah setiap Analisis. */
function AnalisisDanTindakLanjut({ lap }: { lap: LaporanTriwulan }) {
  const kelompok = [...Map.groupBy(lap.analisis, (x) => `${x.indikator.id}|${x.unit?.id ?? ""}`).values()];
  return (
    <Kartu
      judul="Analisis dan Tindak Lanjut"
      sub="Analisis Lingkup RS untuk INM dan IMP-RS, Lingkup Unit untuk IMP-Unit, setiap bulan yang dinilai."
    >
      {kelompok.length === 0 ? (
        <p className="px-5 pb-5 text-[14px] text-muted-foreground">Tidak ada Indikator yang dinilai.</p>
      ) : (
        <div className="grid px-5 pb-3">
          {kelompok.map((g) => {
            const { indikator: i, unit } = g[0];
            return (
              <section key={`${i.id}-${unit?.id}`} className="border-t border-rule py-4 first:border-0 first:pt-0">
                <h3 className="font-semibold print:break-after-avoid">
                  {i.nama} <span className="font-mono text-[12px] font-medium text-muted-foreground">{i.kode}</span>
                  <span className="text-[13px] font-normal text-muted-foreground"> · {labelLingkup(unit)}</span>
                </h3>
                <dl className="mt-2 grid gap-3">
                  {g.map((x) => (
                    <div key={x.bulan} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] print:grid-cols-[7rem_minmax(0,1fr)] print:break-inside-avoid">
                      <dt className="text-[13px] font-semibold text-muted-foreground">
                        <Link href={tautanAnalisis(i.id, unit?.id ?? null, x.bulan)} className="hover:underline">
                          {labelBulan(x.bulan)}
                        </Link>
                      </dt>
                      <dd className="grid min-w-0 gap-2">
                        {x.analisis ? (
                          <p className="text-[14px] whitespace-pre-line">{x.analisis.teks}</p>
                        ) : (
                          <span>
                            <Pil nada="warn">Belum dianalisis</Pil>
                          </span>
                        )}
                        {x.analisis && x.analisis.tindakLanjut.length > 0 && (
                          <ul className="grid gap-1.5 border-l-2 border-tindak/30 pl-3">
                            {x.analisis.tindakLanjut.map((t) => (
                              <li key={t.id} className="text-[14px]">
                                <span className="font-medium">{t.tindakan}</span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  · PIC {t.pic} · tenggat {labelTanggal(t.tenggat)}{" "}
                                </span>
                                <span className="inline-flex flex-wrap gap-1 align-middle">
                                  <LabelTindakLanjut status={t.status} />
                                  {t.lewatTenggat && <Pil nada="neg">Lewat tenggat</Pil>}
                                  {t.mendekatiTenggat && <Pil nada="warn">Mendekati tenggat</Pil>}
                                </span>
                                {t.catatan && (
                                  <span className="block text-[13px] text-muted-foreground">
                                    {t.status === "dibatalkan" ? "Alasan" : "Catatan"}: {t.catatan}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      )}
    </Kartu>
  );
}
