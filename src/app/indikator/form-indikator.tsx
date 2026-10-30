"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ARAH, FREKUENSI, LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import type { Indikator } from "@/modules/indikator/service";

import { aturAktifIndikatorAction, tambahIndikatorAction, ubahIndikatorAction } from "./actions";

const kelasInput =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring";
const kelasBaris = `${kelasInput} h-10 pointer-coarse:h-11`;
const kelasTombol = "h-10 shrink-0 rounded-md px-4 font-semibold disabled:opacity-70 pointer-coarse:h-11";
const tombolUtama = `${kelasTombol} bg-primary text-primary-foreground hover:bg-primary-hover`;
const tombolGaris = `${kelasTombol} inline-flex items-center border border-border hover:bg-background`;

function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
      {pesan}
    </p>
  ) : null;
}

function Kolom({ label, htmlFor, petunjuk, children }: { label: string; htmlFor: string; petunjuk?: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {petunjuk && <p className="text-[12.5px] text-muted-foreground">{petunjuk}</p>}
    </div>
  );
}

/**
 * Formulir tambah IMP (tanpa `indikator`) atau ubah Indikator. Kode, kelompok, dan Target awal hanya diisi saat
 * menambah; setelah itu kode dan kelompok tetap. `bulanIni` = bulan bawaan Target awal.
 */
export function FormIndikator({ indikator, bulanIni }: { indikator?: Indikator; bulanIni?: string }) {
  const [state, action, pending] = useActionState(indikator ? ubahIndikatorAction : tambahIndikatorAction, {});
  const awal = (nama: keyof Indikator, bawaan = "") => state.nilai?.[nama] ?? String(indikator?.[nama] ?? bawaan);

  const teks = (nama: keyof Indikator, label: string, petunjuk?: string) => (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <textarea id={nama} name={nama} required rows={3} defaultValue={awal(nama)} className={`${kelasInput} py-2`} />
    </Kolom>
  );

  return (
    <form action={action} className="grid gap-4">
      <PesanError pesan={state.error} />
      {indikator ? (
        <input type="hidden" name="id" value={indikator.id} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Kolom label="Kode" htmlFor="kode" petunjuk="Unik, mis. IMP-RS-01. Tidak bisa diubah setelah disimpan.">
            <input id="kode" name="kode" required maxLength={32} defaultValue={state.nilai?.kode} className={kelasBaris} />
          </Kolom>
          <Kolom label="Kelompok" htmlFor="kelompok" petunjuk="INM sudah tersedia sesuai PMK 30/2022.">
            <select id="kelompok" name="kelompok" defaultValue={state.nilai?.kelompok ?? "IMP-RS"} className={kelasBaris}>
              <option value="IMP-RS">IMP-RS</option>
              <option value="IMP-Unit">IMP-Unit</option>
            </select>
          </Kolom>
        </div>
      )}
      <Kolom label="Nama" htmlFor="nama">
        <input id="nama" name="nama" required maxLength={200} defaultValue={awal("nama")} className={kelasBaris} />
      </Kolom>
      {teks("definisiOperasional", "Definisi operasional", "Termasuk kriteria eksklusi.")}
      {teks("definisiNumerator", "Definisi Numerator (N)")}
      {teks("definisiDenominator", "Definisi Denominator (D)")}
      {teks("sumberData", "Sumber Data", "Asal data N dan D, mis. rekam medis atau lembar observasi.")}
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Faktor" htmlFor="faktor" petunjuk="Capaian = N/D × faktor: 100 persen, 1 rata-rata, 1000 per seribu.">
          <input
            id="faktor"
            name="faktor"
            required
            inputMode="numeric"
            defaultValue={awal("faktor", "100")}
            className={kelasBaris}
          />
        </Kolom>
        <Kolom label="Satuan" htmlFor="satuan">
          <input id="satuan" name="satuan" required maxLength={32} defaultValue={awal("satuan", "%")} className={kelasBaris} />
        </Kolom>
        <Kolom label="Arah" htmlFor="arah">
          <select id="arah" name="arah" defaultValue={awal("arah", "makinTinggi")} className={kelasBaris}>
            {ARAH.map((a) => (
              <option key={a} value={a}>
                {LABEL_ARAH[a]}
              </option>
            ))}
          </select>
        </Kolom>
        <Kolom label="Frekuensi" htmlFor="frekuensi" petunjuk="Semesteran diisi pada bulan Juni dan Desember.">
          <select id="frekuensi" name="frekuensi" defaultValue={awal("frekuensi", "bulanan")} className={kelasBaris}>
            {FREKUENSI.map((f) => (
              <option key={f} value={f}>
                {LABEL_FREKUENSI[f]}
              </option>
            ))}
          </select>
        </Kolom>
      </div>
      <Kolom label="PIC (opsional)" htmlFor="pic" petunjuk="Nama atau jabatan penanggung jawab Indikator.">
        <input id="pic" name="pic" maxLength={120} defaultValue={awal("pic")} className={kelasBaris} />
      </Kolom>
      {!indikator && (
        <fieldset className="grid gap-4 rounded-md border border-border p-3 sm:grid-cols-2">
          <legend className="px-1 text-[13px] font-semibold">Target awal</legend>
          <Kolom label="Nilai Target" htmlFor="targetNilai" petunjuk="Angka desimal memakai koma, mis. 76,61.">
            <input
              id="targetNilai"
              name="targetNilai"
              required
              inputMode="decimal"
              defaultValue={state.nilai?.targetNilai}
              className={kelasBaris}
            />
          </Kolom>
          <Kolom label="Berlaku mulai" htmlFor="targetBerlakuMulai" petunjuk="Target pertama juga berlaku untuk bulan-bulan sebelumnya.">
            <input
              id="targetBerlakuMulai"
              name="targetBerlakuMulai"
              type="month"
              required
              defaultValue={state.nilai?.targetBerlakuMulai ?? bulanIni}
              className={kelasBaris}
            />
          </Kolom>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link href={indikator ? `/indikator/${indikator.id}` : "/indikator"} className={tombolGaris}>
          Batal
        </Link>
      </div>
    </form>
  );
}

/** Tombol Nonaktifkan / Aktifkan kembali di detail Indikator. */
export function TombolAktif({ id, aktif }: { id: string; aktif: boolean }) {
  const [state, action, pending] = useActionState(aturAktifIndikatorAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktif" value={String(!aktif)} />
      <button type="submit" disabled={pending} className={tombolGaris}>
        {aktif ? "Nonaktifkan" : "Aktifkan kembali"}
      </button>
      <PesanError pesan={state.error} />
    </form>
  );
}
