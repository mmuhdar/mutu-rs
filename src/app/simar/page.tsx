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
import { Halaman, KepalaHalaman, Pil } from "../ui";
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
        className="sm:w-44"
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

  const semuaSiap = rekap.jumlahSiap === rekap.baris.length;
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Rekap SIMAR ${labelBulan(rekap.bulan)}`}
        sub="Isian INM untuk SIMAR Kemenkes, urut seperti form SIMAR. Capaian dihitung SIMAR sendiri dari N dan D; teks diubah lewat Analisis dan Tindak Lanjut."
        aksi={saringan}
      />
      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      {/* Kesiapan: satu permukaan dibagi garis rambut. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-rule bg-rule lg:max-w-3xl">
        <div className="grid min-w-0 content-start gap-2 bg-paper-2 p-5">
          <dt className="text-[14px] text-ink-2">INM siap</dt>
          <dd className={`terukur text-[32px] leading-none tracking-[-0.04em] ${semuaSiap ? "text-ink" : "text-signal"}`}>
            {rekap.jumlahSiap}/{rekap.baris.length}
          </dd>
          <dd className="text-[13px] text-ink-3">tanpa tanda di bawah</dd>
        </div>
        <div className="grid min-w-0 content-start gap-2 bg-paper-2 p-5">
          <dt className="text-[14px] text-ink-2">Paling lambat</dt>
          <dd className="terukur text-[26px] leading-8 tracking-[-0.03em] text-ink sm:text-[32px] sm:leading-none">{labelTanggal(rekap.tenggat)}</dd>
          <dd className={`text-[13px] ${rekap.lewatTenggat ? "text-bad" : "text-ink-3"}`}>
            {rekap.lewatTenggat ? "tenggat sudah lewat" : "pukul 23.59"}
          </dd>
        </div>
      </dl>

      {rekap.baris.length === 0 && <Pesan>Tidak ada INM aktif yang diukur pada {labelBulan(rekap.bulan)}.</Pesan>}
      {rekap.baris.map((x, nomor) => {
        const adaPelapor = x.kelengkapan.wajib > 0;
        return (
          // Satu INM = satu rekaman dibagi garis rambut: kepala, tanda, baris N, D, Capaian, lalu dua teks isian berdampingan.
          <article
            key={x.indikator.id}
            aria-labelledby={`inm-${x.indikator.id}`}
            className="grid min-w-0 gap-px overflow-hidden rounded-card border border-rule bg-rule"
          >
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 bg-paper-2 px-5 py-4">
              <h2 id={`inm-${x.indikator.id}`} className="min-w-0 max-w-[60ch] font-display text-[17px] leading-6 font-medium tracking-[-0.01em]">
                {nomor + 1}. {x.indikator.nama} <span className="terukur text-[13px] font-normal text-ink-3">{x.indikator.kode}</span>
              </h2>
              {x.tanda.length === 0 ? <Pil nada="pos">Siap</Pil> : <Pil nada="warn">Belum siap</Pil>}
            </header>
            {x.tanda.length > 0 && (
              <ul className="grid gap-1 bg-signal-soft px-5 py-3 text-[14px] text-signal">
                {x.tanda.map((t) => (
                  <li key={t.pesan}>{t.pesan}</li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-2 gap-px sm:grid-cols-3">
              <Angka label="N" nilai={x.n} />
              <Angka label="D" nilai={x.d} />
              <div className="col-span-2 grid min-w-0 content-start gap-1.5 bg-paper-2 px-5 py-4 sm:col-span-1">
                <dt className="text-[13px] text-ink-3">Capaian (dihitung SIMAR)</dt>
                <dd className="flex min-h-8 items-center">
                  {x.capaian === null ? (
                    <span className="text-[15px] text-ink-3">tidak ada</span>
                  ) : (
                    <span className="terukur text-[26px] leading-8 tracking-[-0.03em] text-ink">{formatCapaian(x.capaian, x.indikator.satuan)}</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="grid gap-px lg:grid-cols-2">
              <IsianTeks
                label="Analisa Capaian"
                teks={x.analisa}
                kosong={adaPelapor ? "Belum ada Analisis Lingkup RS." : "Belum ada Unit Pelapor, jadi belum bisa dianalisis."}
              />
              <IsianTeks label="Rencana Tindak Lanjut" teks={x.analisa === null ? null : x.rencana || null} kosong="Belum ada Tindak Lanjut." />
            </div>
            {adaPelapor && (menulis || x.analisa !== null) && (
              <p className="bg-paper-2 px-5 py-3.5">
                <Link href={tautanAnalisis(x.indikator.id, null, rekap.bulan)} className="text-primary-ink text-[14px]">
                  {!menulis ? "Lihat Analisis" : x.analisa === null ? "Tulis Analisis" : "Ubah Analisis dan Tindak Lanjut"}
                </Link>
              </p>
            )}
          </article>
        );
      })}
    </Halaman>
  );
}

/** N atau D beserta tombol Salin (angka tanpa pemisah ribuan, seperti diketik di SIMAR). */
function Angka({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5 bg-paper-2 px-5 py-4">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="flex flex-wrap items-center justify-between gap-2">
        <span className="terukur text-[26px] leading-8 tracking-[-0.03em] text-ink">{formatAngka(nilai)}</span>
        <TombolSalin teks={String(nilai)} label={label} />
      </dd>
    </div>
  );
}

/** Teks isian SIMAR dengan jumlah karakter dan tombol Salin; null = belum ada (pesan `kosong`). */
function IsianTeks({ label, teks, kosong }: { label: string; teks: string | null; kosong: string }) {
  return (
    <section className="grid min-w-0 content-start gap-2 bg-paper-2 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium">{label}</h3>
        {teks !== null && (
          <span className="flex items-center gap-3">
            <span className={`text-[13px] ${teks.length > BATAS_TEKS_SIMAR ? "text-bad" : "text-ink-3"}`}>
              <span className="terukur text-[12px]">
                {teks.length}/{BATAS_TEKS_SIMAR}
              </span>{" "}
              karakter
            </span>
            <TombolSalin teks={teks} label={label} />
          </span>
        )}
      </div>
      {teks === null ? (
        <p className="text-[15px] text-ink-3">{kosong}</p>
      ) : (
        <p className="max-w-[80ch] text-[15px] leading-6 whitespace-pre-line">{teks}</p>
      )}
    </section>
  );
}
