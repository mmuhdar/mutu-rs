"use client";

import { useActionState } from "react";

import { kelasInput, Kolom, PesanError, tombolUtama } from "../form";
import { masukAction } from "./actions";

export function FormMasuk() {
  const [state, action, pending] = useActionState(masukAction, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <PesanError pesan={state.error} />
      <Kolom label="Username" htmlFor="username">
        <input
          id="username"
          name="username"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.username}
          className={kelasInput}
        />
      </Kolom>
      <Kolom label="Sandi" htmlFor="sandi">
        <input id="sandi" name="sandi" type="password" required autoComplete="current-password" className={kelasInput} />
      </Kolom>
      <button type="submit" disabled={pending} className={`${tombolUtama} mt-1 sm:w-full`}>
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
