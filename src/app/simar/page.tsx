import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulanBerjalan, bulanDariAlamat, INPUT_BULAN, labelBulan, labelTanggal } from "@/lib/bulan";
import { formatAngka, formatCapaian } from "@/lib/capaian";
import { BATAS_TEKS_SIMAR } from "@/lib/laporan";
import { rekapSimar } from "@/modules/laporan/service";
import { bolehTulisLingkup } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { Pemberitahuan, Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Pil, Ubin } from "../ui";
import { TombolSalin } from "./tombol-salin";

export const metadata: Metadata = { title: "Rekap SIMAR" };

/**
 * Rekap SIMAR (`?bulan=`, bawaan bulan lalu): isian INM satu bulan untuk diketik ulang di SIMAR Kemenkes, urut seperti
 * form SIMAR, dengan tombol Salin dan tanda bila belum siap. Semua dari `rekapSimar`; teksnya diubah lewat Analisis.
 */
export default async function HalamanSimar({ searchParams }: PageProps<"/simar">) {
  const pengguna = await requireUser();
  const { bulan, pemberitahuan } = bulanDariAlamat((await searchParams).bulan);
  const rekap = await pesanAtau(rekapSimar(pengguna, bulan));
  // Analisis Lingkup RS: Direktur hanya membaca.
  const menulis = bolehTulisLingkup(pengguna, null);

  const saringan = (
    <form method="get" className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none">
      <Input
        name="bulan"
        aria-label="Bulan"
        {...INPUT_BULAN}
        required
        max={bulanBerjalan()}
        defaultValue={typeof rekap === "string" ? bulan : rekap.bulan}
        className="shadow-kartu sm:w-44"
      />
      <Button type="submit" variant="outline" size="lg">
        Tampilkan
      </Button>
    </form>
  );
  if (typeof rekap === "string") {
    return (
      <Halaman>
        <KepalaHalaman judul="Rekap SIMAR" aksi={saringan} />
        <Pesan>{rekap}</Pesan>
      </Halaman>
    );
  }

  return (
    <Halaman>
      <KepalaHalaman
        judul={`Rekap SIMAR ${labelBulan(rekap.bulan)}`}
        sub="Isian INM untuk SIMAR Kemenkes, urut seperti form SIMAR. Capaian dihitung SIMAR sendiri dari N dan D; teks diubah lewat Analisis dan Tindak Lanjut."
        aksi={saringan}
      />
      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      <div className="grid grid-cols-2 gap-4 lg:max-w-2xl">
        <Ubin
          nada={rekap.jumlahSiap === rekap.baris.length ? "pos" : "warn"}
          ikon="centang"
          label="INM siap"
          nilai={`${rekap.jumlahSiap}/${rekap.baris.length}`}
          keterangan="tanpa tanda di bawah"
        />
        <Ubin
          nada={rekap.lewatTenggat ? "neg" : "atur"}
          ikon="jam"
          label="Paling lambat"
          nilai={labelTanggal(rekap.tenggat)}
          keterangan={rekap.lewatTenggat ? "tenggat sudah lewat" : "pukul 23.59"}
        />
      </div>

      {rekap.baris.length === 0 && <Pesan>Tidak ada INM aktif yang diukur pada {labelBulan(rekap.bulan)}.</Pesan>}
      {rekap.baris.map((x, nomor) => {
        const adaPelapor = x.kelengkapan.wajib > 0;
        return (
          <Kartu
            key={x.indikator.id}
            judul={
              <span>
                {nomor + 1}. {x.indikator.nama} <span className="font-mono text-[12px] font-medium text-muted-foreground">{x.indikator.kode}</span>
              </span>
            }
            aksi={x.tanda.length === 0 ? <Pil nada="pos">Siap</Pil> : <Pil nada="warn">Belum siap</Pil>}
          >
            <div className="grid gap-4 px-5 pb-5">
              {x.tanda.length > 0 && (
                <ul className="grid gap-1 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-[14px] text-warning">
                  {x.tanda.map((t) => (
                    <li key={t.pesan}>• {t.pesan}</li>
                  ))}
                </ul>
              )}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,12rem))]">
                <Angka label="N" nilai={x.n} />
                <Angka label="D" nilai={x.d} />
                <div className="grid content-start gap-1 rounded-xl bg-muted px-4 py-3">
                  <dt className="text-[12px] font-semibold text-muted-foreground">Capaian (dihitung SIMAR)</dt>
                  <dd className="text-[18px] font-bold">{x.capaian === null ? "–" : formatCapaian(x.capaian, x.indikator.satuan)}</dd>
                </div>
              </dl>
              <IsianTeks
                label="Analisa Capaian"
                teks={x.analisa}
                kosong={adaPelapor ? "Belum ada Analisis Lingkup RS." : "Belum ada Unit Pelapor, jadi belum bisa dianalisis."}
              />
              <IsianTeks label="Rencana Tindak Lanjut" teks={x.analisa === null ? null : x.rencana || null} kosong="Belum ada Tindak Lanjut." />
              {adaPelapor && (menulis || x.analisa !== null) && (
                <Link
                  href={tautanAnalisis(x.indikator.id, null, rekap.bulan)}
                  className="justify-self-start text-[13px] font-semibold text-primary-ink hover:underline"
                >
                  {!menulis ? "Lihat Analisis →" : x.analisa === null ? "Tulis Analisis →" : "Ubah Analisis dan Tindak Lanjut →"}
                </Link>
              )}
            </div>
          </Kartu>
        );
      })}
    </Halaman>
  );
}

/** N atau D beserta tombol Salin (angka tanpa pemisah ribuan, seperti diketik di SIMAR). */
function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="grid content-start gap-1 rounded-xl border border-border px-4 py-3">
      <dt className="text-[12px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[18px] font-bold">{formatAngka(nilai)}</span>
        <TombolSalin teks={String(nilai)} label={label} />
      </dd>
    </div>
  );
}

/** Teks isian SIMAR dengan jumlah karakter dan tombol Salin; null = belum ada (pesan `kosong`). */
function IsianTeks({ label, teks, kosong }: { label: string; teks: string | null; kosong: string }) {
  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold">{label}</h3>
        {teks !== null && (
          <span className="flex items-center gap-3">
            <span className={`text-[12px] ${teks.length > BATAS_TEKS_SIMAR ? "font-semibold text-danger-ink" : "text-muted-foreground"}`}>
              {teks.length}/{BATAS_TEKS_SIMAR} karakter
            </span>
            <TombolSalin teks={teks} label={label} />
          </span>
        )}
      </div>
      {teks === null ? (
        <p className="text-[14px] text-muted-foreground">{kosong}</p>
      ) : (
        <p className="rounded-xl bg-head px-4 py-3 text-[14px] whitespace-pre-line">{teks}</p>
      )}
    </section>
  );
}
