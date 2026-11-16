import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelTanggal } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_JENIS_INSIDEN, LABEL_STATUS_INSIDEN, perluEreport, STATUS_BERTENGGAT, STATUS_INSIDEN_TERBUKA } from "@/lib/insiden";
import { bolehHapusData } from "@/lib/peran";
import { bolehBacaInsiden, daftarInsiden, type SaringanStatusInsiden } from "@/modules/insiden/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../ikon";
import { formatWaktu, Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KELAS_SEGMEN_TAUTAN, KepalaHalaman, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";
import { TombolHapus } from "../tombol-hapus";
import { hapusInsidenAction } from "./actions";
import { LabelStatusInsiden, LabelWarna } from "./label";

export const metadata: Metadata = { title: "Insiden" };

const SARINGAN: { nilai: SaringanStatusInsiden; label: string }[] = [
  { nilai: "terbuka", label: "Terbuka" },
  { nilai: "selesai", label: "Selesai" },
  { nilai: "semua", label: "Semua" },
];

/**
 * Daftar Insiden Keselamatan Pasien yang boleh dibaca (`?status=`, bawaan terbuka): pita jumlah per status terbuka
 * (tautan saringan), lalu satu baris per Insiden; yang lewat tenggat di atas. Hak baca dan saringan dari service.
 */
export default async function HalamanInsiden({ searchParams }: PageProps<"/insiden">) {
  const pengguna = await requireUser();
  const status = (teksAlamat(await searchParams, "status") || "terbuka") as SaringanStatusInsiden;
  // Pita jumlah selalu dari Insiden terbuka; bila saringannya juga "terbuka", satu panggilan cukup.
  const terbuka = await daftarInsiden(pengguna);
  const daftar = status === "terbuka" ? terbuka : await pesanAtau(daftarInsiden(pengguna, { status }));
  const lewat = terbuka.filter((i) => i.lewatTenggat).length;
  // Admin Sistem melihat semua baris untuk menghapus, tetapi detail hanya yang boleh dibacanya.
  const hapus = bolehHapusData(pengguna);
  const baca = (i: (typeof terbuka)[number]) => bolehBacaInsiden(pengguna, { unitId: i.unit.id, dilaporkanOlehId: i.dilaporkanOlehId });
  const judul =
    status === "terbuka" ? "Insiden terbuka" : status === "semua" ? "Semua Insiden" : `Insiden ${LABEL_STATUS_INSIDEN[status] ?? ""}`.trim();

  return (
    <Halaman>
      <KepalaHalaman
        judul="Insiden Keselamatan Pasien"
        sub="Laporan insiden internal (PMK 11/2017): dilaporkan paling lambat 2×24 jam, digrading atasan langsung, lalu diinvestigasi menurut warnanya."
        aksi={
          <>
            <nav aria-label="Saringan status" className="grid w-full grid-cols-3 gap-0.5 rounded-md border border-rule bg-paper-3 p-0.5 sm:flex sm:w-auto">
              {SARINGAN.map((s) => (
                <Button key={s.nilai} asChild variant="ghost" size="sm" className={KELAS_SEGMEN_TAUTAN}>
                  <Link href={s.nilai === "terbuka" ? "/insiden" : `/insiden?status=${s.nilai}`} aria-current={status === s.nilai ? "page" : undefined}>
                    {s.label}
                  </Link>
                </Button>
              ))}
            </nav>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/insiden/lapor">
                <Ikon nama="tambah" className="size-[18px]" />
                Laporkan Insiden
              </Link>
            </Button>
          </>
        }
      />

      <Kartu
        judul={judul}
        sub={`${terbuka.length} Insiden terbuka${lewat > 0 ? `, ${lewat} lewat tenggat investigasi` : ""}.`}
      >
        {/* Jumlah per status terbuka; setiap bacaan membuka saringan status itu. */}
        <ul className="grid grid-cols-2 gap-px border-y border-rule bg-rule lg:grid-cols-4">
          {STATUS_INSIDEN_TERBUKA.map((s) => (
            <li key={s} className="min-w-0 bg-card">
              <Link
                href={`/insiden?status=${s}`}
                aria-current={status === s ? "page" : undefined}
                className="block px-5 py-4 transition-colors hover:bg-paper-3 aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-signal)]"
              >
                <span className="block text-[14px] text-ink-2">{LABEL_STATUS_INSIDEN[s]}</span>
                <span className="terukur mt-1.5 block text-[28px] leading-8 tracking-[-0.04em] text-ink">
                  {terbuka.filter((i) => i.status === s).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {typeof daftar === "string" ? (
          <div className="p-5">
            <Pesan>{daftar}</Pesan>
          </div>
        ) : daftar.length === 0 ? (
          <div className="p-5">
            <Pesan>Tidak ada Insiden {status === "semua" ? "yang bisa Anda lihat" : "dengan status ini"}.</Pesan>
          </div>
        ) : (
          <div className="pt-2">
            <Tabel label="Daftar Insiden" lebarMin="min-w-[58rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Insiden</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Grading</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenggat investigasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="py-3.5 whitespace-normal">
                      {baca(i) ? (
                        <Link href={`/insiden/${i.id}`} className="text-primary-ink text-[15px] font-medium">
                          {i.judul}
                        </Link>
                      ) : (
                        <span className="text-[15px] font-medium">{i.judul}</span>
                      )}
                      <span className="terukur mt-0.5 block text-[12px] text-cool">{formatWaktu(i.waktuInsiden)}</span>
                    </TableCell>
                    <TableCell className="text-[14px] whitespace-nowrap">
                      <span className="block">{LABEL_JENIS_INSIDEN[i.jenis]}</span>
                      {perluEreport(i) && !i.ereportPada && (
                        <span className="mt-1 block">
                          <Pil nada="warn">Belum e-report</Pil>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <LabelWarna warna={i.warna} />
                    </TableCell>
                    <TableCell className="min-w-28 text-[14px] whitespace-normal">{i.unit.nama}</TableCell>
                    <TableCell>
                      <LabelStatusInsiden status={i.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {i.tenggat && STATUS_BERTENGGAT.includes(i.status) ? (
                        <span className="flex flex-wrap items-center gap-2 text-[14px]">
                          {labelTanggal(i.tenggat)}
                          {i.lewatTenggat && <Pil nada="neg">Lewat tenggat</Pil>}
                          {i.mendekatiTenggat && <Pil nada="warn">Mendekati tenggat</Pil>}
                        </span>
                      ) : (
                        <span className="text-[13px] text-ink-3">tidak ada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-start justify-end gap-2">
                        {baca(i) && <TautanIkon href={`/insiden/${i.id}`} ikon="lihat" label={`Buka Insiden ${i.judul}`} />}
                        {hapus && (
                          <TombolHapus
                            kecil
                            action={hapusInsidenAction}
                            data={{ id: i.id }}
                            label={`Hapus Insiden ${i.judul}`}
                            konfirmasi={`Hapus Insiden "${i.judul}" beserta Riwayat Status-nya? Hapus hanya untuk laporan yang salah dimasukkan, misalnya ganda atau uji coba.`}
                          />
                        )}
                      </span>
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
