"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PesanError } from "../form";
import { Ikon } from "../ikon";
import { KotakIkon, Pil, TableCell, TableRow } from "../ui";
import { aturAktifUnitAction, gantiNamaUnitAction, tambahUnitAction } from "./actions";

/** Tombol ikon pembuka panel baris: tepi dan ikon ungu saat panelnya terbuka. */
const kelasTombolPanel =
  "text-muted-foreground shadow-none hover:text-primary-ink";

export function FormTambahUnit() {
  const [state, action, pending] = useActionState(tambahUnitAction, {});
  return (
    <form action={action} className="grid max-w-xl gap-1.5">
      <Label htmlFor="nama-unit-baru" className="font-semibold">
        Tambah Unit
      </Label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          id="nama-unit-baru"
          name="nama"
          required
          maxLength={80}
          placeholder="mis. Rawat Inap"
          defaultValue={state.nama}
          aria-invalid={!!state.error}
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          <Ikon nama="tambah" className="size-[18px]" />
          {pending ? "Menyimpan…" : "Tambah"}
        </Button>
      </div>
      <PesanError pesan={state.error} />
    </form>
  );
}

/**
 * Satu baris tabel kelola (+ baris panel Ganti nama / pesan penolakan di bawahnya). Halaman memberi `key` berisi nama,
 * jadi baris dibuat ulang (panel tertutup) setelah ganti nama.
 */
export function BarisUnit({ unit }: { unit: { id: string; nama: string; aktif: boolean } }) {
  const [ganti, gantiAction, gantiPending] = useActionState(gantiNamaUnitAction, {});
  const [status, statusAction, statusPending] = useActionState(aturAktifUnitAction, {});
  const [buka, setBuka] = useState(false);
  const panel = buka || !!status.error;
  return (
    <>
      <TableRow>
        <TableCell className={`${panel ? "border-b-0!" : ""}`}>
          <span className="flex items-center gap-3">
            <KotakIkon nada={unit.aktif ? "atur" : "netral"} ikon="unit" kecil />
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{unit.nama}</span>
              {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
              {!unit.aktif && <Pil nada="netral">Nonaktif</Pil>}
            </span>
          </span>
        </TableCell>
        <TableCell className={`text-right ${panel ? "border-b-0!" : ""}`}>
          <span className="inline-flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-expanded={buka}
              onClick={() => setBuka(!buka)}
              title="Ganti nama"
              className={kelasTombolPanel}
            >
              <Ikon nama="isi" className="size-4" />
              <span className="sr-only">Ganti nama {unit.nama}</span>
            </Button>
            <form action={statusAction}>
              <input type="hidden" name="id" value={unit.id} />
              <input type="hidden" name="aktif" value={String(!unit.aktif)} />
              <Button type="submit" variant="outline" size="sm" disabled={statusPending} className="shadow-none">
                {unit.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
              </Button>
            </form>
          </span>
        </TableCell>
      </TableRow>
      {panel && (
        <TableRow>
          <TableCell colSpan={2} className="pt-0">
            <div className="grid gap-3">
              <PesanError pesan={status.error} />
              {buka && (
                <form action={gantiAction} className="grid max-w-xl gap-1.5 rounded-xl border border-border bg-head p-4">
                  <input type="hidden" name="id" value={unit.id} />
                  <Label htmlFor={`nama-${unit.id}`} className="font-semibold">
                    Nama baru untuk {unit.nama}
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      id={`nama-${unit.id}`}
                      name="nama"
                      required
                      maxLength={80}
                      defaultValue={ganti.nama ?? unit.nama}
                      aria-invalid={!!ganti.error}
                    />
                    <Button type="submit" size="lg" disabled={gantiPending} className="w-full sm:w-auto">
                      Simpan
                    </Button>
                  </div>
                  <PesanError pesan={ganti.error} />
                </form>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
