import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelUkuran } from "@/lib/bukti";
import { LABEL_EFEKTIVITAS, LABEL_JENIS_DOKUMEN_RISIKO, LABEL_KATEGORI_RISIKO } from "@/lib/risiko";
import { ambilRisiko } from "@/modules/risiko/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../../ikon";
import { formatWaktu, Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman } from "../../ui";
import { FormUnggahDokumen, TombolHapusDokumen, TombolHapusRisiko } from "../kelola";
import { LabelTurun, Penilaian } from "../label";

export const metadata: Metadata = { title: "Detail Risiko" };

/** Detail satu Risiko: penilaian, Perlakuan, Hasil Pemantauan, Simpulan, dan Dokumen Review. */
export default async function HalamanDetailRisiko({ params }: PageProps<"/risiko/[id]">) {
  const pengguna = await requireUser();
  const r = await pesanAtau(ambilRisiko(pengguna, (await params).id));
  if (typeof r === "string") return <Pesan>{r}</Pesan>;
  const register = `/risiko?${new URLSearchParams({ unit: r.unit.id, tahun: String(r.tahun) })}`;
  // Versi data untuk `key` form hapus: setelah satu form berhasil, pesan penolakan form lain hilang. Form unggah
  // sengaja tanpa key supaya penolakan sebagian berkas tetap tampil walau berkas lain masuk daftar.
  const versi = JSON.stringify([r.diubahPada, r.dokumen.map((d) => d.id)]);
  const baris: [string, React.ReactNode][] = [
    ["Kategori Risiko", LABEL_KATEGORI_RISIKO[r.kategori]],
    ["Penilaian Awal", <Penilaian key="a" n={r.awal} />],
    ["Prioritas Risiko", <span key="p" className="terukur">{r.awal.prioritas}</span>],
    [
      "Perlakuan",
      r.daftarPerlakuan.length === 0 ? (
        <span className="text-ink-3">Belum diisi.</span>
      ) : (
        <ol key="l" className="grid list-decimal gap-1 pl-5">
          {r.daftarPerlakuan.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      ),
    ],
    ["Jadwal pelaksanaan", r.jadwalLabel ?? <span className="text-ink-3">Belum dijadwalkan.</span>],
    ["Hasil Pemantauan", <Penilaian key="m" n={r.pemantauan} />],
    ["Simpulan Tingkat Risiko", <LabelTurun key="t" turun={r.turun} />],
    ["Efektivitas", r.efektivitas ? LABEL_EFEKTIVITAS[r.efektivitas] : <span className="text-ink-3">Belum dinilai.</span>],
  ];
  return (
    <Halaman>
      <KepalaHalaman
        judul={r.uraian}
        kembali={[{ href: register, label: "Register Risiko" }]}
        meta={`Unit ${r.unit.nama}, ${r.tahun}`}
        sub={
          <>
            Diubah terakhir oleh <span className="text-signal">{r.diubahOleh}</span>,{" "}
            <span className="terukur text-[14px] text-cool">{formatWaktu(r.diubahPada)}</span>.
          </>
        }
        aksi={
          r.bolehTulis && (
            <>
              <TombolHapusRisiko key={versi} id={r.id} unitId={r.unit.id} tahun={r.tahun} />
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/risiko/${r.id}/ubah`}>
                  <Ikon nama="isi" className="size-[18px]" />
                  Ubah
                </Link>
              </Button>
            </>
          )
        }
      />
      <Kartu judul="Penilaian dan Perlakuan">
        <dl className="grid border-t border-rule">
          {baris.map(([label, isi]) => (
            <div key={label} className="grid min-w-0 gap-1 border-b border-rule px-5 py-3 last:border-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[14px] text-ink-3">{label}</dt>
              <dd className="max-w-[72ch] text-[15px] leading-6">{isi}</dd>
            </div>
          ))}
        </dl>
      </Kartu>
      <Kartu judul="Dokumen Review" sub="Hasil review Risiko ini, misalnya notulen rapat atau laporan pemantauan.">
        {r.dokumen.length === 0 ? (
          <p className="px-5 pb-5 text-[15px] text-ink-2">Belum ada Dokumen Review.</p>
        ) : (
          <ul className="mx-5 mb-5 grid border-t border-rule">
            {r.dokumen.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule py-3">
                <Ikon nama="dokumen" className="size-5 shrink-0 text-ink-3" />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  {/* Tautan biasa: tujuannya route handler yang mengirim berkas. */}
                  <a href={`/risiko/dokumen/${d.id}`} target="_blank" rel="noopener" className="text-primary-ink break-words">
                    {d.nama}
                  </a>
                  <span className="text-[13px] text-ink-3">
                    {LABEL_JENIS_DOKUMEN_RISIKO[d.jenis]}, <span className="terukur">{labelUkuran(d.ukuran)}</span>,{" "}
                    <span className="text-signal">{d.diunggahOleh}</span> <span className="terukur text-cool">{formatWaktu(d.diunggahPada)}</span>
                  </span>
                </span>
                {r.bolehTulis && <TombolHapusDokumen key={versi} dokumenId={d.id} nama={d.nama} />}
              </li>
            ))}
          </ul>
        )}
        {r.bolehTulis && <FormUnggahDokumen risikoId={r.id} />}
      </Kartu>
    </Halaman>
  );
}
