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
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { config } from "@/lib/config";
import { KELOMPOK, TANDA_ARAH } from "@/lib/indikator";
import {
  LABEL_AKIBAT_INSIDEN,
  LABEL_JENIS_INSIDEN,
  LABEL_STATUS_INSIDEN,
  LABEL_TIPE_INSIDEN,
  LABEL_WARNA_GRADING,
  WARNA_GRADING,
} from "@/lib/insiden";
import { formatRupiah, LABEL_KEPUTUSAN_PDSA, labelLingkup } from "@/lib/perbaikan";
import { LABEL_PEMICU_VALIDASI, LABEL_PENYEBAB_TIDAK_VALID } from "@/lib/validasi";
import { laporanTriwulan, type LaporanTriwulan } from "@/modules/laporan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { LabelWarna } from "../insiden/label";
import { Kesesuaian, LabelHasilValidasi } from "../validasi/label";
import { Kolom } from "../form";
import { Ikon } from "../ikon";
import { LabelTahap } from "../pdsa/tahap";
import { PilihCari } from "../pilih-cari";
import { formatWaktu, LabelCapaian, LabelTindakLanjut, Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Pil, Rincian, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui";
import { FormRekomendasi, FormTindakLanjutUmpanBalik, FormUmpanBalik, TombolCetak } from "./klien";

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
  // Versi data yang diubah form-form halaman ini: setelah satu form berhasil, semua form dibuat ulang dan pesan
  // penolakan form lain hilang.
  const versiForm = [lap.rekomendasi, lap.umpanBalik, lap.umpanBalikSebelumnya].map((x) => x?.diubahPada.toISOString()).join("|");
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Laporan ${labelTriwulan(lap.triwulan)}`}
        meta={`${config.namaRs}, Komite Mutu kepada Direktur`}
        sub={
          <>
            {labelPeriode(lap.bulan[0], lap.bulan[2])}, data per <span className="terukur text-[14px] text-cool">{formatWaktu(new Date())}</span>
          </>
        }
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

      {/* Ringkasan: satu permukaan dibagi garis rambut, empat bacaan. */}
      <section aria-labelledby="ringkasan" className="overflow-hidden rounded-card border border-rule bg-rule print:break-inside-avoid">
        <h2 id="ringkasan" className="sr-only">
          Ringkasan
        </h2>
        <dl className="grid grid-cols-2 gap-px xl:grid-cols-4 print:grid-cols-4">
          <Bacaan label="Indikator dinilai" nilai={r.dinilai}>
            <Rincian
              isi={[
                { nilai: r.dinilai - r.kosong, label: "punya Capaian" },
                { nilai: r.kosong, label: "belum" },
              ]}
            />
          </Bacaan>
          <Bacaan label="Tercapai" nilai={r.tercapai} keterangan="Capaian Triwulan menurut Target dan Arah" />
          <Bacaan label="Belum Tercapai" nilai={r.belumTercapai} keterangan="Capaian Triwulan menurut Target dan Arah" />
          <Bacaan
            label="Kelengkapan"
            nilai={`${r.kelengkapan.terverifikasi}/${r.kelengkapan.wajib}`}
            keterangan="Pengukuran Terverifikasi dari yang wajib"
          >
            <BarKemajuan nada="ukur" nilai={r.kelengkapan.terverifikasi} dari={r.kelengkapan.wajib} />
          </Bacaan>
        </dl>
      </section>

      {lap.capaian.length === 0 ? (
        <Pesan>Belum ada Indikator yang dinilai pada {labelTriwulan(lap.triwulan)}.</Pesan>
      ) : (
        // Capaian Triwulan sebagai rekaman: satu panel, satu bagian bergaris per kelompok Indikator.
        <div className="min-w-0 rounded-card border border-rule bg-card">
          <p className="px-5 pt-5 pb-1 text-[14px] text-ink-3">
            Capaian RS (ΣN/ΣD Pengukuran Terverifikasi); Status Capaian dari Capaian Triwulan dengan Target bulan terakhir.
          </p>
          {KELOMPOK.map((k) => (
            <TabelCapaian key={k} kelompok={k} lap={lap} />
          ))}
        </div>
      )}

      <AnalisisDanTindakLanjut lap={lap} />

      <Kartu judul="PDSA" sub="Uji coba perbaikan yang periodenya bersinggungan dengan Triwulan ini, semua Lingkup.">
        {lap.pdsa.length === 0 ? (
          <p className="px-5 pb-5 text-[15px] text-ink-3">Tidak ada PDSA pada {labelTriwulan(lap.triwulan)}.</p>
        ) : (
          <ul className="grid">
            {lap.pdsa.map((p) => (
              <li key={p.id} className="grid gap-2 border-t border-rule px-5 py-4 print:break-inside-avoid">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/pdsa/${p.id}`} className="text-primary-ink text-[16px] font-medium">
                    {p.judul}
                  </Link>
                  <LabelTahap tahap={p.tahap} />
                </span>
                <span className="text-[14px] text-ink-3">
                  <span className="terukur text-[13px] text-ink-2">{p.indikator.kode}</span>, {labelLingkup(p.unit)}, siklus ke-{p.siklus},{" "}
                  {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                </span>
                {(p.hasil || p.keputusan || p.efisiensi) && (
                  <dl className="grid gap-2 pt-1">
                    {p.hasil && <Teks label="Hasil (Study)">{p.hasil}</Teks>}
                    {p.keputusan && <Teks label={`Keputusan (Act): ${LABEL_KEPUTUSAN_PDSA[p.keputusan]}`}>{p.penjelasan}</Teks>}
                    {p.efisiensi && (
                      <Teks label="Efisiensi (PMKP 4 g)">
                        <span className="terukur text-[14px]">
                          {formatRupiah(p.efisiensi.sebelum)} sebelum, {formatRupiah(p.efisiensi.sesudah)} sesudah
                        </span>
                        {p.efisiensi.persen !== null && (
                          <span className={p.efisiensi.hemat > 0 ? "text-ok" : p.efisiensi.hemat < 0 ? "text-bad" : undefined}>
                            {" "}
                            (
                            {p.efisiensi.hemat === 0
                              ? "tetap"
                              : `${p.efisiensi.hemat > 0 ? "hemat" : "bertambah"} ${formatAngka(Math.round(Math.abs(p.efisiensi.persen) * 10) / 10)}%`}
                            )
                          </span>
                        )}
                        {p.kesimpulanEfisiensi && <span className="mt-1 block">{p.kesimpulanEfisiensi}</span>}
                      </Teks>
                    )}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      {lap.insiden && <BagianInsiden lap={lap} r={lap.insiden} />}

      <Kartu
        judul="Validasi Data"
        sub="Validasi yang dilakukan pada Triwulan ini, ditambah yang lebih lama tetapi masih belum valid (PMKP 5); valid bila kesesuaian mencapai 90%."
      >
        {lap.validasi.length === 0 ? (
          <p className="px-5 pb-5 text-[15px] text-ink-3">Tidak ada validasi data pada {labelTriwulan(lap.triwulan)}.</p>
        ) : (
          <Tabel label="Validasi Data" lebarMin="min-w-[62rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Indikator</TableHead>
                <TableHead>Unit dan bulan data</TableHead>
                <TableHead>Pemicu</TableHead>
                <TableHead className="text-right">Kesesuaian</TableHead>
                <TableHead>Hasil</TableHead>
                <TableHead>Penyebab dan perbaikan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lap.validasi.map((v) => (
                <TableRow key={v.id} className="print:break-inside-avoid">
                  <TableCell className="min-w-48 whitespace-normal">
                    <span className="block text-[14px]">{v.indikator.nama}</span>
                    <span className="terukur text-[12px] text-ink-3">{v.indikator.kode}</span>
                  </TableCell>
                  <TableCell className="text-[14px] whitespace-nowrap">
                    {v.unit.nama}, {labelBulan(v.bulan, { pendek: true })}
                  </TableCell>
                  <TableCell className="min-w-40 text-[14px] whitespace-normal text-ink-2">{LABEL_PEMICU_VALIDASI[v.pemicu]}</TableCell>
                  <TableCell className="text-right">
                    <Kesesuaian persen={v.kesesuaian} sesuai={v.sesuai} sampel={v.sampel} />
                  </TableCell>
                  <TableCell>
                    <LabelHasilValidasi valid={v.valid} belumValid={v.belumValid} />
                  </TableCell>
                  <TableCell className="min-w-56 text-[14px] whitespace-normal text-ink-2">
                    {v.penyebab.length > 0 && <span className="block">{v.penyebab.map((x) => LABEL_PENYEBAB_TIDAK_VALID[x]).join(", ")}</span>}
                    {v.perbaikan && <span className="block">{v.perbaikan}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>

      <Kartu judul="Rekomendasi" sub={`Kesimpulan dan saran perbaikan Komite Mutu untuk ${labelTriwulan(lap.triwulan)}.`}>
        <div className="grid gap-3 px-5 pb-5">
          {lap.bolehTulis && (
            <div className="print:hidden">
              <FormRekomendasi key={versiForm} triwulan={lap.triwulan} teks={lap.rekomendasi?.teks ?? ""} />
            </div>
          )}
          <div className={lap.bolehTulis ? "hidden print:block" : undefined}>
            {lap.rekomendasi ? (
              <p className="max-w-[72ch] whitespace-pre-line">{lap.rekomendasi.teks}</p>
            ) : (
              <p className="text-ink-3">Rekomendasi belum ditulis.</p>
            )}
          </div>
          {lap.rekomendasi && (
            <p className="text-[13px] text-ink-3">
              Terakhir diubah oleh <span className="text-signal">{lap.rekomendasi.diubahOleh}</span>,{" "}
              <span className="terukur text-cool">{formatWaktu(lap.rekomendasi.diubahPada)}</span>
            </p>
          )}
        </div>
      </Kartu>

      <UmpanBalik lap={lap} versi={versiForm} />

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

/** Satu bacaan ringkasan: label, angka dalam huruf ukur, lalu keterangan atau rincian (`children`). */
function Bacaan(p: { label: string; nilai: React.ReactNode; keterangan?: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2 bg-paper-2 p-5">
      <dt className="text-[14px] text-ink-2">{p.label}</dt>
      <dd className="terukur text-[32px] leading-none tracking-[-0.04em] text-ink">{p.nilai}</dd>
      <dd>
        {p.keterangan && <span className="block text-[13px] text-ink-3">{p.keterangan}</span>}
        {p.children}
      </dd>
    </div>
  );
}

/** Teks panjang berlabel (isian PDSA). */
function Teks({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[14px] text-ink-3">{label}</dt>
      <dd className="max-w-[72ch] text-[15px] whitespace-pre-line">{children}</dd>
    </div>
  );
}

/** Tabel Capaian Triwulan satu kelompok Indikator, satu bagian di panel Capaian; kosong = tidak tampil. */
function TabelCapaian({ kelompok, lap }: { kelompok: (typeof KELOMPOK)[number]; lap: LaporanTriwulan }) {
  const baris = lap.capaian.filter((c) => c.indikator.kelompok === kelompok);
  if (baris.length === 0) return null;
  const perUnit = kelompok === "IMP-Unit";
  // Kolom Triwulan dipisah garis dari kolom bulan: itu hasil yang dinilai.
  const garisTriwulan = "border-l border-rule";
  return (
    <section aria-labelledby={`capaian-${kelompok}`} className="mt-4 border-t border-rule pt-4">
      <h2 id={`capaian-${kelompok}`} className="px-5 pb-2 font-display text-[17px] font-medium tracking-[-0.01em] print:break-after-avoid">
        Capaian {kelompok}
      </h2>
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
            <TableHead className={`text-right ${garisTriwulan}`}>Triwulan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Kelengkapan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map(({ indikator: i, unit, bulan, triwulan: t }) => (
            <TableRow key={i.id} className="print:break-inside-avoid">
              <TableCell className="min-w-48 whitespace-normal sm:min-w-[16rem] print:min-w-24">
                <span className="block font-medium">
                  {i.nama}
                  {!i.aktif && <span className="font-normal text-ink-3"> (nonaktif)</span>}
                </span>
                <span className="terukur text-[12px] text-ink-3">{i.kode}</span>
              </TableCell>
              {perUnit && <TableCell className="whitespace-normal">{unit.map((u) => u.nama).join(", ")}</TableCell>}
              <TableCell className="text-right whitespace-nowrap text-ink-3">
                {TANDA_ARAH[i.arah]} {formatCapaian(t.target, i.satuan)}
              </TableCell>
              {lap.bulan.map((b) => {
                const m = bulan.find((x) => x.bulan === b);
                return (
                  <TableCell key={b} className="text-right whitespace-nowrap">
                    {!m || m.kelengkapan.terverifikasi === 0 ? (
                      <Kosong />
                    ) : (
                      <span className="terukur text-ink-2">{formatCapaian(m.capaian, i.satuan)}</span>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className={`text-right whitespace-nowrap ${garisTriwulan}`}>
                {t.kelengkapan.terverifikasi === 0 ? <Kosong /> : <span className="terukur text-[15px] text-ink">{formatCapaian(t.capaian, i.satuan)}</span>}
              </TableCell>
              <TableCell>
                <LabelCapaian status={t.status} />
              </TableCell>
              <TableCell
                className={`terukur text-right whitespace-nowrap ${t.kelengkapan.terverifikasi < t.kelengkapan.wajib ? "text-signal" : "text-ink-2"}`}
              >
                {t.kelengkapan.terverifikasi}/{t.kelengkapan.wajib}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Tabel>
    </section>
  );
}

/** Sel tanpa Capaian (tidak diukur, bukan Unit Pelapor, atau belum ada Pengukuran Terverifikasi). */
function Kosong() {
  return <span className="text-[13px] text-ink-3">tidak ada</span>;
}

/**
 * Analisis setiap bulan per Indikator + Lingkup, dengan Tindak Lanjut-nya sebagai jejak di bawah setiap Analisis. Bulan
 * yang belum dianalisis dikumpulkan di satu baris (tautan per bulan tetap ada).
 */
function AnalisisDanTindakLanjut({ lap }: { lap: LaporanTriwulan }) {
  const kelompok = [...Map.groupBy(lap.analisis, (x) => `${x.indikator.id}|${x.unit?.id ?? ""}`).values()];
  return (
    <Kartu
      judul="Analisis dan Tindak Lanjut"
      sub="Analisis Lingkup RS untuk INM, IMP-RS, dan SPM, Lingkup Unit untuk IMP-Unit, setiap bulan yang dinilai."
    >
      {kelompok.length === 0 ? (
        <p className="px-5 pb-5 text-[15px] text-ink-3">Tidak ada Indikator yang dinilai.</p>
      ) : (
        <div className="grid">
          {kelompok.map((g) => {
            const { indikator: i, unit } = g[0];
            const belum = g.filter((x) => !x.analisis);
            const tautan = (bulan: string) => (
              <Link href={tautanAnalisis(i.id, unit?.id ?? null, bulan)} className="text-primary-ink whitespace-nowrap">
                {labelBulan(bulan)}
              </Link>
            );
            return (
              <section key={`${i.id}-${unit?.id}`} className="grid gap-3 border-t border-rule px-5 py-4 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8 print:grid-cols-1 print:gap-2">
                <h3 className="print:break-after-avoid">
                  <span className="block font-medium">{i.nama}</span>
                  <span className="text-[13px] text-ink-3">
                    <span className="terukur text-[12px] text-ink-2">{i.kode}</span> {labelLingkup(unit)}
                  </span>
                </h3>
                <dl className="grid min-w-0 gap-3 print:block print:space-y-3">
                  {g.map(
                    (x) =>
                      x.analisis && (
                        <div key={x.bulan} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] print:block print:space-y-1">
                          <dt className="text-[14px]">{tautan(x.bulan)}</dt>
                          <dd className="grid min-w-0 gap-2.5 print:block print:space-y-2">
                            <p className="max-w-[72ch] text-[15px] whitespace-pre-line">{x.analisis.teks}</p>
                            {x.analisis.tindakLanjut.length > 0 && (
                              <ul className="grid gap-2.5 border-l border-rule-2 pl-4 print:block print:space-y-2">
                                {x.analisis.tindakLanjut.map((t) => (
                                  <li key={t.id} className="grid gap-1 text-[14px] print:block print:break-inside-avoid">
                                    <span className="font-medium">{t.tindakan}</span>
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-3">
                                      <span>
                                        PIC <span className="text-signal">{t.pic}</span>, tenggat {labelTanggal(t.tenggat)}
                                      </span>
                                      <LabelTindakLanjut status={t.status} />
                                      {t.lewatTenggat && <Pil nada="neg">Lewat tenggat</Pil>}
                                      {t.mendekatiTenggat && <Pil nada="warn">Mendekati tenggat</Pil>}
                                    </span>
                                    {t.catatan && (
                                      <span className="text-[13px] text-ink-3">
                                        {t.status === "dibatalkan" ? "Alasan" : "Catatan"}: {t.catatan}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </dd>
                        </div>
                      ),
                  )}
                  {belum.length > 0 && (
                    <div className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] print:flex print:flex-wrap print:items-center print:gap-3 print:break-inside-avoid">
                      <dt>
                        <Pil nada="warn">Belum dianalisis</Pil>
                      </dt>
                      <dd className="text-[14px]">
                        {belum.map((x, n) => (
                          <span key={x.bulan}>
                            {n > 0 && ", "}
                            {tautan(x.bulan)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            );
          })}
        </div>
      )}
    </Kartu>
  );
}

/** Daftar hitungan berlabel di satu panel rekap Insiden (per Unit, per tipe, per akibat). */
function DaftarHitung({ judul, isi }: { judul: string; isi: { label: string; jumlah: number }[] }) {
  return (
    <div className="grid min-w-0 content-start gap-2 bg-paper-2 p-5 print:break-inside-avoid">
      <h3 className="text-[14px] font-medium text-ink-2">{judul}</h3>
      {isi.length === 0 ? (
        <p className="text-[14px] text-ink-3">tidak ada</p>
      ) : (
        <ul className="grid gap-1">
          {isi.map((x) => (
            <li key={x.label} className="flex items-baseline justify-between gap-4 text-[14px]">
              <span className="min-w-0">{x.label}</span>
              <span className="terukur text-ink">{x.jumlah}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Rekap Insiden Keselamatan Pasien Triwulan (KMK 1596/2024 PMKP 1 dan 9): jumlah per jenis × warna grading, per Unit,
 * per tipe insiden, per akibat, penanganan, dan Insiden yang diinvestigasi dengan RCA. Tanpa identitas pasien maupun
 * Pembuat Laporan; semua dari `rekapInsiden`.
 */
function BagianInsiden({ lap, r }: { lap: LaporanTriwulan; r: NonNullable<LaporanTriwulan["insiden"]> }) {
  return (
    <Kartu
      judul="Insiden Keselamatan Pasien"
      sub="Menurut waktu insiden, tanpa Bukan Insiden; tanpa identitas pasien maupun Pembuat Laporan. Grading = grading terakhir. Bagian ini tidak tampil untuk Admin Sistem."
    >
      {r.jumlah === 0 ? (
        <p className="px-5 pb-5 text-[15px] text-ink-3">Tidak ada Insiden pada {labelTriwulan(lap.triwulan)}.</p>
      ) : (
        <div className="grid gap-5 pb-5">
          <Tabel label="Insiden per jenis dan warna grading" lebarMin="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Jenis insiden</TableHead>
                {WARNA_GRADING.map((w) => (
                  <TableHead key={w} className="text-right">
                    {LABEL_WARNA_GRADING[w]}
                  </TableHead>
                ))}
                <TableHead className="text-right">Belum digrading</TableHead>
                <TableHead className="border-l border-rule text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.perJenis.map((j) => (
                <TableRow key={j.jenis}>
                  <TableCell className="font-medium">{LABEL_JENIS_INSIDEN[j.jenis]}</TableCell>
                  {WARNA_GRADING.map((w) => (
                    <TableCell key={w} className={`terukur text-right ${j.perWarna[w] ? "text-ink" : "text-ink-3"}`}>
                      {j.perWarna[w]}
                    </TableCell>
                  ))}
                  <TableCell className={`terukur text-right ${j.belumDigrading ? "text-signal" : "text-ink-3"}`}>{j.belumDigrading}</TableCell>
                  <TableCell className="terukur border-l border-rule text-right text-ink">{j.jumlah}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Semua jenis</TableCell>
                {WARNA_GRADING.map((w) => (
                  <TableCell key={w} className="terukur text-right text-ink">
                    {r.semuaJenis.perWarna[w]}
                  </TableCell>
                ))}
                <TableCell className="terukur text-right text-ink">{r.semuaJenis.belumDigrading}</TableCell>
                <TableCell className="terukur border-l border-rule text-right text-[15px] text-ink">{r.semuaJenis.jumlah}</TableCell>
              </TableRow>
            </TableBody>
          </Tabel>

          <p className="px-5 text-[15px]">
            Penanganan: <span className="terukur text-ink">{r.penanganan.selesai}</span> Selesai,{" "}
            <span className="terukur text-ink">{r.penanganan.berjalan}</span> masih berjalan
            {r.penanganan.lewatTenggat > 0 && (
              <>
                , <span className="terukur text-bad">{r.penanganan.lewatTenggat}</span> lewat tenggat investigasi
              </>
            )}
            .
          </p>

          {/* Tiga hitungan berdampingan: satu pita di dalam panel, dibagi garis rambut (bukan kartu di dalam kartu). */}
          <div className="grid gap-px border-y border-rule bg-rule md:grid-cols-3 print:grid-cols-3">
            <DaftarHitung judul="Per Unit" isi={r.perUnit.map((u) => ({ label: u.unit.nama, jumlah: u.jumlah }))} />
            <DaftarHitung
              judul="Per tipe insiden"
              isi={[
                ...r.perTipe.map((t) => ({ label: LABEL_TIPE_INSIDEN[t.kunci], jumlah: t.jumlah })),
                ...(r.belumDiinvestigasi > 0 ? [{ label: "Belum diinvestigasi", jumlah: r.belumDiinvestigasi }] : []),
              ]}
            />
            <DaftarHitung judul="Akibat terhadap pasien" isi={r.perAkibat.map((a) => ({ label: LABEL_AKIBAT_INSIDEN[a.kunci], jumlah: a.jumlah }))} />
          </div>

          <section aria-labelledby="insiden-rca" className="grid">
            <h3 id="insiden-rca" className="px-5 pb-2 font-display text-[16px] font-medium">
              Insiden yang diinvestigasi dengan RCA
            </h3>
            {r.rca.length === 0 ? (
              <p className="px-5 text-[15px] text-ink-3">Tidak ada RCA pada {labelTriwulan(lap.triwulan)}.</p>
            ) : (
              <ul className="grid">
                {r.rca.map((i) => (
                  <li key={i.id} className="grid gap-2 border-t border-rule px-5 py-4 print:break-inside-avoid">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[16px] font-medium">{i.judul}</span>
                      <LabelWarna warna={i.warna} />
                      {i.lewatTenggat && <Pil nada="neg">Lewat tenggat</Pil>}
                    </span>
                    <span className="text-[14px] text-ink-3">
                      {LABEL_JENIS_INSIDEN[i.jenis]}, Unit {i.unit.nama}, <span className="terukur text-[13px] text-cool">{labelTanggal(i.tanggal)}</span>,{" "}
                      {LABEL_STATUS_INSIDEN[i.status]}
                      {i.tipeInsiden && `, ${LABEL_TIPE_INSIDEN[i.tipeInsiden]}`}
                    </span>
                    {i.akarMasalah ? (
                      <dl className="grid gap-2 pt-1">
                        <Teks label="Akar masalah">{i.akarMasalah}</Teks>
                        <Teks label="Rekomendasi">{i.rekomendasi}</Teks>
                      </dl>
                    ) : (
                      <span className="text-[14px] text-ink-3">Hasil RCA dimuat setelah Selesai.</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Kartu>
  );
}

/**
 * Umpan Balik Dewan Pengawas (KMK 1596/2024 TKRS 1): tindak lanjut atas umpan balik Triwulan sebelumnya (dievaluasi pada
 * pertemuan laporan ini), lalu umpan balik atas laporan ini (dicatat setelah pertemuannya). Di hasil cetak hanya teksnya.
 */
function UmpanBalik({ lap, versi }: { lap: LaporanTriwulan; versi: string }) {
  const { umpanBalik: ub, umpanBalikSebelumnya: ubs } = lap;
  const pencatat = (u: NonNullable<typeof ub>) => (
    <p className="text-[13px] text-ink-3">
      Diterima {labelTanggal(u.diterimaPada)}; dicatat oleh <span className="text-signal">{u.diubahOleh}</span>,{" "}
      <span className="terukur text-cool">{formatWaktu(u.diubahPada)}</span>
    </p>
  );
  return (
    <Kartu judul="Umpan Balik Dewan Pengawas" sub="Umpan balik tertulis atas laporan triwulan dan evaluasi tindak lanjutnya pada pertemuan berikutnya.">
      <div className="grid">
        <section aria-labelledby="ub-sebelumnya" className="grid gap-3 border-t border-rule px-5 py-4 print:break-inside-avoid">
          <h3 id="ub-sebelumnya" className="font-display text-[16px] font-medium">
            Tindak lanjut umpan balik {ubs ? labelTriwulan(ubs.triwulan) : "Triwulan sebelumnya"}
          </h3>
          {!ubs ? (
            <p className="text-[15px] text-ink-3">Tidak ada umpan balik tercatat untuk Triwulan sebelumnya.</p>
          ) : (
            <>
              <dl className="grid gap-2">
                <Teks label="Umpan balik">{ubs.teks}</Teks>
                {/* Pencatat mengisi lewat form; teks tersimpan hanya di hasil cetak supaya tidak tampil dua kali. */}
                <div className={lap.bolehCatatUmpanBalik ? "hidden print:block" : undefined}>
                  <Teks label="Tindak lanjut">{ubs.tindakLanjut || <span className="text-ink-3">belum dicatat</span>}</Teks>
                </div>
              </dl>
              {lap.bolehCatatUmpanBalik && (
                <div className="print:hidden">
                  <FormTindakLanjutUmpanBalik key={versi} triwulan={ubs.triwulan} tindakLanjut={ubs.tindakLanjut} />
                </div>
              )}
              {pencatat(ubs)}
            </>
          )}
        </section>
        <section aria-labelledby="ub-ini" className="grid gap-3 border-t border-rule px-5 py-4 print:break-inside-avoid">
          <h3 id="ub-ini" className="font-display text-[16px] font-medium">
            Umpan balik atas laporan {labelTriwulan(lap.triwulan)}
          </h3>
          {ub && (
            <dl className={lap.bolehCatatUmpanBalik ? "hidden print:grid print:gap-2" : "grid gap-2"}>
              <Teks label="Umpan balik">{ub.teks}</Teks>
            </dl>
          )}
          {lap.bolehCatatUmpanBalik ? (
            <div className="print:hidden">
              <FormUmpanBalik key={versi} triwulan={lap.triwulan} teks={ub?.teks ?? ""} diterimaPada={ub?.diterimaPada ?? ""} maks={hariIni()} />
            </div>
          ) : (
            !ub && <p className="text-[15px] text-ink-3">Belum dicatat; diisi setelah laporan ini dibahas bersama Dewan Pengawas.</p>
          )}
          {ub && pencatat(ub)}
        </section>
      </div>
    </Kartu>
  );
}
