import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/server/sesi";

import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanMasuk() {
  if (await getSessionUser()) redirect("/");
  return (
    <section className="mx-auto mt-6 max-w-sm rounded-lg border border-border bg-surface p-6 shadow-xs">
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Masuk</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">Gunakan username dan sandi dari Admin Sistem.</p>
      <FormMasuk />
    </section>
  );
}
