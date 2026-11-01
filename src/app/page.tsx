import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, geserBulan, INPUT_BULAN, labelBulan } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH } from "@/lib/indikator";
import { LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs, ringkasanCapaian, trenRingkasan } from "@/modules/capaian/service";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { antreanVerifikasi, bolehIsiPengukuran, bolehVerifikasi, pengukuranDikembalikan } from "@/modules/pengukuran/service";
import { belumDianalisis, bolehTulisLingkup, daftarPdsa, daftarTindakLanjut } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "./analisis/tautan";
import { kelasInput, kelasLabel, tombolGaris, tombolUtama } from "./form";
import { BarTarget, GrafikTercapai } from "./grafik-dashboard";
import { LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "./pengukuran/status";
import { BarKemajuan, Halaman, Kartu, KepalaHalaman, Pil, Ubin } from "./ui";

export const metadata: Metadata = { title: "Dashboard" };

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
  const terbuka = tindakLanjut.filter((t) => t.status === "direncanakan" || t.status === "berjalan").length;
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
      Number(b.status === "belumTercapai") - Number(a.status === "belumTercapai") || Number(a.status === null) - Number(b.status === null),
  );
  const temuan =
    jumlah.belumTercapai > 0
      ? `${jumlah.belumTercapai} dari ${jumlah.dinilai} Indikator ${perUnit ? "Unit Anda " : ""}Belum Tercapai pada ${labelBulan(ringkasan.bulan)}.`
      : `Semua ${jumlah.dinilai - jumlah.kosong} Indikator ${perUnit ? "Unit Anda " : ""}yang punya Capaian Tercapai pada ${labelBulan(ringkasan.bulan)}.`;

  return (
    <Halaman area="brand">
      <KepalaHalaman
        judul="Dashboard"
        sub={temuan}
        meta={bolehKelolaIndikator(pengguna) ? `Lapor SIMAR paling lambat 10 ${labelBulan(geserBulan(ringkasan.bulan, 1))}` : undefined}
        aksi={
          <>
            <form method="get" className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none">
              <label className={`grid min-w-0 gap-1.5 ${kelasLabel}`}>
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
              <button type="submit" className={tombolGaris}>
                Tampilkan
              </button>
            </form>
            {aksi && (
              <Link href={aksi.href} className={tombolUtama}>
                {aksi.label}
              </Link>
            )}
          </>
        }
      />

      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Ubin nada="brand" label="Indikator dinilai" nilai={jumlah.dinilai} keterangan={`${jumlah.kosong} belum punya Capaian`} />
        <Ubin
          nada="pos"
          label="Tercapai"
          nilai={jumlah.tercapai}
          keterangan={
            ringkasan.jumlahBelumLengkap.tercapai > 0
              ? `${ringkasan.jumlahBelumLengkap.tercapai} di antaranya belum lengkap`
              : "menurut Target dan Arah"
          }
        />
        <Ubin
          nada={jumlah.belumTercapai > 0 ? "neg" : "netral"}
          label="Belum Tercapai"
          nilai={jumlah.belumTercapai}
          keterangan={
            ringkasan.jumlahBelumLengkap.belumTercapai > 0
              ? `${ringkasan.jumlahBelumLengkap.belumTercapai} di antaranya belum lengkap`
              : "menurut Target dan Arah"
          }
        />
        <Ubin nada="ukur" label="Kelengkapan" nilai={`${k.terverifikasi}/${k.wajib}`} keterangan="Pengukuran Terverifikasi dari yang wajib">
          <BarKemajuan nada="ukur" nilai={k.terverifikasi} dari={k.wajib} />
        </Ubin>
      </div>

      {/* Dua kolom yang tingginya bebas; di HP kolom dilebur (`contents`) dan grafik serta Tindak Lanjut turun ke bawah. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
        <div className="grid gap-5 max-lg:contents">
          <Kartu
            judul="Capaian per Indikator"
            sub={`${labelBulan(ringkasan.bulan)} · garis tegak = Target · Belum Tercapai di atas`}
            aksi={
              <Link
                href={`/monitoring?bulan=${ringkasan.bulan}`}
                className="shrink-0 text-[13px] font-semibold text-pantau-ink hover:underline"
              >
                Monitoring →
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
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem] sm:items-center"
                  >
                    <span className="col-span-2 min-w-0 sm:col-span-1">
                      <Link
                        href={`/monitoring?${new URLSearchParams({ indikator: i.id, bulan: ringkasan.bulan })}`}
                        className="block font-semibold hover:text-pantau-ink"
                      >
                        <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{i.kode}</span>
                        {i.nama}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                        {unit && <span>{unit.nama}</span>}
                        {kb.terverifikasi < kb.wajib ? (
                          <span className="text-warning">
                            belum lengkap {kb.terverifikasi}/{kb.wajib} Unit
                          </span>
                        ) : (
                          <span>
                            {kb.terverifikasi}/{kb.wajib} Unit
                          </span>
                        )}
                        {belumRs.has(i.id) && unit === null && (
                          <Link
                            href={tautanAnalisis(i.id, null, ringkasan.bulan)}
                            className="font-semibold text-pantau-ink hover:underline"
                          >
                            Tulis Analisis
                          </Link>
                        )}
                      </span>
                    </span>
                    <span className="self-center">
                      <BarTarget capaian={capaian} target={target} satuan={i.satuan} arah={i.arah} tercapai={status === "tercapai"} />
                    </span>
                    <span className="row-span-2 text-right leading-tight sm:row-span-1">
                      <span
                        className={`block text-[17px] font-bold ${status === "belumTercapai" ? "text-danger" : status === "tercapai" ? "text-success" : ""}`}
                      >
                        {kb.terverifikasi === 0 ? <span className="text-muted-foreground">–</span> : formatCapaian(capaian, i.satuan)}
                      </span>
                      <span className="block text-[12px] text-muted-foreground">
                        Target {TANDA_ARAH[i.arah]} {formatCapaian(target, i.satuan)}
                      </span>
                    </span>
                    <span className="sm:hidden">
                      <LabelCapaian status={status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
          <Kartu className="max-lg:order-1" judul="Indikator Tercapai per bulan" sub={`12 bulan sampai ${labelBulan(ringkasan.bulan)}`}>
            <div className="px-5 pb-4">{typeof tren === "string" ? <Pesan>{tren}</Pesan> : <GrafikTercapai data={tren} />}</div>
          </Kartu>
        </div>

        <div className="grid gap-5 max-lg:contents">
          <section className="grid gap-3">
            <h2 className="text-[16px] leading-6 font-semibold">Perlu tindakan</h2>
            <div className="grid grid-cols-2 gap-3">
              {antrean && (
                <Ubin
                  nada="ukur"
                  href="/pengukuran/verifikasi"
                  label="Menunggu Verifikasi"
                  nilai={antrean.length}
                  keterangan="Pengukuran Diajukan"
                />
              )}
              {bolehIsiPengukuran(pengguna) && (
                <Ubin
                  nada={dikembalikan.length > 0 ? "warn" : "netral"}
                  href="/pengukuran"
                  label="Dikembalikan"
                  nilai={dikembalikan.length}
                  keterangan="perlu diperbaiki"
                />
              )}
              <Ubin
                nada={lewatTenggat > 0 ? "neg" : "tindak"}
                href="/tindak-lanjut"
                label="Lewat tenggat"
                nilai={lewatTenggat}
                keterangan={`dari ${terbuka} Tindak Lanjut terbuka`}
              />
              <Ubin nada="pdsa" href="/pdsa" label="PDSA berjalan" nilai={pdsa.length} keterangan="uji coba perbaikan" />
            </div>
          </section>

          {dikembalikan.length > 0 && (
            <Kartu judul="Dikembalikan untuk diperbaiki" sub="Perbaiki lalu ajukan lagi.">
              <ul className="divide-y divide-rule border-t border-border">
                {dikembalikan.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pengukuran/isi?${new URLSearchParams({ indikator: p.indikator.id, unit: p.unit.id, bulan: p.bulan })}`}
                      className="block px-5 py-3 hover:bg-background"
                    >
                      <span className="block font-semibold">
                        <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{p.indikator.kode}</span>
                        {p.unit.nama} · {labelBulan(p.bulan, { pendek: true })}
                      </span>
                      <span className="block text-[13px] whitespace-pre-line text-muted-foreground">{p.alasan}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Kartu>
          )}

          {typeof belum !== "string" && (
            <Kartu
              judul="Belum dianalisis"
              sub={
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
                        className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-background"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="mr-2 font-mono text-[12px] font-medium text-muted-foreground">{i.kode}</span>
                          {labelLingkup(unit)}
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold text-pantau-ink">
                          {bolehTulisLingkup(pengguna, unit?.id ?? null) ? "Tulis →" : "Lihat →"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Kartu>
          )}
          <Kartu
            className="max-lg:order-1"
            judul="Tindak Lanjut"
            sub={`${tindakLanjut.length} Tindak Lanjut menurut status`}
            aksi={
              <Link href="/tindak-lanjut?status=semua" className="shrink-0 text-[13px] font-semibold text-tindak-ink hover:underline">
                Semua →
              </Link>
            }
          >
            <ul className="divide-y divide-rule border-t border-border">
              {STATUS_TINDAK_LANJUT.map((s) => {
                const n = tindakLanjut.filter((t) => t.status === s).length;
                return (
                  <li key={s}>
                    <Link href={`/tindak-lanjut?status=${s}`} className="flex min-h-12 items-center gap-3 px-5 hover:bg-background">
                      <span className="flex-1">{LABEL_STATUS_TINDAK_LANJUT[s]}</span>
                      <Pil nada={n === 0 ? "netral" : s === "selesai" ? "pos" : s === "berjalan" ? "tindak" : "netral"}>{n}</Pil>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Kartu>
        </div>
      </div>
    </Halaman>
  );
}
