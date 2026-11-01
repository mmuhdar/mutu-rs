import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/server/sesi";

import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanMasuk() {
  if (await getSessionUser()) redirect("/");
  return (
    <section className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-surface p-6 sm:mt-12">
      <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">Masuk ke MutuRS</h1>
      <p className="mt-1 text-muted-foreground">Indikator mutu RS: isi Pengukuran, verifikasi, pantau Capaian, dan tindak lanjuti.</p>
      <p className="mt-3 text-[13px] text-muted-foreground">Gunakan username dan sandi dari Admin Sistem.</p>
      <FormMasuk />
    </section>
  );
}
