import type { Metadata } from "next";

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
import { Halaman, Kartu, KepalaHalaman, Ubin } from "../ui";
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Ubin
          nada={hitung((t) => t.lewatTenggat) > 0 ? "neg" : "netral"}
          ikon="jam"
          href={alamat("terbuka")}
          label="Lewat tenggat"
          nilai={hitung((t) => t.lewatTenggat)}
          keterangan={
            hitung((t) => t.mendekatiTenggat) > 0
              ? `${hitung((t) => t.mendekatiTenggat)} lainnya mendekati tenggat (≤ ${HARI_MENDEKATI_TENGGAT} hari)`
              : "masih Direncanakan atau Berjalan"
          }
        />
        <Ubin
          nada="atur"
          ikon="dokumen"
          href={alamat("direncanakan")}
          label="Direncanakan"
          nilai={hitung((t) => t.status === "direncanakan")}
          keterangan="belum dimulai"
        />
        <Ubin
          nada="tindak"
          ikon="tindakLanjut"
          href={alamat("berjalan")}
          label="Berjalan"
          nilai={hitung((t) => t.status === "berjalan")}
          keterangan="sedang dikerjakan"
        />
        <Ubin
          nada="pos"
          ikon="centang"
          href={alamat("selesai")}
          label="Selesai"
          nilai={hitung((t) => t.status === "selesai")}
          keterangan="dengan catatan hasil"
        />
      </div>

      {typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : daftar.length === 0 ? (
        <Pesan>Tidak ada Tindak Lanjut dengan saringan ini.</Pesan>
      ) : (
        <Kartu judul={`${daftar.length} Tindak Lanjut`} sub={PILIHAN_STATUS.find((p) => p.nilai === status)?.label}>
          <TabelTindakLanjut
            daftar={daftar}
            atas={(t) => `${t.indikator.kode} · ${labelLingkup(t.unit)} · Analisis ${labelBulan(t.bulan, { pendek: true })}`}
            href={(t) => tautanAnalisis(t.indikator.id, t.unit?.id ?? null, t.bulan)}
          />
        </Kartu>
      )}
    </Halaman>
  );
}
