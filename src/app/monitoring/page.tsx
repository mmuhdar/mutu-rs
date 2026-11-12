import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH, urutKelompok } from "@/lib/indikator";
import { punyaLingkupRs } from "@/lib/perbaikan";
import { trenCapaian, type TitikCapaian, type TrenCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { analisisTersedia } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { Kolom } from "../form";
import { PilihCari } from "../pilih-cari";
import { BarTarget } from "../grafik-dashboard";
import { LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { Ikon } from "../ikon";
import { AngkaBesar, BarKemajuan, Halaman, Kartu, KepalaHalaman, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TUMPUK } from "../ui";
import { formatSelisih, keteranganRs, keteranganUnit, Tren } from "./grafik";

export const metadata: Metadata = { title: "Monitoring" };

/** Tautan Analisis satu Lingkup pada satu titik (null = tanpa tautan), dibuat `HalamanMonitoring`. */
type TautanTitik = (unitId: string | null, t: TitikCapaian) => React.ReactNode;

/** Tautan ke Analisis: "Analisis" bila sudah ada, "Belum dianalisis" bila belum (teks, bukan warna saja). */
function TautanAnalisis({ href, ada }: { href: string; ada: boolean }) {
  return (
    <Link href={href} className="text-primary-ink text-[13px] whitespace-nowrap pointer-coarse:py-1">
      {ada ? "Analisis" : "Belum dianalisis"}
    </Link>
  );
}

/**
 * Bacaan bulan terakhir rentang, sebagai sel di dalam permukaan `Tren`: Capaian dalam huruf ukur ukuran tampilan dengan
 * Status Capaian-nya, lalu Target (nilai yang ditetapkan, huruf badan) dan Kelengkapan di sampingnya.
 */
function RingkasanBulan(p: { t: TitikCapaian; satuan: string; arah: TrenCapaian["indikator"]["arah"]; label: string }) {
  const { t, satuan } = p;
  const ada = t.kelengkapan.terverifikasi > 0;
  return (
    <div className="grid grid-cols-2 gap-px md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="col-span-2 grid content-between gap-4 bg-paper-2 px-5 py-5 sm:px-6 md:col-span-1">
        <p className="text-[14px] font-medium text-ink-2">
          {p.label}, {labelBulan(t.bulan, { pendek: true })}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {ada ? (
            <AngkaBesar teks={formatCapaian(t.capaian, satuan)} satuan={satuan} className="text-[48px] tracking-[-0.04em] sm:text-[60px]" />
          ) : (
            <span className="text-[22px] leading-none text-ink-3">belum ada</span>
          )}
          {t.status && <LabelCapaian status={t.status} />}
        </p>
        <p className="text-[13px] text-ink-3">
          {!t.status
            ? "belum ada Pengukuran Terverifikasi"
            : t.selisih === null
              ? "selisih belum ada"
              : `selisih ${formatSelisih(t.selisih)} ${satuan} dari Target`}
        </p>
      </div>
      <div className="grid content-between gap-4 bg-paper-2 px-5 py-5">
        <p className="text-[14px] font-medium text-ink-2">Target</p>
        <p className="text-[28px] leading-none tracking-[-0.03em] text-ink">
          {TANDA_ARAH[p.arah]} {formatCapaian(t.target, satuan)}
        </p>
        <p className="text-[13px] text-ink-3">berlaku {labelBulan(t.bulan)}</p>
      </div>
      <div className="grid content-between gap-4 bg-paper-2 px-5 py-5">
        <p className="text-[14px] font-medium text-ink-2">Kelengkapan</p>
        <p className="terukur text-[28px] leading-none tracking-[-0.04em] text-ink">
          {t.kelengkapan.terverifikasi}/{t.kelengkapan.wajib}
        </p>
        <div>
          <p className="text-[13px] text-ink-3">Unit Pelapor yang sudah Terverifikasi</p>
          <BarKemajuan nada="ukur" nilai={t.kelengkapan.terverifikasi} dari={t.kelengkapan.wajib} />
        </div>
      </div>
    </div>
  );
}

/** Capaian setiap Unit Pelapor pada bulan akhir rentang: satu baris per Unit dengan bar terhadap Target dan tautan Analisis. */
function PerUnit({ tren, tautan }: { tren: TrenCapaian; tautan: TautanTitik }) {
  const { satuan, arah } = tren.indikator;
  const i = tren.bulan.length - 1;
  const bulan = tren.bulan[i];
  const unit = tren.unit.filter((u) => u.titik[i].kelengkapan.wajib > 0);
  return (
    <Kartu judul={`Capaian per Unit, ${labelBulan(bulan)}`} sub="Garis tegak = Target. Hanya Pengukuran Terverifikasi.">
      {unit.length === 0 ? (
        <p className="px-5 pb-5 text-[15px] text-ink-2">Tidak ada Unit Pelapor pada {labelBulan(bulan)}.</p>
      ) : (
        <Tabel label={`Capaian per Unit ${labelBulan(bulan)}`} tumpuk>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead className="w-[36%]">Capaian terhadap Target</TableHead>
              <TableHead className="text-right">Capaian</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Analisis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unit.map(({ unit: u, titik }) => {
              const t = titik[i];
              const ada = t.kelengkapan.terverifikasi > 0;
              return (
                <TableRow key={u.id}>
                  <TableCell className={`min-w-[12rem] max-sm:min-w-0 ${TUMPUK.penuh} ${TUMPUK.urut1}`}>
                    <span className="block font-medium">
                      {u.nama}
                      {!u.aktif && <span className="font-normal text-ink-3"> (nonaktif)</span>}
                    </span>
                    {ada ? (
                      <span className="terukur block text-[13px] whitespace-nowrap text-ink-3">
                        N {t.n} / D {t.d}
                      </span>
                    ) : (
                      <span className="block text-[13px] text-ink-3">belum Terverifikasi</span>
                    )}
                  </TableCell>
                  <TableCell className={`${TUMPUK.penuh} ${TUMPUK.urut5}`}>
                    <BarTarget capaian={ada ? t.capaian : null} target={t.target} satuan={satuan} arah={arah} tercapai={t.status === "tercapai"} />
                  </TableCell>
                  <TableCell className={`text-right ${TUMPUK.urut2}`}>
                    {ada ? (
                      <span className="terukur text-[15px] whitespace-nowrap text-ink">{formatCapaian(t.capaian, satuan)}</span>
                    ) : (
                      <span className="text-[13px] text-ink-3">belum ada</span>
                    )}
                  </TableCell>
                  <TableCell className={TUMPUK.urut3}>
                    <LabelCapaian status={ada ? t.status : null} />
                  </TableCell>
                  <TableCell className={`text-right ${TUMPUK.ujung} ${TUMPUK.urut4}`}>{tautan(u.id, t)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Tabel>
      )}
    </Kartu>
  );
}

export default async function HalamanMonitoring({ searchParams }: PageProps<"/monitoring">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const dariAlamat = bulanDariAlamat(sp.bulan);
  const bulan = dariAlamat.bulan ?? bulanLalu();
  // Urut kelompok (INM, IMP-RS, IMP-Unit, SPM) supaya judul kelompok di pemilih Indikator tidak berulang.
  const daftar = (await daftarIndikator(pengguna)).sort(urutKelompok);
  const indikatorId = teksAlamat(sp, "indikator") || daftar[0]?.id;
  const tren = indikatorId ? await pesanAtau(trenCapaian(pengguna, indikatorId, bulan)) : "Belum ada Indikator.";
  const ada =
    typeof tren === "string"
      ? new Set<string>()
      : new Set((await analisisTersedia(pengguna, tren.indikator.id, tren.bulan)).map((a) => `${a.unitId}|${a.bulan}`));
  // Analisis yang ada selalu ditautkan; "Belum dianalisis" hanya bila bulan itu bisa dianalisis (Indikator aktif, ada
  // Unit Pelapor; IMP-Unit hanya pada Lingkup Unit Pelapor-nya). Aturan lengkapnya tetap diperiksa service.
  const tautan: TautanTitik = (unitId, t) => {
    if (typeof tren === "string") return null;
    const sudah = ada.has(`${unitId}|${t.bulan}`);
    const bisa =
      tren.indikator.aktif && t.kelengkapan.wajib > 0 && (unitId !== null || punyaLingkupRs(tren.indikator.kelompok));
    return sudah || bisa ? <TautanAnalisis href={tautanAnalisis(tren.indikator.id, unitId, t.bulan)} ada={sudah} /> : null;
  };

  return (
    <Halaman>
      <KepalaHalaman judul="Monitoring" sub="Tren Capaian 12 bulan dibanding Target yang berlaku setiap bulan, dari Pengukuran Terverifikasi.">
        <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <Kolom label="Indikator" htmlFor="indikator">
            <PilihCari
              key={indikatorId}
              id="indikator"
              nama="indikator"
              nilai={indikatorId}
              cari="Cari kode atau nama Indikator…"
              pilihan={daftar.map((i) => ({ nilai: i.id, label: `${i.kode}, ${i.nama}${i.aktif ? "" : " (nonaktif)"}`, grup: i.kelompok }))}
            />
          </Kolom>
          <Kolom label="Sampai bulan" htmlFor="bulan">
            <Input id="bulan" name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} />
          </Kolom>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Ikon nama="cari" className="size-[18px]" />
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      {typeof tren === "string" ? (
        <Pesan>{tren}</Pesan>
      ) : (
        <>
          <section aria-labelledby="judul-indikator" className="grid gap-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 id="judul-indikator" className="min-w-0 font-display text-[22px] leading-7 font-medium tracking-[-0.03em] [overflow-wrap:break-word] sm:text-[24px]">
                {tren.indikator.nama}
              </h2>
              {!tren.indikator.aktif && <Pil nada="redup">nonaktif</Pil>}
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
              <Ciri label="Kode">
                <span className="terukur text-ink">{tren.indikator.kode}</span>
              </Ciri>
              <Ciri label="Kelompok">{tren.indikator.kelompok}</Ciri>
              <Ciri label="Arah">{LABEL_ARAH[tren.indikator.arah]}</Ciri>
              <Ciri label="Frekuensi">{LABEL_FREKUENSI[tren.indikator.frekuensi]}</Ciri>
            </dl>
          </section>
          <IsiTren tren={tren} bulanAkhir={bulan} tautan={tautan} />
        </>
      )}
    </Halaman>
  );
}

function IsiTren({ tren, bulanAkhir, tautan }: { tren: TrenCapaian; bulanAkhir: string; tautan: TautanTitik }) {
  const { satuan, frekuensi, arah } = tren.indikator;
  const rentang = `${frekuensi === "semesteran" ? "Titik Juni dan Desember dalam " : ""}12 bulan sampai ${labelBulan(bulanAkhir)}`;
  // Petugas Input Data dan Kepala Unit: Capaian Unit-nya saja, tanpa Capaian RS.
  if (!tren.rs) {
    if (tren.unit.length === 0) return <Pesan>Unit Anda bukan Unit Pelapor Indikator ini dalam rentang ini.</Pesan>;
    return tren.unit.map((u) => (
      <Tren
        key={u.unit.id}
        judul={`Capaian ${u.unit.nama}`}
        keterangan={rentang}
        titik={u.titik}
        satuan={satuan}
        catatan={keteranganUnit}
        analisis={(t) => tautan(u.unit.id, t)}
      >
        <RingkasanBulan t={u.titik.at(-1)!} satuan={satuan} arah={arah} label={`Capaian ${u.unit.nama}`} />
      </Tren>
    ));
  }
  return (
    <>
      <Tren judul="Capaian RS" keterangan={rentang} titik={tren.rs} satuan={satuan} catatan={keteranganRs} analisis={(t) => tautan(null, t)}>
        <RingkasanBulan t={tren.rs.at(-1)!} satuan={satuan} arah={arah} label="Capaian RS" />
      </Tren>
      <PerUnit tren={tren} tautan={tautan} />
    </>
  );
}

/** Satu ciri Indikator: label redup, nilainya dalam tinta. */
function Ciri({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-ink-2">{children}</dd>
    </div>
  );
}
