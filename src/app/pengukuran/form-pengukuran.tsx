"use client";

import { useActionState, useState } from "react";

import { formatCapaian, hitungCapaian, tercapai } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Kolom, PesanError } from "../form";
import { Ikon } from "../ikon";
import { Pil } from "../ui";
import { simpanPengukuranAction } from "./actions";

/** Bilangan bulat ≥ 0 dari isian, atau null (aturan yang sama dengan server action). */
const bilanganBulat = (teks: string) => (/^\d+$/.test(teks.trim()) ? Number(teks.trim()) : null);

function KolomAngka(p: { id: "n" | "d"; label: string; singkat: string; definisi: string; nilai: string; ubah: (v: string) => void }) {
  return (
    <div className="grid min-w-0 content-start gap-2 rounded-xl border border-border bg-head p-4">
      <Label htmlFor={p.id} className="justify-between">
        <span className="text-[15px] font-bold">{p.label}</span>
        <Pil nada="ukur">{p.singkat}</Pil>
      </Label>
      <p id={`${p.id}-definisi`} className="text-[13px] leading-5 whitespace-pre-line text-muted-foreground">
        {p.definisi}
      </p>
      <Input
        id={p.id}
        name={p.id}
        required
        inputMode="numeric"
        pattern="[0-9]*"
        title="Bilangan bulat ≥ 0, tanpa titik atau koma"
        autoComplete="off"
        placeholder="0"
        aria-describedby={`${p.id}-definisi`}
        value={p.nilai}
        onChange={(e) => p.ubah(e.target.value)}
        className="h-16 px-4 text-[28px] font-bold placeholder:text-muted-foreground/50 sm:text-[28px]"
      />
    </div>
  );
}

/**
 * Formulir isian N, D, dan Catatan dengan pratinjau Capaian terhadap Target bulan itu (hijau Tercapai, merah Belum
 * Tercapai, memakai aturan `tercapai` yang sama dengan modul Capaian). Tombol "Simpan Draf" (tombol pertama, juga
 * tombol Enter) dan "Ajukan" mengirim `aksi`; di HP keduanya menempel di bawah layar. Isian dikendalikan state supaya
 * tidak hilang saat ditolak.
 */
export function FormPengukuran(p: {
  kunci: { indikatorId: string; unitId: string; bulan: string };
  faktor: number;
  satuan: string;
  arah: Arah;
  target: number;
  definisiNumerator: string;
  definisiDenominator: string;
  awal: { n: number; d: number; catatan: string } | null;
}) {
  const [state, action, pending] = useActionState(simpanPengukuranAction, {});
  const [n, setN] = useState(p.awal ? String(p.awal.n) : "");
  const [d, setD] = useState(p.awal ? String(p.awal.d) : "");
  const [catatan, setCatatan] = useState(p.awal?.catatan ?? "");
  const [nAngka, dAngka] = [bilanganBulat(n), bilanganBulat(d)];
  const capaian = nAngka !== null && dAngka !== null ? hitungCapaian(nAngka, dAngka, p.faktor) : undefined;
  const pratinjau = capaian === undefined ? null : capaian === null ? "kosong (D = 0)" : formatCapaian(capaian, p.satuan);
  const status = capaian === undefined || capaian === null ? null : tercapai(capaian, p.target, p.arah);
  const target = `${TANDA_ARAH[p.arah]} ${formatCapaian(p.target, p.satuan)}`;

  // Card tanpa overflow-hidden supaya bar tombol di HP tetap menempel (sticky) di bawah layar.
  return (
    <Card className="gap-0 overflow-visible p-5 sm:p-6">
      <form action={action} className="grid gap-5">
        <input type="hidden" name="indikatorId" value={p.kunci.indikatorId} />
        <input type="hidden" name="unitId" value={p.kunci.unitId} />
        <input type="hidden" name="bulan" value={p.kunci.bulan} />

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
          <KolomAngka id="n" label="Numerator" singkat="N" definisi={p.definisiNumerator} nilai={n} ubah={setN} />
          <KolomAngka id="d" label="Denominator" singkat="D" definisi={p.definisiDenominator} nilai={d} ubah={setD} />
          <div
            aria-live="polite"
            className={`grid min-w-0 content-start gap-1 rounded-xl p-4 ${status === null ? "bg-muted" : status ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink"}`}
          >
            <p className="text-[15px] font-bold">Pratinjau Capaian</p>
            {pratinjau === null ? (
              <p className="text-[14px] text-muted-foreground">Isi N dan D dengan bilangan bulat untuk melihat Capaian.</p>
            ) : (
              <>
                <p className="text-[36px] leading-10 font-bold tracking-[-0.02em]">{pratinjau}</p>
                <p className="text-[14px] font-semibold">
                  {status === null ? "Tanpa Status Capaian" : status ? "Tercapai" : "Belum Tercapai"} · Target {target}
                </p>
                <p className="text-[13px] opacity-80">
                  {nAngka} ÷ {dAngka} × {p.faktor}
                </p>
              </>
            )}
          </div>
        </div>

        <Kolom
          label={
            // Satu span: Label memakai flex + gap, jadi "(opsional)" tetap berjarak satu spasi.
            <span>
              Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
            </span>
          }
          htmlFor="catatan"
          petunjuk={<span id="catatan-petunjuk">Jangan menulis identitas pasien (nama, nomor rekam medis, tanggal lahir).</span>}
        >
          <Textarea
            id="catatan"
            name="catatan"
            rows={3}
            maxLength={1000}
            aria-describedby="catatan-petunjuk"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </Kolom>

        <PesanError pesan={state.error} />
        {/* Di HP tombol menempel di bawah layar, selebar kartu. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 grid grid-cols-2 gap-2 rounded-b-2xl border-t border-border bg-card/95 px-5 py-3 sm:static sm:m-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" variant="outline" size="lg" name="aksi" value="simpan" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Menyimpan…" : "Simpan Draf"}
          </Button>
          <Button
            type="submit"
            size="lg"
            name="aksi"
            value="ajukan"
            disabled={pending}
            onClick={(e) => {
              const teks = pratinjau === null ? "" : ` dengan Capaian ${pratinjau}`;
              if (!confirm(`Ajukan Pengukuran ini${teks}? Setelah diajukan, N dan D tidak bisa diubah lagi.`)) {
                e.preventDefault();
              }
            }}
            className="w-full sm:w-auto"
          >
            <Ikon nama="verifikasi" className="size-[18px]" />
            {/* Label lengkap tidak muat di setengah lebar HP. */}
            <span className="sm:hidden">Ajukan</span>
            <span className="max-sm:hidden">Ajukan untuk Verifikasi</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
