import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelPeriode } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_TAHAP_PDSA, labelLingkup, type TahapPdsa } from "@/lib/perbaikan";
import { bolehMulaiPdsa, daftarPdsa } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../ikon";
import { Pesan } from "../pengukuran/status";
import { Halaman, Kartu, KELAS_SEGMEN_TAUTAN, KepalaHalaman, Rincian, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";
import { JejakTahap, LabelTahap } from "./tahap";

export const metadata: Metadata = { title: "PDSA" };

/** Bacaan per tahap aktif. Plan tidak pernah menjadi tahap aktif (PDSA dibuat dengan Plan tersimpan, langsung Do). */
const BACAAN_TAHAP: { tahap: TahapPdsa; keterangan: string }[] = [
  { tahap: "do", keterangan: "uji coba skala kecil" },
  { tahap: "study", keterangan: "hasil dibanding prediksi" },
  { tahap: "act", keterangan: "menunggu keputusan" },
];

/**
 * Daftar PDSA yang boleh dilihat sebagai buku catatan: satu panel, jumlah per tahap di pita atasnya (dipisah garis
 * rambut), lalu satu baris per PDSA. Bawaan yang belum Selesai, `?status=semua` termasuk yang Selesai.
 */
export default async function HalamanPdsa({ searchParams }: PageProps<"/pdsa">) {
  const pengguna = await requireUser();
  const semua = teksAlamat(await searchParams, "status") === "semua";
  const daftar = await daftarPdsa(pengguna, { semua });
  const jumlah = (tahap: TahapPdsa) => daftar.filter((p) => p.tahap === tahap).length;

  return (
    <Halaman>
      <KepalaHalaman
        judul="PDSA"
        sub="Siklus uji coba perbaikan Plan, Do, Study, Act per Indikator dan Lingkup."
        aksi={
          <>
            {/* Saringan di atas daftar: jumlah per tahap ikut saringan ini. */}
            <nav aria-label="Saringan status" className="grid w-full grid-cols-2 gap-0.5 rounded-md border border-rule bg-paper-3 p-0.5 sm:flex sm:w-auto">
              <Button asChild variant="ghost" size="sm" className={KELAS_SEGMEN_TAUTAN}>
                <Link href="/pdsa" aria-current={!semua ? "page" : undefined}>
                  Sedang berjalan
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className={KELAS_SEGMEN_TAUTAN}>
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

      <Kartu judul="Daftar PDSA" sub={semua ? "Semua PDSA, termasuk yang Selesai." : "PDSA yang belum Selesai."}>
        <dl className="grid grid-cols-2 gap-px border-y border-rule bg-rule lg:grid-cols-4">
          {semua ? (
            <Bacaan label="Semua PDSA" nilai={daftar.length}>
              <Rincian
                isi={[
                  { nilai: daftar.length - jumlah("selesai"), label: "sedang berjalan" },
                  { nilai: jumlah("selesai"), label: "Selesai" },
                ]}
              />
            </Bacaan>
          ) : (
            <Bacaan label="Sedang berjalan" nilai={daftar.length}>
              <span className="mt-1 block text-[13px] text-ink-3">PDSA yang belum Selesai</span>
            </Bacaan>
          )}
          {BACAAN_TAHAP.map((u) => (
            <Bacaan key={u.tahap} label={`Tahap ${LABEL_TAHAP_PDSA[u.tahap]}`} nilai={jumlah(u.tahap)}>
              <span className="mt-1 block text-[13px] text-ink-3">{u.keterangan}</span>
            </Bacaan>
          ))}
        </dl>
        {daftar.length === 0 ? (
          <div className="p-5">
            <Pesan>{semua ? "Belum ada PDSA." : "Tidak ada PDSA yang sedang berjalan."}</Pesan>
          </div>
        ) : (
          <div className="pt-2">
            <Tabel label="Daftar PDSA" lebarMin="min-w-[54rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">PDSA</TableHead>
                  <TableHead>Indikator</TableHead>
                  <TableHead>Lingkup</TableHead>
                  <TableHead>Kemajuan</TableHead>
                  <TableHead>Tahap</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="py-3.5 whitespace-normal">
                      <Link href={`/pdsa/${p.id}`} className="text-primary-ink text-[15px] font-medium">
                        {p.judul}
                      </Link>
                      <span className="mt-0.5 block text-[13px] text-ink-3">
                        siklus ke-{p.siklus}, uji coba {labelPeriode(p.bulanMulai, p.bulanAkhir)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-44 whitespace-normal">
                      <span className="block text-[14px]">{p.indikator.nama}</span>
                      <span className="terukur text-[12px] text-ink-3">{p.indikator.kode}</span>
                    </TableCell>
                    <TableCell className="min-w-28 text-[14px] whitespace-normal">{labelLingkup(p.unit)}</TableCell>
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
          </div>
        )}
      </Kartu>
    </Halaman>
  );
}

/** Satu bacaan di pita jumlah: label, angka dalam huruf ukur, keterangan (`children`). */
function Bacaan({ label, nilai, children }: { label: string; nilai: number; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-5 py-4">
      <dt className="text-[14px] text-ink-2">{label}</dt>
      <dd className="terukur mt-1.5 text-[28px] leading-8 tracking-[-0.04em] text-ink">{nilai}</dd>
      <dd>{children}</dd>
    </div>
  );
}
