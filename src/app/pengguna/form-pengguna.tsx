"use client";

import { useActionState } from "react";

import { LABEL_PERAN, PERAN, PERAN_BER_UNIT } from "@/lib/peran";
import type { daftarPengguna } from "@/modules/pengguna/service";

import { kelasInput, kelasLabel, kelasPetunjuk, Kolom, PesanError, Segmen, tombolGaris, tombolUtama } from "../form";
import { Pil } from "../ui";
import {
  aturAktifPenggunaAction,
  resetSandiAction,
  tambahPenggunaAction,
  ubahPenggunaAction,
  type StatePengguna,
} from "./actions";

type BarisDaftar = Awaited<ReturnType<typeof daftarPengguna>>[number];
type PilihanUnit = { id: string; nama: string }[];

const PERAN_BER_UNIT_TEKS = PERAN_BER_UNIT.map((p) => LABEL_PERAN[p]).join(" dan ");
const PILIHAN_PERAN = PERAN.map((p) => ({ nilai: p, label: LABEL_PERAN[p] }));
const kelasRingkas = "w-fit cursor-pointer text-[14px] font-semibold text-area-ink pointer-coarse:py-1.5";

function Pesan({ state }: { state: StatePengguna }) {
  if (state.error) return <PesanError pesan={state.error} />;
  return state.berhasil ? (
    <p role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-[14px] text-success-ink">
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
      <Kolom label="Nama" htmlFor={`${idAwalan}-nama`}>
        <input id={`${idAwalan}-nama`} name="nama" required maxLength={120} defaultValue={awal.nama} className={kelasInput} />
      </Kolom>
      <div className="col-span-full">
        {/* key: pilihan bawaan dibuat ulang supaya peran yang ditolak tetap terpilih setelah form di-reset. */}
        <Segmen key={awal.peran} nama="peran" label="Peran" pilihan={PILIHAN_PERAN} nilai={awal.peran} wajib />
      </div>
      <fieldset className="col-span-full grid min-w-0 gap-1.5">
        <legend className={kelasLabel}>Unit</legend>
        <p className={kelasPetunjuk}>Wajib untuk {PERAN_BER_UNIT_TEKS} (boleh lebih dari satu). Peran lain tidak punya Unit.</p>
        {unit.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Belum ada Unit aktif.</p>
        ) : (
          <div className="mt-1 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {unit.map((u) => (
              <label
                key={u.id}
                className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[14px] font-medium hover:border-area/50 has-checked:border-area has-checked:bg-area-tint has-checked:text-area-ink has-focus-visible:ring-2 has-focus-visible:ring-area"
              >
                <input type="checkbox" name="unitIds" value={u.id} defaultChecked={awal.unitIds.includes(u.id)} className="size-4 accent-area" />
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
    <form action={action} className="grid gap-4 px-5 pb-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kolom label="Username" htmlFor="baru-username">
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
        </Kolom>
        <Kolom label="Sandi awal" htmlFor="baru-sandi" petunjuk="Minimal 8 karakter. Pengguna bisa menggantinya sendiri.">
          <input id="baru-sandi" name="sandi" type="password" required minLength={8} autoComplete="new-password" className={kelasInput} />
        </Kolom>
        <IsianPengguna idAwalan="baru" awal={{ ...isian, unitIds: isian?.unitIds ?? [] }} unit={unit} />
      </div>
      <Pesan state={state} />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Tambah Pengguna"}
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
    <li className="grid gap-3 px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[16px] font-semibold">{p.nama}</span>
            <span className="text-muted-foreground">{p.username}</span>
            {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
            {!p.aktif && <Pil nada="netral">Nonaktif</Pil>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[14px]">
            <span className="font-medium text-area-ink">{LABEL_PERAN[p.peran]}</span>
            {p.unit.map((u) => (
              <span key={u.id} className="rounded-full bg-active px-2.5 py-0.5 text-[13px]">
                {u.aktif ? u.nama : `${u.nama} (Unit nonaktif)`}
              </span>
            ))}
          </p>
        </div>
        <form action={statusAction} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="aktif" value={String(!p.aktif)} />
          <button type="submit" disabled={statusPending} className={tombolGaris}>
            {p.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
          </button>
        </form>
      </div>
      <Pesan state={status} />
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <details className="open:w-full open:rounded-2xl open:bg-area-tint/50 open:p-4">
          <summary className={kelasRingkas}>Ubah nama, peran, dan Unit</summary>
          <form action={ubahAction} className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={p.id} />
            <IsianPengguna idAwalan={p.id} awal={awal} unit={unit} />
            <div className="grid gap-2 sm:col-span-2">
              <Pesan state={ubah} />
              <button type="submit" disabled={ubahPending} className={tombolUtama}>
                Simpan
              </button>
            </div>
          </form>
        </details>
        <details className="open:w-full open:rounded-2xl open:bg-area-tint/50 open:p-4">
          <summary className={kelasRingkas}>Reset sandi</summary>
          <form action={sandiAction} className="mt-3 grid max-w-xl gap-1.5">
            <input type="hidden" name="id" value={p.id} />
            <label htmlFor={`${p.id}-sandi`} className={kelasLabel}>
              Sandi baru untuk {p.nama}
            </label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
