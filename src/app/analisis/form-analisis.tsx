"use client";

import { useActionState } from "react";

import { kelasArea, kelasPetunjuk, PesanError, tombolUtama } from "../form";
import { simpanAnalisisAction } from "./actions";

/** Form teks Analisis untuk satu Indikator + Lingkup + bulan. */
export function FormAnalisis(p: { indikatorId: string; unitId: string | null; bulan: string; teks: string }) {
  const [state, action, pending] = useActionState(simpanAnalisisAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="indikatorId" value={p.indikatorId} />
      <input type="hidden" name="unitId" value={p.unitId ?? ""} />
      <input type="hidden" name="bulan" value={p.bulan} />
      <label htmlFor="teks" className="sr-only">
        Analisis
      </label>
      <p id="teks-petunjuk" className={kelasPetunjuk}>
        Apa yang terjadi, mengapa Capaian tercapai atau tidak, dan apakah perlu Tindak Lanjut atau PDSA. Jangan menulis
        identitas pasien.
      </p>
      <textarea
        id="teks"
        name="teks"
        rows={7}
        required
        maxLength={4000}
        aria-describedby="teks-petunjuk"
        placeholder="Contoh: Capaian turun karena observasi shift malam menemukan handrub kosong di 3 ruangan…"
        defaultValue={state.nilai?.teks ?? p.teks}
        className={`${kelasArea} text-[16px] leading-7`}
      />
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Simpan Analisis"}
      </button>
    </form>
  );
}
