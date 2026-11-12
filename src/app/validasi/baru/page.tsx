import type { Metadata } from "next";

import { bulanLalu, hariIni } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { daftarIndikator } from "@/modules/indikator/service";
import { bolehTulisLingkup } from "@/modules/perbaikan/service";
import { pilihanUnit } from "@/modules/unit/service";
import { bolehCatatValidasi } from "@/modules/validasi/service";
import { requireUser } from "@/server/sesi";

import { Pesan } from "../../pengukuran/status";
import { Halaman, KepalaHalaman } from "../../ui";
import { FormValidasi } from "../form-validasi";

export const metadata: Metadata = { title: "Catat Validasi" };

/**
 * Mencatat Validasi Data. `?indikator=&unit=&bulan=&pemicu=&pengumpul=` mengisi pilihan awal (dipakai tombol Validasi
 * ulang). Pilihan Unit hanya yang boleh ditulis aktor; Unit Pelapor dan aturan lain diperiksa service.
 */
export default async function HalamanCatatValidasi({ searchParams }: PageProps<"/validasi/baru">) {
  const pengguna = await requireUser();
  if (!bolehCatatValidasi(pengguna)) return <Pesan>Validasi dicatat Komite Mutu, Admin Sistem, dan Kepala Unit.</Pesan>;
  const sp = await searchParams;
  const [indikator, unit] = await Promise.all([daftarIndikator(pengguna), pilihanUnit(pengguna)]);
  const ulang = Boolean(teksAlamat(sp, "indikator"));
  return (
    <Halaman>
      <KepalaHalaman
        judul={ulang ? "Validasi ulang" : "Catat Validasi"}
        kembali={[{ href: "/validasi", label: "Validasi Data" }]}
        sub="Metode kesesuaian hasil pengukuran (PMK 30/2022): validator mengukur ulang sampel acak dari sumber data dan formulir yang sama, lalu hasilnya dibandingkan dengan pengumpul data."
      />
      <section aria-label="Validasi" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormValidasi
          indikator={indikator.filter((i) => i.aktif).map((i) => ({ id: i.id, label: `${i.kode} ${i.nama}` }))}
          unit={unit.filter((u) => bolehTulisLingkup(pengguna, u.id)).map((u) => ({ id: u.id, label: u.nama }))}
          awal={{
            indikatorId: teksAlamat(sp, "indikator") || undefined,
            unitId: teksAlamat(sp, "unit") || undefined,
            bulan: teksAlamat(sp, "bulan") || bulanLalu(),
            pemicu: teksAlamat(sp, "pemicu") || undefined,
            pengumpulData: teksAlamat(sp, "pengumpul") || undefined,
            tanggal: hariIni(),
            validator: pengguna.nama,
          }}
          maksTanggal={hariIni()}
        />
      </section>
    </Halaman>
  );
}
