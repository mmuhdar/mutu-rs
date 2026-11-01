"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Kolom, PesanError } from "../form";
import { masukAction } from "./actions";

export function FormMasuk() {
  const [state, action, pending] = useActionState(masukAction, {});
  return (
    <form action={action} className="grid gap-4">
      <PesanError pesan={state.error} />
      <Kolom label="Username" htmlFor="username">
        <Input
          id="username"
          name="username"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.username}
        />
      </Kolom>
      <Kolom label="Sandi" htmlFor="sandi">
        <Input id="sandi" name="sandi" type="password" required autoComplete="current-password" />
      </Kolom>
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}
