import type { Metadata } from "next";
import Link from "next/link";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { ambilPengukuran, bolehIsiPengukuran, bolehVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { tombolUtama } from "../../form";
import { Halaman, Kartu, KepalaHalaman, Ubin } from "../../ui";
import { AlasanPengembalian, formatWaktu, LabelStatus, Pesan, pesanAtau, RiwayatStatus } from "../status";
import { FormVerifikasi } from "./form-verifikasi";

export const metadata: Metadata = { title: "Detail Pengukuran" };

export default async function HalamanDetailPengukuran({ params }: PageProps<"/pengukuran/[id]">) {
  const pengguna = await requireUser();
  // Hak akses (Unit sendiri, atau Komite Mutu/Admin Sistem) diperiksa di service.
  const p = await pesanAtau(ambilPengukuran(pengguna, (await params).id));
  if (typeof p === "string") return <Pesan>{p}</Pesan>;

  const { indikator, unit } = p;
  const kunci = new URLSearchParams({ unit: unit.id, bulan: p.bulan });
  const kembali = bolehIsiPengukuran(pengguna)
    ? [
        ...(bolehVerifikasi(pengguna) ? [{ href: "/pengukuran/verifikasi", label: "Antrean Verifikasi" }] : []),
        { href: `/pengukuran?${kunci}`, label: "Daftar isian" },
      ]
    : [{ href: `/pengukuran/pantau?${kunci}`, label: "Status Pengukuran" }];

  return (
    <Halaman area="ukur">
      <KepalaHalaman
        judul={indikator.nama}
        kembali={kembali}
        meta={
          <>
            <span className="font-mono text-[13px]">{indikator.kode}</span> · {unit.nama} · {labelBulan(p.bulan)}
          </>
        }
        sub={`Terakhir disimpan oleh ${p.pengisi}, ${formatWaktu(p.disimpan)}.`}
        aksi={<LabelStatus status={p.status} />}
      />

      <AlasanPengembalian status={p.status} riwayat={p.riwayat} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Ubin nada="ukur" label="Numerator (N)" nilai={p.n} keterangan={indikator.definisiNumerator} />
        <Ubin nada="ukur" label="Denominator (D)" nilai={p.d} keterangan={indikator.definisiDenominator} />
        <Ubin nada="pantau" label="Capaian" nilai={formatCapaian(p.capaian, indikator.satuan)} keterangan={`N ÷ D × ${indikator.faktor}`} />
      </div>

      <Kartu judul="Catatan">
        <p className="px-5 pb-5 whitespace-pre-line">{p.catatan || <span className="text-muted-foreground">Tidak ada catatan.</span>}</p>
      </Kartu>

      {p.status === "draf"
        ? bolehIsiPengukuran(pengguna) && (
            <Link href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan: p.bulan })}`} className={tombolUtama}>
              Ubah isian
            </Link>
          )
        : bolehVerifikasi(pengguna) && <FormVerifikasi id={p.id} status={p.status} />}

      <RiwayatStatus riwayat={p.riwayat} />
    </Halaman>
  );
}
