"use client";

import { useActionState } from "react";

import { ACCEPT_BUKTI } from "@/lib/bukti";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Kolom, PesanError } from "../form";
import { hapusBuktiAction, unggahBuktiAction, type StatePengukuran } from "./actions";

/** Form unggah Bukti (beberapa berkas sekaligus) ke Pengukuran Draf; pesan penolakan per berkas dari service. */
export function FormUnggahBukti({ pengukuranId }: { pengukuranId: string }) {
  const [state, action, pending] = useActionState(unggahBuktiAction, {} satisfies StatePengukuran);
  return (
    <form action={action} className="grid gap-3 border-t border-rule px-5 py-4">
      <input type="hidden" name="pengukuranId" value={pengukuranId} />
      <PesanError pesan={state.error} />
      <Kolom label="Tambah bukti" htmlFor="berkas-bukti" petunjuk="PDF, JPG, atau PNG; paling besar 10 MB per berkas, paling banyak 5 berkas.">
        <Input id="berkas-bukti" name="berkas" type="file" multiple required accept={ACCEPT_BUKTI} className="h-auto py-2" />
      </Kolom>
      <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Mengunggah…" : "Unggah"}
      </Button>
    </form>
  );
}

/** Tombol Hapus satu Bukti; pesan penolakannya tampil di sampingnya. */
export function TombolHapusBukti({ buktiId, nama }: { buktiId: string; nama: string }) {
  const [state, action, pending] = useActionState(hapusBuktiAction, {} satisfies StatePengukuran);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="buktiId" value={buktiId} />
      {state.error && (
        <span role="alert" className="text-[13px] text-bad">
          {state.error}
        </span>
      )}
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label={`Hapus ${nama}`}>
        Hapus
      </Button>
    </form>
  );
}
