"use client";

import { useActionState } from "react";

import { LABEL_PERAN, PERAN, PERAN_BER_UNIT } from "@/lib/peran";
import type { daftarPengguna } from "@/modules/pengguna/service";

import {
  aturAktifPenggunaAction,
  resetSandiAction,
  tambahPenggunaAction,
  ubahPenggunaAction,
  type StatePengguna,
} from "./actions";

type BarisDaftar = Awaited<ReturnType<typeof daftarPengguna>>[number];
type PilihanUnit = { id: string; nama: string }[];

const kelasInput =
  "h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-danger pointer-coarse:h-11";
const kelasTombol = "h-10 shrink-0 rounded-md px-4 font-semibold disabled:opacity-70 pointer-coarse:h-11";
const tombolUtama = `${kelasTombol} bg-primary text-primary-foreground hover:bg-primary-hover`;
const tombolGaris = `${kelasTombol} border border-border hover:bg-background`;
const kelasLabel = "text-[13px] font-medium";
const PERAN_BER_UNIT_TEKS = PERAN_BER_UNIT.map((p) => LABEL_PERAN[p]).join(" dan ");

function Pesan({ state }: { state: StatePengguna }) {
  if (state.error) {
    return (
      <p role="alert" className="text-[13px] text-danger">
        {state.error}
      </p>
    );
  }
  return state.berhasil ? (
    <p role="status" className="text-[13px] text-success">
      {state.berhasil}
    </p>
  ) : null;
}

/** Nama, peran, dan Unit: sama untuk tambah dan ubah. `idAwalan` membuat id input unik per baris. */
function IsianPengguna({
  idAwalan,
  awal,
  unit,
}: {
  idAwalan: string;
  awal: { nama?: string; peran?: string; unitIds: string[] };
  unit: PilihanUnit;
}) {
  return (
    <>
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${idAwalan}-nama`} className={kelasLabel}>
          Nama
        </label>
        <input
          id={`${idAwalan}-nama`}
          name="nama"
          required
          maxLength={120}
          defaultValue={awal.nama}
          className={kelasInput}
        />
      </div>
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${idAwalan}-peran`} className={kelasLabel}>
          Peran
        </label>
        {/* key: React tidak memperbarui pilihan bawaan select yang sudah ada; dibuat ulang supaya peran yang ditolak tetap terpilih setelah form di-reset. */}
        <select
          key={awal.peran}
          id={`${idAwalan}-peran`}
          name="peran"
          required
          defaultValue={awal.peran ?? ""}
          className={kelasInput}
        >
          <option value="" disabled>
            Pilih peran
          </option>
          {PERAN.map((p) => (
            <option key={p} value={p}>
              {LABEL_PERAN[p]}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid gap-1.5 sm:col-span-2">
        <legend className={kelasLabel}>Unit</legend>
        <p className="text-[12.5px] text-muted-foreground">
          Wajib untuk {PERAN_BER_UNIT_TEKS} (boleh lebih dari satu). Peran lain tidak punya Unit.
        </p>
        {unit.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Belum ada Unit aktif.</p>
        ) : (
          <div className="mt-1 grid max-h-52 gap-x-4 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
            {unit.map((u) => (
              <label key={u.id} className="flex items-center gap-2 py-1 pointer-coarse:py-2">
                <input
                  type="checkbox"
                  name="unitIds"
                  value={u.id}
                  defaultChecked={awal.unitIds.includes(u.id)}
                  className="size-4 accent-primary"
                />
                {u.nama}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}

export function FormTambahPengguna({ unit }: { unit: PilihanUnit }) {
  const [state, action, pending] = useActionState(tambahPenggunaAction, {});
  const isian = state.isian;
  return (
    <form action={action} className="grid gap-3">
      <h2 className="text-[15px] font-semibold">Tambah Pengguna</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <label htmlFor="baru-username" className={kelasLabel}>
            Username
          </label>
          <input
            id="baru-username"
            name="username"
            required
            maxLength={64}
            pattern="\S+"
            title="Tanpa spasi"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={isian?.username}
            className={kelasInput}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor="baru-sandi" className={kelasLabel}>
            Sandi awal
          </label>
          <input
            id="baru-sandi"
            name="sandi"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={kelasInput}
          />
          <p className="text-[12.5px] text-muted-foreground">Minimal 8 karakter. Pengguna bisa menggantinya sendiri.</p>
        </div>
        <IsianPengguna idAwalan="baru" awal={{ ...isian, unitIds: isian?.unitIds ?? [] }} unit={unit} />
      </div>
      <Pesan state={state} />
      <button type="submit" disabled={pending} className={`${tombolUtama} justify-self-start`}>
        {pending ? "Menyimpan…" : "Tambah"}
      </button>
    </form>
  );
}

/**
 * Satu baris daftar kelola. Halaman memberi `key` berisi seluruh data Pengguna, jadi baris dibuat ulang
 * (form tertutup, pesan hilang) setelah datanya berubah.
 */
export function BarisPengguna({ pengguna: p, unit }: { pengguna: BarisDaftar; unit: PilihanUnit }) {
  const [ubah, ubahAction, ubahPending] = useActionState(ubahPenggunaAction, {});
  const [sandi, sandiAction, sandiPending] = useActionState(resetSandiAction, {});
  const [status, statusAction, statusPending] = useActionState(aturAktifPenggunaAction, {});
  const awal = ubah.isian ?? { nama: p.nama, peran: p.peran, unitIds: p.unit.map((u) => u.id) };
  return (
    <li className="grid gap-2 p-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="font-medium">
            {p.nama} <span className="font-normal text-muted-foreground">({p.username})</span>
          </p>
          <p className="text-[13px] text-muted-foreground">
            {LABEL_PERAN[p.peran]}
            {p.unit.length > 0 && ` · ${p.unit.map((u) => (u.aktif ? u.nama : `${u.nama} (Unit nonaktif)`)).join(", ")}`}
          </p>
        </div>
        {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
        {!p.aktif && (
          <span className="inline-flex h-5 flex-none items-center rounded-full bg-active px-2 text-[12px] font-medium text-muted-foreground">
            Nonaktif
          </span>
        )}
        <form action={statusAction} className="ml-auto">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="aktif" value={String(!p.aktif)} />
          <button type="submit" disabled={statusPending} className={tombolGaris}>
            {p.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
          </button>
        </form>
      </div>
      <Pesan state={status} />
      <div className="grid gap-2">
        <details>
          <summary className="w-fit cursor-pointer text-[13px] font-medium text-accent">Ubah nama, peran, dan Unit</summary>
          <form action={ubahAction} className="mt-2 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={p.id} />
            <IsianPengguna idAwalan={p.id} awal={awal} unit={unit} />
            <div className="grid gap-2 sm:col-span-2">
              <Pesan state={ubah} />
              <button type="submit" disabled={ubahPending} className={`${tombolUtama} justify-self-start`}>
                Simpan
              </button>
            </div>
          </form>
        </details>
        <details>
          <summary className="w-fit cursor-pointer text-[13px] font-medium text-accent">Reset sandi</summary>
          <form action={sandiAction} className="mt-2 grid gap-1.5">
            <input type="hidden" name="id" value={p.id} />
            <label htmlFor={`${p.id}-sandi`} className={kelasLabel}>
              Sandi baru untuk {p.nama}
            </label>
            <div className="flex gap-2">
              <input
                id={`${p.id}-sandi`}
                name="sandi"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={kelasInput}
              />
              <button type="submit" disabled={sandiPending} className={tombolUtama}>
                Simpan
              </button>
            </div>
            <Pesan state={sandi} />
          </form>
        </details>
      </div>
    </li>
  );
}
