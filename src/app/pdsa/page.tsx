import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_TAHAP_PDSA, labelLingkup, type TahapPdsa } from "@/lib/perbaikan";
import { bolehMulaiPdsa, daftarPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { Ikon, type NamaIkon } from "../ikon";
import { Pesan } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, KotakIkon, type Nada, Rincian, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon, Ubin } from "../ui";
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
    "h-[34px] px-3.5 text-[14px] text-muted-foreground hover:bg-transparent aria-[current=page]:bg-primary-tint aria-[current=page]:text-primary-ink";

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
              className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-kartu sm:flex sm:w-auto"
            >
              <Button asChild variant="ghost" size="sm" className={kelasPilihan}>
                <Link href="/pdsa" aria-current={!semua ? "page" : undefined}>
                  Sedang berjalan
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className={kelasPilihan}>
                <Link href="/pdsa?status=semua" aria-current={semua ? "page" : undefined}>
                  Semua
                </Link>
              </Button>
            </nav>
            {bolehMulaiPdsa(pengguna) && (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/pdsa/baru">
                  <Ikon nama="tambah" className="size-[18px]" />
                  Mulai PDSA
                </Link>
              </Button>
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
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-60">PDSA</TableHead>
                <TableHead>Indikator</TableHead>
                <TableHead>Lingkup</TableHead>
                <TableHead>Uji coba</TableHead>
                <TableHead>Kemajuan</TableHead>
                <TableHead>Tahap</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <KotakIkon nada={p.tahap === "selesai" ? "pos" : "pdsa"} ikon="pdsa" kecil />
                      <span className="min-w-0">
                        <Link href={`/pdsa/${p.id}`} className="block font-semibold hover:text-primary-ink hover:underline">
                          {p.judul}
                        </Link>
                        <span className="text-[13px] text-muted-foreground">siklus ke-{p.siklus}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-[14px]">{p.indikator.nama}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">{p.indikator.kode}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{labelLingkup(p.unit)}</TableCell>
                  <TableCell className="text-muted-foreground">{labelPeriode(p.bulanMulai, p.bulanAkhir)}</TableCell>
                  <TableCell>
                    <JejakTahap aktif={p.tahap} />
                  </TableCell>
                  <TableCell>
                    <LabelTahap tahap={p.tahap} />
                  </TableCell>
                  <TableCell className="text-right">
                    <TautanIkon href={`/pdsa/${p.id}`} ikon="lihat" label={`Buka PDSA ${p.judul}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
