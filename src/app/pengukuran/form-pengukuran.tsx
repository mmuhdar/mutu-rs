"use client";

import { useActionState, useState } from "react";

import { formatCapaian, hitungCapaian } from "@/lib/capaian";

import { simpanPengukuranAction } from "./actions";

const kelasKartu = "rounded-lg border border-border bg-surface";
const kelasInput =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring";
const kelasTombol = "h-12 rounded-md px-4 font-semibold disabled:opacity-70";

/** Bilangan bulat ≥ 0 dari isian, atau null (aturan yang sama dengan server action). */
const bilanganBulat = (teks: string) => (/^\d+$/.test(teks.trim()) ? Number(teks.trim()) : null);

function KolomAngka(p: { id: "n" | "d"; label: string; definisi: string; nilai: string; ubah: (v: string) => void }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={p.id} className="font-semibold">
        {p.label}
      </label>
      <p id={`${p.id}-definisi`} className="text-[13px] whitespace-pre-line text-muted-foreground">
        {p.definisi}
      </p>
      <input
        id={p.id}
        name={p.id}
        required
        inputMode="numeric"
        pattern="[0-9]*"
        title="Bilangan bulat ≥ 0, tanpa titik atau koma"
        autoComplete="off"
        aria-describedby={`${p.id}-definisi`}
        value={p.nilai}
        onChange={(e) => p.ubah(e.target.value)}
        className={`${kelasInput} h-12 text-lg tabular-nums`}
      />
    </div>
  );
}

/**
 * Formulir isian N, D, dan Catatan dengan pratinjau Capaian. Tombol "Simpan Draf" (tombol pertama, juga dipakai
 * tombol Enter) dan "Ajukan" mengirim `aksi`. Isian dikendalikan state supaya tidak hilang saat ditolak.
 */
export function FormPengukuran(p: {
  kunci: { indikatorId: string; unitId: string; bulan: string };
  faktor: number;
  satuan: string;
  definisiNumerator: string;
  definisiDenominator: string;
  awal: { n: number; d: number; catatan: string } | null;
}) {
  const [state, action, pending] = useActionState(simpanPengukuranAction, {});
  const [n, setN] = useState(p.awal ? String(p.awal.n) : "");
  const [d, setD] = useState(p.awal ? String(p.awal.d) : "");
  const [catatan, setCatatan] = useState(p.awal?.catatan ?? "");
  const [nAngka, dAngka] = [bilanganBulat(n), bilanganBulat(d)];
  const capaian = nAngka !== null && dAngka !== null ? hitungCapaian(nAngka, dAngka, p.faktor) : undefined;
  const pratinjau = capaian === undefined ? null : capaian === null ? "kosong (D = 0)" : formatCapaian(capaian, p.satuan);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="indikatorId" value={p.kunci.indikatorId} />
      <input type="hidden" name="unitId" value={p.kunci.unitId} />
      <input type="hidden" name="bulan" value={p.kunci.bulan} />

      <div className={`${kelasKartu} grid gap-5 p-4 sm:grid-cols-2`}>
        <KolomAngka id="n" label="Numerator (N)" definisi={p.definisiNumerator} nilai={n} ubah={setN} />
        <KolomAngka id="d" label="Denominator (D)" definisi={p.definisiDenominator} nilai={d} ubah={setD} />
      </div>

      <div aria-live="polite" className={`${kelasKartu} p-4`}>
        <p className="text-[13px] font-medium text-muted-foreground">Pratinjau Capaian</p>
        {pratinjau === null ? (
          <p className="mt-1 text-muted-foreground">Isi N dan D dengan bilangan bulat untuk melihat Capaian.</p>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{pratinjau}</p>
            <p className="text-[13px] text-muted-foreground tabular-nums">
              {nAngka}/{dAngka} × {p.faktor}
            </p>
          </>
        )}
      </div>

      <div className={`${kelasKartu} grid gap-1.5 p-4`}>
        <label htmlFor="catatan" className="font-semibold">
          Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <p id="catatan-petunjuk" className="text-[13px] text-muted-foreground">
          Jangan menulis identitas pasien (nama, nomor rekam medis, tanggal lahir).
        </p>
        <textarea
          id="catatan"
          name="catatan"
          rows={3}
          maxLength={1000}
          aria-describedby="catatan-petunjuk"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          className={`${kelasInput} py-2`}
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-danger-ink">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button
          type="submit"
          name="aksi"
          value="simpan"
          disabled={pending}
          className={`${kelasTombol} border border-border bg-surface hover:bg-background`}
        >
          {pending ? "Menyimpan…" : "Simpan Draf"}
        </button>
        <button
          type="submit"
          name="aksi"
          value="ajukan"
          disabled={pending}
          onClick={(e) => {
            const teks = pratinjau === null ? "" : ` dengan Capaian ${pratinjau}`;
            if (!confirm(`Ajukan Pengukuran ini${teks}? Setelah diajukan, N dan D tidak bisa diubah lagi.`)) {
              e.preventDefault();
            }
          }}
          className={`${kelasTombol} bg-primary text-primary-foreground hover:bg-primary-hover`}
        >
          Ajukan
        </button>
      </div>
    </form>
  );
}
