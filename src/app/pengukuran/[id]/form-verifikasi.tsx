"use client";

import { useActionState, useState } from "react";

import { ubahStatusPengukuranAction } from "../actions";

const kelasTombol = "h-12 rounded-md px-4 font-semibold disabled:opacity-70";

/**
 * Aksi Kepala Unit pada Pengukuran Diajukan (verifikasi, kembalikan ke Draf) atau Terverifikasi (buka kembali).
 * Alasan wajib untuk kembalikan dan buka kembali; isiannya dikendalikan state supaya tidak hilang saat ditolak.
 */
export function FormVerifikasi({ id, status }: { id: string; status: "diajukan" | "terverifikasi" }) {
  const [state, action, pending] = useActionState(ubahStatusPengukuranAction, {});
  const [alasan, setAlasan] = useState("");
  const [aksi, label, petunjuk] =
    status === "diajukan"
      ? ["kembalikan", "Kembalikan ke Draf", "Tulis apa yang harus diperbaiki Petugas Input Data."]
      : ["bukaKembali", "Buka kembali", "Statusnya kembali Diajukan sehingga bisa dikembalikan ke Draf untuk dikoreksi."];

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs">
      <h2 className="text-[15px] font-semibold">Verifikasi</h2>
      {status === "diajukan" && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            name="aksi"
            value="verifikasi"
            disabled={pending}
            className={`${kelasTombol} w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:w-auto`}
          >
            {pending ? "Memproses…" : "Verifikasi"}
          </button>
        </form>
      )}
      <details>
        <summary className="cursor-pointer font-medium text-primary pointer-coarse:py-2">{label}</summary>
        <form action={action} className="mt-2 grid gap-2">
          <input type="hidden" name="id" value={id} />
          <label htmlFor="alasan" className="font-semibold">
            Alasan
          </label>
          <p id="alasan-petunjuk" className="text-[13px] text-muted-foreground">
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
            className="w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring"
          />
          <button
            type="submit"
            name="aksi"
            value={aksi}
            disabled={pending}
            className={`${kelasTombol} border border-border bg-surface hover:bg-background sm:justify-self-end`}
          >
            {label}
          </button>
        </form>
      </details>
      {state.error && (
        <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2.5 text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
