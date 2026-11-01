"use client";

import { useActionState, useState } from "react";

import { kelasInput, kelasLabel, PesanError, tombolBaris, tombolIkon, tombolUtama } from "../form";
import { Ikon } from "../ikon";
import { kelasTd, KotakIkon, Pil } from "../ui";
import { aturAktifUnitAction, gantiNamaUnitAction, tambahUnitAction } from "./actions";

export function FormTambahUnit() {
  const [state, action, pending] = useActionState(tambahUnitAction, {});
  return (
    <form action={action} className="grid max-w-xl gap-1.5">
      <label htmlFor="nama-unit-baru" className={kelasLabel}>
        Tambah Unit
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          id="nama-unit-baru"
          name="nama"
          required
          maxLength={80}
          placeholder="mis. Rawat Inap"
          defaultValue={state.nama}
          aria-invalid={!!state.error}
          className={kelasInput}
        />
        <button type="submit" disabled={pending} className={tombolUtama}>
          <Ikon nama="tambah" className="size-[18px]" />
          {pending ? "Menyimpan…" : "Tambah"}
        </button>
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
      <tr>
        <td className={`${kelasTd} ${panel ? "border-b-0!" : ""}`}>
          <span className="flex items-center gap-3">
            <KotakIkon nada={unit.aktif ? "atur" : "netral"} ikon="unit" kecil />
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{unit.nama}</span>
              {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
              {!unit.aktif && <Pil nada="netral">Nonaktif</Pil>}
            </span>
          </span>
        </td>
        <td className={`${kelasTd} text-right ${panel ? "border-b-0!" : ""}`}>
          <span className="inline-flex items-center gap-2">
            <button type="button" aria-expanded={buka} onClick={() => setBuka(!buka)} title="Ganti nama" className={tombolIkon}>
              <Ikon nama="isi" className="size-4" />
              <span className="sr-only">Ganti nama {unit.nama}</span>
            </button>
            <form action={statusAction}>
              <input type="hidden" name="id" value={unit.id} />
              <input type="hidden" name="aktif" value={String(!unit.aktif)} />
              <button type="submit" disabled={statusPending} className={tombolBaris}>
                {unit.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
              </button>
            </form>
          </span>
        </td>
      </tr>
      {panel && (
        <tr>
          <td colSpan={2} className={`${kelasTd} pt-0`}>
            <div className="grid gap-3">
              <PesanError pesan={status.error} />
              {buka && (
                <form action={gantiAction} className="grid max-w-xl gap-1.5 rounded-xl border border-border bg-head p-4">
                  <input type="hidden" name="id" value={unit.id} />
                  <label htmlFor={`nama-${unit.id}`} className={kelasLabel}>
                    Nama baru untuk {unit.nama}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      id={`nama-${unit.id}`}
                      name="nama"
                      required
                      maxLength={80}
                      defaultValue={ganti.nama ?? unit.nama}
                      aria-invalid={!!ganti.error}
                      className={kelasInput}
                    />
                    <button type="submit" disabled={gantiPending} className={tombolUtama}>
                      Simpan
                    </button>
                  </div>
                  <PesanError pesan={ganti.error} />
                </form>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
