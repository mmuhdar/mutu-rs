import type { Metadata } from "next";
import Link from "next/link";

import { bulanBerjalan, bulanDariAlamat, INPUT_BULAN, labelBulan, labelTanggal, salam } from "@/lib/bulan";
import { formatCapaian } from "@/lib/capaian";
import { TANDA_ARAH } from "@/lib/indikator";
import { HARI_MENDEKATI_TENGGAT, LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs, ringkasanCapaian, trenRingkasan } from "@/modules/capaian/service";
import { bolehKelolaIndikator } from "@/modules/indikator/service";
import { menanganiInsiden, ringkasanInsiden } from "@/modules/insiden/service";
import { rekapSimar } from "@/modules/laporan/service";
import { antreanVerifikasi, bolehIsiPengukuran, bolehVerifikasi, pengukuranDikembalikan } from "@/modules/pengukuran/service";
import { belumDianalisis, bolehTulisLingkup, daftarPdsa, daftarTindakLanjut } from "@/modules/perbaikan/service";
import { requireUser } from "@/server/sesi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { tautanAnalisis } from "./analisis/tautan";
import { BarTarget, GrafikTercapai } from "./grafik-dashboard";
import { LabelCapaian, Pemberitahuan, Pesan, pesanAtau } from "./pengukuran/status";
import { Ikon, type NamaIkon } from "./ikon";
import {
  BarKemajuan,
  Halaman,
  Komposisi,
  Kartu,
  KepalaHalaman,
  KotakIkon,
  type Nada,
  Tabel,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TautanIkon,
  TUMPUK,
} from "./ui";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard: halaman pertama setelah masuk. Pertanyaannya: Indikator mana yang belum tercapai bulan ini, dan apa yang
 * harus saya kerjakan? Angka Capaian dari `ringkasanCapaian` dan `trenRingkasan` (modul Capaian); Analisis yang belum
 * ditulis, Tindak Lanjut, dan PDSA dari modul Perbaikan; antrean Insiden dari `ringkasanInsiden` (modul Insiden).
 */
export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const pengguna = await requireUser();
  // Bulan tidak valid atau belum berjalan diganti bulan bawaan (ditentukan service) dengan pemberitahuan.
  const { bulan, pemberitahuan } = bulanDariAlamat((await searchParams).bulan);
  const perUnit = !melihatCapaianRs(pengguna);
  const [ringkasan, tren, antrean, dikembalikan, belum, tindakLanjut, pdsa, simar, insiden] = await Promise.all([
    pesanAtau(ringkasanCapaian(pengguna, bulan)),
    pesanAtau(trenRingkasan(pengguna, bulan)),
    bolehVerifikasi(pengguna) ? antreanVerifikasi(pengguna) : null,
    bolehIsiPengukuran(pengguna) ? pengukuranDikembalikan(pengguna) : [],
    pesanAtau(belumDianalisis(pengguna, bulan)),
    daftarTindakLanjut(pengguna, { status: "semua" }),
    daftarPdsa(pengguna),
    // Kesiapan SIMAR bulan lalu untuk pengelola Indikator (yang melapor ke SIMAR).
    bolehKelolaIndikator(pengguna) ? rekapSimar(pengguna) : null,
    ringkasanInsiden(pengguna),
  ]);
  const lewatTenggat = tindakLanjut.filter((t) => t.lewatTenggat).length;
  const mendekatiTenggat = tindakLanjut.filter((t) => t.mendekatiTenggat).length;
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
  const persenDari = (n: number) => (punyaCapaian > 0 ? `${Math.round((n / punyaCapaian) * 100)}%` : null);
  const perluTindakan: { label: string; nilai: number | string; ikon: NamaIkon; nada: Nada; href: string; keterangan?: string }[] = [
    ...(simar
      ? [
          {
            label: `SIMAR ${labelBulan(simar.bulan)}`,
            nilai: `${simar.jumlahSiap}/${simar.baris.length}`,
            keterangan: `INM siap, paling lambat ${labelTanggal(simar.tenggat)}${simar.lewatTenggat ? ", sudah lewat" : ""}`,
            ikon: "simar" as const,
            nada: simar.jumlahSiap === simar.baris.length ? ("pos" as const) : ("warn" as const),
            href: "/simar",
          },
        ]
      : []),
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
    // Insiden: yang menunggu penangan (Kepala Unit, Komite Mutu); Direktur melihat yang masih terbuka.
    ...(menanganiInsiden(pengguna)
      ? [
          { label: "Insiden menunggu Anda", nilai: insiden.menunggu, ikon: "insiden" as const, nada: "warn" as const, href: "/insiden" },
          {
            label: "Insiden lewat tenggat investigasi",
            nilai: insiden.lewatTenggat,
            ikon: "jam" as const,
            nada: insiden.lewatTenggat > 0 ? ("neg" as const) : ("tindak" as const),
            href: "/insiden",
          },
        ]
      : pengguna.peran === "direktur"
        ? [
            {
              label: "Insiden terbuka",
              nilai: insiden.terbuka,
              keterangan: `${insiden.lewatTenggat} lewat tenggat investigasi`,
              ikon: "insiden" as const,
              nada: insiden.lewatTenggat > 0 ? ("neg" as const) : ("tindak" as const),
              href: "/insiden",
            },
          ]
        : []),
    ...(insiden.belumEreport !== null
      ? [
          {
            label: "KTD dan Sentinel belum di e-report",
            nilai: insiden.belumEreport,
            keterangan: "laporan ke Kemenkes",
            ikon: "insiden" as const,
            nada: "warn" as const,
            href: "/insiden?status=semua",
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
    {
      label: "Tindak Lanjut mendekati tenggat",
      nilai: mendekatiTenggat,
      keterangan: `tenggat ≤ ${HARI_MENDEKATI_TENGGAT} hari lagi`,
      ikon: "jam",
      nada: mendekatiTenggat > 0 ? "warn" : "tindak",
      href: "/tindak-lanjut",
    },
    { label: "PDSA berjalan", nilai: pdsa.length, ikon: "pdsa", nada: "pdsa", href: "/pdsa" },
  ];
  return (
    <Halaman>
      <KepalaHalaman
        judul={`Capaian ${labelBulan(ringkasan.bulan)}`}
        sub={`${salam()}, ${pengguna.nama}. ${temuan}`}
        aksi={
          <>
            <form method="get" className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex-none">
              <Input
                name="bulan"
                aria-label="Bulan"
                {...INPUT_BULAN}
                required
                max={bulanBerjalan()}
                defaultValue={ringkasan.bulan}
                className="sm:w-44"
              />
              <Button type="submit" variant="outline" size="lg">
                Tampilkan
              </Button>
            </form>
            {aksi && (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={aksi.href}>
                  <Ikon nama={aksi.ikon} className="size-[18px]" />
                  {aksi.label}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Pemberitahuan>{pemberitahuan}</Pemberitahuan>

      {/* Bacaan bulan ini: satu permukaan dibagi garis rambut; angka Tercapai sebagai bacaan utama. */}
      <section aria-label={`Ringkasan Capaian ${labelBulan(ringkasan.bulan)}`} className="overflow-hidden rounded-card border border-rule bg-rule">
        <div className="grid grid-cols-2 gap-px md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 grid content-between gap-4 bg-paper-2 p-5 sm:p-6 md:col-span-1">
            <p className="text-[14px] font-medium text-ink-2">Indikator Tercapai</p>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="terukur text-[56px] leading-none tracking-[-0.04em] text-ink sm:text-[64px]">
                {jumlah.tercapai}
                <span className="text-ink-3">/{punyaCapaian}</span>
              </span>
              {persenDari(jumlah.tercapai) && <span className="terukur text-[18px] text-ok">{persenDari(jumlah.tercapai)}</span>}
            </p>
            <p className="text-[13px] text-ink-3">
              {jumlah.dinilai} Indikator dinilai, {punyaCapaian} punya Capaian
              {ringkasan.jumlahBelumLengkap.tercapai > 0 && `, ${ringkasan.jumlahBelumLengkap.tercapai} Tercapai di antaranya belum lengkap`}.
            </p>
          </div>
          <Bacaan
            label="Belum Tercapai"
            nilai={jumlah.belumTercapai}
            tambahan={jumlah.belumTercapai > 0 ? persenDari(jumlah.belumTercapai) : null}
            nadaTambahan="text-bad"
            keterangan={
              ringkasan.jumlahBelumLengkap.belumTercapai > 0
                ? `${ringkasan.jumlahBelumLengkap.belumTercapai} di antaranya belum lengkap`
                : "menurut Target dan Arah"
            }
          />
          <Bacaan label="Belum ada Capaian" nilai={jumlah.kosong} keterangan="tanpa Pengukuran Terverifikasi" />
          <Bacaan
            label="Kelengkapan"
            nilai={`${k.terverifikasi}/${k.wajib}`}
            keterangan="Pengukuran Terverifikasi dari yang wajib"
            className="col-span-2 md:col-span-1"
          >
            <BarKemajuan nada="ukur" nilai={k.terverifikasi} dari={k.wajib} />
          </Bacaan>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <Kartu judul="Perlu tindakan" sub="Pekerjaan yang menunggu Anda.">
          <ul className="grid px-2 pb-2">
            {perluTindakan.map((t) => (
              <li key={t.label} className="border-t border-rule first:border-0">
                <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-paper-3">
                  <KotakIkon ikon={t.ikon} kecil />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{t.label}</span>
                    {t.keterangan && <span className="block text-[12px] leading-4 text-ink-3">{t.keterangan}</span>}
                  </span>
                  <span
                    className={`terukur text-[18px] whitespace-nowrap ${t.nilai === 0 ? "text-ink-3" : t.nada === "neg" ? "text-bad" : t.nada === "warn" ? "text-signal" : "text-ink"}`}
                  >
                    {t.nilai}
                  </span>
                  <Ikon nama="kanan" className="size-4 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>
        <Kartu
          judul="Tren Indikator Tercapai"
          sub={`12 bulan sampai ${labelBulan(ringkasan.bulan)}.`}
          aksi={<TautanKecil href={`/monitoring?bulan=${ringkasan.bulan}`}>Buka Monitoring</TautanKecil>}
        >
          <div className="px-5 pb-5">{typeof tren === "string" ? <Pesan>{tren}</Pesan> : <GrafikTercapai data={tren} />}</div>
        </Kartu>
      </div>

      <Kartu
        judul="Capaian per Indikator"
        sub={`${labelBulan(ringkasan.bulan)}. Garis tegak = Target; Belum Tercapai di atas.`}
        aksi={
          // Di HP bertumpuk supaya judul kartu tetap selebar sebelum ada tombol kedua.
          <span className="flex flex-col items-end gap-2 sm:flex-row">
            {!perUnit && (
              // Tautan biasa, bukan `Link`: tujuannya route handler yang mengunduh berkas.
              <Button asChild variant="outline" size="sm">
                <a href={`/rekap-bulanan?bulan=${ringkasan.bulan}`} download>
                  <Ikon nama="unduh" className="size-4" />
                  Unduh CSV
                </a>
              </Button>
            )}
            <TautanKecil href={`/monitoring?bulan=${ringkasan.bulan}`}>Buka Monitoring</TautanKecil>
          </span>
        }
      >
        {urut.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>Belum ada Indikator aktif yang dinilai pada {labelBulan(ringkasan.bulan)}.</Pesan>
          </div>
        ) : (
          <Tabel label="Capaian per Indikator" lebarMin="min-w-[60rem]" tumpuk>
            <TableHeader>
              <TableRow>
                <TableHead>Indikator</TableHead>
                <TableHead>{perUnit ? "Unit" : "Kelengkapan"}</TableHead>
                <TableHead className="w-[20%] min-w-36">Capaian terhadap Target</TableHead>
                <TableHead className="text-right">Capaian</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urut.map(({ indikator: i, unit, capaian, target, status, kelengkapan: kb }) => (
                <TableRow key={`${i.id}-${unit?.id}`}>
                  <TableCell className={`min-w-[17rem] whitespace-normal max-sm:min-w-0 ${TUMPUK.penuh} ${TUMPUK.urut1}`}>
                    <span className="block font-medium">{i.nama}</span>
                    <span className="terukur text-[12px] text-ink-3">{i.kode}</span>
                  </TableCell>
                  <TableCell className={`whitespace-nowrap ${TUMPUK.ujung} ${TUMPUK.urut6}`}>
                    {unit && <span className="block font-medium">{unit.nama}</span>}
                    <span className={`terukur text-[13px] ${kb.terverifikasi < kb.wajib ? "text-signal" : "text-ink-3"}`}>
                      {kb.terverifikasi}/{kb.wajib}
                    </span>
                    <span className={`text-[13px] ${kb.terverifikasi < kb.wajib ? "text-signal" : "text-ink-3"}`}>
                      {kb.terverifikasi < kb.wajib ? " Unit, belum lengkap" : " Unit"}
                    </span>
                  </TableCell>
                  <TableCell className={`${TUMPUK.dua} ${TUMPUK.urut5}`}>
                    <BarTarget capaian={capaian} target={target} satuan={i.satuan} arah={i.arah} tercapai={status === "tercapai"} />
                  </TableCell>
                  <TableCell className={`text-right ${TUMPUK.urut2}`}>
                    {kb.terverifikasi === 0 ? (
                      <span className="text-[13px] text-ink-3">belum ada</span>
                    ) : (
                      <span className="terukur text-[15px] whitespace-nowrap text-ink">{formatCapaian(capaian, i.satuan)}</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right whitespace-nowrap text-ink-3 ${TUMPUK.urut3}`}>
                    {TANDA_ARAH[i.arah]} {formatCapaian(target, i.satuan)}
                  </TableCell>
                  <TableCell className={`${TUMPUK.ujung} ${TUMPUK.urut4}`}>
                    <LabelCapaian status={status} />
                  </TableCell>
                  <TableCell className={`text-right ${TUMPUK.penuh} ${TUMPUK.urut7}`}>
                    <span className="inline-flex items-center gap-3">
                      {belumRs.has(i.id) && unit === null && (
                        <Link href={tautanAnalisis(i.id, null, ringkasan.bulan)} className="text-primary-ink text-[13px] whitespace-nowrap">
                          Tulis Analisis
                        </Link>
                      )}
                      <TautanIkon
                        href={`/monitoring?${new URLSearchParams({ indikator: i.id, bulan: ringkasan.bulan })}`}
                        ikon="lihat"
                        label={`Monitoring ${i.kode}`}
                      />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          {dikembalikan.length > 0 && (
            <Kartu judul="Dikembalikan untuk diperbaiki" sub="Perbaiki lalu ajukan lagi.">
              <Tabel label="Pengukuran dikembalikan" lebarMin="min-w-[32rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Pengukuran</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dikembalikan.slice(0, 5).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="block font-medium">
                          {p.unit.nama}, {labelBulan(p.bulan, { pendek: true })}
                        </span>
                        <span className="terukur text-[12px] text-ink-3">{p.indikator.kode}</span>
                      </TableCell>
                      <TableCell className="text-[14px] whitespace-pre-line text-ink-2">{p.alasan}</TableCell>
                      <TableCell className="text-right">
                        <TautanIkon
                          href={`/pengukuran/isi?${new URLSearchParams({ indikator: p.indikator.id, unit: p.unit.id, bulan: p.bulan })}`}
                          ikon="isi"
                          label={`Perbaiki ${p.indikator.kode}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
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
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indikator</TableHead>
                      <TableHead>Lingkup</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daftarBelum.slice(0, 6).map(({ indikator: i, unit }) => (
                      <TableRow key={`${i.id}-${unit?.id}`}>
                        <TableCell>
                          <span className="block font-medium">{i.nama}</span>
                          <span className="terukur text-[12px] text-ink-3">{i.kode}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{labelLingkup(unit)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={tautanAnalisis(i.id, unit?.id ?? null, belum.bulan)} className="text-primary-ink text-[13px] whitespace-nowrap">
                            {bolehTulisLingkup(pengguna, unit?.id ?? null) ? "Tulis Analisis" : "Lihat Analisis"}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Tabel>
              )}
            </Kartu>
          )}
        </div>
        <Kartu
          judul="Tindak Lanjut"
          sub={`${tindakLanjut.length} Tindak Lanjut, ${lewatTenggat} lewat tenggat.`}
          aksi={<TautanKecil href="/tindak-lanjut?status=semua">Lihat semua</TautanKecil>}
        >
          <div className="px-5 pb-5">
            <Komposisi
              label="Tindak Lanjut menurut status"
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

/** Satu bacaan di permukaan ringkasan: label, angka dalam huruf ukur, keterangan. */
function Bacaan(p: {
  label: string;
  nilai: React.ReactNode;
  tambahan?: string | null;
  nadaTambahan?: string;
  keterangan: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`grid min-w-0 content-between gap-3 bg-paper-2 p-4 sm:p-5 ${p.className ?? ""}`}>
      <p className="text-[14px] font-medium text-ink-2">{p.label}</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="terukur text-[26px] leading-none tracking-[-0.04em] text-ink sm:text-[32px]">{p.nilai}</span>
        {p.tambahan && <span className={`terukur text-[15px] ${p.nadaTambahan ?? "text-ink-3"}`}>{p.tambahan}</span>}
      </p>
      <div>
        <p className="text-[13px] text-ink-3">{p.keterangan}</p>
        {p.children}
      </div>
    </div>
  );
}

/** Tautan kecil di kepala panel, mis. "Buka Monitoring". */
function TautanKecil({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

const NADA_TINDAK_LANJUT = { direncanakan: "netral", berjalan: "tindak", selesai: "pos", dibatalkan: "redup" } as const satisfies Record<
  string,
  Nada
>;
