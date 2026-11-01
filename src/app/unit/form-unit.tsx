"use client";

import { useActionState } from "react";

import { kelasInput, kelasLabel, PesanError, tombolGaris, tombolUtama } from "../form";
import { Pil } from "../ui";
import { aturAktifUnitAction, gantiNamaUnitAction, tambahUnitAction } from "./actions";

export function FormTambahUnit() {
  const [state, action, pending] = useActionState(tambahUnitAction, {});
  return (
    <form action={action} className="mt-5 grid max-w-xl gap-1.5">
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
          {pending ? "Menyimpan…" : "Tambah"}
        </button>
      </div>
      <PesanError pesan={state.error} />
    </form>
  );
}

/** Satu baris daftar kelola. Halaman memberi `key` berisi nama, jadi baris dibuat ulang (form tertutup) setelah ganti nama. */
export function BarisUnit({ unit }: { unit: { id: string; nama: string; aktif: boolean } }) {
  const [ganti, gantiAction, gantiPending] = useActionState(gantiNamaUnitAction, {});
  const [status, statusAction, statusPending] = useActionState(aturAktifUnitAction, {});
  return (
    <li className="grid gap-2 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[16px] font-semibold">{unit.nama}</span>
        {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
        {!unit.aktif && <Pil nada="netral">Nonaktif</Pil>}
        <form action={statusAction} className="w-full sm:ml-auto sm:w-auto">
          <input type="hidden" name="id" value={unit.id} />
          <input type="hidden" name="aktif" value={String(!unit.aktif)} />
          <button type="submit" disabled={statusPending} className={tombolGaris}>
            {unit.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
          </button>
        </form>
      </div>
      <PesanError pesan={status.error} />
      <details>
        <summary className="w-fit cursor-pointer text-[14px] font-semibold text-area-ink pointer-coarse:py-1.5">Ganti nama</summary>
        <form action={gantiAction} className="mt-2 grid max-w-xl gap-1.5">
          <input type="hidden" name="id" value={unit.id} />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              name="nama"
              required
              maxLength={80}
              aria-label={`Nama baru untuk ${unit.nama}`}
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
      </details>
    </li>
  );
}
