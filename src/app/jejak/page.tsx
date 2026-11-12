import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teksAlamat } from "@/lib/form";
import { ENTITAS_JEJAK, LABEL_ENTITAS_JEJAK } from "@/lib/jejak";
import { BATAS_JEJAK, daftarJejak } from "@/modules/jejak/service";
import { requireUser } from "@/server/sesi";

import { Kolom } from "../form";
import { PilihCari } from "../pilih-cari";
import { formatWaktu, Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Tabel, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui";

export const metadata: Metadata = { title: "Jejak Audit" };

/**
 * Jejak Audit (`?entitas=&dari=&sampai=`): siapa mengubah apa dan kapan, terbaru di atas, paling banyak `BATAS_JEJAK`
 * baris. Admin Sistem dan Komite Mutu; saringan dan hak baca diperiksa service.
 */
export default async function HalamanJejak({ searchParams }: PageProps<"/jejak">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const saringan = { entitas: teksAlamat(sp, "entitas"), dari: teksAlamat(sp, "dari"), sampai: teksAlamat(sp, "sampai") };
  const daftar = await pesanAtau(daftarJejak(pengguna, saringan));
  return (
    <Halaman>
      <KepalaHalaman judul="Jejak Audit" sub="Siapa mengubah data apa dan kapan. Hanya ditambah, tidak pernah diubah atau dihapus.">
        <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_repeat(2,minmax(0,11rem))_auto] sm:items-end">
          <Kolom label="Jenis data" htmlFor="entitas">
            {/* key: pilihan saringan mengikuti alamat. */}
            <PilihCari
              key={saringan.entitas}
              id="entitas"
              nama="entitas"
              nilai={saringan.entitas}
              cari="Cari jenis data…"
              pilihan={[{ nilai: "", label: "Semua" }, ...ENTITAS_JEJAK.map((e) => ({ nilai: e, label: LABEL_ENTITAS_JEJAK[e] }))]}
            />
          </Kolom>
          <Kolom label="Dari tanggal" htmlFor="dari">
            <Input id="dari" name="dari" type="date" defaultValue={saringan.dari} />
          </Kolom>
          <Kolom label="Sampai tanggal" htmlFor="sampai">
            <Input id="sampai" name="sampai" type="date" defaultValue={saringan.sampai} />
          </Kolom>
          <Button type="submit" variant="outline" size="lg" className="w-full sm:w-auto">
            Tampilkan
          </Button>
        </form>
      </KepalaHalaman>
      {typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : (
        <Kartu
          judul="Perubahan"
          sub={daftar.length === BATAS_JEJAK ? `${BATAS_JEJAK} perubahan terbaru; persempit saringan untuk melihat yang lebih lama.` : `${daftar.length} perubahan.`}
        >
          {daftar.length === 0 ? (
            <div className="px-5 pb-5">
              <Pesan>Tidak ada perubahan dengan saringan ini.</Pesan>
            </div>
          ) : (
            <Tabel label="Jejak Audit" lebarMin="min-w-[48rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="terukur text-[13px] whitespace-nowrap text-cool">{formatWaktu(j.waktu)}</TableCell>
                    <TableCell className="text-[14px] whitespace-nowrap">
                      {j.oleh ? <span className="text-signal">{j.oleh}</span> : <span className="text-ink-3">tanpa sesi</span>}
                    </TableCell>
                    <TableCell className="text-[14px] whitespace-nowrap text-ink-2">{LABEL_ENTITAS_JEJAK[j.entitas]}</TableCell>
                    <TableCell className="min-w-72 text-[14px] whitespace-normal">{j.ringkasan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabel>
          )}
        </Kartu>
      )}
    </Halaman>
  );
}
