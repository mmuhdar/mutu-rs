"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INPUT_BULAN } from "@/lib/bulan";
import { bilanganBulat } from "@/lib/form";
import {
  AMBANG_VALID,
  formatPersen,
  kesesuaian,
  LABEL_PEMICU_VALIDASI,
  LABEL_PENYEBAB_TIDAK_VALID,
  PEMICU_VALIDASI,
  PENYEBAB_TIDAK_VALID,
  sampelMinimalValidasi,
  validData,
} from "@/lib/validasi";

import { KELAS_CHIP_CENTANG, kelasPetunjuk, Kolom, PesanError } from "../form";
import { PilihCari } from "../pilih-cari";
import { simpanValidasiAction } from "./actions";

/** Isian awal form: nama field → nilai teks (`penyebab` dipisah koma). */
export type AwalValidasi = Partial<Record<string, string>>;


/**
 * Form Validasi Data (metode kesesuaian hasil pengukuran, PMK 30/2022 BAB IV.B). Tanpa `id` = validasi baru (Indikator,
 * Unit, bulan dipilih); dengan `id` = memperbaiki catatan (Indikator, Unit, bulan tetap). Kesesuaian dan sampel minimal
 * dihitung langsung dari aturan murni yang sama dengan service; aturannya tetap diperiksa service.
 */
export function FormValidasi(p: {
  id?: string;
  indikator: { id: string; label: string }[];
  unit: { id: string; label: string }[];
  awal: AwalValidasi;
  maksTanggal: string;
}) {
  const [state, action, pending] = useActionState(simpanValidasiAction, {});
  const a = { ...p.awal, ...state.nilai };
  const [populasi, setPopulasi] = useState(a.populasi ?? "");
  const [sampel, setSampel] = useState(a.sampel ?? "");
  const [sesuai, setSesuai] = useState(a.sesuai ?? "");
  // Aturan angka sama dengan action (`bilanganBulat`): kosong atau bukan bilangan bulat = NaN.
  const [nP, nS, nC] = [populasi, sampel, sesuai].map(bilanganBulat);
  const minimal = nP > 0 ? sampelMinimalValidasi(nP) : null;
  const hasil = nS > 0 && nC <= nS ? { persen: kesesuaian(nC, nS), valid: validData(nC, nS) } : null;
  const penyebab = (a.penyebab ?? "").split(",");

  return (
    <form action={action} className="grid gap-5">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      {!p.id && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,10rem)]">
          <Kolom label="Indikator" htmlFor="indikatorId">
            {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
            <PilihCari key={a.indikatorId} id="indikatorId" nama="indikatorId" wajib nilai={a.indikatorId} placeholder="Pilih Indikator" cari="Cari kode atau nama…" pilihan={p.indikator.map((i) => ({ nilai: i.id, label: i.label }))} />
          </Kolom>
          <Kolom label="Unit Pelapor" htmlFor="unitId">
            <PilihCari key={a.unitId} id="unitId" nama="unitId" wajib nilai={a.unitId} placeholder="Pilih Unit" cari="Cari Unit…" pilihan={p.unit.map((u) => ({ nilai: u.id, label: u.label }))} />
          </Kolom>
          <Kolom label="Bulan data" htmlFor="bulan">
            <Input id="bulan" name="bulan" {...INPUT_BULAN} required defaultValue={a.bulan} />
          </Kolom>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
        <Kolom label="Pemicu" htmlFor="pemicu" petunjuk="Validasi dilakukan bila salah satu keadaan ini terjadi (PMKP 5).">
          <PilihCari key={a.pemicu} id="pemicu" nama="pemicu" wajib nilai={a.pemicu} placeholder="Pilih pemicu" cari="Cari pemicu…" pilihan={PEMICU_VALIDASI.map((x) => ({ nilai: x, label: LABEL_PEMICU_VALIDASI[x] }))} />
        </Kolom>
        <Kolom label="Tanggal validasi" htmlFor="tanggal">
          <Input id="tanggal" name="tanggal" type="date" required max={p.maksTanggal} defaultValue={a.tanggal} />
        </Kolom>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Pengumpul data" htmlFor="pengumpulData" petunjuk="Nama petugas yang mengumpulkan data pertama kali.">
          <Input id="pengumpulData" name="pengumpulData" required maxLength={120} defaultValue={a.pengumpulData} />
        </Kolom>
        <Kolom label="Validator" htmlFor="validator" petunjuk="Orang lain yang mengukur ulang dengan formulir dan sumber data yang sama.">
          <Input id="validator" name="validator" required maxLength={120} defaultValue={a.validator} />
        </Kolom>
      </div>
      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-1 text-sm font-medium">Sampel dan kesesuaian</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kolom label="Populasi" htmlFor="populasi" petunjuk="Jumlah kasus pada bulan itu.">
            <Input id="populasi" name="populasi" type="number" inputMode="numeric" min={1} required value={populasi} onChange={(e) => setPopulasi(e.target.value)} />
          </Kolom>
          <Kolom label="Sampel validator" htmlFor="sampel" petunjuk={minimal ? `Minimal ${minimal} (PMK 30/2022 Tabel 3).` : "Minimal menurut Tabel 3."}>
            <Input id="sampel" name="sampel" type="number" inputMode="numeric" min={1} required value={sampel} onChange={(e) => setSampel(e.target.value)} />
          </Kolom>
          <Kolom label="Data sesuai" htmlFor="sesuai" petunjuk="Sampel yang hasilnya sama dengan pengumpul data.">
            <Input id="sesuai" name="sesuai" type="number" inputMode="numeric" min={0} required value={sesuai} onChange={(e) => setSesuai(e.target.value)} />
          </Kolom>
        </div>
        <p aria-live="polite" className="text-[15px]">
          {hasil ? (
            <>
              Kesesuaian <span className="terukur text-cool">{formatPersen(hasil.persen)}</span>:{" "}
              <span className={hasil.valid ? "text-ok" : "text-bad"}>{hasil.valid ? "valid" : `tidak valid (di bawah ${AMBANG_VALID}%)`}</span>
            </>
          ) : (
            <span className="text-ink-3">Kesesuaian = data sesuai / sampel validator × 100%; valid bila mencapai {AMBANG_VALID}%.</span>
          )}
        </p>
      </fieldset>
      <fieldset className="grid min-w-0 gap-1.5">
        <legend className="text-sm font-medium">Penyebab data tidak valid</legend>
        <p className={kelasPetunjuk}>Wajib bila kesesuaian di bawah {AMBANG_VALID}%. Boleh lebih dari satu.</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {PENYEBAB_TIDAK_VALID.map((x) => (
            <label
              // key memuat pilihan bawaan supaya Checkbox (Radix) kembali ke pilihan itu setelah form di-reset.
              key={`${x}:${penyebab.includes(x)}`}
              className={KELAS_CHIP_CENTANG}
            >
              <Checkbox name="penyebab" value={x} defaultChecked={penyebab.includes(x)} />
              {LABEL_PENYEBAB_TIDAK_VALID[x]}
            </label>
          ))}
        </div>
      </fieldset>
      <Kolom label="Perbaikan yang dilakukan" htmlFor="perbaikan" petunjuk="Wajib bila tidak valid; setelah perbaikan, data dikumpulkan ulang dengan sampel baru (validasi ulang).">
        <Textarea id="perbaikan" name="perbaikan" rows={3} maxLength={4000} defaultValue={a.perbaikan} className="leading-6" />
      </Kolom>
      <Kolom label="Catatan" htmlFor="catatan" petunjuk="Opsional, mis. sumber data atau cara pemilihan sampel.">
        <Textarea id="catatan" name="catatan" rows={2} maxLength={4000} defaultValue={a.catatan} className="leading-6" />
      </Kolom>
      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : p.id ? "Simpan perbaikan catatan" : "Simpan validasi"}
      </Button>
    </form>
  );
}
