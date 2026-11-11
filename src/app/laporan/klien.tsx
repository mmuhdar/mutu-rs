"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { kelasPetunjuk, PesanError } from "../form";
import { Ikon } from "../ikon";
import { simpanRekomendasiAction } from "./actions";

/** Tombol cetak browser; "Simpan sebagai PDF" dipilih di dialog cetaknya. */
export function TombolCetak() {
  return (
    <Button type="button" size="lg" onClick={() => window.print()} className="w-full sm:w-auto">
      <Ikon nama="cetak" className="size-[18px]" />
      Cetak / Simpan PDF
    </Button>
  );
}

/** Form Rekomendasi satu Triwulan. */
export function FormRekomendasi(p: { triwulan: string; teks: string }) {
  const [state, action, pending] = useActionState(simpanRekomendasiAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="triwulan" value={p.triwulan} />
      <label htmlFor="rekomendasi" className="sr-only">
        Rekomendasi
      </label>
      <p id="rekomendasi-petunjuk" className={kelasPetunjuk}>
        Kesimpulan Triwulan ini dan saran perbaikan untuk Direktur: Indikator yang perlu diprioritaskan, perbaikan yang
        berhasil dan perlu diperluas, dukungan yang dibutuhkan.
      </p>
      <Textarea
        id="rekomendasi"
        name="teks"
        rows={8}
        required
        maxLength={8000}
        aria-describedby="rekomendasi-petunjuk"
        defaultValue={state.nilai?.teks ?? p.teks}
        className="text-[16px] leading-7 sm:text-[16px]"
      />
      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan Rekomendasi"}
      </Button>
    </form>
  );
}
