"use client";

import { useActionState } from "react";

import { aturAktifUnitAction, gantiNamaUnitAction, tambahUnitAction } from "./actions";

const kelasInput =
  "h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-danger pointer-coarse:h-11";
const kelasTombol = "h-10 shrink-0 rounded-md px-4 font-semibold disabled:opacity-70 pointer-coarse:h-11";
const tombolUtama = `${kelasTombol} bg-primary text-primary-foreground hover:bg-primary-hover`;
const tombolGaris = `${kelasTombol} border border-border hover:bg-background`;

function PesanError({ pesan }: { pesan?: string }) {
  return pesan ? (
    <p role="alert" className="text-[13px] text-danger">
      {pesan}
    </p>
  ) : null;
}

export function FormTambahUnit() {
  const [state, action, pending] = useActionState(tambahUnitAction, {});
  return (
    <form action={action} className="grid gap-1.5">
      <label htmlFor="nama-unit-baru" className="text-[13px] font-medium">
        Tambah Unit
      </label>
      <div className="flex gap-2">
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
    <li className="grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-medium">{unit.nama}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${unit.aktif ? "bg-success-soft text-success" : "bg-background text-muted-foreground"}`}
        >
          {unit.aktif ? "Aktif" : "Nonaktif"}
        </span>
        <form action={statusAction} className="ml-auto">
          <input type="hidden" name="id" value={unit.id} />
          <input type="hidden" name="aktif" value={String(!unit.aktif)} />
          <button type="submit" disabled={statusPending} className={tombolGaris}>
            {unit.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
          </button>
        </form>
      </div>
      <PesanError pesan={status.error} />
      <details>
        <summary className="w-fit cursor-pointer text-[13px] font-medium text-primary">Ganti nama</summary>
        <form action={gantiAction} className="mt-2 grid gap-1.5">
          <input type="hidden" name="id" value={unit.id} />
          <div className="flex gap-2">
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
