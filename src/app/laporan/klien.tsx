"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAKS_REKOMENDASI } from "@/lib/laporan";

import { kelasPetunjuk, Kolom, PesanError } from "../form";
import { Ikon } from "../ikon";
import { simpanRekomendasiAction, simpanTindakLanjutUmpanBalikAction, simpanUmpanBalikAction } from "./actions";

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
        maxLength={MAKS_REKOMENDASI}
        aria-describedby="rekomendasi-petunjuk"
        defaultValue={state.nilai?.teks ?? p.teks}
        className="text-[16px] leading-7 sm:text-[16px]"
      />
      <PesanError pesan={state.error} />
      {/* Tombol utama layar ini = Cetak; simpan berupa tombol sekunder. */}
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan Rekomendasi"}
      </Button>
    </form>
  );
}

/** Umpan Balik Dewan Pengawas atas laporan ini, dicatat setelah pertemuan pembahasannya. */
export function FormUmpanBalik(p: { triwulan: string; teks: string; diterimaPada: string; maks: string }) {
  const [state, action, pending] = useActionState(simpanUmpanBalikAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="triwulan" value={p.triwulan} />
      <Kolom label="Umpan balik" htmlFor="umpan-balik" petunjuk="Umpan balik perbaikan tertulis dari Dewan Pengawas setelah laporan ini dibahas.">
        <Textarea id="umpan-balik" name="teks" rows={5} required maxLength={MAKS_REKOMENDASI} defaultValue={state.nilai?.teks ?? p.teks} className="leading-6" />
      </Kolom>
      <Kolom label="Tanggal diterima" htmlFor="diterima-pada">
        <Input id="diterima-pada" name="diterimaPada" type="date" required max={p.maks} defaultValue={state.nilai?.diterimaPada ?? p.diterimaPada} className="sm:w-48" />
      </Kolom>
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan umpan balik"}
      </Button>
    </form>
  );
}

/** Tindak lanjut Umpan Balik Dewan Pengawas Triwulan sebelumnya, dievaluasi pada pertemuan laporan ini. */
export function FormTindakLanjutUmpanBalik(p: { triwulan: string; tindakLanjut: string }) {
  const [state, action, pending] = useActionState(simpanTindakLanjutUmpanBalikAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="triwulan" value={p.triwulan} />
      <Kolom label="Tindak lanjut yang dilakukan" htmlFor="tindak-lanjut-umpan-balik" petunjuk="Apa yang sudah dikerjakan atas umpan balik itu dan hasilnya.">
        <Textarea
          id="tindak-lanjut-umpan-balik"
          name="tindakLanjut"
          rows={4}
          required
          maxLength={MAKS_REKOMENDASI}
          defaultValue={state.nilai?.tindakLanjut ?? p.tindakLanjut}
          className="leading-6"
        />
      </Kolom>
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan tindak lanjut"}
      </Button>
    </form>
  );
}
