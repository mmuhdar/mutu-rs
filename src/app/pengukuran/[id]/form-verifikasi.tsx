"use client";

import { useActionState, useState } from "react";

import type { AksiVerifikasi } from "@/lib/pengukuran";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

import { Kolom, PesanError } from "../../form";
import { Ikon } from "../../ikon";
import { KotakIkon } from "../../ui";
import { ubahStatusPengukuranAction } from "../actions";

/** Nilai tombol `aksi` = kunci `PERPINDAHAN` (`src/lib/pengukuran.ts`). */
const VERIFIKASI: AksiVerifikasi = "verifikasi";

/**
 * Aksi Kepala Unit pada Pengukuran Diajukan (verifikasi, kembalikan ke Draf) atau Terverifikasi (buka kembali).
 * Alasan wajib untuk kembalikan dan buka kembali; isiannya dikendalikan state supaya tidak hilang saat ditolak.
 */
export function FormVerifikasi({ id, status }: { id: string; status: "diajukan" | "terverifikasi" }) {
  const [state, action, pending] = useActionState(ubahStatusPengukuranAction, {});
  const [alasan, setAlasan] = useState("");
  const [aksi, label, petunjuk]: [AksiVerifikasi, string, string] =
    status === "diajukan"
      ? ["kembalikan", "Kembalikan ke Draf", "Tulis apa yang harus diperbaiki Petugas Input Data."]
      : ["bukaKembali", "Buka kembali", "Statusnya kembali Diajukan sehingga bisa dikembalikan ke Draf untuk dikoreksi."];

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start gap-3.5">
        <KotakIkon nada="ukur" ikon="verifikasi" />
        <div className="min-w-0">
          <h2 className="text-[16px] leading-6 font-bold">Verifikasi</h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">
            {status === "diajukan"
              ? "Periksa N dan D. Bila wajar, verifikasi supaya angkanya ikut dihitung dalam Capaian."
              : "Pengukuran ini sudah Terverifikasi dan ikut dihitung dalam Capaian."}
          </p>
        </div>
      </div>
      {status === "diajukan" && (
        <form action={action} className="grid">
          <input type="hidden" name="id" value={id} />
          <Button type="submit" size="lg" name="aksi" value={VERIFIKASI} disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
            <Ikon nama="verifikasi" className="size-[18px]" />
            {pending ? "Memproses…" : "Verifikasi"}
          </Button>
        </form>
      )}
      <Collapsible className="rounded-xl border border-border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="group/buka h-auto w-full justify-start rounded-xl px-4 py-3 text-[15px] aria-expanded:bg-transparent pointer-coarse:py-4"
          >
            <Ikon nama="kembalikan" className="size-[18px] text-muted-foreground" />
            <span className="flex-1 text-left">{label}</span>
            <Ikon nama="bawah" className="size-4 text-muted-foreground group-data-[state=open]/buka:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <form action={action} className="grid gap-3 px-4 pb-4">
            <input type="hidden" name="id" value={id} />
            <Kolom label="Alasan" htmlFor="alasan" petunjuk={<span id="alasan-petunjuk">{petunjuk} Jangan menulis identitas pasien.</span>}>
              <Textarea
                id="alasan"
                name="alasan"
                rows={3}
                required
                maxLength={1000}
                aria-describedby="alasan-petunjuk"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
            </Kolom>
            <Button type="submit" variant="outline" size="lg" name="aksi" value={aksi} disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
              {label}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
      <PesanError pesan={state.error} />
    </Card>
  );
}
