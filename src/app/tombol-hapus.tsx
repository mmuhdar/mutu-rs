"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { StateForm } from "@/lib/form";

import { PesanError } from "./form";

/**
 * Tombol Hapus satu data (koreksi salah input) dengan konfirmasi browser. `data` = isian tersembunyi untuk action;
 * pesan penolakan service tampil di atas tombol. `kecil` untuk baris tabel.
 */
export function TombolHapus(p: {
  action: (prev: StateForm, formData: FormData) => Promise<StateForm>;
  data: Record<string, string>;
  konfirmasi: string;
  label?: string;
  kecil?: boolean;
}) {
  const [state, action, pending] = useActionState(p.action, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(p.konfirmasi)) e.preventDefault();
      }}
      className={p.kecil ? "inline-grid justify-items-end gap-2" : "grid w-full gap-2 sm:w-auto"}
    >
      {Object.entries(p.data).map(([nama, nilai]) => (
        <input key={nama} type="hidden" name={nama} value={nilai} />
      ))}
      <PesanError pesan={state.error} />
      <Button
        type="submit"
        variant="outline"
        size={p.kecil ? "sm" : "default"}
        disabled={pending}
        aria-label={p.label}
        className={`${p.kecil ? "" : "w-full sm:w-auto"} text-danger-ink hover:border-danger-border hover:bg-danger-soft hover:text-danger-ink`}
      >
        {pending ? "Menghapus…" : "Hapus"}
      </Button>
    </form>
  );
}
