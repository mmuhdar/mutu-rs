"use client";

import { useActionState, useState } from "react";

import type { AksiVerifikasi } from "@/lib/pengukuran";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

import { Kolom, PesanError } from "../../form";
import { Ikon } from "../../ikon";
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

  // Satu panel: keputusan utama di atas, aksi beralasan di bawah garis rambut; pesan penolakan di luar panel.
  return (
    <div className="grid gap-3">
      <section aria-labelledby="judul-verifikasi" className="overflow-hidden rounded-card border border-rule bg-paper-2">
        <div className="grid gap-4 p-5">
          <div>
            <h2 id="judul-verifikasi" className="text-[17px] leading-6 font-medium tracking-[-0.01em]">
              Verifikasi
            </h2>
            <p className="mt-1 max-w-[60ch] text-[15px] text-ink-3">
              {status === "diajukan"
                ? "Periksa N dan D. Bila wajar, verifikasi supaya angkanya ikut dihitung dalam Capaian."
                : "Pengukuran ini sudah Terverifikasi dan ikut dihitung dalam Capaian."}
            </p>
          </div>
          {status === "diajukan" && (
            <form action={action} className="grid">
              <input type="hidden" name="id" value={id} />
              <Button type="submit" size="lg" name="aksi" value={VERIFIKASI} disabled={pending} className="w-full disabled:opacity-50 sm:w-auto sm:justify-self-start">
                <Ikon nama="verifikasi" className="size-[18px]" />
                {pending ? "Memproses…" : "Verifikasi"}
              </Button>
            </form>
          )}
        </div>
        <Collapsible className="border-t border-rule">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group/buka h-auto w-full justify-start rounded-none px-5 py-3.5 text-[15px] font-medium hover:bg-paper-3 focus-visible:ring-inset active:bg-paper-3 aria-expanded:bg-transparent pointer-coarse:py-4"
            >
              <Ikon nama="kembalikan" className="size-[18px] text-ink-3" />
              <span className="flex-1 text-left">{label}</span>
              <Ikon nama="bawah" className="size-4 text-ink-3 group-data-[state=open]/buka:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form action={action} className="grid gap-3 px-5 pb-5">
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
              <Button
                type="submit"
                variant="outline"
                size="lg"
                name="aksi"
                value={aksi}
                disabled={pending}
                className="w-full disabled:opacity-50 sm:w-auto sm:justify-self-start"
              >
                {label}
              </Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </section>
      <PesanError pesan={state.error} />
    </div>
  );
}
