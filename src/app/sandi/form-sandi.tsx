"use client";

import { useActionState } from "react";

import { gantiSandiAction } from "./actions";

const kelasInput =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:h-11";

const KOLOM = [
  { name: "sandiLama", label: "Sandi lama", autoComplete: "current-password", minLength: undefined },
  { name: "sandiBaru", label: "Sandi baru", autoComplete: "new-password", minLength: 8 },
  { name: "ulangiSandi", label: "Ulangi sandi baru", autoComplete: "new-password", minLength: 8 },
];

export function FormSandi() {
  const [state, action, pending] = useActionState(gantiSandiAction, {});
  return (
    <form action={action} className="mt-5 grid gap-4">
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          {state.error}
        </p>
      )}
      {state.berhasil && (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2.5 text-[13px] text-success">
          Sandi berhasil diganti. Sesi Anda di perangkat lain sudah diakhiri.
        </p>
      )}
      {KOLOM.map((k) => (
        <div key={k.name} className="grid gap-1.5">
          <label htmlFor={k.name} className="text-[13px] font-medium">
            {k.label}
          </label>
          <input
            id={k.name}
            name={k.name}
            type="password"
            required
            minLength={k.minLength}
            autoComplete={k.autoComplete}
            className={kelasInput}
          />
        </div>
      ))}
      <p className="-mt-2 text-[12.5px] text-muted-foreground">Sandi baru minimal 8 karakter.</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
      >
        {pending ? "Menyimpan…" : "Ganti sandi"}
      </button>
    </form>
  );
}
