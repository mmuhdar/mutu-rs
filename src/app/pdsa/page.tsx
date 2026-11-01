import type { Metadata } from "next";
import Link from "next/link";

import { labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_TAHAP_PDSA, labelLingkup, type TahapPdsa } from "@/lib/perbaikan";
import { bolehMulaiPdsa, daftarPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tombolUtama } from "../form";
import { Ikon, type NamaIkon } from "../ikon";
import { Pesan } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, kelasTd, kelasTh, KotakIkon, type Nada, Rincian, Tabel, TautanIkon, Ubin } from "../ui";
import { JejakTahap, LabelTahap } from "./tahap";

export const metadata: Metadata = { title: "PDSA" };

/** Kartu angka per tahap aktif. Plan tidak pernah menjadi tahap aktif (PDSA dibuat dengan Plan tersimpan, langsung Do). */
const UBIN_TAHAP: { tahap: TahapPdsa; ikon: NamaIkon; nada: Nada; keterangan: string }[] = [
  { tahap: "do", ikon: "isi", nada: "ukur", keterangan: "uji coba skala kecil" },
  { tahap: "study", ikon: "monitoring", nada: "pantau", keterangan: "hasil dibanding prediksi" },
  { tahap: "act", ikon: "target", nada: "tindak", keterangan: "menunggu keputusan" },
];

/** Daftar PDSA yang boleh dilihat: bawaan yang belum Selesai, `?status=semua` termasuk yang Selesai. */
export default async function HalamanPdsa({ searchParams }: PageProps<"/pdsa">) {
  const pengguna = await requireUser();
  const semua = teksAlamat(await searchParams, "status") === "semua";
  const daftar = await daftarPdsa(pengguna, { semua });
  const jumlah = (tahap: TahapPdsa) => daftar.filter((p) => p.tahap === tahap).length;
  const kelasPilihan =
    "inline-flex min-h-[34px] items-center justify-center rounded-lg px-3.5 text-[14px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:bg-primary-tint aria-[current=page]:text-primary-ink";

  return (
    <Halaman>
      <KepalaHalaman
        judul="PDSA"
        sub="Siklus uji coba perbaikan Plan, Do, Study, Act per Indikator dan Lingkup."
        aksi={
          <>
            {/* Saringan di atas kartu angka: angkanya ikut saringan ini. */}
            <nav
              aria-label="Saringan status"
              className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border/70 bg-surface p-1 shadow-kartu sm:flex sm:w-auto"
            >
              <Link href="/pdsa" aria-current={!semua ? "page" : undefined} className={kelasPilihan}>
                Sedang berjalan
              </Link>
              <Link href="/pdsa?status=semua" aria-current={semua ? "page" : undefined} className={kelasPilihan}>
                Semua
              </Link>
            </nav>
            {bolehMulaiPdsa(pengguna) && (
              <Link href="/pdsa/baru" className={tombolUtama}>
                <Ikon nama="tambah" className="size-[18px]" />
                Mulai PDSA
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {semua ? (
          <Ubin nada="pdsa" ikon="pdsa" label="Semua PDSA" nilai={daftar.length}>
            <Rincian
              isi={[
                { nada: "pdsa", nilai: daftar.length - jumlah("selesai"), label: "sedang berjalan" },
                { nada: "pos", nilai: jumlah("selesai"), label: "Selesai" },
              ]}
            />
          </Ubin>
        ) : (
          <Ubin nada="pdsa" ikon="pdsa" label="Sedang berjalan" nilai={daftar.length} keterangan="PDSA yang belum Selesai" />
        )}
        {UBIN_TAHAP.map((u) => (
          <Ubin key={u.tahap} nada={u.nada} ikon={u.ikon} label={`Tahap ${LABEL_TAHAP_PDSA[u.tahap]}`} nilai={jumlah(u.tahap)} keterangan={u.keterangan} />
        ))}
      </div>

      <Kartu judul="Daftar PDSA" sub={semua ? "Semua PDSA, termasuk yang Selesai." : "PDSA yang belum Selesai."}>
        {daftar.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>{semua ? "Belum ada PDSA." : "Tidak ada PDSA yang sedang berjalan."}</Pesan>
          </div>
        ) : (
          <Tabel label="Daftar PDSA" lebarMin="min-w-[60rem]">
            <thead>
              <tr>
                <th className={`${kelasTh} min-w-60`}>PDSA</th>
                <th className={kelasTh}>Indikator</th>
                <th className={kelasTh}>Lingkup</th>
                <th className={kelasTh}>Uji coba</th>
                <th className={kelasTh}>Kemajuan</th>
                <th className={kelasTh}>Tahap</th>
                <th className={`${kelasTh} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id}>
                  <td className={kelasTd}>
                    <span className="flex items-center gap-3">
                      <KotakIkon nada={p.tahap === "selesai" ? "pos" : "pdsa"} ikon="pdsa" kecil />
                      <span className="min-w-0">
                        <Link href={`/pdsa/${p.id}`} className="block font-semibold hover:text-primary-ink hover:underline">
                          {p.judul}
                        </Link>
                        <span className="text-[13px] text-muted-foreground">siklus ke-{p.siklus}</span>
                      </span>
                    </span>
                  </td>
                  <td className={kelasTd}>
                    <span className="block text-[14px]">{p.indikator.nama}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{p.indikator.kode}</span>
                  </td>
                  <td className={`${kelasTd} whitespace-nowrap`}>{labelLingkup(p.unit)}</td>
                  <td className={`${kelasTd} text-muted-foreground`}>{labelPeriode(p.bulanMulai, p.bulanAkhir)}</td>
                  <td className={kelasTd}>
                    <JejakTahap aktif={p.tahap} />
                  </td>
                  <td className={kelasTd}>
                    <LabelTahap tahap={p.tahap} />
                  </td>
                  <td className={`${kelasTd} text-right`}>
                    <TautanIkon href={`/pdsa/${p.id}`} ikon="lihat" label={`Buka PDSA ${p.judul}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
