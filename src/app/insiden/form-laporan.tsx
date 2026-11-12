"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AKIBAT_INSIDEN,
  DEFINISI_JENIS_INSIDEN,
  JENIS_INSIDEN,
  JENIS_KELAMIN,
  KATEGORI_PASIEN,
  LABEL_AKIBAT_INSIDEN,
  LABEL_JENIS_INSIDEN,
  LABEL_JENIS_KELAMIN,
  LABEL_KATEGORI_PASIEN,
  LABEL_ORANG_PERTAMA,
  LABEL_PENANGGUNG_BIAYA,
  LABEL_SPESIALISASI,
  LABEL_TINDAKAN_OLEH,
  ORANG_PERTAMA,
  PENANGGUNG_BIAYA,
  SPESIALISASI,
  TINDAKAN_OLEH,
} from "@/lib/insiden";

import { kelasPetunjuk, Kolom, PesanError, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";
import { laporAction, ubahLaporanAction } from "./actions";

/** Isian awal form laporan: nama field → nilai teks (dari laporan tersimpan atau dari isian yang ditolak). */
export type AwalLaporan = Partial<Record<string, string>>;

const opsi = <K extends string>(daftar: readonly K[], label: Record<K, string>) => daftar.map((k) => ({ nilai: k, label: label[k] }));

/** Satu baris form: judul dan petunjuk di kiri, isian di kanan (bertumpuk di layar sempit), dipisah garis rambut. */
function Baris(p: { label: string; htmlFor?: string; petunjuk?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-rule py-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <div className="grid content-start gap-1">
        {p.htmlFor ? (
          <Label htmlFor={p.htmlFor} className="font-medium">
            {p.label}
          </Label>
        ) : (
          <p className="text-sm font-medium">{p.label}</p>
        )}
        {p.petunjuk && <p className={kelasPetunjuk}>{p.petunjuk}</p>}
      </div>
      <div className="grid min-w-0 content-start gap-3">{p.children}</div>
    </div>
  );
}

/** Judul bagian form (Insiden, Data pasien, Tindakan). */
function Bagian({ judul, sub, children }: { judul: string; sub?: string; children: React.ReactNode }) {
  return (
    <section aria-label={judul} className="grid">
      <h2 className="border-b border-rule pb-2 font-display text-[19px] font-medium tracking-[-0.01em]">{judul}</h2>
      {sub && <p className={`${kelasPetunjuk} border-b border-rule py-2`}>{sub}</p>}
      {children}
    </section>
  );
}

/**
 * Form laporan Insiden (isian Formulir 1 PMK 11/2017), untuk melapor maupun mengubah (`id`). Pilihan dari daftar =
 * `PilihCari`, pilihan sedikit = `Segmen`. Data pasien tidak `required` di browser karena KPC boleh tanpa data pasien;
 * service yang memeriksanya.
 */
export function FormLaporan(p: { id?: string; unit: { id: string; label: string }[]; awal: AwalLaporan; maksWaktu: string }) {
  const [state, action, pending] = useActionState(p.id ? ubahLaporanAction : laporAction, {});
  const a = { ...p.awal, ...state.nilai };
  const pilihUnit = p.unit.map((u) => ({ nilai: u.id, label: u.label }));
  return (
    <form action={action} className="grid gap-8">
      {p.id && <input type="hidden" name="id" value={p.id} />}

      <Bagian judul="Insiden">
        <Baris label="Unit tempat insiden" htmlFor="unitId" petunjuk="Kepala Unit dari Unit ini yang menggrading laporan.">
          {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
          <PilihCari key={a.unitId} id="unitId" nama="unitId" wajib nilai={a.unitId} placeholder="Pilih Unit" cari="Cari Unit…" pilihan={pilihUnit} />
        </Baris>
        <Baris label="Waktu insiden" htmlFor="waktuInsiden" petunjuk="Laporkan paling lambat 2×24 jam setelah insiden.">
          <Input id="waktuInsiden" name="waktuInsiden" type="datetime-local" required max={p.maksWaktu} defaultValue={a.waktuInsiden} className="sm:max-w-64" />
        </Baris>
        <Baris label="Insiden" htmlFor="judul" petunjuk="Singkat, tanpa nama pasien. Mis. Pasien jatuh dari tempat tidur.">
          <Input id="judul" name="judul" required maxLength={200} defaultValue={a.judul} className="text-[16px]" />
        </Baris>
        <Baris label="Kronologi" htmlFor="kronologi" petunjuk="Urutan kejadian sebenarnya, bukan pendapat atau asumsi pelapor.">
          <Textarea id="kronologi" name="kronologi" rows={5} required maxLength={4000} defaultValue={a.kronologi} className="leading-6" />
        </Baris>
        <Baris label="Jenis insiden" petunjuk="Menurut PMK 11/2017 Pasal 14 dan 15.">
          <Segmen key={a.jenis} nama="jenis" label="Jenis insiden" labelTersembunyi pilihan={opsi(JENIS_INSIDEN, LABEL_JENIS_INSIDEN)} nilai={a.jenis} wajib />
          <dl className="grid gap-1 text-[13px] leading-5 text-ink-3">
            {JENIS_INSIDEN.map((j) => (
              <div key={j}>
                <dt className="inline font-medium text-ink-2">{LABEL_JENIS_INSIDEN[j]}</dt>: <dd className="inline">{DEFINISI_JENIS_INSIDEN[j]}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[13px] leading-5 text-ink">
            Kejadian Sentinel yang berdampak luas (diberitakan media, menyangkut tokoh publik, atau melibatkan fasilitas lain) juga
            dilaporkan lewat telepon ke Kemenkes paling lama 1 jam setelah diketahui.
          </p>
        </Baris>
        <Baris label="Akibat terhadap pasien" htmlFor="akibat" petunjuk="KPC, KNC, dan KTC tidak menimbulkan cedera.">
          <PilihCari
            key={a.akibat}
            id="akibat"
            nama="akibat"
            wajib
            nilai={a.akibat}
            placeholder="Pilih akibat"
            cari="Cari akibat…"
            pilihan={opsi(AKIBAT_INSIDEN, LABEL_AKIBAT_INSIDEN)}
          />
        </Baris>
        <Baris label="Orang pertama yang melaporkan" htmlFor="orangPertama" petunjuk="Siapa yang pertama melaporkan, walau bukan Anda yang mengisi.">
          <PilihCari
            key={a.orangPertama}
            id="orangPertama"
            nama="orangPertama"
            wajib
            nilai={a.orangPertama}
            placeholder="Pilih pelapor pertama"
            cari="Cari…"
            pilihan={opsi(ORANG_PERTAMA, LABEL_ORANG_PERTAMA)}
          />
        </Baris>
        <Baris label="Tempat insiden" htmlFor="tempat" petunjuk="Lokasi pasien berada saat insiden.">
          <Input id="tempat" name="tempat" required maxLength={120} defaultValue={a.tempat} />
        </Baris>
        <Baris label="Unit penyebab" htmlFor="unitPenyebabId" petunjuk="Unit atau departemen terkait yang menyebabkan insiden, bila diketahui.">
          <PilihCari
            key={a.unitPenyebabId}
            id="unitPenyebabId"
            nama="unitPenyebabId"
            nilai={a.unitPenyebabId ?? ""}
            cari="Cari Unit…"
            pilihan={[{ nilai: "", label: "Tidak diketahui" }, ...pilihUnit]}
          />
        </Baris>
      </Bagian>

      <Bagian
        judul="Data pasien"
        sub="Wajib, kecuali untuk KPC. Nama cukup inisial. Insiden pada karyawan, pengunjung, atau keluarga dilaporkan ke K3 RS, bukan di sini."
      >
        <div className="grid gap-5 border-b border-rule py-4 sm:grid-cols-2">
          <Kolom label="Inisial" htmlFor="pasienInisial" petunjuk="Mis. Tn AR, Ny SY">
            <Input id="pasienInisial" name="pasienInisial" maxLength={20} defaultValue={a.pasienInisial} />
          </Kolom>
          <Kolom label="No. RM" htmlFor="pasienNoRm">
            <Input id="pasienNoRm" name="pasienNoRm" maxLength={30} defaultValue={a.pasienNoRm} />
          </Kolom>
          <Kolom label="Ruangan" htmlFor="pasienRuangan" petunjuk="Nama ruangan dan nomor kamar (opsional)">
            <Input id="pasienRuangan" name="pasienRuangan" maxLength={80} defaultValue={a.pasienRuangan} />
          </Kolom>
          <Kolom label="Tanggal masuk" htmlFor="tanggalMasuk" petunjuk="Masuk RS atau mendapat pelayanan (opsional)">
            <Input id="tanggalMasuk" name="tanggalMasuk" type="datetime-local" max={p.maksWaktu} defaultValue={a.tanggalMasuk} />
          </Kolom>
          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="text-sm font-medium">Umur</legend>
            <p className={kelasPetunjuk}>Kelompok umur dihitung otomatis.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input name="umurTahun" aria-label="Umur, tahun" placeholder="tahun" type="number" inputMode="numeric" min={0} max={150} defaultValue={a.umurTahun} />
              <Input name="umurBulan" aria-label="Umur, bulan" placeholder="bulan" type="number" inputMode="numeric" min={0} max={11} defaultValue={a.umurBulan} />
            </div>
          </fieldset>
          <Segmen key={a.jenisKelamin} nama="jenisKelamin" label="Jenis kelamin" pilihan={opsi(JENIS_KELAMIN, LABEL_JENIS_KELAMIN)} nilai={a.jenisKelamin} />
          <Kolom label="Penanggung biaya" htmlFor="penanggungBiaya">
            <PilihCari
              key={a.penanggungBiaya}
              id="penanggungBiaya"
              nama="penanggungBiaya"
              nilai={a.penanggungBiaya}
              placeholder="Pilih penanggung biaya"
              cari="Cari…"
              pilihan={opsi(PENANGGUNG_BIAYA, LABEL_PENANGGUNG_BIAYA)}
            />
          </Kolom>
          <Kolom label="Spesialisasi kasus" htmlFor="spesialisasi">
            <PilihCari
              key={a.spesialisasi}
              id="spesialisasi"
              nama="spesialisasi"
              nilai={a.spesialisasi}
              placeholder="Pilih spesialisasi"
              cari="Cari spesialisasi…"
              pilihan={opsi(SPESIALISASI, LABEL_SPESIALISASI)}
            />
          </Kolom>
          <div className="sm:col-span-2">
            <Segmen
              key={a.kategoriPasien}
              nama="kategoriPasien"
              label="Insiden menyangkut pasien"
              pilihan={opsi(KATEGORI_PASIEN, LABEL_KATEGORI_PASIEN)}
              nilai={a.kategoriPasien}
            />
          </div>
        </div>
      </Bagian>

      <Bagian judul="Tindakan">
        <Baris label="Tindakan segera dan hasilnya" htmlFor="tindakanSegera">
          <Textarea id="tindakanSegera" name="tindakanSegera" rows={4} required maxLength={4000} defaultValue={a.tindakanSegera} className="leading-6" />
        </Baris>
        <Baris label="Tindakan dilakukan oleh">
          <Segmen
            key={a.tindakanOleh}
            nama="tindakanOleh"
            label="Tindakan dilakukan oleh"
            labelTersembunyi
            pilihan={opsi(TINDAKAN_OLEH, LABEL_TINDAKAN_OLEH)}
            nilai={a.tindakanOleh}
            wajib
          />
        </Baris>
        <Baris label="Pernah terjadi di unit kerja lain?">
          <Segmen
            key={a.pernahTerjadi}
            nama="pernahTerjadi"
            label="Pernah terjadi di unit kerja lain?"
            labelTersembunyi
            pilihan={[
              { nilai: "tidak", label: "Tidak" },
              { nilai: "ya", label: "Ya" },
            ]}
            nilai={a.pernahTerjadi}
            wajib
          />
          <Kolom label="Bila ya: kapan, dan langkah yang diambil unit itu" htmlFor="pernahTerjadiKeterangan">
            <Textarea
              id="pernahTerjadiKeterangan"
              name="pernahTerjadiKeterangan"
              rows={2}
              maxLength={1000}
              defaultValue={a.pernahTerjadiKeterangan}
              className="leading-6"
            />
          </Kolom>
        </Baris>
      </Bagian>

      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : p.id ? "Simpan perubahan" : "Kirim laporan"}
      </Button>
    </form>
  );
}
