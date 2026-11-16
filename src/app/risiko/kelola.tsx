"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelUkuran, MAKS_UKURAN_BUKTI } from "@/lib/bukti";
import { ACCEPT_DOKUMEN_RISIKO, MAKS_DOKUMEN_RISIKO } from "@/lib/risiko";

import { Kolom, PesanError } from "../form";
import { hapusDokumenRisikoAction, unggahDokumenRisikoAction } from "./actions";

/** Pilihan yang pasti ditolak diperiksa di browser supaya kiriman tidak melewati batas body server; aturannya tetap di service. */
function periksaPilihan(berkas: FileList | null) {
  if (berkas && berkas.length > MAKS_DOKUMEN_RISIKO) return `Paling banyak ${MAKS_DOKUMEN_RISIKO} berkas sekali unggah.`;
  const besar = [...(berkas ?? [])].find((f) => f.size > MAKS_UKURAN_BUKTI);
  return besar ? `Berkas ${besar.name} lebih dari ${labelUkuran(MAKS_UKURAN_BUKTI)}.` : undefined;
}

/** Form unggah Dokumen Review (beberapa berkas sekaligus); pesan penolakan per berkas dari service. */
export function FormUnggahDokumen({ risikoId }: { risikoId: string }) {
  const [state, action, pending] = useActionState(unggahDokumenRisikoAction, {});
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
      <input type="hidden" name="risikoId" value={risikoId} />
      <PesanError pesan={pilihanDitolak ?? state.error} />
      <Kolom
        label="Tambah Dokumen Review"
        htmlFor="berkas-dokumen"
        petunjuk={`PDF, DOC, atau DOCX; paling besar ${labelUkuran(MAKS_UKURAN_BUKTI)} per berkas, paling banyak ${MAKS_DOKUMEN_RISIKO} berkas.`}
      >
        <Input id="berkas-dokumen" name="berkas" type="file" multiple required accept={ACCEPT_DOKUMEN_RISIKO} className="h-auto py-2" />
      </Kolom>
      <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Mengunggah…" : "Unggah"}
      </Button>
    </form>
  );
}

/** Tombol Hapus satu Dokumen Review; pesan penolakannya tampil di atas tombol, selebar baris. */
export function TombolHapusDokumen({ dokumenId, nama }: { dokumenId: string; nama: string }) {
  const [state, action, pending] = useActionState(hapusDokumenRisikoAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2 has-[[role=alert]]:basis-full">
      <input type="hidden" name="dokumenId" value={dokumenId} />
      <div className="basis-full empty:hidden">
        <PesanError pesan={state.error} />
      </div>
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label={`Hapus ${nama}`}>
        Hapus
      </Button>
    </form>
  );
}
