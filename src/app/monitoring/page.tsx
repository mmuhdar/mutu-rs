import type { Metadata } from "next";

import { bulanBerjalan, bulanLalu, labelBulan, labelBulanPendek } from "@/lib/bulan";
import { formatCapaian, LABEL_STATUS_CAPAIAN, type StatusCapaian } from "@/lib/capaian";
import { LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import { trenCapaian, type TitikCapaian, type TrenCapaian } from "@/modules/capaian/service";
import { daftarIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasKartu, Pesan, pesanAtau } from "../pengukuran/status";
import { GrafikCapaian } from "./grafik";

export const metadata: Metadata = { title: "Monitoring" };

const angka = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
/** Selisih Capaian terhadap Target dengan tanda: "+2", "−26,36", "0". */
const formatSelisih = (s: number | null) => (s === null ? "–" : `${s > 0 ? "+" : s < 0 ? "−" : ""}${angka(Math.abs(s))}`);

const WARNA_STATUS: Record<StatusCapaian, string> = {
  tercapai: "bg-success-soft text-success",
  belumTercapai: "bg-danger-soft text-danger",
};

/** Status Capaian sebagai teks (warna hanya pelengkap); Capaian kosong tidak punya status. */
function LabelCapaian({ status }: { status: StatusCapaian | null }) {
  if (!status) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden>–</span>
        <span className="sr-only">Tanpa Status Capaian</span>
      </span>
    );
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${WARNA_STATUS[status]}`}>
      {LABEL_STATUS_CAPAIAN[status]}
    </span>
  );
}

/** Keterangan Capaian RS: Kelengkapan yang belum penuh. */
const keteranganRs = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "tidak ada Unit Pelapor" : k.terverifikasi < k.wajib ? `belum lengkap (${k.terverifikasi}/${k.wajib} Unit)` : null;
/** Keterangan Capaian Unit: bukan Unit Pelapor, atau Pengukurannya belum Terverifikasi. */
const keteranganUnit = ({ kelengkapan: k }: TitikCapaian) =>
  k.wajib === 0 ? "bukan Unit Pelapor" : k.terverifikasi === 0 ? "belum Terverifikasi" : null;

/** Grafik dan tabel satu deret Capaian (Capaian RS atau Capaian satu Unit). */
function Tren(p: {
  judul: string;
  keterangan: string;
  titik: TitikCapaian[];
  satuan: string;
  catatan: (t: TitikCapaian) => string | null;
}) {
  return (
    <div className={kelasKartu}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold">{p.judul}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{p.keterangan}</p>
      </div>
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-2 lg:items-start">
        <GrafikCapaian titik={p.titik} satuan={p.satuan} judul={p.judul} />
        <div className="-mx-1.5 overflow-x-auto">
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="px-1.5 py-2 font-semibold">Bulan</th>
                <th className="px-1.5 py-2 text-right font-semibold">Capaian</th>
                <th className="px-1.5 py-2 text-right font-semibold">Target</th>
                <th className="px-1.5 py-2 text-right font-semibold">Selisih</th>
                <th className="px-1.5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.titik.map((t) => {
                const catatan = p.catatan(t);
                return (
                  <tr key={t.bulan} className="align-top">
                    <td className="px-1.5 py-2 whitespace-nowrap">{labelBulanPendek(t.bulan)}</td>
                    <td className="px-1.5 py-2 text-right">
                      <span className="whitespace-nowrap">
                        {/* "kosong" hanya untuk ΣD = 0 dari Pengukuran Terverifikasi; tanpa Pengukuran Terverifikasi = "–". */}
                        {t.kelengkapan.terverifikasi === 0 ? "–" : formatCapaian(t.capaian, p.satuan)}
                      </span>
                      {catatan && <span className="block text-[12px] text-warning">{catatan}</span>}
                    </td>
                    <td className="px-1.5 py-2 text-right whitespace-nowrap">{formatCapaian(t.target, p.satuan)}</td>
                    <td className="px-1.5 py-2 text-right whitespace-nowrap">{formatSelisih(t.selisih)}</td>
                    <td className="px-1.5 py-2">
                      <LabelCapaian status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Rincian Capaian per Unit, satu bagian per bulan (terbaru di atas dan terbuka). */
function RincianPerUnit({ tren }: { tren: TrenCapaian }) {
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
                  <ul className="divide-y divide-border border-t border-border bg-background/40">
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
  const ambil = (nama: string) => (typeof sp[nama] === "string" ? (sp[nama] as string) : "");
  const bulan = ambil("bulan") || bulanLalu();
  const daftar = await daftarIndikator(pengguna);
  const indikatorId = ambil("indikator") || daftar[0]?.id;
  const tren = indikatorId ? await pesanAtau(trenCapaian(pengguna, indikatorId, bulan)) : "Belum ada Indikator.";

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
          <input id="bulan" name="bulan" type="month" required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
        </div>
        <button type="submit" className="h-11 rounded-md border border-border px-4 font-semibold hover:bg-background">
          Tampilkan
        </button>
      </form>

      {typeof tren === "string" ? (
        <Pesan>{tren}</Pesan>
      ) : (
        <>
          <div className={`${kelasKartu} px-4 py-3`}>
            <p className="text-[12.5px] font-medium text-muted-foreground">
              {tren.indikator.kode} · {tren.indikator.kelompok}
              {!tren.indikator.aktif && " · nonaktif"}
            </p>
            <p className="font-semibold">{tren.indikator.nama}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {LABEL_ARAH[tren.indikator.arah]} · {LABEL_FREKUENSI[tren.indikator.frekuensi]} · satuan {tren.indikator.satuan}
            </p>
          </div>
          <IsiTren tren={tren} bulanAkhir={bulan} />
        </>
      )}
    </section>
  );
}

function IsiTren({ tren, bulanAkhir }: { tren: TrenCapaian; bulanAkhir: string }) {
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
      />
    ));
  }
  return (
    <>
      <Tren judul="Capaian RS" keterangan={rentang} titik={tren.rs} satuan={satuan} catatan={keteranganRs} />
      <RincianPerUnit tren={tren} />
    </>
  );
}
