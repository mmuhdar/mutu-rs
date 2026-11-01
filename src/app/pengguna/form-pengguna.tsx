"use client";

import { useActionState, useState } from "react";

import { LABEL_PERAN, PERAN, PERAN_BER_UNIT, type Peran } from "@/lib/peran";
import type { daftarPengguna } from "@/modules/pengguna/service";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { kelasPetunjuk, Kolom, PesanError, Segmen } from "../form";
import { Ikon } from "../ikon";
import { inisial } from "../nav-samping";
import { isiNada, type Nada, Pil, TableCell, TableRow } from "../ui";
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
        <Input id={`${idAwalan}-nama`} name="nama" required maxLength={120} defaultValue={awal.nama} />
      </Kolom>
      <div className="col-span-full">
        {/* key: pilihan bawaan dibuat ulang supaya peran yang ditolak tetap terpilih setelah form di-reset. */}
        <Segmen key={awal.peran} nama="peran" label="Peran" pilihan={PILIHAN_PERAN} nilai={awal.peran} wajib />
      </div>
      <fieldset className="col-span-full grid min-w-0 gap-1.5">
        <legend className="text-sm font-semibold">Unit</legend>
        <p className={kelasPetunjuk}>Wajib untuk {PERAN_BER_UNIT_TEKS} (boleh lebih dari satu). Peran lain tidak punya Unit.</p>
        {unit.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Belum ada Unit aktif.</p>
        ) : (
          <div className="mt-1 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {unit.map((u) => {
              const dipilih = awal.unitIds.includes(u.id);
              return (
                // key memuat pilihan bawaan: Checkbox (Radix) kembali ke pilihan saat dipasang ketika form di-reset, jadi
                // pilihan Unit yang ditolak tetap tercentang setelah form di-reset (seperti `key` pada select).
                <label
                  key={`${u.id}:${dipilih}`}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[14px] font-medium hover:border-primary/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-tint has-data-[state=checked]:text-primary-ink has-focus-visible:ring-2 has-focus-visible:ring-primary"
                >
                  <Checkbox name="unitIds" value={u.id} defaultChecked={dipilih} />
                  {u.nama}
                </label>
              );
            })}
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
          <Input
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
          />
        </Kolom>
        <Kolom label="Sandi awal" htmlFor="baru-sandi" petunjuk="Minimal 8 karakter. Pengguna bisa menggantinya sendiri.">
          <Input id="baru-sandi" name="sandi" type="password" required minLength={8} autoComplete="new-password" />
        </Kolom>
        <IsianPengguna idAwalan="baru" awal={{ ...isian, unitIds: isian?.unitIds ?? [] }} unit={unit} />
      </div>
      <Pesan state={state} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        <Ikon nama="tambah" className="size-[18px]" />
        {pending ? "Menyimpan…" : "Tambah Pengguna"}
      </Button>
    </form>
  );
}

const NADA_PERAN: Record<Peran, Nada> = {
  petugasInputData: "ukur",
  kepalaUnit: "pantau",
  komiteMutu: "brand",
  direktur: "tindak",
  adminSistem: "atur",
};

/*
 * Di HP tabel menjadi daftar bertumpuk (setiap baris = grid, kepala tabel disembunyikan halaman), supaya panel isian
 * selebar layar dan tidak perlu digeser ke samping.
 */
const trHp =
  "max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-3 max-sm:border-t max-sm:border-rule max-sm:px-2 max-sm:py-4 max-sm:first:border-t-0";
const tdHp = "max-sm:border-0 max-sm:p-0";

/**
 * Satu baris tabel kelola + baris panel di bawahnya (Ubah nama, peran, dan Unit / Reset sandi / pesan). Halaman memberi
 * `key` berisi seluruh data Pengguna, jadi baris dibuat ulang (panel tertutup, pesan hilang) setelah datanya berubah.
 */
export function BarisPengguna({ pengguna: p, unit }: { pengguna: BarisDaftar; unit: PilihanUnit }) {
  const [ubah, ubahAction, ubahPending] = useActionState(ubahPenggunaAction, {});
  const [sandi, sandiAction, sandiPending] = useActionState(resetSandiAction, {});
  const [status, statusAction, statusPending] = useActionState(aturAktifPenggunaAction, {});
  const [buka, setBuka] = useState<"ubah" | "sandi" | null>(null);
  const awal = ubah.isian ?? { nama: p.nama, peran: p.peran, unitIds: p.unit.map((u) => u.id) };
  const panel = buka !== null || !!status.error || !!status.berhasil;
  const tanpaGaris = panel ? "border-b-0!" : "";
  const tombolPanel = (nama: "ubah" | "sandi", ikon: "isi" | "sandi", label: string) => (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-expanded={buka === nama}
      onClick={() => setBuka(buka === nama ? null : nama)}
      title={label}
      className="text-muted-foreground shadow-none hover:text-primary-ink"
    >
      <Ikon nama={ikon} className="size-4" />
      <span className="sr-only">
        {label} {p.nama}
      </span>
    </Button>
  );
  return (
    <>
      <TableRow className={trHp}>
        <TableCell className={`${tanpaGaris} ${tdHp} max-sm:col-span-2`}>
          <span className="flex items-center gap-3">
            <Avatar aria-hidden className="size-9 after:hidden">
              <AvatarFallback className={`text-[13px] font-bold text-white ${isiNada(p.aktif ? NADA_PERAN[p.peran] : "netral")}`}>
                {inisial(p.nama)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{p.nama}</span>
                {/* Hanya yang nonaktif yang diberi tanda; aktif adalah keadaan biasa. */}
                {!p.aktif && <Pil nada="netral">Nonaktif</Pil>}
              </span>
              <span className="block text-[13px] text-muted-foreground">{p.username}</span>
            </span>
          </span>
        </TableCell>
        <TableCell className={`${tanpaGaris} ${tdHp}`}>
          <Pil nada={NADA_PERAN[p.peran]}>{LABEL_PERAN[p.peran]}</Pil>
        </TableCell>
        <TableCell className={`${tanpaGaris} ${tdHp}`}>
          {p.unit.length === 0 ? (
            <span className="text-muted-foreground">
              <span aria-hidden>–</span>
              <span className="sr-only">Tanpa Unit</span>
            </span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {p.unit.map((u) => (
                <span key={u.id} className="rounded-full bg-muted px-2.5 py-0.5 text-[13px] whitespace-nowrap">
                  {u.aktif ? u.nama : `${u.nama} (Unit nonaktif)`}
                </span>
              ))}
            </span>
          )}
        </TableCell>
        <TableCell className={`text-right ${tanpaGaris} ${tdHp} max-sm:col-span-2 max-sm:text-left`}>
          <span className="inline-flex items-center gap-2">
            {tombolPanel("ubah", "isi", "Ubah nama, peran, dan Unit")}
            {tombolPanel("sandi", "sandi", "Reset sandi")}
            <form action={statusAction}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="aktif" value={String(!p.aktif)} />
              <Button type="submit" variant="outline" size="sm" disabled={statusPending} className="shadow-none">
                {p.aktif ? "Nonaktifkan" : "Aktifkan kembali"}
              </Button>
            </form>
          </span>
        </TableCell>
      </TableRow>
      {panel && (
        <TableRow className="max-sm:block">
          <TableCell colSpan={4} className="pt-0 max-sm:block max-sm:border-0 max-sm:px-2">
            <div className="grid gap-3">
              <Pesan state={status} />
              {buka === "ubah" && (
                <form action={ubahAction} className="grid gap-4 rounded-xl border border-border bg-head p-4 sm:grid-cols-2">
                  <p className="text-[15px] font-bold sm:col-span-2">Ubah nama, peran, dan Unit</p>
                  <input type="hidden" name="id" value={p.id} />
                  <IsianPengguna idAwalan={p.id} awal={awal} unit={unit} />
                  <div className="grid gap-2 sm:col-span-2">
                    <Pesan state={ubah} />
                    <Button type="submit" size="lg" disabled={ubahPending} className="w-full sm:w-auto sm:justify-self-start">
                      Simpan
                    </Button>
                  </div>
                </form>
              )}
              {buka === "sandi" && (
                <form action={sandiAction} className="grid max-w-xl gap-1.5 rounded-xl border border-border bg-head p-4">
                  <input type="hidden" name="id" value={p.id} />
                  <Label htmlFor={`${p.id}-sandi`} className="font-semibold">
                    Sandi baru untuk {p.nama}
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input id={`${p.id}-sandi`} name="sandi" type="password" required minLength={8} autoComplete="new-password" />
                    <Button type="submit" size="lg" disabled={sandiPending} className="w-full sm:w-auto">
                      Simpan
                    </Button>
                  </div>
                  <Pesan state={sandi} />
                </form>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
