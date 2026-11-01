import type { Metadata } from "next";

import { labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { antreanVerifikasi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman, kelasTd, kelasTh, KotakIkon, Tabel, TautanIkon, Ubin } from "../../ui";
import { Pesan, pesanAtau } from "../status";

export const metadata: Metadata = { title: "Antrean Verifikasi" };

export default async function HalamanAntreanVerifikasi() {
  const pengguna = await requireUser();
  const antrean = await pesanAtau(antreanVerifikasi(pengguna));
  if (typeof antrean === "string") return <Pesan>{antrean}</Pesan>;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Antrean Verifikasi"
        sub={
          antrean.length === 0
            ? "Tidak ada Pengukuran yang menunggu Verifikasi."
            : `${antrean.length} Pengukuran Diajukan dari Unit Anda, terlama lebih dulu. Buka untuk memverifikasi atau mengembalikan.`
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Ubin nada="ukur" ikon="kotakMasuk" label="Menunggu Verifikasi" nilai={antrean.length} keterangan="Pengukuran Diajukan" />
        {/* Antrean urut bulan, jadi yang pertama = bulan terlama. */}
        <Ubin
          nada="tindak"
          ikon="jam"
          label="Bulan terlama"
          nilai={antrean[0] ? labelBulan(antrean[0].bulan, { pendek: true }) : "–"}
          keterangan="Pengukuran Diajukan paling lama"
        />
      </div>

      {antrean.length > 0 && (
        <Kartu judul="Pengukuran Diajukan" sub="Terlama lebih dulu.">
          {/* Di HP Unit, bulan, dan pengisi pindah ke bawah nama Indikator supaya tabel tidak perlu digeser. */}
          <Tabel label="Antrean Verifikasi" lebarMin="min-w-0">
            <thead>
              <tr>
                <th className={kelasTh}>Indikator</th>
                <th className={`${kelasTh} max-sm:hidden`}>Unit</th>
                <th className={`${kelasTh} max-sm:hidden`}>Bulan</th>
                <th className={`${kelasTh} max-sm:hidden`}>Diisi oleh</th>
                <th className={`${kelasTh} text-right`}>Capaian</th>
                <th className={`${kelasTh} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {antrean.map((p) => (
                <tr key={p.id}>
                  <td className={kelasTd}>
                    <span className="flex items-center gap-3">
                      <span className="max-sm:hidden">
                        <KotakIkon nada="ukur" ikon="kotakMasuk" kecil />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{p.indikator.nama}</span>
                        <span className="font-mono text-[12px] text-muted-foreground">{p.indikator.kode}</span>
                        <span className="mt-1 block text-[13px] text-muted-foreground sm:hidden">
                          {p.unit.nama} · {labelBulan(p.bulan, { pendek: true })} · diisi {p.pengisi}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className={`${kelasTd} whitespace-nowrap max-sm:hidden`}>{p.unit.nama}</td>
                  <td className={`${kelasTd} whitespace-nowrap max-sm:hidden`}>{labelBulan(p.bulan)}</td>
                  <td className={`${kelasTd} text-muted-foreground max-sm:hidden`}>{p.pengisi}</td>
                  <td className={`${kelasTd} text-right whitespace-nowrap`}>
                    <span className="block font-bold text-primary-ink">{formatCapaian(p.capaian, p.indikator.satuan)}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {p.n} ÷ {p.d}
                    </span>
                  </td>
                  <td className={`${kelasTd} text-right`}>
                    <TautanIkon href={`/pengukuran/${p.id}`} ikon="lihat" label={`Periksa ${p.indikator.kode}, ${p.unit.nama}, ${labelBulan(p.bulan)}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>
      )}
    </Halaman>
  );
}
