import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, geserBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { labelLingkup } from "@/lib/perbaikan";
import { daftarIndikator } from "@/modules/indikator/service";
import { ambilPdsa, bolehMulaiPdsa, bolehTulisLingkup } from "@/modules/perbaikan/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, KepalaHalaman } from "../../ui";
import { FormPdsaBaru } from "../form-pdsa";

export const metadata: Metadata = { title: "Mulai PDSA" };

/**
 * Memulai PDSA (`?indikator=&unit=` mengisi pilihan awal, unit kosong = RS) atau siklus berikutnya (`?sebelumnya=`).
 * Pilihan Lingkup hanya yang boleh ditulis aktor; aturan lainnya diperiksa service.
 */
export default async function HalamanPdsaBaru({ searchParams }: PageProps<"/pdsa/baru">) {
  const pengguna = await requireUser();
  if (!bolehMulaiPdsa(pengguna)) {
    return <Pesan>Hanya Komite Mutu, Admin Sistem, dan Kepala Unit yang bisa memulai PDSA.</Pesan>;
  }
  const sp = await searchParams;
  const sebelumnyaId = teksAlamat(sp, "sebelumnya");
  const sebelumnya = sebelumnyaId ? await pesanAtau(ambilPdsa(pengguna, sebelumnyaId)) : null;
  if (typeof sebelumnya === "string") return <Pesan>{sebelumnya}</Pesan>;

  const [indikator, unit] = await Promise.all([daftarIndikator(pengguna), pilihanUnit(pengguna)]);
  const lingkup = [
    ...(bolehTulisLingkup(pengguna, null) ? [{ id: "", label: labelLingkup(null) }] : []),
    ...unit.filter((u) => bolehTulisLingkup(pengguna, u.id)).map((u) => ({ id: u.id, label: labelLingkup(u) })),
  ];
  const bulanMulai = bulanBerjalan();

  return (
    <Halaman>
      <KepalaHalaman
        judul={sebelumnya ? `Siklus ke-${sebelumnya.siklus + 1}: ${sebelumnya.judul}` : "Mulai PDSA"}
        kembali={[{ href: sebelumnya ? `/pdsa/${sebelumnya.id}` : "/pdsa", label: sebelumnya ? "PDSA sebelumnya" : "Daftar PDSA" }]}
        sub={
          sebelumnya ? (
            <>
              <span className="terukur text-[14px] text-ink-2">{sebelumnya.indikator.kode}</span>, {labelLingkup(sebelumnya.unit)}. Isi Plan
              siklus ini berdasarkan Act siklus sebelumnya (lihat{" "}
              <Link href="/pdsa/pedoman" className="text-primary-ink">
                Pedoman pengisian PDSA
              </Link>
              ).
            </>
          ) : (
            <>
              Isi Plan uji coba perbaikan. Setelah disimpan, PDSA langsung berada di tahap Do. Penjelasan dan contoh setiap isian ada di{" "}
              <Link href="/pdsa/pedoman" className="text-primary-ink">
                Pedoman pengisian PDSA
              </Link>
              .
            </>
          )
        }
      />
      <section aria-label="Plan" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormPdsaBaru
          sebelumnyaId={sebelumnya?.id}
          indikator={indikator.filter((i) => i.aktif).map((i) => ({ id: i.id, label: `${i.kode} ${i.nama}` }))}
          lingkup={lingkup}
          awal={{
            indikatorId: teksAlamat(sp, "indikator") || undefined,
            unitId: teksAlamat(sp, "unit") || lingkup[0]?.id,
            judul: sebelumnya?.judul,
            bulanMulai,
            bulanAkhir: geserBulan(bulanMulai, 2),
          }}
        />
      </section>
    </Halaman>
  );
}
