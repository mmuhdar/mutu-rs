import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelTanggal } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_EFEKTIVITAS, LABEL_KATEGORI_RISIKO } from "@/lib/risiko";
import { bolehBacaLingkup } from "@/modules/perbaikan/service";
import { bolehTambahRisiko, daftarRisiko, tahunBerjalan, tahunMaksRisiko, tahunRisikoValid } from "@/modules/risiko/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Kolom } from "../form";
import { Ikon } from "../ikon";
import { Pesan, pesanAtau } from "../pengukuran/status";
import { PilihCari } from "../pilih-cari";
import { Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow, TautanIkon } from "../ui";
import { LabelTurun, Penilaian } from "./label";

export const metadata: Metadata = { title: "Register Risiko" };

/**
 * Register Risiko satu tahun: satu Unit (`?unit=`) atau semua Unit yang terbaca, urut Unit lalu Nilai Risiko awal
 * tertinggi. Tahun di luar 2000 sampai tahun berjalan + 1 kembali ke tahun berjalan.
 */
export default async function HalamanRisiko({ searchParams }: PageProps<"/risiko">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const dariAlamat = Number(teksAlamat(sp, "tahun"));
  const tahun = tahunRisikoValid(dariAlamat) ? dariAlamat : tahunBerjalan();
  const unitId = teksAlamat(sp, "unit");
  const [daftar, unit] = await Promise.all([
    pesanAtau(daftarRisiko(pengguna, { tahun, unitId: unitId || undefined })),
    pilihanUnit(pengguna),
  ]);
  if (typeof daftar === "string") return <Pesan>{daftar}</Pesan>;
  const terbaca = unit.filter((u) => bolehBacaLingkup(pengguna, u.id));
  // Unit nonaktif tidak ada di pilihan; namanya dari Risiko-nya, atau "nonaktif" bila tahun itu kosong.
  const namaUnit = unitId ? (terbaca.find((u) => u.id === unitId)?.nama ?? daftar[0]?.unit.nama ?? "nonaktif") : undefined;
  const baru = `/risiko/baru?${new URLSearchParams({ tahun: String(tahun), ...(unitId && { unit: unitId }) })}`;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Register Risiko"
        sub="Risiko setiap Unit per tahun: Penilaian Awal, Perlakuan, Hasil Pemantauan, dan simpulannya."
        aksi={
          (daftar.length > 0 || bolehTambahRisiko(pengguna)) && (
            <>
              {daftar.length > 0 && (
                // Tautan biasa, bukan `Link`: tujuannya route handler yang mengunduh berkas.
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <a href={`/risiko/unduh?${new URLSearchParams({ tahun: String(tahun), ...(unitId && { unit: unitId }) })}`} download>
                    <Ikon nama="unduh" className="size-[18px]" />
                    Unduh Excel
                  </a>
                </Button>
              )}
              {bolehTambahRisiko(pengguna) && (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={baru}>
                    <Ikon nama="tambah" className="size-[18px]" />
                    Tambah Risiko
                  </Link>
                </Button>
              )}
            </>
          )
        }
      >
        <form method="get" className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-end">
          <Kolom label="Tahun" htmlFor="tahun">
            <Input id="tahun" name="tahun" type="number" inputMode="numeric" min={2000} max={tahunMaksRisiko()} required defaultValue={tahun} />
          </Kolom>
          <Kolom label="Unit" htmlFor="unit">
            <PilihCari
              key={unitId}
              id="unit"
              nama="unit"
              nilai={unitId}
              cari="Cari Unit…"
              pilihan={[{ nilai: "", label: "Semua Unit" }, ...terbaca.map((u) => ({ nilai: u.id, label: u.nama }))]}
            />
          </Kolom>
          <Button type="submit" variant="outline" size="lg" className="w-full sm:w-auto">
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>

      <Kartu judul={`${namaUnit ? `Unit ${namaUnit}` : "Semua Unit"}, ${tahun}`} sub={`${daftar.length} risiko.`}>
        {daftar.length === 0 ? (
          <div className="px-5 pb-5">
            <Pesan>Belum ada Risiko yang tercatat untuk tahun ini.</Pesan>
          </div>
        ) : (
          <Tabel label={`Register Risiko ${tahun}`} lebarMin="min-w-[72rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Risiko</TableHead>
                {!unitId && <TableHead>Unit</TableHead>}
                <TableHead>Penilaian Awal</TableHead>
                <TableHead className="text-right">Prioritas</TableHead>
                <TableHead>Perlakuan</TableHead>
                <TableHead>Hasil Pemantauan</TableHead>
                <TableHead>Simpulan</TableHead>
                <TableHead className="text-right">Dokumen</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="min-w-64 whitespace-normal">
                    <span className="block text-[14px] leading-5">{r.uraian}</span>
                    <span className="text-[12px] text-ink-3">{LABEL_KATEGORI_RISIKO[r.kategori]}</span>
                  </TableCell>
                  {!unitId && <TableCell className="text-[14px] whitespace-nowrap">{r.unit.nama}</TableCell>}
                  <TableCell>
                    <Penilaian n={r.awal} />
                  </TableCell>
                  <TableCell className="terukur text-right text-[15px]">{r.awal.prioritas}</TableCell>
                  <TableCell className="text-[14px] whitespace-nowrap">
                    <span className="block">
                      <span className="terukur">{r.daftarPerlakuan.length}</span> langkah
                    </span>
                    <span className="text-[12px] text-ink-3">{r.jadwal ? labelTanggal(r.jadwal) : "tanpa jadwal"}</span>
                  </TableCell>
                  <TableCell>
                    <Penilaian n={r.pemantauan} />
                  </TableCell>
                  <TableCell>
                    <span className="grid justify-items-start gap-1">
                      <LabelTurun turun={r.turun} />
                      {r.efektivitas && <span className="text-[13px] text-ink-2">{LABEL_EFEKTIVITAS[r.efektivitas]}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="terukur text-right text-[15px]">{r.jumlahDokumen}</TableCell>
                  <TableCell className="text-right">
                    <TautanIkon href={`/risiko/${r.id}`} ikon="lihat" label={`Buka Risiko ${r.uraian.slice(0, 40)}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Tabel>
        )}
      </Kartu>
    </Halaman>
  );
}
