"use client";

import Link from "next/link";
import { useActionState } from "react";

import { kelasArea, kelasInput, kelasLabel, kelasPetunjuk, Kolom, PesanError, Segmen, tombolGaris, tombolUtama } from "../form";
import type { NamaIkon } from "../ikon";
import { KotakIkon, type Nada } from "../ui";

import { INPUT_BULAN } from "@/lib/bulan";
import { ARAH, FIELD_CARA_HITUNG, FREKUENSI, LABEL_ARAH, LABEL_FREKUENSI } from "@/lib/indikator";
import type { Indikator } from "@/modules/indikator/service";

import {
  akhiriUnitPelaporAction,
  aturAktifIndikatorAction,
  hapusUnitPelaporAction,
  tambahIndikatorAction,
  tambahUnitPelaporAction,
  tetapkanTargetAction,
  ubahIndikatorAction,
} from "./actions";

/** Bagian form bertepi: mengelompokkan isian yang berhubungan, judulnya diberi kotak ikon kecil. */
const kelasBagian = "grid min-w-0 gap-4 rounded-2xl border border-border p-4 sm:p-5";

function JudulBagian({ nada, ikon, children }: { nada: Nada; ikon: NamaIkon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3 text-[16px] font-bold">
      <KotakIkon nada={nada} ikon={ikon} kecil />
      {children}
    </span>
  );
}

/** Tombol kecil bertepi untuk aksi satu baris (Akhiri, Hapus). */
const tombolBaris =
  "inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold hover:bg-active disabled:opacity-60 pointer-coarse:h-11";

/**
 * Formulir tambah IMP (tanpa `indikator`) atau ubah Indikator. Kode, kelompok, dan Target awal hanya diisi saat
 * menambah; setelah itu kode dan kelompok tetap. `bulanIni` = bulan bawaan Target awal. `terkunci` = Indikator sudah
 * punya Pengukuran: field cara hitung tampil terkunci (tetap dikirim dengan nilai lamanya).
 */
export function FormIndikator({ indikator, bulanIni, terkunci = false }: { indikator?: Indikator; bulanIni?: string; terkunci?: boolean }) {
  const [state, action, pending] = useActionState(indikator ? ubahIndikatorAction : tambahIndikatorAction, {});
  const awal = (nama: keyof Indikator, bawaan = "") => state.nilai?.[nama] ?? String(indikator?.[nama] ?? bawaan);
  const kunci = (nama: keyof Indikator) => terkunci && nama in FIELD_CARA_HITUNG;
  const kelasKunci = (nama: keyof Indikator) => (kunci(nama) ? " bg-active! text-muted-foreground" : "");

  const teks = (nama: keyof Indikator, label: string, petunjuk?: string) => (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <textarea
        id={nama}
        name={nama}
        required
        rows={3}
        readOnly={kunci(nama)}
        defaultValue={awal(nama)}
        className={`${kelasArea}${kelasKunci(nama)}`}
      />
    </Kolom>
  );

  /**
   * Pilihan sedikit sebagai segmen. Saat terkunci segmennya disabled (tidak terkirim), nilainya dikirim lewat input
   * tersembunyi. `key` = pilihan bawaan supaya pilihan yang ditolak tetap terpilih setelah form di-reset.
   */
  const pilihan = (nama: "arah" | "frekuensi", judul: string, bawaan: string, opsi: readonly string[], label: Record<string, string>) => (
    <div className="grid gap-1">
      <Segmen
        key={awal(nama, bawaan)}
        nama={nama}
        label={judul}
        pilihan={opsi.map((o) => ({ nilai: o, label: label[o] }))}
        nilai={awal(nama, bawaan)}
        wajib
        disabled={kunci(nama)}
      />
      {kunci(nama) && <input type="hidden" name={nama} value={awal(nama)} />}
    </div>
  );

  return (
    <form action={action} className="grid gap-5">
      <PesanError pesan={state.error} />
      {terkunci && (
        <p className="rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-[14px]">
          <strong className="font-semibold">Cara hitung terkunci.</strong> Indikator ini sudah punya Pengukuran, jadi faktor, satuan, Arah,
          definisi N dan D, serta Frekuensi tidak bisa diubah supaya tren tidak mencampur dua cara hitung. Untuk mengubahnya,{" "}
          <Link href="/indikator/baru" className="font-semibold text-primary-ink hover:underline">
            buat Indikator baru
          </Link>{" "}
          lalu nonaktifkan Indikator ini. Nama, definisi operasional, Sumber Data, dan PIC tetap bisa diubah.
        </p>
      )}
      {indikator ? (
        <input type="hidden" name="id" value={indikator.id} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Kolom label="Kode" htmlFor="kode" petunjuk="Unik, mis. IMP-RS-01. Tidak bisa diubah setelah disimpan.">
            <input id="kode" name="kode" required maxLength={32} defaultValue={state.nilai?.kode} className={`${kelasInput} font-mono`} />
          </Kolom>
          <Segmen
            key={state.nilai?.kelompok}
            nama="kelompok"
            label="Kelompok (INM sudah tersedia sesuai PMK 30/2022)"
            pilihan={[
              { nilai: "IMP-RS", label: "IMP-RS" },
              { nilai: "IMP-Unit", label: "IMP-Unit" },
            ]}
            nilai={state.nilai?.kelompok ?? "IMP-RS"}
            wajib
          />
        </div>
      )}
      <Kolom label="Nama" htmlFor="nama">
        <input id="nama" name="nama" required maxLength={200} defaultValue={awal("nama")} className={kelasInput} />
      </Kolom>
      <div className={kelasBagian}>
        <p>
          <JudulBagian nada="brand" ikon="dokumen">
            Definisi
          </JudulBagian>
        </p>
        {teks("definisiOperasional", "Definisi operasional", "Termasuk kriteria eksklusi.")}
        <div className="grid gap-4 md:grid-cols-2">
          {teks("definisiNumerator", "Definisi Numerator (N)")}
          {teks("definisiDenominator", "Definisi Denominator (D)")}
        </div>
        {teks("sumberData", "Sumber Data", "Asal data N dan D, mis. rekam medis atau lembar observasi.")}
      </div>
      <div className={`${kelasBagian} sm:grid-cols-2`}>
        <p className="sm:col-span-2">
          <JudulBagian nada="ukur" ikon="monitoring">
            Cara hitung
          </JudulBagian>
        </p>
        <Kolom label="Faktor" htmlFor="faktor" petunjuk="Capaian = N/D × faktor: 100 persen, 1 rata-rata, 1000 per seribu.">
          <input
            id="faktor"
            name="faktor"
            required
            inputMode="numeric"
            readOnly={kunci("faktor")}
            defaultValue={awal("faktor", "100")}
            className={`${kelasInput}${kelasKunci("faktor")}`}
          />
        </Kolom>
        <Kolom label="Satuan" htmlFor="satuan">
          <input
            id="satuan"
            name="satuan"
            required
            maxLength={32}
            readOnly={kunci("satuan")}
            defaultValue={awal("satuan", "%")}
            className={`${kelasInput}${kelasKunci("satuan")}`}
          />
        </Kolom>
        {pilihan("arah", "Arah", "makinTinggi", ARAH, LABEL_ARAH)}
        {pilihan("frekuensi", "Frekuensi (Semesteran: Juni dan Desember)", "bulanan", FREKUENSI, LABEL_FREKUENSI)}
      </div>
      <Kolom label="PIC (opsional)" htmlFor="pic" petunjuk="Nama atau jabatan penanggung jawab Indikator.">
        <input id="pic" name="pic" maxLength={120} defaultValue={awal("pic")} className={kelasInput} />
      </Kolom>
      {!indikator && (
        <fieldset className={`${kelasBagian} sm:grid-cols-2`}>
          <legend className="float-left w-full sm:col-span-2">
            <JudulBagian nada="pantau" ikon="target">
              Target awal
            </JudulBagian>
          </legend>
          <Kolom label="Nilai Target" htmlFor="targetNilai" petunjuk="Angka desimal memakai koma, mis. 76,61.">
            <input
              id="targetNilai"
              name="targetNilai"
              required
              inputMode="decimal"
              defaultValue={state.nilai?.targetNilai}
              className={kelasInput}
            />
          </Kolom>
          <Kolom label="Berlaku mulai" htmlFor="targetBerlakuMulai" petunjuk="Target pertama juga berlaku untuk bulan-bulan sebelumnya.">
            <input
              id="targetBerlakuMulai"
              name="targetBerlakuMulai"
              {...INPUT_BULAN}
              required
              defaultValue={state.nilai?.targetBerlakuMulai ?? bulanIni}
              className={kelasInput}
            />
          </Kolom>
        </fieldset>
      )}
      <div className="grid gap-2 sm:flex">
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
    <form action={action} className="grid w-full gap-2 sm:w-auto">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktif" value={String(!aktif)} />
      <button type="submit" disabled={pending} className={tombolGaris}>
        {aktif ? "Nonaktifkan" : "Aktifkan kembali"}
      </button>
      <PesanError pesan={state.error} />
    </form>
  );
}

/** Form tetapkan Target di detail Indikator. `bulanIni` = bulan mulai berlaku bawaan. */
export function FormTarget({ indikatorId, bulanIni }: { indikatorId: string; bulanIni: string }) {
  const [state, action, pending] = useActionState(tetapkanTargetAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="indikatorId" value={indikatorId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom label="Nilai Target" htmlFor="targetNilai" petunjuk="Angka desimal memakai koma, mis. 76,61.">
          <input
            id="targetNilai"
            name="targetNilai"
            required
            inputMode="decimal"
            defaultValue={state.nilai?.targetNilai}
            className={kelasInput}
          />
        </Kolom>
        <Kolom
          label="Berlaku mulai"
          htmlFor="targetBerlakuMulai"
          petunjuk="Bulan sebelumnya tetap memakai Target lama. Bila bulan ini sudah punya Target, nilainya diganti."
        >
          <input
            id="targetBerlakuMulai"
            name="targetBerlakuMulai"
            {...INPUT_BULAN}
            required
            defaultValue={state.nilai?.targetBerlakuMulai ?? bulanIni}
            className={kelasInput}
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Tetapkan Target"}
      </button>
    </form>
  );
}

/** Form tambah Unit Pelapor di detail Indikator. `unit` = pilihan Unit aktif, `bulanIni` = bulan mulai bawaan. */
export function FormUnitPelapor({
  indikatorId,
  unit,
  bulanIni,
}: {
  indikatorId: string;
  unit: { id: string; nama: string }[];
  bulanIni: string;
}) {
  const [state, action, pending] = useActionState(tambahUnitPelaporAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="indikatorId" value={indikatorId} />
      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div className="sm:col-span-2">
          <Kolom label="Unit" htmlFor="unitId">
            {/* key: pilihan Unit yang ditolak tetap terpilih setelah form di-reset (lihat `pilihan` di FormIndikator). */}
            <select
              key={state.nilai?.unitId}
              id="unitId"
              name="unitId"
              required
              defaultValue={state.nilai?.unitId ?? ""}
              className={kelasInput}
            >
              <option value="" disabled>
                Pilih Unit
              </option>
              {unit.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama}
                </option>
              ))}
            </select>
          </Kolom>
        </div>
        <Kolom label="Bulan mulai" htmlFor="bulanMulai">
          <input
            id="bulanMulai"
            name="bulanMulai"
            {...INPUT_BULAN}
            required
            defaultValue={state.nilai?.bulanMulai ?? bulanIni}
            className={kelasInput}
          />
        </Kolom>
        <Kolom label="Bulan berhenti (opsional)" htmlFor="bulanBerhenti" petunjuk="Kosongkan bila masih berlangsung.">
          <input
            id="bulanBerhenti"
            name="bulanBerhenti"
            {...INPUT_BULAN}
            defaultValue={state.nilai?.bulanBerhenti}
            className={kelasInput}
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Tambah Unit Pelapor"}
      </button>
    </form>
  );
}

/** Aksi pengelola untuk satu periode Unit Pelapor: mengakhiri (mengisi bulan berhenti) atau menghapus salah input. */
export function AksiUnitPelapor({ id, namaUnit, bulanBerhenti }: { id: string; namaUnit: string; bulanBerhenti: string | null }) {
  const [akhiri, akhiriAction, akhiriPending] = useActionState(akhiriUnitPelaporAction, {});
  const [hapus, hapusAction, hapusPending] = useActionState(hapusUnitPelaporAction, {});
  const idBerhenti = `berhenti-${id}`;
  return (
    // Saat form Akhiri terbuka, aksi pindah ke baris sendiri selebar daftar (lihat daftar Unit Pelapor di halaman detail).
    <div className="grid min-w-0 gap-2 sm:has-[details[open]]:col-span-2">
      <div className="flex flex-wrap items-start gap-2">
        <details className="group">
          <summary
            className={`${tombolBaris} list-none group-open:border-primary group-open:text-primary-ink [&::-webkit-details-marker]:hidden`}
          >
            {bulanBerhenti ? "Ubah bulan berhenti" : "Akhiri"}
          </summary>
          <form action={akhiriAction} className="mt-3 grid max-w-md gap-1.5">
            <input type="hidden" name="id" value={id} />
            <label htmlFor={idBerhenti} className={kelasLabel}>
              Bulan berhenti
            </label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id={idBerhenti}
                name="bulanBerhenti"
                {...INPUT_BULAN}
                required
                defaultValue={akhiri.nilai?.bulanBerhenti ?? bulanBerhenti ?? ""}
                className={kelasInput}
              />
              <button type="submit" disabled={akhiriPending} className={tombolUtama}>
                Simpan
              </button>
            </div>
            <p className={kelasPetunjuk}>Masih wajib melapor pada bulan ini, tidak lagi mulai bulan berikutnya.</p>
            <PesanError pesan={akhiri.error} />
          </form>
        </details>
        <form
          action={hapusAction}
          onSubmit={(e) => {
            if (!confirm(`Hapus periode Unit Pelapor ${namaUnit}? Hapus hanya untuk koreksi salah input.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={hapusPending}
            className={`${tombolBaris} text-danger-ink hover:border-danger-border hover:bg-danger-soft`}
          >
            Hapus
          </button>
        </form>
      </div>
      <PesanError pesan={hapus.error} />
    </div>
  );
}
