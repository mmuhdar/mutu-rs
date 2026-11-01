"use client";

import { useActionState, useState } from "react";

import type { AksiVerifikasi } from "@/lib/pengukuran";

import { kelasArea, kelasLabel, kelasPetunjuk, PesanError, tombolGaris, tombolUtama } from "../../form";
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
    <section className="grid gap-4 rounded-2xl bg-ukur-tint p-5">
      <div>
        <h2 className="text-[18px] font-bold text-ukur-ink">Verifikasi</h2>
        <p className="text-[14px] text-foreground/80">
          {status === "diajukan"
            ? "Periksa N dan D. Bila wajar, verifikasi supaya angkanya ikut dihitung dalam Capaian."
            : "Pengukuran ini sudah Terverifikasi dan ikut dihitung dalam Capaian."}
        </p>
      </div>
      {status === "diajukan" && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" name="aksi" value={VERIFIKASI} disabled={pending} className={tombolUtama}>
            {pending ? "Memproses…" : "Verifikasi"}
          </button>
        </form>
      )}
      <details className="rounded-xl bg-surface px-4 py-3">
        <summary className="cursor-pointer font-semibold text-ukur-ink pointer-coarse:py-2">{label}</summary>
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
          <button type="submit" name="aksi" value={aksi} disabled={pending} className={tombolGaris}>
            {label}
          </button>
        </form>
      </details>
      <PesanError pesan={state.error} />
    </section>
  );
}
