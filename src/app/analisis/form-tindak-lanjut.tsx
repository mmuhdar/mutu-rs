"use client";

import { useActionState } from "react";

import { LABEL_STATUS_TINDAK_LANJUT, STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "@/lib/perbaikan";

import { kelasArea, kelasInput, Kolom, PesanError, Segmen, tombolGaris, tombolUtama } from "../form";
import { Ikon } from "../ikon";
import { tambahTindakLanjutAction, ubahTindakLanjutAction } from "./actions";

/** Tindakan, PIC, dan tenggat; `awal` = nilai bawaan, `id` = akhiran id unik per form. */
function IsianDasar({ id, awal }: { id: string; awal: { tindakan?: string; pic?: string; tenggat?: string } }) {
  return (
    <>
      <Kolom label="Tindakan" htmlFor={`tindakan-${id}`}>
        <textarea
          id={`tindakan-${id}`}
          name="tindakan"
          rows={2}
          required
          maxLength={1000}
          placeholder="Apa yang akan dilakukan"
          defaultValue={awal.tindakan}
          className={kelasArea}
        />
      </Kolom>
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom label="PIC" htmlFor={`pic-${id}`}>
          <input
            id={`pic-${id}`}
            name="pic"
            required
            maxLength={120}
            placeholder="Nama atau jabatan"
            defaultValue={awal.pic}
            className={kelasInput}
          />
        </Kolom>
        <Kolom label="Tenggat" htmlFor={`tenggat-${id}`}>
          <input id={`tenggat-${id}`} name="tenggat" type="date" required defaultValue={awal.tenggat} className={kelasInput} />
        </Kolom>
      </div>
    </>
  );
}

/** Form tambah Tindak Lanjut ke Analisis yang sudah disimpan. */
export function FormTambahTindakLanjut({ analisisId }: { analisisId: string }) {
  const [state, action, pending] = useActionState(tambahTindakLanjutAction, {});
  return (
    <form action={action} className="grid gap-3">
      <h3 className="text-[15px] font-bold">Tambah Tindak Lanjut</h3>
      <input type="hidden" name="analisisId" value={analisisId} />
      <IsianDasar id="baru" awal={state.nilai ?? {}} />
      <PesanError pesan={state.error} />
      {/* Tombol kedua: tombol utama halaman ini = Simpan Analisis. */}
      <button type="submit" disabled={pending} className={tombolGaris}>
        <Ikon nama="tambah" className="size-[18px]" />
        {pending ? "Menyimpan…" : "Tambah Tindak Lanjut"}
      </button>
    </form>
  );
}

/** Ubah satu Tindak Lanjut, termasuk statusnya; catatan wajib saat Selesai (hasil) dan Dibatalkan (alasan). */
export function FormUbahTindakLanjut({
  t,
}: {
  t: { id: string; tindakan: string; pic: string; tenggat: string; status: StatusTindakLanjut; catatan: string };
}) {
  const [state, action, pending] = useActionState(ubahTindakLanjutAction, {});
  const awal = state.nilai ?? t;
  return (
    <details open={Boolean(state.error)} className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold hover:bg-active group-open:bg-active pointer-coarse:py-2 [&::-webkit-details-marker]:hidden">
        <Ikon nama="isi" className="size-4" />
        Perbarui status atau ubah
      </summary>
      <form action={action} className="mt-2 grid gap-3 rounded-xl border border-border bg-head p-4">
        <input type="hidden" name="id" value={t.id} />
        {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
        <Segmen
          key={awal.status}
          nama="status"
          label="Status"
          pilihan={STATUS_TINDAK_LANJUT.map((s) => ({ nilai: s, label: LABEL_STATUS_TINDAK_LANJUT[s] }))}
          nilai={awal.status}
          wajib
        />
        <Kolom label="Catatan" petunjuk="Hasil saat Selesai, alasan saat Dibatalkan." htmlFor={`catatan-${t.id}`}>
          <textarea id={`catatan-${t.id}`} name="catatan" rows={2} maxLength={1000} defaultValue={awal.catatan} className={kelasArea} />
        </Kolom>
        <IsianDasar id={t.id} awal={awal} />
        <PesanError pesan={state.error} />
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
    </details>
  );
}
