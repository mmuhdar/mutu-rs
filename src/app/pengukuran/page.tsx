import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanLalu, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import type { StatusPengukuran } from "@/lib/pengukuran";
import { daftarIsian, unitPengisi } from "@/modules/pengukuran/service";
import { requireUser } from "@/server/sesi";

import { kelasInput, kelasLabel, Segmen, tombolUtama } from "../form";
import { Ikon, type NamaIkon } from "../ikon";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, kelasKartu, kelasTd, kelasTh, KotakIkon, type Nada, Tabel, TautanIkon, Ubin } from "../ui";
import { LabelStatus, Pesan, pesanAtau } from "./status";

export const metadata: Metadata = { title: "Isi Pengukuran" };

/** Kartu angka dan kotak ikon baris per status; nadanya sama dengan label status. */
const TAMPIL_STATUS: Record<StatusPengukuran | "belum", { label: string; nada: Nada; ikon: NamaIkon }> = {
  belum: { label: "Belum diisi", nada: "warn", ikon: "jam" },
  draf: { label: "Draf", nada: "brand", ikon: "isi" },
  diajukan: { label: "Diajukan", nada: "ukur", ikon: "kotakMasuk" },
  terverifikasi: { label: "Terverifikasi", nada: "pos", ikon: "verifikasi" },
};

/** Daftar isian satu Unit pada satu bulan: Indikator yang wajib diisi beserta statusnya, belum diisi di atas. */
export default async function HalamanIsian({ searchParams }: PageProps<"/pengukuran">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const bulan = typeof sp.bulan === "string" ? sp.bulan : bulanLalu();
  const pilihan = await pesanAtau(unitPengisi(pengguna));
  if (typeof pilihan === "string") return <Pesan>{pilihan}</Pesan>;
  if (pilihan.length === 0) return <Pesan>Anda belum terkait ke Unit aktif. Hubungi Admin Sistem.</Pesan>;
  // Satu Unit langsung terpilih; lebih dari satu Unit harus dipilih lebih dulu.
  const unit = pilihan.length === 1 ? pilihan[0] : pilihan.find((u) => u.id === sp.unit);
  const daftar = unit ? await pesanAtau(daftarIsian(pengguna, { unitId: unit.id, bulan })) : null;
  const jumlah = (cocok: (s: string | null) => boolean) => (Array.isArray(daftar) ? daftar.filter((i) => cocok(i.status)).length : 0);
  const urut = Array.isArray(daftar)
    ? daftar.toSorted((a, b) => Number(Boolean(a.status)) - Number(Boolean(b.status)) || Number(!a.alasanPengembalian) - Number(!b.alasanPengembalian))
    : [];

  // Satu Unit: hanya pilihan bulan, di samping judul. Beberapa Unit: Unit dan bulan di kartu saringan.
  const saringan = unit && (
    <form
      method="get"
      className={
        pilihan.length > 1
          ? "grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
          : "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none"
      }
    >
      {pilihan.length > 1 ? (
        <Segmen key={unit.id} nama="unit" label="Unit" pilihan={pilihan.map((u) => ({ nilai: u.id, label: u.nama }))} nilai={unit.id} />
      ) : (
        <input type="hidden" name="unit" value={unit.id} />
      )}
      <label className={`grid min-w-0 gap-1.5 ${kelasLabel} ${pilihan.length > 1 ? "" : "sm:w-44"}`}>
        Bulan
        <input name="bulan" {...INPUT_BULAN} required max={bulanBerjalan()} defaultValue={bulan} className={kelasInput} />
      </label>
      <button type="submit" className={tombolUtama}>
        Tampilkan
      </button>
    </form>
  );

  return (
    <Halaman>
      <KepalaHalaman
        judul="Isi Pengukuran"
        sub={unit ? `${unit.nama} · ${labelBulan(bulan)}. Isi Numerator dan Denominator setiap Indikator yang wajib diisi.` : "Pilih Unit yang sedang Anda isi."}
        aksi={pilihan.length === 1 && saringan}
      >
        {pilihan.length > 1 && saringan}
      </KepalaHalaman>

      {!unit ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pilihan.map((u) => (
            <Link
              key={u.id}
              href={`/pengukuran?${new URLSearchParams({ unit: u.id, bulan })}`}
              className={`${kelasKartu} flex min-h-20 min-w-0 items-center gap-3.5 p-4 text-[16px] font-bold hover:-translate-y-0.5 hover:border-primary/30 sm:p-5`}
            >
              <KotakIkon nada="ukur" ikon="unit" />
              <span className="min-w-0 flex-1">{u.nama}</span>
              <Ikon nama="kanan" className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      ) : typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : (
        daftar && (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Ubin {...TAMPIL_STATUS.belum} nilai={jumlah((s) => !s)} />
              <Ubin {...TAMPIL_STATUS.draf} nilai={jumlah((s) => s === "draf")} />
              <Ubin {...TAMPIL_STATUS.diajukan} nilai={jumlah((s) => s === "diajukan")} />
              <Ubin {...TAMPIL_STATUS.terverifikasi} nilai={`${jumlah((s) => s === "terverifikasi")}/${daftar.length}`}>
                <BarKemajuan nada="pos" nilai={jumlah((s) => s === "terverifikasi")} dari={daftar.length} />
              </Ubin>
            </div>
            <Kartu judul={`${daftar.length} Indikator wajib diisi`} sub="Belum diisi dan yang dikembalikan di atas.">
              {daftar.length === 0 ? (
                <div className="px-5 pb-5">
                  <Pesan>Tidak ada Indikator yang wajib diisi Unit ini pada bulan itu. Unit Pelapor ditetapkan Komite Mutu.</Pesan>
                </div>
              ) : (
                // Di HP kolom Status pindah ke bawah nama Indikator supaya tabel tidak perlu digeser.
                <Tabel label="Indikator wajib diisi" lebarMin="min-w-0">
                  <thead>
                    <tr>
                      <th className={kelasTh}>Indikator</th>
                      <th className={`${kelasTh} max-sm:hidden`}>Status</th>
                      <th className={`${kelasTh} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urut.map(({ indikator, status, alasanPengembalian }) => {
                      const label = <LabelStatus status={status} dikembalikan={Boolean(alasanPengembalian)} />;
                      const bisaDiisi = status === null || status === "draf";
                      return (
                        <tr key={indikator.id}>
                          <td className={kelasTd}>
                            <span className="flex items-start gap-3">
                              <span className="max-sm:hidden">
                                <KotakIkon nada={TAMPIL_STATUS[status ?? "belum"].nada} ikon={TAMPIL_STATUS[status ?? "belum"].ikon} kecil />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold">{indikator.nama}</span>
                                <span className="font-mono text-[12px] text-muted-foreground">{indikator.kode}</span>
                                {alasanPengembalian && (
                                  <span className="mt-1 block text-[13px] whitespace-pre-line text-warning">Dikembalikan: {alasanPengembalian}</span>
                                )}
                                <span className="mt-1.5 block sm:hidden">{label}</span>
                              </span>
                            </span>
                          </td>
                          <td className={`${kelasTd} max-sm:hidden`}>{label}</td>
                          <td className={`${kelasTd} text-right`}>
                            <TautanIkon
                              href={`/pengukuran/isi?${new URLSearchParams({ indikator: indikator.id, unit: unit.id, bulan })}`}
                              ikon={bisaDiisi ? "isi" : "lihat"}
                              label={`${bisaDiisi ? "Isi" : "Lihat"} ${indikator.kode}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabel>
              )}
            </Kartu>
          </>
        )
      )}
    </Halaman>
  );
}
