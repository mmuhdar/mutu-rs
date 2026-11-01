"use client";

import Link from "next/link";
import { useActionState } from "react";

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

const kelasInput =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring";
const kelasBaris = `${kelasInput} h-10 pointer-coarse:h-11`;
const kelasTombol = "h-10 shrink-0 rounded-md px-4 font-semibold disabled:opacity-70 pointer-coarse:h-11";
const tombolUtama = `${kelasTombol} bg-primary text-primary-foreground hover:bg-primary-hover`;
const tombolGaris = `${kelasTombol} inline-flex items-center border border-border hover:bg-background`;

function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
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
 * menambah; setelah itu kode dan kelompok tetap. `bulanIni` = bulan bawaan Target awal. `terkunci` = Indikator sudah
 * punya Pengukuran: field cara hitung tampil terkunci (tetap dikirim dengan nilai lamanya).
 */
export function FormIndikator({
  indikator,
  bulanIni,
  terkunci = false,
}: {
  indikator?: Indikator;
  bulanIni?: string;
  terkunci?: boolean;
}) {
  const [state, action, pending] = useActionState(indikator ? ubahIndikatorAction : tambahIndikatorAction, {});
  const awal = (nama: keyof Indikator, bawaan = "") => state.nilai?.[nama] ?? String(indikator?.[nama] ?? bawaan);
  const kunci = (nama: keyof Indikator) => terkunci && nama in FIELD_CARA_HITUNG;
  const kelasKunci = (nama: keyof Indikator) => (kunci(nama) ? " bg-background text-muted-foreground" : "");

  const teks = (nama: keyof Indikator, label: string, petunjuk?: string) => (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <textarea
        id={nama}
        name={nama}
        required
        rows={3}
        readOnly={kunci(nama)}
        defaultValue={awal(nama)}
        className={`${kelasInput} py-2${kelasKunci(nama)}`}
      />
    </Kolom>
  );

  /**
   * Select tidak punya readOnly: saat terkunci dibuat disabled, nilainya dikirim lewat input tersembunyi. `key` = pilihan
   * bawaan: React tidak memperbarui pilihan bawaan select yang sudah ada, jadi select dibuat ulang supaya pilihan yang
   * ditolak tetap terpilih setelah form di-reset.
   */
  const pilihan = (nama: "arah" | "frekuensi", bawaan: string, opsi: readonly string[], label: Record<string, string>) => (
    <>
      <select
        key={awal(nama, bawaan)}
        id={nama}
        name={kunci(nama) ? undefined : nama}
        disabled={kunci(nama)}
        defaultValue={awal(nama, bawaan)}
        className={`${kelasBaris}${kelasKunci(nama)}`}
      >
        {opsi.map((o) => (
          <option key={o} value={o}>
            {label[o]}
          </option>
        ))}
      </select>
      {kunci(nama) && <input type="hidden" name={nama} value={awal(nama)} />}
    </>
  );

  return (
    <form action={action} className="grid gap-4">
      <PesanError pesan={state.error} />
      {terkunci && (
        <p className="rounded-md border border-border bg-background px-3 py-2.5 text-[13px]">
          <strong className="font-semibold">Cara hitung terkunci.</strong> Indikator ini sudah punya Pengukuran, jadi
          faktor, satuan, Arah, definisi N dan D, serta Frekuensi tidak bisa diubah supaya tren tidak mencampur dua cara
          hitung. Untuk mengubahnya,{" "}
          <Link href="/indikator/baru" className="font-medium text-accent hover:underline">
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
            <input id="kode" name="kode" required maxLength={32} defaultValue={state.nilai?.kode} className={kelasBaris} />
          </Kolom>
          <Kolom label="Kelompok" htmlFor="kelompok" petunjuk="INM sudah tersedia sesuai PMK 30/2022.">
            <select
              key={state.nilai?.kelompok}
              id="kelompok"
              name="kelompok"
              defaultValue={state.nilai?.kelompok ?? "IMP-RS"}
              className={kelasBaris}
            >
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
            readOnly={kunci("faktor")}
            defaultValue={awal("faktor", "100")}
            className={`${kelasBaris}${kelasKunci("faktor")}`}
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
            className={`${kelasBaris}${kelasKunci("satuan")}`}
          />
        </Kolom>
        <Kolom label="Arah" htmlFor="arah">
          {pilihan("arah", "makinTinggi", ARAH, LABEL_ARAH)}
        </Kolom>
        <Kolom label="Frekuensi" htmlFor="frekuensi" petunjuk="Semesteran diisi pada bulan Juni dan Desember.">
          {pilihan("frekuensi", "bulanan", FREKUENSI, LABEL_FREKUENSI)}
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
              {...INPUT_BULAN}
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
            className={kelasBaris}
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
            className={kelasBaris}
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={`${tombolUtama} w-fit`}>
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
      <div className="grid gap-3 sm:grid-cols-3">
        <Kolom label="Unit" htmlFor="unitId">
          {/* key: pilihan Unit yang ditolak tetap terpilih setelah form di-reset (lihat `pilihan` di FormIndikator). */}
          <select
            key={state.nilai?.unitId}
            id="unitId"
            name="unitId"
            required
            defaultValue={state.nilai?.unitId ?? ""}
            className={kelasBaris}
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
        <Kolom label="Bulan mulai" htmlFor="bulanMulai">
          <input
            id="bulanMulai"
            name="bulanMulai"
            {...INPUT_BULAN}
            required
            defaultValue={state.nilai?.bulanMulai ?? bulanIni}
            className={kelasBaris}
          />
        </Kolom>
        <Kolom label="Bulan berhenti (opsional)" htmlFor="bulanBerhenti" petunjuk="Kosongkan bila masih berlangsung.">
          <input
            id="bulanBerhenti"
            name="bulanBerhenti"
            {...INPUT_BULAN}
            defaultValue={state.nilai?.bulanBerhenti}
            className={kelasBaris}
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={`${tombolUtama} w-fit`}>
        {pending ? "Menyimpan…" : "Tambah Unit Pelapor"}
      </button>
    </form>
  );
}

/** Aksi pengelola untuk satu periode Unit Pelapor: mengakhiri (mengisi bulan berhenti) atau menghapus salah input. */
export function AksiUnitPelapor({
  id,
  namaUnit,
  bulanBerhenti,
}: {
  id: string;
  namaUnit: string;
  bulanBerhenti: string | null;
}) {
  const [akhiri, akhiriAction, akhiriPending] = useActionState(akhiriUnitPelaporAction, {});
  const [hapus, hapusAction, hapusPending] = useActionState(hapusUnitPelaporAction, {});
  const idBerhenti = `berhenti-${id}`;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <details>
          <summary className="cursor-pointer text-[13px] font-medium text-accent pointer-coarse:py-2">
            {bulanBerhenti ? "Ubah bulan berhenti" : "Akhiri"}
          </summary>
          <form action={akhiriAction} className="mt-2 grid gap-1.5">
            <input type="hidden" name="id" value={id} />
            <label htmlFor={idBerhenti} className="text-[13px] font-medium">
              Bulan berhenti
            </label>
            <div className="flex gap-2">
              <input
                id={idBerhenti}
                name="bulanBerhenti"
                {...INPUT_BULAN}
                required
                defaultValue={akhiri.nilai?.bulanBerhenti ?? bulanBerhenti ?? ""}
                className={kelasBaris}
              />
              <button type="submit" disabled={akhiriPending} className={tombolUtama}>
                Simpan
              </button>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Masih wajib melapor pada bulan ini, tidak lagi mulai bulan berikutnya.
            </p>
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
            className="text-[13px] font-medium text-danger hover:underline disabled:opacity-70 pointer-coarse:py-2"
          >
            Hapus
          </button>
        </form>
      </div>
      <PesanError pesan={hapus.error} />
    </div>
  );
}
