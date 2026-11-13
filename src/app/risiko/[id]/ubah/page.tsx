import type { Metadata } from "next";

import { ambilRisiko, TOLAK_TULIS_RISIKO, tahunMaksRisiko } from "@/modules/risiko/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../../../pengukuran/status";
import { Halaman, KepalaHalaman } from "../../../ui";
import { FormRisiko } from "../../form-risiko";

export const metadata: Metadata = { title: "Ubah Risiko" };

/** Mengubah isian Risiko; Unit dan tahun tetap. */
export default async function HalamanUbahRisiko({ params }: PageProps<"/risiko/[id]/ubah">) {
  const pengguna = await requireUser();
  const r = await pesanAtau(ambilRisiko(pengguna, (await params).id));
  if (typeof r === "string") return <Pesan>{r}</Pesan>;
  if (!r.bolehTulis) return <Pesan>{TOLAK_TULIS_RISIKO}</Pesan>;
  return (
    <Halaman>
      <KepalaHalaman
        judul="Ubah Risiko"
        kembali={[
          { href: `/risiko?${new URLSearchParams({ unit: r.unit.id, tahun: String(r.tahun) })}`, label: "Register Risiko" },
          { href: `/risiko/${r.id}`, label: "Detail Risiko" },
        ]}
        meta={`Unit ${r.unit.nama}, ${r.tahun}`}
      />
      <section aria-label="Risiko" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormRisiko
          id={r.id}
          unit={[]}
          tahunMaks={tahunMaksRisiko()}
          awal={{
            uraian: r.uraian,
            kategori: r.kategori,
            probabilitas: String(r.probabilitas),
            dampak: String(r.dampak),
            perlakuan: r.perlakuan,
            jadwal: r.jadwal ?? "",
            probabilitasPemantauan: r.probabilitasPemantauan ? String(r.probabilitasPemantauan) : "belum",
            dampakPemantauan: r.dampakPemantauan ? String(r.dampakPemantauan) : "belum",
            efektivitas: r.efektivitas ?? "belum",
          }}
        />
      </section>
    </Halaman>
  );
}
