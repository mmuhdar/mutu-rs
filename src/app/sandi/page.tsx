import type { Metadata } from "next";

import { requireUser } from "@/server/sesi";

import { FormSandi } from "./form-sandi";

export const metadata: Metadata = { title: "Ganti sandi" };

export default async function HalamanSandi() {
  await requireUser();
  return (
    <section className="mx-auto max-w-sm rounded-lg border border-border bg-surface p-6">
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Ganti sandi</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">Ganti sandi sementara dari Admin Sistem dengan sandi Anda sendiri.</p>
      <FormSandi />
    </section>
  );
}
