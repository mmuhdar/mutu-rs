import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, geserBulan, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH } from "@/lib/indikator";
import { LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs, ringkasanCapaian, trenRingkasan } from "@/modules/capaian/service";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import {
  antreanVerifikasi,
  bolehIsiPengukuran,
  bolehVerifikasi,
  pengukuranDikembalikan,
} from "@/modules/pengukuran/service";
import { belumDianalisis, bolehTulisLingkup, daftarPdsa, daftarTindakLanjut } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "./analisis/tautan";
import { kelasInput } from "./form";
import { BarTarget, GrafikTercapai } from "./grafik-dashboard";
import { kelasKartu, LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "./pengukuran/status";

export const metadata: Metadata = { title: "Dashboard" };

/** Kartu berjudul: judul 16px di kiri, aksi tenang di kanan. */
function Bagian(p: { judul: string; keterangan?: React.ReactNode; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${kelasKartu} min-w-0`}>
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-medium">{p.judul}</h2>
          {p.keterangan && <p className="mt-0.5 text-[13px] text-muted-foreground">{p.keterangan}</p>}
        </div>
        {p.aksi}
      </header>
      {p.children}
    </section>
  );
}

/** Satu sel strip KPI: label di atas angka, keterangan kecil di bawahnya. */
function Kpi(p: { label: string; nilai: React.ReactNode; keterangan?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-[13px] font-medium text-muted-foreground">{p.label}</p>
      <p className="mt-1 text-[28px] leading-8 tracking-[-0.01em]">{p.nilai}</p>
      {p.children}
      {p.keterangan && <p className="mt-1 text-[12px] text-muted-foreground">{p.keterangan}</p>}
    </div>
  );
}

/** Baris "Perlu tindakan": nama tugas di kiri, jumlahnya di kanan; seluruh baris menaut ke daftarnya. */
function Tugas({ href, label, jumlah, merah = false }: { href: string; label: string; jumlah: number; merah?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center gap-3 px-5 hover:bg-background">
        <span className="flex-1">{label}</span>
        <span className={`text-[16px] ${merah && jumlah > 0 ? "font-medium text-danger" : jumlah === 0 ? "text-muted-foreground" : ""}`}>
          {jumlah}
        </span>
        <span aria-hidden className="text-muted-foreground">
          ›
        </span>
      </Link>
    </li>
  );
}

/**
 * Dashboard: halaman pertama setelah masuk. Pertanyaannya: Indikator mana yang belum tercapai bulan ini, dan apa yang
 * harus saya kerjakan? Angka Capaian dari `ringkasanCapaian` dan `trenRingkasan` (modul Capaian); Analisis yang belum
 * ditulis, Tindak Lanjut, dan PDSA dari modul Perbaikan.
 */
export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const pengguna = await requireUser();
  // Bulan tidak valid atau belum berjalan diganti bulan bawaan (ditentukan service) dengan pemberitahuan.
  const { bulan, pemberitahuan } = bulanDariAlamat((await searchParams).bulan);
  const perUnit = !melihatCapaianRs(pengguna);
  const [ringkasan, tren, antrean, dikembalikan, belum, tindakLanjut, pdsa] = await Promise.all([
    pesanAtau(ringkasanCapaian(pengguna, bulan)),
    pesanAtau(trenRingkasan(pengguna, bulan)),
    bolehVerifikasi(pengguna) ? antreanVerifikasi(pengguna) : null,
    bolehIsiPengukuran(pengguna) ? pengukuranDikembalikan(pengguna) : [],
    pesanAtau(belumDianalisis(pengguna, bulan)),
    daftarTindakLanjut(pengguna, { status: "semua" }),
    daftarPdsa(pengguna),
  ]);
  const lewatTenggat = tindakLanjut.filter((t) => t.lewatTenggat).length;
  const daftarBelum = typeof belum === "string" ? [] : belum.daftar;
  const belumRs = new Set(daftarBelum.filter((b) => b.unit === null).map((b) => b.indikator.id));

  // Tugas paling sering per peran, satu klik dari layar pertama.
  const pertama = daftarBelum[0];
  const aksi =
    antrean && antrean.length > 0
      ? { href: "/pengukuran/verifikasi", label: `Verifikasi ${antrean.length} Pengukuran` }
      : bolehIsiPengukuran(pengguna)
        ? { href: "/pengukuran", label: "Isi Pengukuran" }
        : pertama && typeof belum !== "string" && bolehTulisLingkup(pengguna, pertama.unit?.id ?? null)
          ? { href: tautanAnalisis(pertama.indikator.id, pertama.unit?.id ?? null, belum.bulan), label: "Tulis Analisis" }
          : null;

  if (typeof ringkasan === "string") return <Pesan>{ringkasan}</Pesan>;
  if (perUnit && pengguna.unitIds.length === 0) return <Pesan>Anda belum terkait ke Unit mana pun. Hubungi Admin Sistem.</Pesan>;

  const { jumlah, kelengkapan: k } = ringkasan;
  const urut = ringkasan.baris.toSorted(
    (a, b) =>
      Number(b.status === "belumTercapai") - Number(a.status === "belumTercapai") ||
      Number(a.status === null) - Number(b.status === null),
  );
  const temuan =
    `${labelBulan(ringkasan.bulan)}: ${jumlah.belumTercapai} dari ${jumlah.dinilai} Indikator ${perUnit ? "Unit Anda " : ""}` +
    `Belum Tercapai · Kelengkapan ${k.terverifikasi}/${k.wajib}` +
    (bolehKelolaIndikator(pengguna) ? ` · lapor SIMAR paling lambat 10 ${labelBulan(geserBulan(ringkasan.bulan, 1))}` : "");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">{temuan}</p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <form method="get" className="flex min-w-0 flex-1 items-end gap-2 sm:flex-none">
            <label className="grid min-w-0 flex-1 gap-1 text-[13px] font-medium">
              Bulan
              <input
                name="bulan"
                {...INPUT_BULAN}
                required
                max={bulanBerjalan()}
                defaultValue={ringkasan.bulan}
                className={`${kelasInput} sm:w-44`}
              />
            </label>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md border border-input bg-surface px-4 font-medium hover:bg-background active:translate-y-px"
            >
              Tampilkan
            </button>
          </form>
          {aksi && (
            <Link
              href={aksi.href}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover sm:w-auto"
            >
              {aksi.label}
            </Link>
          )}
        </div>
      </div>

      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      <div className={`${kelasKartu} grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-border`}>
        <div className="max-sm:border-r max-sm:border-b max-sm:border-border">
          <Kpi label="Indikator dinilai" nilai={jumlah.dinilai} keterangan={`${jumlah.kosong} belum punya Capaian`} />
        </div>
        <div className="max-sm:border-b max-sm:border-border">
          <Kpi
            label="Tercapai"
            nilai={jumlah.tercapai}
            keterangan={
              ringkasan.jumlahBelumLengkap.tercapai > 0
                ? `${ringkasan.jumlahBelumLengkap.tercapai} di antaranya belum lengkap`
                : "menurut Target dan Arah"
            }
          />
        </div>
        <div className="max-sm:border-r max-sm:border-border">
          <Kpi
            label="Belum Tercapai"
            nilai={<span className={jumlah.belumTercapai > 0 ? "text-danger" : undefined}>{jumlah.belumTercapai}</span>}
            keterangan={
              ringkasan.jumlahBelumLengkap.belumTercapai > 0
                ? `${ringkasan.jumlahBelumLengkap.belumTercapai} di antaranya belum lengkap`
                : "menurut Target dan Arah"
            }
          />
        </div>
        <Kpi
          label="Kelengkapan"
          nilai={
            <>
              {k.terverifikasi}
              <span className="text-[16px] text-muted-foreground">/{k.wajib}</span>
            </>
          }
          keterangan="Pengukuran Terverifikasi dari yang wajib"
        >
          {k.wajib > 0 && (
            <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-active">
              <span className="block h-full rounded-full bg-accent" style={{ width: `calc(${k.terverifikasi} / ${k.wajib} * 100%)` }} />
            </span>
          )}
        </Kpi>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Bagian
          judul="Capaian per Indikator"
          keterangan={`${labelBulan(ringkasan.bulan)}. Garis tegak = Target; Belum Tercapai di atas.`}
          aksi={
            <Link href={`/monitoring?bulan=${ringkasan.bulan}`} className="shrink-0 text-[13px] text-accent hover:underline">
              Monitoring
            </Link>
          }
        >
          {urut.length === 0 ? (
            <div className="px-5 pb-5">
              <Pesan>Belum ada Indikator aktif yang dinilai pada {labelBulan(ringkasan.bulan)}.</Pesan>
            </div>
          ) : (
            <ul className="divide-y divide-rule border-t border-border">
              {urut.map(({ indikator: i, unit, capaian, target, status, kelengkapan: kb }) => (
                <li
                  key={`${i.id}-${unit?.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_7.5rem] sm:items-center"
                >
                  <span className="col-span-2 min-w-0 sm:col-span-1">
                    <Link
                      href={`/monitoring?${new URLSearchParams({ indikator: i.id, bulan: ringkasan.bulan })}`}
                      className="block font-medium hover:text-accent"
                    >
                      <span className="mr-2 font-mono text-[12px] text-muted-foreground">{i.kode}</span>
                      {i.nama}
                    </Link>
                    <span className="block text-[12px] text-muted-foreground">
                      {unit ? `${unit.nama} · ` : ""}
                      {kb.terverifikasi < kb.wajib ? (
                        <span className="text-warning">
                          belum lengkap ({kb.terverifikasi}/{kb.wajib} Unit)
                        </span>
                      ) : (
                        `${kb.terverifikasi}/${kb.wajib} Unit Terverifikasi`
                      )}
                      {belumRs.has(i.id) && unit === null && (
                        <>
                          {" · "}
                          <Link href={tautanAnalisis(i.id, null, ringkasan.bulan)} className="text-accent hover:underline">
                            belum dianalisis
                          </Link>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="self-center">
                    <BarTarget capaian={capaian} target={target} satuan={i.satuan} arah={i.arah} tercapai={status === "tercapai"} />
                  </span>
                  <span className="row-span-2 text-right leading-tight sm:row-span-1">
                    <span className={`block font-medium ${status === "belumTercapai" ? "text-danger" : ""}`}>
                      {kb.terverifikasi === 0 ? <span className="text-muted-foreground">–</span> : formatCapaian(capaian, i.satuan)}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      Target {TANDA_ARAH[i.arah]} {formatCapaian(target, i.satuan)}
                    </span>
                  </span>
                  <span className="sm:text-right">
                    <LabelCapaian status={status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bagian>

        <div className="grid gap-6">
          <Bagian judul="Perlu tindakan">
            <ul className="divide-y divide-rule border-t border-border">
              {antrean && <Tugas href="/pengukuran/verifikasi" label="Menunggu Verifikasi" jumlah={antrean.length} />}
              {bolehIsiPengukuran(pengguna) && (
                <Tugas href="/pengukuran" label="Pengukuran dikembalikan" jumlah={dikembalikan.length} merah />
              )}
              <Tugas href="/tindak-lanjut" label="Tindak Lanjut lewat tenggat" jumlah={lewatTenggat} merah />
              <Tugas href="/pdsa" label="PDSA sedang berjalan" jumlah={pdsa.length} />
            </ul>
          </Bagian>

          {dikembalikan.length > 0 && (
            <Bagian judul="Dikembalikan untuk diperbaiki" keterangan="Perbaiki lalu ajukan lagi.">
              <ul className="divide-y divide-rule border-t border-border">
                {dikembalikan.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pengukuran/isi?${new URLSearchParams({ indikator: p.indikator.id, unit: p.unit.id, bulan: p.bulan })}`}
                      className="block px-5 py-3 hover:bg-background"
                    >
                      <span className="block font-medium">
                        <span className="mr-2 font-mono text-[12px] text-muted-foreground">{p.indikator.kode}</span>
                        {p.unit.nama} · {labelBulan(p.bulan, { pendek: true })}
                      </span>
                      <span className="block text-[13px] whitespace-pre-line text-muted-foreground">{p.alasan}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Bagian>
          )}

          {typeof belum !== "string" && (
            <Bagian
              judul="Belum dianalisis"
              keterangan={
                daftarBelum.length === 0
                  ? `Semua Analisis ${labelBulan(belum.bulan)} sudah ditulis.`
                  : `${daftarBelum.length} Analisis ${labelBulan(belum.bulan)} belum ditulis.`
              }
            >
              {daftarBelum.length > 0 && (
                <ul className="divide-y divide-rule border-t border-border">
                  {daftarBelum.slice(0, 5).map(({ indikator: i, unit }) => (
                    <li key={`${i.id}-${unit?.id}`}>
                      <Link
                        href={tautanAnalisis(i.id, unit?.id ?? null, belum.bulan)}
                        className="flex min-h-11 items-center gap-3 px-5 py-2 hover:bg-background"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="mr-2 font-mono text-[12px] text-muted-foreground">{i.kode}</span>
                          {labelLingkup(unit)}
                        </span>
                        <span className="shrink-0 text-[13px] text-accent">
                          {bolehTulisLingkup(pengguna, unit?.id ?? null) ? "Tulis" : "Lihat"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Bagian>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Bagian judul="Indikator Tercapai per bulan" keterangan={`12 bulan sampai ${labelBulan(ringkasan.bulan)}.`}>
          <div className="px-5 pb-4">{typeof tren === "string" ? <Pesan>{tren}</Pesan> : <GrafikTercapai data={tren} />}</div>
        </Bagian>
        <Bagian
          judul="Tindak Lanjut"
          keterangan={`${tindakLanjut.length} Tindak Lanjut menurut status.`}
          aksi={
            <Link href="/tindak-lanjut?status=semua" className="shrink-0 text-[13px] text-accent hover:underline">
              Semua
            </Link>
          }
        >
          <ul className="divide-y divide-rule border-t border-border">
            {STATUS_TINDAK_LANJUT.map((s) => {
              const n = tindakLanjut.filter((t) => t.status === s).length;
              return (
                <li key={s}>
                  <Link href={`/tindak-lanjut?status=${s}`} className="flex min-h-11 items-center gap-3 px-5 hover:bg-background">
                    <span className="flex-1">{LABEL_STATUS_TINDAK_LANJUT[s]}</span>
                    <span className={n === 0 ? "text-muted-foreground" : undefined}>{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bagian>
      </div>
    </div>
  );
}
