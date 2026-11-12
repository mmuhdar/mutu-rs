import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { hariIni, labelTanggal } from "@/lib/bulan";
import {
  dampakAkibat,
  JENIS_EREPORT,
  kelompokUmur,
  LABEL_AKIBAT_INSIDEN,
  LABEL_FAKTOR_KONTRIBUTOR,
  LABEL_JENIS_INSIDEN,
  LABEL_JENIS_KELAMIN,
  LABEL_KATEGORI_PASIEN,
  LABEL_ORANG_PERTAMA,
  LABEL_PENANGGUNG_BIAYA,
  LABEL_SPESIALISASI,
  LABEL_TINDAKAN_OLEH,
  LABEL_TIPE_INSIDEN,
  labelUmur,
  STATUS_INSIDEN_TERBUKA,
  warnaGrading,
} from "@/lib/insiden";
import { ambilInsiden, type DetailInsiden } from "@/modules/insiden/service";
import { requireUser } from "@/server/sesi";

import { Ikon } from "../../ikon";
import { formatWaktu, Pemberitahuan, Pesan, pesanAtau } from "../../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Pil } from "../../ui";
import { FormBukanInsiden, FormEreport, FormGrading, FormInvestigasi, FormTinjau } from "../form-penanganan";
import { LabelStatusInsiden, LabelWarna } from "../label";

export const metadata: Metadata = { title: "Detail Insiden" };

/** Baris rekaman berlabel: label di kiri, isi di kanan (bertumpuk di layar sempit), dipisah garis rambut. */
function Rekaman({ baris }: { baris: [string, React.ReactNode][] }) {
  return (
    <dl className="grid border-t border-rule">
      {baris.map(([label, isi]) => (
        <div key={label} className="grid min-w-0 gap-1 border-b border-rule px-5 py-3 last:border-0 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
          <dt className="text-[14px] text-ink-3">{label}</dt>
          <dd className="max-w-[72ch] text-[15px] leading-6 break-words whitespace-pre-line">{isi || <span className="text-ink-3">tidak diisi</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Isi Formulir 1 yang tersimpan. */
function barisLaporan(i: DetailInsiden): [string, React.ReactNode][] {
  const pasien = [i.pasienInisial, i.pasienNoRm && `No. RM ${i.pasienNoRm}`, i.pasienRuangan].filter(Boolean).join(", ");
  return [
    ["Jenis insiden", LABEL_JENIS_INSIDEN[i.jenis]],
    ["Waktu insiden", <span key="w" className="terukur text-[14px] text-cool">{formatWaktu(i.waktuInsiden)}</span>],
    ["Kronologi", i.kronologi],
    ["Akibat terhadap pasien", LABEL_AKIBAT_INSIDEN[i.akibat]],
    ["Orang pertama yang melaporkan", LABEL_ORANG_PERTAMA[i.orangPertama]],
    ["Tempat insiden", i.tempat],
    ["Unit tempat insiden", i.unit.nama],
    ["Unit penyebab", i.unitPenyebab?.nama ?? "tidak diketahui"],
    ["Pasien", pasien],
    ["Umur", i.pasienUmurBulan === null ? "" : `${labelUmur(i.pasienUmurBulan)} (${kelompokUmur(i.pasienUmurBulan)})`],
    ["Jenis kelamin", i.pasienJenisKelamin ? LABEL_JENIS_KELAMIN[i.pasienJenisKelamin] : ""],
    ["Insiden menyangkut pasien", i.kategoriPasien ? LABEL_KATEGORI_PASIEN[i.kategoriPasien] : ""],
    ["Penanggung biaya", i.penanggungBiaya ? LABEL_PENANGGUNG_BIAYA[i.penanggungBiaya] : ""],
    ["Spesialisasi kasus", i.spesialisasi ? LABEL_SPESIALISASI[i.spesialisasi] : ""],
    ["Tanggal masuk", i.tanggalMasuk && <span key="m" className="terukur text-[14px] text-cool">{formatWaktu(i.tanggalMasuk)}</span>],
    ["Tindakan segera dan hasilnya", i.tindakanSegera],
    ["Tindakan dilakukan oleh", LABEL_TINDAKAN_OLEH[i.tindakanOleh]],
    ["Pernah terjadi di unit kerja lain", i.pernahTerjadi ? `Ya. ${i.pernahTerjadiKeterangan}` : "Tidak"],
    ...(JENIS_EREPORT.includes(i.jenis)
      ? ([["e-Report Kemenkes", i.ereportPada ? `Dikirim ${labelTanggal(i.ereportPada)}` : "belum dicatat"]] as [string, string][])
      : []),
  ];
}

/** Langkah berikutnya menurut status: form bila aktor boleh, selain itu siapa yang sedang ditunggu. */
function LangkahBerikutnya({ i }: { i: DetailInsiden }) {
  const versi = i.diubahPada.toISOString();
  const grading = i.dampak && i.probabilitas ? { dampak: i.dampak, probabilitas: i.probabilitas } : null;
  const tenggat = i.tenggat && (
    <span className="flex flex-wrap items-center gap-2">
      Paling lambat {labelTanggal(i.tenggat)}
      {i.lewatTenggat && <Pil nada="neg">Lewat tenggat</Pil>}
      {i.mendekatiTenggat && <Pil nada="warn">Mendekati tenggat</Pil>}
    </span>
  );
  const isi = (judul: string, sub: React.ReactNode, form: React.ReactNode) => (
    <Kartu judul={judul} sub={sub}>
      <div className="px-5 pb-5">{form}</div>
    </Kartu>
  );
  switch (i.status) {
    case "dilaporkan":
      return i.boleh.grading ? (
        isi(
          "Grading",
          "Oleh atasan langsung (Kepala Unit) atau Komite Mutu.",
          <FormGrading
            key={versi}
            id={i.id}
            petunjuk={`Akibat menurut laporan: ${LABEL_AKIBAT_INSIDEN[i.akibat]}, sejajar dengan dampak ${dampakAkibat(i.akibat)}.`}
          />,
        )
      ) : (
        <Pesan>Menunggu grading oleh Kepala Unit {i.unit.nama} atau Komite Mutu.</Pesan>
      );
    case "investigasi":
      return i.boleh.investigasi ? (
        isi("Investigasi Sederhana", tenggat, <FormInvestigasi key={versi} id={i.id} awal={i.investigasi} rca={false} grading={grading} />)
      ) : (
        <Pesan>Menunggu Investigasi Sederhana oleh Kepala Unit {i.unit.nama}{i.tenggat ? `, paling lambat ${labelTanggal(i.tenggat)}` : ""}.</Pesan>
      );
    case "ditinjau":
      return i.boleh.tinjau ? (
        isi("Tinjauan Komite Mutu", "Periksa hasil Investigasi Sederhana di bawah, lalu tetapkan grading akhir.", <FormTinjau key={versi} id={i.id} grading={grading} />)
      ) : (
        <Pesan>Hasil Investigasi Sederhana menunggu tinjauan Komite Mutu.</Pesan>
      );
    case "rca":
      return i.boleh.investigasi ? (
        isi("RCA", tenggat, <FormInvestigasi key={versi} id={i.id} awal={i.investigasi} rca grading={grading} />)
      ) : (
        <Pesan>RCA oleh Komite Mutu{i.tenggat ? `, paling lambat ${labelTanggal(i.tenggat)}` : ""}.</Pesan>
      );
    default:
      return null;
  }
}

/** Riwayat Status Insiden sebagai jejak: perpindahan, grading yang ditetapkan, pelaku (amber), waktu (cool), catatan. */
function Riwayat({ riwayat }: { riwayat: DetailInsiden["riwayat"] }) {
  return (
    <Kartu judul="Riwayat Status">
      <ol className="mx-5 mb-5 grid border-l border-rule-2">
        {riwayat.map((r, n) => (
          <li key={n} className="grid gap-1 py-3 pl-4 first:pt-0 last:pb-0">
            <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
              {r.statusAsal ? (
                <>
                  <LabelStatusInsiden status={r.statusAsal} />
                  menjadi
                </>
              ) : (
                "Laporan dibuat,"
              )}
              <LabelStatusInsiden status={r.statusTujuan} />
            </span>
            {r.dampak && r.probabilitas && (
              <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
                Grading <LabelWarna warna={warnaGrading(r.dampak, r.probabilitas)} />
                <span>
                  dampak <span className="terukur text-ink-2">{r.dampak}</span>, probabilitas <span className="terukur text-ink-2">{r.probabilitas}</span>
                </span>
              </span>
            )}
            <span className="text-[13px]">
              <span className="text-signal">{r.oleh}</span> <span className="terukur text-cool">{formatWaktu(r.waktu)}</span>
            </span>
            {r.catatan && <span className="block text-[14px] whitespace-pre-line">{r.statusTujuan === "bukanInsiden" ? "Alasan" : "Catatan"}: {r.catatan}</span>}
          </li>
        ))}
      </ol>
    </Kartu>
  );
}

/**
 * Detail Insiden: langkah berikutnya (form sesuai status dan hak dari service), isi laporan, hasil investigasi, Riwayat
 * Status, dan alat Komite Mutu (e-Report, Bukan Insiden). Hak baca dan semua aturan di service.
 */
export default async function HalamanDetailInsiden({ params }: PageProps<"/insiden/[id]">) {
  const pengguna = await requireUser();
  const i = await pesanAtau(ambilInsiden(pengguna, (await params).id));
  if (typeof i === "string") return <Pesan>{i}</Pesan>;
  const terbuka = STATUS_INSIDEN_TERBUKA.includes(i.status);
  // Hasil investigasi dibaca di kartu sendiri bila tidak sedang diisi lewat form.
  const tampilInvestigasi = i.investigasi && !i.boleh.investigasi;

  return (
    <Halaman>
      <KepalaHalaman
        judul={i.judul}
        kembali={[{ href: "/insiden", label: "Insiden" }]}
        meta={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <LabelStatusInsiden status={i.status} />
            {i.warna && <LabelWarna warna={i.warna} />}
            <span>
              {LABEL_JENIS_INSIDEN[i.jenis]}, Unit {i.unit.nama}, <span className="terukur text-[13px] text-cool">{formatWaktu(i.waktuInsiden)}</span>
            </span>
          </span>
        }
        sub={
          <>
            Dilaporkan oleh <span className="text-signal">{i.pembuat}</span>,{" "}
            <span className="terukur text-[14px] text-cool">{formatWaktu(i.dilaporkanPada)}</span>
            {i.terlambatDilaporkan && ", lewat dari 2×24 jam setelah insiden"}.
          </>
        }
        aksi={
          i.boleh.ubah && (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href={`/insiden/${i.id}/ubah`}>
                <Ikon nama="isi" className="size-[18px]" />
                Ubah laporan
              </Link>
            </Button>
          )
        }
      />

      {i.jenis === "sentinel" && terbuka && (
        <Pemberitahuan>
          Kejadian Sentinel: RCA oleh Komite Mutu paling lama 45 hari. Bila berdampak luas, laporkan juga lewat telepon ke Kemenkes paling lama
          1 jam setelah diketahui.
        </Pemberitahuan>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          <LangkahBerikutnya i={i} />
          {tampilInvestigasi && i.investigasi && (
            <Kartu judul={i.status === "selesai" ? "Hasil investigasi" : "Investigasi"}>
              <Rekaman
                baris={[
                  ["Tipe insiden", LABEL_TIPE_INSIDEN[i.investigasi.tipeInsiden]],
                  ["Faktor kontributor", i.investigasi.faktorKontributor.map((f) => LABEL_FAKTOR_KONTRIBUTOR[f]).join(", ")],
                  ["Penyebab langsung", i.investigasi.penyebabLangsung],
                  ["Akar masalah", i.investigasi.akarMasalah],
                  ["Rekomendasi", i.investigasi.rekomendasi],
                ]}
              />
            </Kartu>
          )}
          <Kartu judul="Laporan" sub="Rahasia; bukan alat bukti hukum dan bukan untuk menyalahkan (PMK 11/2017 Pasal 16 dan 21).">
            <Rekaman baris={barisLaporan(i)} />
          </Kartu>
        </div>
        <div className="grid min-w-0 gap-5">
          <Riwayat riwayat={i.riwayat} />
          {i.boleh.ereport && (
            <Kartu
              judul="e-Report Kemenkes"
              sub="KTD dan Kejadian Sentinel dilaporkan ke mutufasyankes.kemkes.go.id (Log In RS (IKP)). MutuRS hanya mencatat tanggalnya."
            >
              <div className="px-5 pb-5">
                <FormEreport key={i.ereportPada} id={i.id} tanggal={i.ereportPada} maks={hariIni()} />
              </div>
            </Kartu>
          )}
          {i.boleh.bukanInsiden && (
            <Kartu judul="Bukan Insiden" sub="Untuk laporan yang ternyata bukan insiden keselamatan pasien. Status ini final.">
              <Collapsible className="group/bukan grid gap-4 px-5 pb-5">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-self-start sm:w-auto">
                    Tandai Bukan Insiden
                    <Ikon nama="bawah" className="size-4 text-ink-3 group-data-[state=open]/bukan:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <FormBukanInsiden id={i.id} />
                </CollapsibleContent>
              </Collapsible>
            </Kartu>
          )}
        </div>
      </div>
    </Halaman>
  );
}
