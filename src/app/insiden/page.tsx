import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelTanggal } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_JENIS_INSIDEN, LABEL_STATUS_INSIDEN, STATUS_INSIDEN_TERBUKA } from "@/lib/insiden";
import { daftarInsiden, type SaringanStatusInsiden } from "@/modules/insiden/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../ikon";
import { formatWaktu, Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Pil, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";
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
  const [daftar, terbuka] = await Promise.all([pesanAtau(daftarInsiden(pengguna, { status })), daftarInsiden(pengguna)]);
  const lewat = terbuka.filter((i) => i.lewatTenggat).length;
  const judul =
    status === "terbuka" ? "Insiden terbuka" : status === "semua" ? "Semua Insiden" : `Insiden ${LABEL_STATUS_INSIDEN[status] ?? ""}`.trim();
  // Segmen saringan: jalur paper-3, pilihan yang dibuka di paper-2 dengan garis amber di bawahnya (seperti PDSA).
  const kelasPilihan =
    "h-9 px-3.5 text-[14px] text-ink-3 hover:bg-transparent hover:text-ink aria-[current=page]:bg-card aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-signal)]";

  return (
    <Halaman>
      <KepalaHalaman
        judul="Insiden Keselamatan Pasien"
        sub="Laporan insiden internal (PMK 11/2017): dilaporkan paling lambat 2×24 jam, digrading atasan langsung, lalu diinvestigasi menurut warnanya."
        aksi={
          <>
            <nav aria-label="Saringan status" className="grid w-full grid-cols-3 gap-0.5 rounded-md border border-rule bg-paper-3 p-0.5 sm:flex sm:w-auto">
              {SARINGAN.map((s) => (
                <Button key={s.nilai} asChild variant="ghost" size="sm" className={kelasPilihan}>
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
                      <Link href={`/insiden/${i.id}`} className="text-primary-ink text-[15px] font-medium">
                        {i.judul}
                      </Link>
                      <span className="terukur mt-0.5 block text-[12px] text-cool">{formatWaktu(i.waktuInsiden)}</span>
                    </TableCell>
                    <TableCell className="text-[14px] whitespace-nowrap">{LABEL_JENIS_INSIDEN[i.jenis]}</TableCell>
                    <TableCell>
                      <LabelWarna warna={i.warna} />
                    </TableCell>
                    <TableCell className="min-w-28 text-[14px] whitespace-normal">{i.unit.nama}</TableCell>
                    <TableCell>
                      <LabelStatusInsiden status={i.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {i.tenggat && (i.status === "investigasi" || i.status === "rca") ? (
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
                      <TautanIkon href={`/insiden/${i.id}`} ikon="lihat" label={`Buka Insiden ${i.judul}`} />
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
