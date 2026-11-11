"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { kelasPetunjuk, Kolom, PesanError, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";

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

/**
 * Bagian form: satu kolom isian di bawah garis rambut, judulnya `legend` (bukan kotak bertepi di dalam panel). Legend
 * di-float supaya menjadi isi grid biasa dan garis atas fieldset tidak terputus olehnya.
 */
function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-5 border-t border-rule pt-6">
      <legend className="float-left w-full font-display text-[17px] font-medium tracking-[-0.01em]">{judul}</legend>
      {children}
    </fieldset>
  );
}

/** Tombol kecil bertepi untuk aksi satu baris (Akhiri, Hapus); lebih tinggi di layar sentuh. */
const kelasTombolBaris = "shadow-none pointer-coarse:h-11";

/**
 * Formulir tambah IMP (tanpa `indikator`) atau ubah Indikator. Kode, kelompok, dan Target awal hanya diisi saat
 * menambah; setelah itu kode dan kelompok tetap. `bulanIni` = bulan bawaan Target awal. `terkunci` = Indikator sudah
 * punya Pengukuran: field cara hitung tampil terkunci (tetap dikirim dengan nilai lamanya).
 */
export function FormIndikator({ indikator, bulanIni, terkunci = false }: { indikator?: Indikator; bulanIni?: string; terkunci?: boolean }) {
  const [state, action, pending] = useActionState(indikator ? ubahIndikatorAction : tambahIndikatorAction, {});
  const awal = (nama: keyof Indikator, bawaan = "") => state.nilai?.[nama] ?? String(indikator?.[nama] ?? bawaan);
  const kunci = (nama: keyof Indikator) => terkunci && nama in FIELD_CARA_HITUNG;
  // Terkunci: rata dengan panel (bukan cekung seperti isian yang bisa diketik), teks redup.
  const kelasKunci = (nama: keyof Indikator) => (kunci(nama) ? "cursor-not-allowed bg-paper-2! text-ink-3" : "");

  const teks = (nama: keyof Indikator, label: string, petunjuk?: string) => (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <Textarea
        id={nama}
        name={nama}
        required
        rows={3}
        readOnly={kunci(nama)}
        defaultValue={awal(nama)}
        className={`leading-6 ${kelasKunci(nama)}`}
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
    <form action={action} className="grid gap-6">
      <PesanError pesan={state.error} />
      {terkunci && (
        <p className="rounded-md bg-paper-3 px-4 py-3.5 text-[14px] leading-6 text-ink-2">
          <strong className="font-medium text-ink">Cara hitung terkunci.</strong> Indikator ini sudah punya Pengukuran, jadi faktor, satuan, Arah,
          definisi N dan D, serta Frekuensi tidak bisa diubah supaya tren tidak mencampur dua cara hitung. Untuk mengubahnya,{" "}
          <Link href="/indikator/baru" className="text-primary-ink">
            buat Indikator baru
          </Link>{" "}
          lalu nonaktifkan Indikator ini. Nama, definisi operasional, Sumber Data, dan PIC tetap bisa diubah.
        </p>
      )}
      <div className="grid min-w-0 gap-5">
        {indikator ? (
          <input type="hidden" name="id" value={indikator.id} />
        ) : (
          <>
            <Kolom label="Kode" htmlFor="kode" petunjuk="Unik, mis. IMP-RS-01. Tidak bisa diubah setelah disimpan.">
              <Input id="kode" name="kode" required maxLength={32} defaultValue={state.nilai?.kode} className="terukur sm:max-w-[16rem]" />
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
          </>
        )}
        <Kolom label="Nama" htmlFor="nama">
          <Input id="nama" name="nama" required maxLength={200} defaultValue={awal("nama")} />
        </Kolom>
        <Kolom label="PIC (opsional)" htmlFor="pic" petunjuk="Nama atau jabatan penanggung jawab Indikator.">
          <Input id="pic" name="pic" maxLength={120} defaultValue={awal("pic")} />
        </Kolom>
      </div>
      <Bagian judul="Definisi">
        {teks("definisiOperasional", "Definisi operasional", "Termasuk kriteria eksklusi.")}
        {teks("definisiNumerator", "Definisi Numerator (N)")}
        {teks("definisiDenominator", "Definisi Denominator (D)")}
        {teks("sumberData", "Sumber Data", "Asal data N dan D, mis. rekam medis atau lembar observasi.")}
      </Bagian>
      <Bagian judul="Cara hitung">
        <Kolom label="Faktor" htmlFor="faktor" petunjuk="Capaian = N/D × faktor: 100 persen, 1 rata-rata, 1000 per seribu.">
          <Input
            id="faktor"
            name="faktor"
            required
            inputMode="numeric"
            readOnly={kunci("faktor")}
            defaultValue={awal("faktor", "100")}
            className={`sm:max-w-[12rem] ${kelasKunci("faktor")}`}
          />
        </Kolom>
        <Kolom label="Satuan" htmlFor="satuan">
          <Input
            id="satuan"
            name="satuan"
            required
            maxLength={32}
            readOnly={kunci("satuan")}
            defaultValue={awal("satuan", "%")}
            className={`sm:max-w-[12rem] ${kelasKunci("satuan")}`}
          />
        </Kolom>
        {pilihan("arah", "Arah", "makinTinggi", ARAH, LABEL_ARAH)}
        {pilihan("frekuensi", "Frekuensi (Semesteran: Juni dan Desember)", "bulanan", FREKUENSI, LABEL_FREKUENSI)}
      </Bagian>
      {!indikator && (
        <Bagian judul="Target awal">
          <Kolom label="Nilai Target" htmlFor="targetNilai" petunjuk="Angka desimal memakai koma, mis. 76,61.">
            <Input
              id="targetNilai"
              name="targetNilai"
              required
              inputMode="decimal"
              defaultValue={state.nilai?.targetNilai}
              className="sm:max-w-[12rem]"
            />
          </Kolom>
          <Kolom label="Berlaku mulai" htmlFor="targetBerlakuMulai" petunjuk="Target pertama juga berlaku untuk bulan-bulan sebelumnya.">
            <Input
              id="targetBerlakuMulai"
              name="targetBerlakuMulai"
              {...INPUT_BULAN}
              required
              defaultValue={state.nilai?.targetBerlakuMulai ?? bulanIni}
              className="sm:max-w-[12rem]"
            />
          </Kolom>
        </Bagian>
      )}
      <div className="grid gap-2 border-t border-rule pt-6 sm:flex">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href={indikator ? `/indikator/${indikator.id}` : "/indikator"}>Batal</Link>
        </Button>
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
      <Button type="submit" variant="outline" size="lg" disabled={pending}>
        {aktif ? "Nonaktifkan" : "Aktifkan kembali"}
      </Button>
      <PesanError pesan={state.error} />
    </form>
  );
}

/** Form tetapkan Target di detail Indikator. `bulanIni` = bulan mulai berlaku bawaan. */
export function FormTarget({ indikatorId, bulanIni }: { indikatorId: string; bulanIni: string }) {
  const [state, action, pending] = useActionState(tetapkanTargetAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="indikatorId" value={indikatorId} />
      <div className="grid gap-4">
        <Kolom label="Nilai Target" htmlFor="targetNilai" petunjuk="Angka desimal memakai koma, mis. 76,61.">
          <Input
            id="targetNilai"
            name="targetNilai"
            required
            inputMode="decimal"
            defaultValue={state.nilai?.targetNilai}
            className="sm:max-w-[12rem]"
          />
        </Kolom>
        <Kolom
          label="Berlaku mulai"
          htmlFor="targetBerlakuMulai"
          petunjuk="Bulan sebelumnya tetap memakai Target lama. Bila bulan ini sudah punya Target, nilainya diganti."
        >
          <Input
            id="targetBerlakuMulai"
            name="targetBerlakuMulai"
            {...INPUT_BULAN}
            required
            defaultValue={state.nilai?.targetBerlakuMulai ?? bulanIni}
            className="sm:max-w-[12rem]"
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Tetapkan Target"}
      </Button>
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
    <form action={action} className="grid gap-4">
      <input type="hidden" name="indikatorId" value={indikatorId} />
      <div className="grid gap-4">
        <div>
          <Kolom label="Unit" htmlFor="unitId">
            {/* key: pilihan Unit yang ditolak tetap terpilih setelah form di-reset (lihat `pilihan` di FormIndikator). */}
            <PilihCari
              key={state.nilai?.unitId}
              id="unitId"
              nama="unitId"
              wajib
              nilai={state.nilai?.unitId ?? ""}
              placeholder="Pilih Unit"
              cari="Cari Unit…"
              pilihan={unit.map((u) => ({ nilai: u.id, label: u.nama }))}
            />
          </Kolom>
        </div>
        <Kolom label="Bulan mulai" htmlFor="bulanMulai">
          <Input
            id="bulanMulai"
            name="bulanMulai"
            {...INPUT_BULAN}
            required
            defaultValue={state.nilai?.bulanMulai ?? bulanIni}
            className="sm:max-w-[12rem]"
          />
        </Kolom>
        <Kolom label="Bulan berhenti (opsional)" htmlFor="bulanBerhenti" petunjuk="Kosongkan bila masih berlangsung.">
          <Input
            id="bulanBerhenti"
            name="bulanBerhenti"
            {...INPUT_BULAN}
            defaultValue={state.nilai?.bulanBerhenti}
            className="sm:max-w-[12rem]"
          />
        </Kolom>
      </div>
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Tambah Unit Pelapor"}
      </Button>
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
    <div className="grid min-w-0 gap-2 sm:has-data-[state=open]:col-span-2">
      <div className="flex flex-wrap items-start gap-2">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`${kelasTombolBaris} aria-expanded:border-signal-rule aria-expanded:bg-card aria-expanded:text-ink`}
            >
              {bulanBerhenti ? "Ubah bulan berhenti" : "Akhiri"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent asChild>
            <form action={akhiriAction} className="mt-3 grid max-w-md gap-1.5">
              <input type="hidden" name="id" value={id} />
              <Label htmlFor={idBerhenti} className="font-medium">
                Bulan berhenti
              </Label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id={idBerhenti}
                  name="bulanBerhenti"
                  {...INPUT_BULAN}
                  required
                  defaultValue={akhiri.nilai?.bulanBerhenti ?? bulanBerhenti ?? ""}
                />
                <Button type="submit" variant="outline" size="lg" disabled={akhiriPending} className="w-full sm:w-auto">
                  Simpan
                </Button>
              </div>
              <p className={kelasPetunjuk}>Masih wajib melapor pada bulan ini, tidak lagi mulai bulan berikutnya.</p>
              <PesanError pesan={akhiri.error} />
            </form>
          </CollapsibleContent>
        </Collapsible>
        <form
          action={hapusAction}
          onSubmit={(e) => {
            if (!confirm(`Hapus periode Unit Pelapor ${namaUnit}? Hapus hanya untuk koreksi salah input.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={hapusPending}
            className={`${kelasTombolBaris} text-danger-ink hover:border-danger-border hover:bg-danger-soft hover:text-danger-ink`}
          >
            Hapus
          </Button>
        </form>
      </div>
      <PesanError pesan={hapus.error} />
    </div>
  );
}
