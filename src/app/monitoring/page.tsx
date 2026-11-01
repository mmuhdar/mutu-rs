import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { LABEL_ARAH, LABEL_FREKUENSI, TANDA_ARAH } from "@/lib/indikator";
import { punyaLingkupRs } from "@/lib/perbaikan";
import { trenCapaian, type TitikCapaian, type TrenCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { analisisTersedia } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { kelasInput, kelasLabel, tombolUtama } from "../form";
import { BarTarget } from "../grafik-dashboard";
import { LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Ubin } from "../ui";
import { keteranganRs, keteranganUnit, Tren } from "./grafik";

export const metadata: Metadata = { title: "Monitoring" };

/** Tautan Analisis satu Lingkup pada satu titik (null = tanpa tautan), dibuat `HalamanMonitoring`. */
type TautanTitik = (unitId: string | null, t: TitikCapaian) => React.ReactNode;

/** Tautan ke Analisis: "Analisis" bila sudah ada, "Belum dianalisis" bila belum (teks, bukan warna saja). */
function TautanAnalisis({ href, ada }: { href: string; ada: boolean }) {
  return (
    <Link
      href={href}
      className={`ml-2 text-[12px] font-semibold whitespace-nowrap hover:underline pointer-coarse:py-1 ${ada ? "text-area-ink" : "text-muted-foreground"}`}
    >
      {ada ? "Analisis" : "Belum dianalisis"}
    </Link>
  );
}

/** Ubin ringkasan bulan terakhir rentang: Capaian (hijau/merah menurut status), Target, dan Kelengkapan. */
function RingkasanBulan(p: { t: TitikCapaian; satuan: string; arah: TrenCapaian["indikator"]["arah"]; label: string }) {
  const { t, satuan } = p;
  const ada = t.kelengkapan.terverifikasi > 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Ubin
        nada={t.status === "tercapai" ? "pos" : t.status === "belumTercapai" ? "neg" : "netral"}
        label={`${p.label} · ${labelBulan(t.bulan, { pendek: true })}`}
        nilai={ada ? formatCapaian(t.capaian, satuan) : "–"}
        keterangan={t.status ? (t.status === "tercapai" ? "Tercapai" : "Belum Tercapai") : "belum ada Pengukuran Terverifikasi"}
      />
      <Ubin
        nada="pantau"
        label="Target"
        nilai={`${TANDA_ARAH[p.arah]} ${formatCapaian(t.target, satuan)}`}
        keterangan={t.selisih === null ? "selisih belum ada" : `selisih ${t.selisih > 0 ? "+" : ""}${formatCapaian(t.selisih, satuan)}`}
      />
      <div className="col-span-2 md:col-span-1">
        <Ubin nada="ukur" label="Kelengkapan" nilai={`${t.kelengkapan.terverifikasi}/${t.kelengkapan.wajib}`} keterangan="Unit Pelapor yang sudah Terverifikasi">
          <BarKemajuan nada="ukur" nilai={t.kelengkapan.terverifikasi} dari={t.kelengkapan.wajib} />
        </Ubin>
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
    <Kartu judul={`Capaian per Unit · ${labelBulan(bulan)}`} sub="Garis tegak = Target. Hanya Pengukuran Terverifikasi.">
      {unit.length === 0 ? (
        <div className="px-5 pb-5">
          <Pesan>Tidak ada Unit Pelapor pada {labelBulan(bulan)}.</Pesan>
        </div>
      ) : (
        <ul className="divide-y divide-rule border-t border-border">
          {unit.map(({ unit: u, titik }) => {
            const t = titik[i];
            const ada = t.kelengkapan.terverifikasi > 0;
            return (
              <li
                key={u.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_6rem_8rem]"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {u.nama}
                    {!u.aktif && <span className="font-normal text-muted-foreground"> (nonaktif)</span>}
                  </span>
                  <span className="block text-[13px] text-muted-foreground">
                    {ada ? `N ${t.n} / D ${t.d}` : "belum Terverifikasi"}
                    {tautan(u.id, t)}
                  </span>
                </span>
                <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <BarTarget capaian={ada ? t.capaian : null} target={t.target} satuan={satuan} arah={arah} tercapai={t.status === "tercapai"} />
                </span>
                <span className="text-right font-semibold">
                  {ada ? formatCapaian(t.capaian, satuan) : <span className="text-muted-foreground">–</span>}
                </span>
                <span className="hidden sm:block sm:text-right">{ada && <LabelCapaian status={t.status} />}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Kartu>
  );
}

export default async function HalamanMonitoring({ searchParams }: PageProps<"/monitoring">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const dariAlamat = bulanDariAlamat(sp.bulan);
  const bulan = dariAlamat.bulan ?? bulanLalu();
  const daftar = await daftarIndikator(pengguna);
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
    <Halaman area="pantau">
      <KepalaHalaman judul="Monitoring" sub="Tren Capaian 12 bulan dibanding Target yang berlaku setiap bulan, dari Pengukuran Terverifikasi.">
        <form method="get" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className={`grid min-w-0 gap-1.5 ${kelasLabel}`}>
            Indikator
            <select name="indikator" defaultValue={indikatorId} className={kelasInput}>
              {daftar.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.kode} — {i.nama}
                  {!i.aktif && " (nonaktif)"}
                </option>
              ))}
            </select>
          </label>
          <label className={`grid gap-1.5 ${kelasLabel}`}>
            Sampai bulan
            <input name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
          </label>
          <button type="submit" className={tombolUtama}>
            Tampilkan
          </button>
        </form>
      </KepalaHalaman>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      {typeof tren === "string" ? (
        <Pesan>{tren}</Pesan>
      ) : (
        <>
          <div>
            <h2 className="text-[20px] leading-7 font-bold tracking-[-0.01em]">{tren.indikator.nama}</h2>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              <span className="font-mono text-[13px]">{tren.indikator.kode}</span> · {tren.indikator.kelompok}
              {!tren.indikator.aktif && " · nonaktif"} · {LABEL_ARAH[tren.indikator.arah]} · {LABEL_FREKUENSI[tren.indikator.frekuensi]}
            </p>
          </div>
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
      <div key={u.unit.id} className="grid gap-5">
        <RingkasanBulan t={u.titik.at(-1)!} satuan={satuan} arah={arah} label={`Capaian ${u.unit.nama}`} />
        <Tren
          judul={`Capaian ${u.unit.nama}`}
          keterangan={rentang}
          titik={u.titik}
          satuan={satuan}
          catatan={keteranganUnit}
          analisis={(t) => tautan(u.unit.id, t)}
        />
      </div>
    ));
  }
  return (
    <>
      <RingkasanBulan t={tren.rs.at(-1)!} satuan={satuan} arah={arah} label="Capaian RS" />
      <Tren judul="Capaian RS" keterangan={rentang} titik={tren.rs} satuan={satuan} catatan={keteranganRs} analisis={(t) => tautan(null, t)} />
      <PerUnit tren={tren} tautan={tautan} />
    </>
  );
}
