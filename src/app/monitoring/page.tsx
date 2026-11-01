import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { teksAlamat } from "@/lib/form";
import { LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import { punyaLingkupRs } from "@/lib/perbaikan";
import { trenCapaian, type TitikCapaian, type TrenCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { analisisTersedia } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { kelasInput, kelasKartu, LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { keteranganRs, keteranganUnit, Tren } from "./grafik";

export const metadata: Metadata = { title: "Monitoring" };

/** Tautan Analisis satu Lingkup pada satu titik (null = tanpa tautan), dibuat `HalamanMonitoring`. */
type TautanTitik = (unitId: string | null, t: TitikCapaian) => React.ReactNode;

/** Tautan ke Analisis: "Analisis" bila sudah ada, "Belum dianalisis" bila belum (teks, bukan warna saja). */
function TautanAnalisis({ href, ada }: { href: string; ada: boolean }) {
  return (
    <Link
      href={href}
      className={`block text-[12px] font-medium whitespace-nowrap hover:underline pointer-coarse:py-1 ${ada ? "text-accent" : "text-muted-foreground"}`}
    >
      {ada ? "Analisis" : "Belum dianalisis"}
    </Link>
  );
}

/** Rincian Capaian per Unit, satu bagian per bulan (terbaru di atas dan terbuka). */
function RincianPerUnit({ tren, tautan }: { tren: TrenCapaian; tautan: TautanTitik }) {
  const { satuan } = tren.indikator;
  return (
    <div className={kelasKartu}>
      <h2 className="border-b border-border px-4 py-3 text-[15px] font-semibold">Rincian Capaian per Unit</h2>
      {tren.unit.length === 0 ? (
        <p className="p-4 text-muted-foreground">Belum ada Unit Pelapor dalam rentang ini.</p>
      ) : (
        <div className="divide-y divide-border">
          {tren.bulan
            .map((bulan, i) => {
              const unit = tren.unit.filter((u) => u.titik[i].kelengkapan.wajib > 0);
              const k = tren.rs?.[i].kelengkapan;
              return (
                <details key={bulan} open={i === tren.bulan.length - 1} className="group">
                  <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-2 hover:bg-background">
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">
                      ›
                    </span>
                    <span className="font-medium">{labelBulan(bulan)}</span>
                    <span className="ml-auto text-[13px] text-muted-foreground">
                      {k && k.wajib > 0 ? `${k.terverifikasi}/${k.wajib} Unit Terverifikasi` : "tidak ada Unit Pelapor"}
                    </span>
                  </summary>
                  <ul className="divide-y divide-border border-t border-border">
                    {unit.map(({ unit: u, titik }) => {
                      const t = titik[i];
                      return (
                        <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">
                              {u.nama}
                              {!u.aktif && <span className="font-normal text-muted-foreground"> (nonaktif)</span>}
                            </span>
                            <span className="block text-[12.5px] text-muted-foreground tabular-nums">
                              {t.kelengkapan.terverifikasi ? `N ${t.n} / D ${t.d}` : "belum Terverifikasi"}
                            </span>
                            {tautan(u.id, t)}
                          </span>
                          <span className="text-right tabular-nums">
                            <span className="block whitespace-nowrap">
                              {t.kelengkapan.terverifikasi ? formatCapaian(t.capaian, satuan) : "–"}
                            </span>
                            {t.kelengkapan.terverifikasi > 0 && <LabelCapaian status={t.status} />}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })
            .toReversed()}
        </div>
      )}
    </div>
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
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Monitoring</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Tren Capaian 12 bulan dibanding Target yang berlaku setiap bulan. Hanya Pengukuran Terverifikasi yang dihitung.
        </p>
      </div>

      <form method="get" className={`${kelasKartu} grid gap-3 p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end`}>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="indikator" className="text-[13px] font-medium">
            Indikator
          </label>
          <select id="indikator" name="indikator" defaultValue={indikatorId} className={kelasInput}>
            {daftar.map((i) => (
              <option key={i.id} value={i.id}>
                {i.kode} — {i.nama}
                {!i.aktif && " (nonaktif)"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="bulan" className="text-[13px] font-medium">
            Bulan akhir
          </label>
          <input id="bulan" name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
        </div>
        <button type="submit" className="h-11 rounded-md border border-border px-4 font-semibold hover:bg-background">
          Tampilkan
        </button>
      </form>

      <Pemberitahuan>{dariAlamat.pemberitahuan}</Pemberitahuan>

      {typeof tren === "string" ? (
        <Pesan>{tren}</Pesan>
      ) : (
        <>
          <div>
            <h2 className="text-[16px] font-medium">{tren.indikator.nama}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              <span className="font-mono text-[12px]">{tren.indikator.kode}</span> · {tren.indikator.kelompok}
              {!tren.indikator.aktif && " · nonaktif"} · {LABEL_ARAH[tren.indikator.arah]} ·{" "}
              {LABEL_FREKUENSI[tren.indikator.frekuensi]} · satuan {tren.indikator.satuan}
            </p>
          </div>
          <IsiTren tren={tren} bulanAkhir={bulan} tautan={tautan} />
        </>
      )}
    </section>
  );
}

function IsiTren({ tren, bulanAkhir, tautan }: { tren: TrenCapaian; bulanAkhir: string; tautan: TautanTitik }) {
  const { satuan, frekuensi } = tren.indikator;
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
      />
    ));
  }
  return (
    <>
      <Tren
        judul="Capaian RS"
        keterangan={rentang}
        titik={tren.rs}
        satuan={satuan}
        catatan={keteranganRs}
        analisis={(t) => tautan(null, t)}
      />
      <RincianPerUnit tren={tren} tautan={tautan} />
    </>
  );
}
