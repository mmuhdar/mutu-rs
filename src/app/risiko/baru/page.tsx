import type { Metadata } from "next";

import { teksAlamat } from "@/lib/form";
import { bolehTambahRisiko, bolehTulisRisiko, TOLAK_TULIS_RISIKO, tahunBerjalan, tahunMaksRisiko } from "@/modules/risiko/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan } from "../../pengukuran/status";
import { Halaman, KepalaHalaman } from "../../ui";
import { FormRisiko } from "../form-risiko";

export const metadata: Metadata = { title: "Tambah Risiko" };

/** Menambah Risiko ke Register Risiko. `?unit=&tahun=` mengisi pilihan awal; Unit hanya yang boleh ditulis aktor. */
export default async function HalamanTambahRisiko({ searchParams }: PageProps<"/risiko/baru">) {
  const pengguna = await requireUser();
  if (!bolehTambahRisiko(pengguna)) return <Pesan>{TOLAK_TULIS_RISIKO}</Pesan>;
  const sp = await searchParams;
  const unit = (await pilihanUnit(pengguna)).filter((u) => bolehTulisRisiko(pengguna, u.id));
  if (unit.length === 0) return <Pesan>Tidak ada Unit aktif yang Register Risiko-nya bisa Anda isi.</Pesan>;
  const unitId = teksAlamat(sp, "unit") || (unit.length === 1 ? unit[0].id : undefined);
  const tahun = teksAlamat(sp, "tahun") || String(tahunBerjalan());
  return (
    <Halaman>
      <KepalaHalaman
        judul="Tambah Risiko"
        kembali={[{ href: `/risiko?${new URLSearchParams({ tahun, ...(unitId && { unit: unitId }) })}`, label: "Register Risiko" }]}
        sub="Hasil Pemantauan dan Efektivitas boleh diisi kemudian, setelah Perlakuan berjalan."
      />
      <section aria-label="Risiko" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormRisiko unit={unit.map((u) => ({ id: u.id, label: u.nama }))} awal={{ unitId, tahun }} tahunMaks={tahunMaksRisiko()} />
      </section>
    </Halaman>
  );
}
