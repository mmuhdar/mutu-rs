"use client";

import { useActionState } from "react";

import { masukAction } from "./actions";

const kelasInput =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:h-11";

export function FormMasuk() {
  const [state, action, pending] = useActionState(masukAction, {});
  return (
    <form action={action} className="mt-5 grid gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-[13px] text-danger"
        >
          {state.error}
        </p>
      )}
      <div className="grid gap-1.5">
        <label htmlFor="username" className="text-[13px] font-medium">
          Username
        </label>
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
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="sandi" className="text-[13px] font-medium">
          Sandi
        </label>
        <input
          id="sandi"
          name="sandi"
          type="password"
          required
          autoComplete="current-password"
          className={kelasInput}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
      >
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
