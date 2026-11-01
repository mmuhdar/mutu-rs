"use client";

import { useActionState } from "react";

import { simpanAnalisisAction, type StateAnalisis } from "./actions";

export const kelasArea =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring";
export const tombolUtama =
  "h-11 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70 sm:w-auto";

/** Pesan hasil form: penolakan service atau konfirmasi tersimpan. */
export function HasilForm({ state, tersimpan }: { state: StateAnalisis; tersimpan: string }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
        {state.error}
      </p>
    );
  }
  return state.tersimpan ? (
    <p role="status" className="text-[13px] font-medium text-success">
      {tersimpan}
    </p>
  ) : null;
}

/** Form teks Analisis untuk satu Indikator + Lingkup + bulan. */
export function FormAnalisis(p: { indikatorId: string; unitId: string | null; bulan: string; teks: string }) {
  const [state, action, pending] = useActionState(simpanAnalisisAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="indikatorId" value={p.indikatorId} />
      <input type="hidden" name="unitId" value={p.unitId ?? ""} />
      <input type="hidden" name="bulan" value={p.bulan} />
      <label htmlFor="teks" className="font-semibold">
        Analisis
      </label>
      <p id="teks-petunjuk" className="text-[13px] text-muted-foreground">
        Apa yang terjadi, mengapa Capaian tercapai atau tidak tercapai, dan apakah perlu Tindak Lanjut atau PDSA. Jangan
        menulis identitas pasien.
      </p>
      <textarea
        id="teks"
        name="teks"
        rows={6}
        required
        maxLength={4000}
        aria-describedby="teks-petunjuk"
        defaultValue={state.nilai?.teks ?? p.teks}
        className={kelasArea}
      />
      <HasilForm state={state} tersimpan="Analisis tersimpan." />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Simpan Analisis"}
      </button>
    </form>
  );
}
