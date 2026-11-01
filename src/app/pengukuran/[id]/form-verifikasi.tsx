"use client";

import { useActionState, useState } from "react";

import type { AksiVerifikasi } from "@/lib/pengukuran";

import { kelasArea, kelasLabel, kelasPetunjuk, PesanError, tombolGaris, tombolUtama } from "../../form";
import { Ikon } from "../../ikon";
import { kelasKartu, KotakIkon } from "../../ui";
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
    <section className={`${kelasKartu} grid gap-4 p-5`}>
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
          <button type="submit" name="aksi" value={VERIFIKASI} disabled={pending} className={tombolUtama}>
            <Ikon nama="verifikasi" className="size-[18px]" />
            {pending ? "Memproses…" : "Verifikasi"}
          </button>
        </form>
      )}
      <details className="group rounded-xl border border-border px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold pointer-coarse:py-2 [&::-webkit-details-marker]:hidden">
          <Ikon nama="kembalikan" className="size-[18px] text-muted-foreground" />
          <span className="flex-1">{label}</span>
          <Ikon nama="bawah" className="size-4 text-muted-foreground group-open:rotate-180" />
        </summary>
        <form action={action} className="mt-3 grid gap-2">
          <input type="hidden" name="id" value={id} />
          <label htmlFor="alasan" className={kelasLabel}>
            Alasan
          </label>
          <p id="alasan-petunjuk" className={kelasPetunjuk}>
            {petunjuk} Jangan menulis identitas pasien.
          </p>
          <textarea
            id="alasan"
            name="alasan"
            rows={3}
            required
            maxLength={1000}
            aria-describedby="alasan-petunjuk"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className={kelasArea}
          />
          <button type="submit" name="aksi" value={aksi} disabled={pending} className={`${tombolGaris} mt-1`}>
            {label}
          </button>
        </form>
      </details>
      <PesanError pesan={state.error} />
    </section>
  );
}
