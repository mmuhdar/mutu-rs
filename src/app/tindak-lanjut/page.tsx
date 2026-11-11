import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { HARI_MENDEKATI_TENGGAT, LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs } from "@/modules/capaian/service";
import { bolehBacaLingkup, daftarTindakLanjut, type SaringanStatusTindakLanjut } from "@/modules/perbaikan/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { Kolom, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";
import { Pesan, pesanAtau } from "../pengukuran/status";
import { Ikon } from "../ikon";
import { Halaman, KepalaHalaman } from "../ui";
import { TabelTindakLanjut } from "./tabel";

export const metadata: Metadata = { title: "Tindak Lanjut" };

const PILIHAN_STATUS: { nilai: SaringanStatusTindakLanjut; label: string }[] = [
  { nilai: "terbuka", label: "Terbuka" },
  ...STATUS_TINDAK_LANJUT.map((s) => ({ nilai: s, label: LABEL_STATUS_TINDAK_LANJUT[s] })),
  { nilai: "semua", label: "Semua" },
];

/** Daftar Tindak Lanjut yang boleh dilihat: lewat tenggat paling atas, lalu urut tenggat. `?status=&unit=` (unit "rs" = Lingkup RS). */
export default async function HalamanTindakLanjut({ searchParams }: PageProps<"/tindak-lanjut">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const status = (teksAlamat(sp, "status") || "terbuka") as SaringanStatusTindakLanjut;
  const unit = teksAlamat(sp, "unit");
  const semuaLingkup = melihatCapaianRs(pengguna);
  // Pilihan Lingkup: Unit aktif yang boleh dibaca aktor (dan Lingkup RS bagi yang melihat semua).
  const pilihan = (await pilihanUnit(pengguna)).filter((u) => bolehBacaLingkup(pengguna, u.id));
  const lingkup = unit === "rs" ? null : unit || undefined;
  // Status dan Lingkup di luar hak/daftar ditolak service. Ringkasan status dihitung dari semua status Lingkup itu.
  const [daftar, semua] = await Promise.all([
    pesanAtau(daftarTindakLanjut(pengguna, { status, lingkup })),
    pesanAtau(daftarTindakLanjut(pengguna, { status: "semua", lingkup })),
  ]);
  const hitung = (cocok: (t: { status: string; lewatTenggat: boolean; mendekatiTenggat: boolean }) => boolean) =>
    typeof semua === "string" ? 0 : semua.filter(cocok).length;
  const alamat = (s: string) => `/tindak-lanjut?${new URLSearchParams({ status: s, unit })}`;

  return (
    <Halaman>
      <KepalaHalaman judul="Tindak Lanjut" sub="Tindakan perbaikan dari Analisis. Yang lewat tenggat paling atas, lalu urut tenggat; status diubah di halaman Analisis-nya.">
        <form method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-end">
          {/* key: pilihan saringan mengikuti alamat. */}
          <Segmen key={status} nama="status" label="Status" pilihan={PILIHAN_STATUS} nilai={status} />
          <Kolom label="Lingkup" htmlFor="unit">
            <PilihCari
              key={unit}
              id="unit"
              nama="unit"
              nilai={unit}
              cari="Cari Lingkup…"
              pilihan={[
                { nilai: "", label: semuaLingkup ? "Semua Lingkup" : "Semua Unit saya" },
                ...(semuaLingkup ? [{ nilai: "rs", label: labelLingkup(null) }] : []),
                ...pilihan.map((u) => ({ nilai: u.id, label: labelLingkup(u) })),
              ]}
            />
          </Kolom>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Ikon nama="cari" className="size-[18px]" />
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>

      {typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : (
        // Buku Tindak Lanjut: hitungan per status (tautan saringan) di atas, tabel di bawahnya, satu permukaan.
        <div className="grid min-w-0 gap-px overflow-hidden rounded-card border border-rule bg-rule">
          <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
            <Hitungan
              href={alamat("terbuka")}
              label="Lewat tenggat"
              nilai={hitung((t) => t.lewatTenggat)}
              penyimpangan
              keterangan={
                hitung((t) => t.mendekatiTenggat) > 0
                  ? `${hitung((t) => t.mendekatiTenggat)} lainnya mendekati tenggat (≤ ${HARI_MENDEKATI_TENGGAT} hari)`
                  : "masih Direncanakan atau Berjalan"
              }
            />
            <Hitungan
              href={alamat("direncanakan")}
              label="Direncanakan"
              nilai={hitung((t) => t.status === "direncanakan")}
              keterangan="belum dimulai"
            />
            <Hitungan href={alamat("berjalan")} label="Berjalan" nilai={hitung((t) => t.status === "berjalan")} keterangan="sedang dikerjakan" />
            <Hitungan href={alamat("selesai")} label="Selesai" nilai={hitung((t) => t.status === "selesai")} keterangan="dengan catatan hasil" />
          </div>
          <section aria-labelledby="judul-buku" className="min-w-0 bg-paper-2">
            <div className="px-5 pt-5 pb-3 sm:px-6">
              <h2 id="judul-buku" className="font-display text-[17px] leading-6 font-medium tracking-[-0.01em]">
                <span className="terukur">{daftar.length}</span> Tindak Lanjut
              </h2>
              <p className="mt-1 text-[13px] text-ink-3">{PILIHAN_STATUS.find((p) => p.nilai === status)?.label}</p>
            </div>
            {daftar.length === 0 ? (
              <p className="px-5 pb-6 text-[15px] text-ink-2 sm:px-6">Tidak ada Tindak Lanjut dengan saringan ini.</p>
            ) : (
              <TabelTindakLanjut
                daftar={daftar}
                atas={(t) => (
                  <>
                    <span className="terukur">{t.indikator.kode}</span>, {labelLingkup(t.unit)}, Analisis {labelBulan(t.bulan, { pendek: true })}
                  </>
                )}
                href={(t) => tautanAnalisis(t.indikator.id, t.unit?.id ?? null, t.bulan)}
              />
            )}
          </section>
        </div>
      )}
    </Halaman>
  );
}

/**
 * Satu hitungan di kepala buku Tindak Lanjut: label, angka dalam huruf ukur, keterangan; seluruh sel = tautan saringan.
 * `penyimpangan` = angka di atas 0 ditulis amber (yang harus ditindaklanjuti seseorang, mis. lewat tenggat).
 */
function Hitungan(p: { href: string; label: string; nilai: number; keterangan: string; penyimpangan?: boolean }) {
  return (
    <Link href={p.href} className="grid min-w-0 content-between gap-3 bg-paper-2 p-5 transition-colors hover:bg-paper-3">
      <span className="text-[14px] font-medium text-ink-2">{p.label}</span>
      <span className={`terukur text-[32px] leading-none tracking-[-0.04em] ${p.penyimpangan && p.nilai > 0 ? "text-signal" : "text-ink"}`}>
        {p.nilai}
      </span>
      <span className="text-[13px] text-ink-3">{p.keterangan}</span>
    </Link>
  );
}
