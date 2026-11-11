"use client";

import { useActionState, useState } from "react";

import { formatCapaian, hitungCapaian, tercapai } from "@/lib/capaian";
import { TANDA_ARAH, type Arah } from "@/lib/indikator";

import { Button } from "@/components/ui/button";
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
    <div className="flex min-w-0 flex-col gap-2 bg-paper-2 p-5 sm:p-6">
      <Label htmlFor={p.id} className="justify-between text-[14px] font-medium text-ink-2">
        <span>{p.label}</span>
        <span className="text-ink-3">{p.singkat}</span>
      </Label>
      <p id={`${p.id}-definisi`} className="max-w-[60ch] text-[14px] leading-5 whitespace-pre-line text-ink-3">
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
        className="mt-auto h-16 px-4 text-[28px] font-medium tracking-[-0.02em] placeholder:text-ink-3/60 sm:text-[28px]"
      />
    </div>
  );
}

/**
 * Formulir isian N, D, dan Catatan dengan pratinjau Capaian terhadap Target bulan itu (label Tercapai atau Belum
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

  // Bacaan N, D, dan Capaian sebagai satu permukaan dibagi garis rambut; Catatan di baris bawahnya.
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="indikatorId" value={p.kunci.indikatorId} />
      <input type="hidden" name="unitId" value={p.kunci.unitId} />
      <input type="hidden" name="bulan" value={p.kunci.bulan} />

      <div className="grid gap-px overflow-hidden rounded-card border border-rule bg-rule">
        <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
          <KolomAngka id="n" label="Numerator" singkat="N" definisi={p.definisiNumerator} nilai={n} ubah={setN} />
          <KolomAngka id="d" label="Denominator" singkat="D" definisi={p.definisiDenominator} nilai={d} ubah={setD} />
          <div aria-live="polite" className="flex min-w-0 flex-col gap-3 bg-paper-2 p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
            <p className="text-[14px] font-medium text-ink-2">Pratinjau Capaian</p>
            {pratinjau === null ? (
              <p className="max-w-[40ch] text-[15px] text-ink-3">Isi N dan D dengan bilangan bulat untuk melihat Capaian.</p>
            ) : (
              <div className="grid gap-2">
                <p
                  className={`terukur leading-none tracking-[-0.04em] break-words text-ink ${capaian === null ? "text-[24px]" : "text-[44px] sm:text-[52px]"}`}
                >
                  {pratinjau}
                </p>
                <p className="terukur text-[13px] text-ink-3">
                  {nAngka} ÷ {dAngka} × {p.faktor}
                </p>
              </div>
            )}
            <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-[14px] text-ink-2">
              {pratinjau !== null &&
                (status === null ? (
                  <span className="text-ink-3">Tanpa Status Capaian</span>
                ) : (
                  <Pil nada={status ? "pos" : "neg"}>{status ? "Tercapai" : "Belum Tercapai"}</Pil>
                ))}
              <span>Target {target}</span>
            </p>
          </div>
        </div>

        <div className="bg-paper-2 p-5 sm:p-6">
          <Kolom
            label={
              // Satu span: Label memakai flex + gap, jadi "(opsional)" tetap berjarak satu spasi.
              <span>
                Catatan <span className="font-normal text-ink-3">(opsional)</span>
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
        </div>
      </div>

      <PesanError pesan={state.error} />
      {/* Di HP tombol menempel di bawah layar, selebar layar. */}
      <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-2 border-t border-rule bg-paper px-4 py-3 sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" variant="outline" size="lg" name="aksi" value="simpan" disabled={pending} className="w-full disabled:opacity-50 sm:w-auto">
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
          className="w-full disabled:opacity-50 sm:w-auto"
        >
          <Ikon nama="verifikasi" className="size-[18px]" />
          {/* Label lengkap tidak muat di setengah lebar HP. */}
          <span className="sm:hidden">Ajukan</span>
          <span className="max-sm:hidden">Ajukan untuk Verifikasi</span>
        </Button>
      </div>
    </form>
  );
}
