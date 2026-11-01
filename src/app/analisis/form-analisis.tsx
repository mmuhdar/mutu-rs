"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { kelasPetunjuk, PesanError } from "../form";
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
      <Textarea
        id="teks"
        name="teks"
        rows={7}
        required
        maxLength={4000}
        aria-describedby="teks-petunjuk"
        placeholder="Contoh: Capaian turun karena observasi shift malam menemukan handrub kosong di 3 ruangan…"
        defaultValue={state.nilai?.teks ?? p.teks}
        // Tinggi tetap 7 baris seperti sebelumnya (bawaan Textarea = tinggi mengikuti isi).
        className="text-[16px] leading-7 sm:text-[16px]"
      />
      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan Analisis"}
      </Button>
    </form>
  );
}
