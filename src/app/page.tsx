import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, INPUT_BULAN, labelBulan, salam } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH } from "@/lib/indikator";
import { LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs, ringkasanCapaian, trenRingkasan } from "@/modules/capaian/service";
import { antreanVerifikasi, bolehIsiPengukuran, bolehVerifikasi, pengukuranDikembalikan } from "@/modules/pengukuran/service";
import { belumDianalisis, bolehTulisLingkup, daftarPdsa, daftarTindakLanjut } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "./analisis/tautan";
import { kelasInput, tombolGaris, tombolUtama } from "./form";
import { BarTarget, GrafikTercapai } from "./grafik-dashboard";
import { LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "./pengukuran/status";
import { Ikon, type NamaIkon } from "./ikon";
import {
  BarKemajuan,
  Donat,
  Halaman,
  Kartu,
  KepalaHalaman,
  kelasTd,
  kelasTh,
  KotakIkon,
  type Nada,
  Pil,
  Rincian,
  Tabel,
  TautanIkon,
  Ubin,
} from "./ui";

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
  const daftarBelum = typeof belum === "string" ? [] : belum.daftar;
  const belumRs = new Set(daftarBelum.filter((b) => b.unit === null).map((b) => b.indikator.id));

  // Tugas paling sering per peran, satu klik dari layar pertama.
  const pertama = daftarBelum[0];
  const aksi =
    antrean && antrean.length > 0
      ? { href: "/pengukuran/verifikasi", label: `Verifikasi ${antrean.length} Pengukuran`, ikon: "verifikasi" as const }
      : bolehIsiPengukuran(pengguna)
        ? { href: "/pengukuran", label: "Isi Pengukuran", ikon: "tambah" as const }
        : pertama && typeof belum !== "string" && bolehTulisLingkup(pengguna, pertama.unit?.id ?? null)
          ? {
              href: tautanAnalisis(pertama.indikator.id, pertama.unit?.id ?? null, belum.bulan),
              label: "Tulis Analisis",
              ikon: "tambah" as const,
            }
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

  const punyaCapaian = jumlah.dinilai - jumlah.kosong;
  const persenDari = (n: number) =>
    punyaCapaian > 0 ? <Pil nada={n === jumlah.tercapai ? "pos" : "neg"}>{Math.round((n / punyaCapaian) * 100)}%</Pil> : null;
  const perluTindakan: { label: string; nilai: number; ikon: NamaIkon; nada: Nada; href: string }[] = [
    ...(antrean
      ? [
          {
            label: "Menunggu Verifikasi",
            nilai: antrean.length,
            ikon: "kotakMasuk" as const,
            nada: "ukur" as const,
            href: "/pengukuran/verifikasi",
          },
        ]
      : []),
    ...(bolehIsiPengukuran(pengguna)
      ? [
          {
            label: "Dikembalikan untuk diperbaiki",
            nilai: dikembalikan.length,
            ikon: "kembalikan" as const,
            nada: "warn" as const,
            href: "/pengukuran",
          },
        ]
      : []),
    { label: "Belum dianalisis", nilai: daftarBelum.length, ikon: "dokumen", nada: "pantau", href: "#belum-dianalisis" },
    {
      label: "Tindak Lanjut lewat tenggat",
      nilai: lewatTenggat,
      ikon: "jam",
      nada: lewatTenggat > 0 ? "neg" : "tindak",
      href: "/tindak-lanjut",
    },
    { label: "PDSA berjalan", nilai: pdsa.length, ikon: "pdsa", nada: "pdsa", href: "/pdsa" },
  ];
  const nadaKelompok = { INM: "brand", "IMP-RS": "ukur", "IMP-Unit": "pantau" } as const;

  return (
    <Halaman>
      <KepalaHalaman
        judul={`${salam()}, ${pengguna.nama}! 👋`}
        sub={temuan}
        aksi={
          <>
            <form method="get" className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none">
              <input
                name="bulan"
                aria-label="Bulan"
                {...INPUT_BULAN}
                required
                max={bulanBerjalan()}
                defaultValue={ringkasan.bulan}
                className={`${kelasInput} shadow-kartu sm:w-44`}
              />
              <button type="submit" className={tombolGaris}>
                Tampilkan
              </button>
            </form>
            {aksi && (
              <Link href={aksi.href} className={tombolUtama}>
                <Ikon nama={aksi.ikon} className="size-[18px]" />
                {aksi.label}
              </Link>
            )}
          </>
        }
      />

      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Ubin nada="brand" ikon="indikator" label="Indikator dinilai" nilai={jumlah.dinilai}>
          <Rincian
            isi={[
              { nada: "brand", nilai: punyaCapaian, label: "punya Capaian" },
              { nada: "netral", nilai: jumlah.kosong, label: "belum" },
            ]}
          />
        </Ubin>
        <Ubin
          nada="pos"
          ikon="centang"
          label="Tercapai"
          nilai={jumlah.tercapai}
          lencana={persenDari(jumlah.tercapai)}
          keterangan={
            ringkasan.jumlahBelumLengkap.tercapai > 0
              ? `${ringkasan.jumlahBelumLengkap.tercapai} di antaranya belum lengkap`
              : "menurut Target dan Arah"
          }
        />
        <Ubin
          nada="neg"
          ikon="peringatan"
          label="Belum Tercapai"
          nilai={jumlah.belumTercapai}
          lencana={jumlah.belumTercapai > 0 ? persenDari(jumlah.belumTercapai) : null}
          keterangan={
            ringkasan.jumlahBelumLengkap.belumTercapai > 0
              ? `${ringkasan.jumlahBelumLengkap.belumTercapai} di antaranya belum lengkap`
              : "menurut Target dan Arah"
          }
        />
        <Ubin
          nada="ukur"
          ikon="verifikasi"
          label="Kelengkapan"
          nilai={`${k.terverifikasi}/${k.wajib}`}
          keterangan="Pengukuran Terverifikasi dari yang wajib"
        >
          <BarKemajuan nada="ukur" nilai={k.terverifikasi} dari={k.wajib} />
        </Ubin>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Kartu
          className="lg:col-span-2 xl:col-span-1"
          judul="Tren Indikator Tercapai"
          sub={`12 bulan sampai ${labelBulan(ringkasan.bulan)}`}
          aksi={<TautanKecil href={`/monitoring?bulan=${ringkasan.bulan}`}>Monitoring</TautanKecil>}
        >
          <div className="px-5 pb-5">{typeof tren === "string" ? <Pesan>{tren}</Pesan> : <GrafikTercapai data={tren} />}</div>
        </Kartu>
        <Kartu judul="Status Capaian" sub={`${labelBulan(ringkasan.bulan)}, ${perUnit ? "Indikator Unit Anda" : "semua Indikator"}`}>
          <div className="px-5 pb-6">
            <Donat
              label={`Status Capaian ${labelBulan(ringkasan.bulan)}`}
              tengah={{ nilai: jumlah.dinilai, label: "Indikator" }}
              bagian={[
                { label: "Tercapai", nilai: jumlah.tercapai, nada: "pos" },
                { label: "Belum Tercapai", nilai: jumlah.belumTercapai, nada: "neg" },
                { label: "Belum ada Capaian", nilai: jumlah.kosong, nada: "netral" },
              ]}
            />
          </div>
        </Kartu>
        <Kartu judul="Perlu tindakan" sub="Pekerjaan yang menunggu Anda">
          <ul className="grid gap-1 px-3 pb-3">
            {perluTindakan.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-active">
                  <KotakIkon nada={t.nada} ikon={t.ikon} kecil />
                  <span className="min-w-0 flex-1 text-[14px] font-medium">{t.label}</span>
                  <span className={`text-[18px] font-bold ${t.nilai > 0 && t.nada === "neg" ? "text-danger" : ""}`}>{t.nilai}</span>
                  <Ikon nama="kanan" className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      <Kartu
        judul="Capaian per Indikator"
        sub={`${labelBulan(ringkasan.bulan)} · garis tegak = Target · Belum Tercapai di atas`}
        aksi={<TautanKecil href={`/monitoring?bulan=${ringkasan.bulan}`}>Monitoring</TautanKecil>}
      >
        {urut.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>Belum ada Indikator aktif yang dinilai pada {labelBulan(ringkasan.bulan)}.</Pesan>
          </div>
        ) : (
          <Tabel label="Capaian per Indikator" lebarMin="min-w-[54rem]">
            <thead>
              <tr>
                <th className={kelasTh}>Indikator</th>
                <th className={kelasTh}>{perUnit ? "Unit" : "Kelengkapan"}</th>
                <th className={`${kelasTh} w-[26%]`}>Capaian</th>
                <th className={`${kelasTh} text-right`}>Target</th>
                <th className={kelasTh}>Status</th>
                <th className={`${kelasTh} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {urut.map(({ indikator: i, unit, capaian, target, status, kelengkapan: kb }) => (
                <tr key={`${i.id}-${unit?.id}`}>
                  <td className={kelasTd}>
                    <span className="flex items-center gap-3">
                      <KotakIkon nada={nadaKelompok[i.kelompok]} ikon="indikator" kecil />
                      <span className="min-w-0">
                        <span className="block font-semibold">{i.nama}</span>
                        <span className="font-mono text-[12px] text-muted-foreground">{i.kode}</span>
                      </span>
                    </span>
                  </td>
                  <td className={`${kelasTd} whitespace-nowrap`}>
                    {unit && <span className="block font-medium">{unit.nama}</span>}
                    <span className={`text-[13px] ${kb.terverifikasi < kb.wajib ? "text-warning" : "text-muted-foreground"}`}>
                      {kb.terverifikasi < kb.wajib ? "belum lengkap " : ""}
                      {kb.terverifikasi}/{kb.wajib} Unit
                    </span>
                  </td>
                  <td className={kelasTd}>
                    <span className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <BarTarget capaian={capaian} target={target} satuan={i.satuan} arah={i.arah} tercapai={status === "tercapai"} />
                      </span>
                      <span
                        className={`w-16 text-right font-bold ${status === "belumTercapai" ? "text-danger" : status === "tercapai" ? "text-success-ink" : ""}`}
                      >
                        {kb.terverifikasi === 0 ? <span className="text-muted-foreground">–</span> : formatCapaian(capaian, i.satuan)}
                      </span>
                    </span>
                  </td>
                  <td className={`${kelasTd} text-right whitespace-nowrap text-muted-foreground`}>
                    {TANDA_ARAH[i.arah]} {formatCapaian(target, i.satuan)}
                  </td>
                  <td className={kelasTd}>
                    <LabelCapaian status={status} />
                  </td>
                  <td className={`${kelasTd} text-right`}>
                    <span className="inline-flex items-center gap-2">
                      {belumRs.has(i.id) && unit === null && (
                        <Link
                          href={tautanAnalisis(i.id, null, ringkasan.bulan)}
                          className="text-[13px] font-semibold whitespace-nowrap text-primary-ink hover:underline"
                        >
                          Tulis Analisis
                        </Link>
                      )}
                      <TautanIkon
                        href={`/monitoring?${new URLSearchParams({ indikator: i.id, bulan: ringkasan.bulan })}`}
                        ikon="lihat"
                        label={`Monitoring ${i.kode}`}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Kartu>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          {dikembalikan.length > 0 && (
            <Kartu judul="Dikembalikan untuk diperbaiki" sub="Perbaiki lalu ajukan lagi.">
              <Tabel label="Pengukuran dikembalikan" lebarMin="min-w-[32rem]">
                <thead>
                  <tr>
                    <th className={kelasTh}>Pengukuran</th>
                    <th className={kelasTh}>Alasan</th>
                    <th className={`${kelasTh} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dikembalikan.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td className={kelasTd}>
                        <span className="block font-semibold">
                          {p.unit.nama} · {labelBulan(p.bulan, { pendek: true })}
                        </span>
                        <span className="font-mono text-[12px] text-muted-foreground">{p.indikator.kode}</span>
                      </td>
                      <td className={`${kelasTd} text-[14px] whitespace-pre-line text-muted-foreground`}>{p.alasan}</td>
                      <td className={`${kelasTd} text-right`}>
                        <TautanIkon
                          href={`/pengukuran/isi?${new URLSearchParams({ indikator: p.indikator.id, unit: p.unit.id, bulan: p.bulan })}`}
                          ikon="isi"
                          label={`Perbaiki ${p.indikator.kode}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </Kartu>
          )}
          {typeof belum !== "string" && (
            <Kartu
              judul={<span id="belum-dianalisis">Belum dianalisis</span>}
              sub={
                daftarBelum.length === 0
                  ? `Semua Analisis ${labelBulan(belum.bulan)} sudah ditulis.`
                  : `${daftarBelum.length} Analisis ${labelBulan(belum.bulan)} belum ditulis.`
              }
            >
              {daftarBelum.length > 0 && (
                <Tabel label="Analisis yang belum ditulis" lebarMin="min-w-[30rem]">
                  <thead>
                    <tr>
                      <th className={kelasTh}>Indikator</th>
                      <th className={kelasTh}>Lingkup</th>
                      <th className={`${kelasTh} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarBelum.slice(0, 6).map(({ indikator: i, unit }) => (
                      <tr key={`${i.id}-${unit?.id}`}>
                        <td className={kelasTd}>
                          <span className="flex items-center gap-3">
                            <KotakIkon nada={nadaKelompok[i.kelompok]} ikon="dokumen" kecil />
                            <span className="min-w-0">
                              <span className="block font-semibold">{i.nama}</span>
                              <span className="font-mono text-[12px] text-muted-foreground">{i.kode}</span>
                            </span>
                          </span>
                        </td>
                        <td className={`${kelasTd} whitespace-nowrap`}>{labelLingkup(unit)}</td>
                        <td className={`${kelasTd} text-right`}>
                          <Link
                            href={tautanAnalisis(i.id, unit?.id ?? null, belum.bulan)}
                            className="text-[13px] font-semibold whitespace-nowrap text-primary-ink hover:underline"
                          >
                            {bolehTulisLingkup(pengguna, unit?.id ?? null) ? "Tulis Analisis →" : "Lihat →"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tabel>
              )}
            </Kartu>
          )}
        </div>
        <Kartu
          judul="Tindak Lanjut"
          sub={`${tindakLanjut.length} Tindak Lanjut · ${lewatTenggat} lewat tenggat`}
          aksi={<TautanKecil href="/tindak-lanjut?status=semua">Semua</TautanKecil>}
        >
          <div className="px-5 pb-6">
            <Donat
              label="Tindak Lanjut menurut status"
              tengah={{ nilai: tindakLanjut.length, label: "Tindak Lanjut" }}
              bagian={STATUS_TINDAK_LANJUT.map((s) => ({
                label: LABEL_STATUS_TINDAK_LANJUT[s],
                nilai: tindakLanjut.filter((t) => t.status === s).length,
                nada: NADA_TINDAK_LANJUT[s],
              }))}
            />
          </div>
        </Kartu>
      </div>
    </Halaman>
  );
}

/** Tautan kecil di kepala kartu, mis. "Monitoring →". */
function TautanKecil({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-active"
    >
      {children} →
    </Link>
  );
}

const NADA_TINDAK_LANJUT = { direncanakan: "atur", berjalan: "tindak", selesai: "pos", dibatalkan: "netral" } as const satisfies Record<
  string,
  Nada
>;
