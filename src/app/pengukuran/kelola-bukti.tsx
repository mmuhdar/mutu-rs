"use client";

import { useActionState, useState } from "react";

import { ACCEPT_BUKTI, labelUkuran, MAKS_BUKTI, MAKS_UKURAN_BUKTI } from "@/lib/bukti";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Kolom, PesanError } from "../form";
import { hapusBuktiAction, unggahBuktiAction, type StatePengukuran } from "./actions";

/**
 * Pilihan berkas yang pasti ditolak (lebih dari `MAKS_BUKTI` sekaligus, atau satu berkas di atas batas) diperiksa di
 * browser sebelum dikirim, supaya kiriman tidak melewati batas body server dan pesannya tetap jelas. Aturan sebenarnya
 * tetap di service.
 */
function periksaPilihan(berkas: FileList | null) {
  if (berkas && berkas.length > MAKS_BUKTI) return `Paling banyak ${MAKS_BUKTI} berkas sekali unggah.`;
  const besar = [...(berkas ?? [])].find((f) => f.size > MAKS_UKURAN_BUKTI);
  return besar ? `Berkas ${besar.name} lebih dari ${labelUkuran(MAKS_UKURAN_BUKTI)}.` : undefined;
}

/** Form unggah Bukti (beberapa berkas sekaligus) ke Pengukuran Draf; pesan penolakan per berkas dari service. */
export function FormUnggahBukti({ pengukuranId }: { pengukuranId: string }) {
  const [state, action, pending] = useActionState(unggahBuktiAction, {} satisfies StatePengukuran);
  const [pilihanDitolak, setPilihanDitolak] = useState<string>();
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const pesan = periksaPilihan((e.currentTarget.elements.namedItem("berkas") as HTMLInputElement).files);
        setPilihanDitolak(pesan);
        if (pesan) e.preventDefault();
      }}
      className="grid gap-3 border-t border-rule px-5 py-4"
    >
      <input type="hidden" name="pengukuranId" value={pengukuranId} />
      <PesanError pesan={pilihanDitolak ?? state.error} />
      <Kolom
        label="Tambah Bukti"
        htmlFor="berkas-bukti"
        petunjuk={`PDF, JPG, atau PNG; paling besar ${labelUkuran(MAKS_UKURAN_BUKTI)} per berkas, paling banyak ${MAKS_BUKTI} berkas.`}
      >
        <Input id="berkas-bukti" name="berkas" type="file" multiple required accept={ACCEPT_BUKTI} className="h-auto py-2" />
      </Kolom>
      <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Mengunggah…" : "Unggah"}
      </Button>
    </form>
  );
}

/** Tombol Hapus satu Bukti; pesan penolakannya tampil di atas tombol, selebar baris. */
export function TombolHapusBukti({ buktiId, nama }: { buktiId: string; nama: string }) {
  const [state, action, pending] = useActionState(hapusBuktiAction, {} satisfies StatePengukuran);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2 has-[[role=alert]]:basis-full">
      <input type="hidden" name="buktiId" value={buktiId} />
      <div className="basis-full empty:hidden">
        <PesanError pesan={state.error} />
      </div>
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label={`Hapus ${nama}`}>
        Hapus
      </Button>
    </form>
  );
}
