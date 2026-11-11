"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { Ikon } from "../ikon";

/**
 * Cadangan bila Clipboard API tidak ada: `navigator.clipboard` hanya tersedia di secure context (HTTPS atau
 * localhost), sedangkan MutuRS biasa dibuka lewat `http://` di jaringan RS.
 */
function salinLewatSeleksi(teks: string) {
  const area = document.createElement("textarea");
  area.value = teks;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const berhasil = document.execCommand("copy");
  area.remove();
  return berhasil;
}

/** Tombol Salin satu isian SIMAR; hasilnya diumumkan ke pembaca layar. */
export function TombolSalin({ teks, label }: { teks: string; label: string }) {
  const [hasil, setHasil] = useState<"tersalin" | "gagal" | null>(null);
  async function salin() {
    let berhasil = true;
    try {
      await navigator.clipboard.writeText(teks);
    } catch {
      berhasil = salinLewatSeleksi(teks);
    }
    setHasil(berhasil ? "tersalin" : "gagal");
    setTimeout(() => setHasil(null), 2500);
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={salin} aria-label={`Salin ${label}`}>
        <Ikon nama={hasil === "tersalin" ? "cek" : "salin"} className="size-4" />
        {hasil === "tersalin" ? "Tersalin" : "Salin"}
      </Button>
      <span role="status" className="text-[13px] text-bad">
        {hasil === "gagal" ? "Gagal menyalin; pilih teksnya lalu salin manual." : ""}
      </span>
    </span>
  );
}
