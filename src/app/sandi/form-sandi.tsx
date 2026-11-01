"use client";

import { useActionState } from "react";

import { kelasInput, Kolom, PesanError, tombolUtama } from "../form";
import { gantiSandiAction } from "./actions";

const KOLOM = [
  { name: "sandiLama", label: "Sandi lama", autoComplete: "current-password", minLength: undefined },
  { name: "sandiBaru", label: "Sandi baru", autoComplete: "new-password", minLength: 8, petunjuk: "Minimal 8 karakter." },
  { name: "ulangiSandi", label: "Ulangi sandi baru", autoComplete: "new-password", minLength: 8 },
];

export function FormSandi() {
  const [state, action, pending] = useActionState(gantiSandiAction, {});
  return (
    <form action={action} className="grid gap-4 p-5 sm:p-6">
      <PesanError pesan={state.error} />
      {state.berhasil && (
        <p role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-[14px] text-success-ink">
          Sandi berhasil diganti. Sesi Anda di perangkat lain sudah diakhiri.
        </p>
      )}
      {KOLOM.map((k) => (
        <Kolom key={k.name} label={k.label} htmlFor={k.name} petunjuk={k.petunjuk}>
          <input
            id={k.name}
            name={k.name}
            type="password"
            required
            minLength={k.minLength}
            autoComplete={k.autoComplete}
            className={kelasInput}
          />
        </Kolom>
      ))}
      <button type="submit" disabled={pending} className={`${tombolUtama} mt-1`}>
        {pending ? "Menyimpan…" : "Ganti sandi"}
      </button>
    </form>
  );
}
