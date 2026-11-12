import type { Metadata } from "next";

import { waktuSetempat } from "@/lib/bulan";
import { ambilInsiden, type DetailInsiden } from "@/modules/insiden/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { Pesan, pesanAtau } from "../../../pengukuran/status";
import { Halaman, KepalaHalaman } from "../../../ui";
import { FormLaporan, type AwalLaporan } from "../../form-laporan";

export const metadata: Metadata = { title: "Ubah Laporan Insiden" };

/** Laporan tersimpan sebagai isian awal form (teks per nama field). */
const awalDari = (i: DetailInsiden): AwalLaporan => ({
  unitId: i.unit.id,
  unitPenyebabId: i.unitPenyebab?.id ?? "",
  waktuInsiden: waktuSetempat(i.waktuInsiden),
  judul: i.judul,
  kronologi: i.kronologi,
  jenis: i.jenis,
  orangPertama: i.orangPertama,
  tempat: i.tempat,
  pasienInisial: i.pasienInisial ?? "",
  pasienNoRm: i.pasienNoRm ?? "",
  pasienRuangan: i.pasienRuangan,
  umurTahun: i.pasienUmurBulan === null ? "" : String(Math.floor(i.pasienUmurBulan / 12)),
  umurBulan: i.pasienUmurBulan === null ? "" : String(i.pasienUmurBulan % 12),
  jenisKelamin: i.pasienJenisKelamin ?? "",
  penanggungBiaya: i.penanggungBiaya ?? "",
  kategoriPasien: i.kategoriPasien ?? "",
  spesialisasi: i.spesialisasi ?? "",
  tanggalMasuk: i.tanggalMasuk ? waktuSetempat(i.tanggalMasuk) : "",
  akibat: i.akibat,
  tindakanSegera: i.tindakanSegera,
  tindakanOleh: i.tindakanOleh,
  pernahTerjadi: i.pernahTerjadi ? "ya" : "tidak",
  pernahTerjadiKeterangan: i.pernahTerjadiKeterangan,
});

/** Mengubah laporan: hanya Pembuat Laporan selama Dilaporkan (aturannya di service; di sini hanya tampilan). */
export default async function HalamanUbahLaporan({ params }: PageProps<"/insiden/[id]/ubah">) {
  const pengguna = await requireUser();
  const i = await pesanAtau(ambilInsiden(pengguna, (await params).id));
  if (typeof i === "string") return <Pesan>{i}</Pesan>;
  if (!i.boleh.ubah) return <Pesan>Laporan hanya bisa diubah Pembuat Laporan-nya selama belum digrading.</Pesan>;
  const unit = await pilihanUnit(pengguna);
  return (
    <Halaman>
      <KepalaHalaman
        judul="Ubah laporan"
        kembali={[
          { href: "/insiden", label: "Insiden" },
          { href: `/insiden/${i.id}`, label: i.judul },
        ]}
        sub="Laporan bisa diubah sampai digrading oleh Kepala Unit atau Komite Mutu."
      />
      <section aria-label="Laporan Insiden" className="rounded-card border border-rule bg-card p-5 sm:p-6">
        <FormLaporan id={i.id} unit={unit.map((u) => ({ id: u.id, label: u.nama }))} awal={awalDari(i)} maksWaktu={waktuSetempat(new Date())} />
      </section>
    </Halaman>
  );
}
