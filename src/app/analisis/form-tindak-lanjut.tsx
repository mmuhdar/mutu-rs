"use client";

import { useActionState } from "react";

import { LABEL_STATUS_TINDAK_LANJUT, STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "@/lib/perbaikan";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Kolom, PesanError, Segmen } from "../form";
import { Ikon } from "../ikon";
import { tambahTindakLanjutAction, ubahTindakLanjutAction } from "./actions";

/** Tindakan, PIC, dan tenggat; `awal` = nilai bawaan, `id` = akhiran id unik per form. */
function IsianDasar({ id, awal }: { id: string; awal: { tindakan?: string; pic?: string; tenggat?: string } }) {
  return (
    <>
      <Kolom label="Tindakan" htmlFor={`tindakan-${id}`}>
        <Textarea
          id={`tindakan-${id}`}
          name="tindakan"
          rows={2}
          required
          maxLength={1000}
          placeholder="Apa yang akan dilakukan"
          defaultValue={awal.tindakan}
        />
      </Kolom>
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom label="PIC" htmlFor={`pic-${id}`}>
          <Input
            id={`pic-${id}`}
            name="pic"
            required
            maxLength={120}
            placeholder="Nama atau jabatan"
            defaultValue={awal.pic}
          />
        </Kolom>
        <Kolom label="Tenggat" htmlFor={`tenggat-${id}`}>
          <Input id={`tenggat-${id}`} name="tenggat" type="date" required defaultValue={awal.tenggat} />
        </Kolom>
      </div>
    </>
  );
}

/** Form tambah Tindak Lanjut ke Analisis yang sudah disimpan. */
export function FormTambahTindakLanjut({ analisisId }: { analisisId: string }) {
  const [state, action, pending] = useActionState(tambahTindakLanjutAction, {});
  return (
    <form action={action} className="grid gap-3">
      <h3 className="font-display text-[16px] leading-6 font-medium tracking-[-0.01em]">Tambah Tindak Lanjut</h3>
      <input type="hidden" name="analisisId" value={analisisId} />
      <IsianDasar id="baru" awal={state.nilai ?? {}} />
      <PesanError pesan={state.error} />
      {/* Tombol kedua: tombol utama halaman ini = Simpan Analisis. */}
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        <Ikon nama="tambah" className="size-[18px]" />
        {pending ? "Menyimpan…" : "Tambah Tindak Lanjut"}
      </Button>
    </form>
  );
}

/** Ubah satu Tindak Lanjut, termasuk statusnya; catatan wajib saat Selesai (hasil) dan Dibatalkan (alasan). */
export function FormUbahTindakLanjut({
  t,
}: {
  t: { id: string; tindakan: string; pic: string; tenggat: string; status: StatusTindakLanjut; catatan: string };
}) {
  const [state, action, pending] = useActionState(ubahTindakLanjutAction, {});
  const awal = state.nilai ?? t;
  return (
    // Tetap terbuka setelah ditolak; setelah berhasil form dibuat ulang (key = versi data) sehingga tertutup.
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">
          <Ikon nama="isi" className="size-4" />
          Perbarui status atau ubah
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        {/* Sumur tanpa bingkai di dalam permukaan (bukan kotak bergaris di dalam panel). */}
        <form action={action} className="mt-3 grid gap-4 rounded-card bg-paper-3 p-4 sm:p-5">
          <input type="hidden" name="id" value={t.id} />
          {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
          <Segmen
            key={awal.status}
            nama="status"
            label="Status"
            pilihan={STATUS_TINDAK_LANJUT.map((s) => ({ nilai: s, label: LABEL_STATUS_TINDAK_LANJUT[s] }))}
            nilai={awal.status}
            wajib
          />
          <Kolom label="Catatan" petunjuk="Hasil saat Selesai, alasan saat Dibatalkan." htmlFor={`catatan-${t.id}`}>
            <Textarea id={`catatan-${t.id}`} name="catatan" rows={2} maxLength={1000} defaultValue={awal.catatan} />
          </Kolom>
          <IsianDasar id={t.id} awal={awal} />
          <PesanError pesan={state.error} />
          {/* Tombol bergaris: tombol utama halaman ini = Simpan Analisis. */}
          <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
