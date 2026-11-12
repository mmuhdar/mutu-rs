import type { Metadata } from "next";

import { waktuSetempat } from "@/lib/bulan";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Halaman, KepalaHalaman } from "../../ui";
import { FormLaporan } from "../form-laporan";

export const metadata: Metadata = { title: "Laporkan Insiden" };

/** Laporan Insiden baru (semua Pengguna). Unit tempat insiden terisi Unit milik pelapor bila ia hanya punya satu Unit aktif. */
export default async function HalamanLaporInsiden() {
  const pengguna = await requireUser();
  const unit = await pilihanUnit(pengguna);
  const unitSaya = unit.filter((u) => pengguna.unitIds.includes(u.id));
  return (
    <Halaman>
      <KepalaHalaman
        judul="Laporkan Insiden"
        kembali={[{ href: "/insiden", label: "Insiden" }]}
        sub="Isian Formulir 1 PMK 11/2017. Laporan ini rahasia dan dipakai untuk belajar, bukan untuk menyalahkan siapa pun."
      />
      <section aria-label="Laporan Insiden" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormLaporan
          unit={unit.map((u) => ({ id: u.id, label: u.nama }))}
          awal={{ unitId: unitSaya.length === 1 ? unitSaya[0].id : undefined }}
          maksWaktu={waktuSetempat(new Date())}
        />
      </section>
    </Halaman>
  );
}
