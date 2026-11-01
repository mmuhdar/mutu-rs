"use client";

import { useActionState } from "react";

import { LABEL_STATUS_TINDAK_LANJUT, STATUS_TINDAK_LANJUT, type StatusTindakLanjut } from "@/lib/perbaikan";

import { tambahTindakLanjutAction, ubahTindakLanjutAction } from "./actions";
import { HasilForm, kelasArea, tombolUtama } from "./form-analisis";

const kelasBaris = `${kelasArea} h-11 py-0`;

function Kolom({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

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
          defaultValue={awal.tindakan}
          className={kelasArea}
        />
      </Kolom>
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom label="PIC (nama atau jabatan)" htmlFor={`pic-${id}`}>
          <input id={`pic-${id}`} name="pic" required maxLength={120} defaultValue={awal.pic} className={kelasBaris} />
        </Kolom>
        <Kolom label="Tenggat" htmlFor={`tenggat-${id}`}>
          <input
            id={`tenggat-${id}`}
            name="tenggat"
            type="date"
            required
            placeholder="YYYY-MM-DD"
            defaultValue={awal.tenggat}
            className={kelasBaris}
          />
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
      <h3 className="font-semibold">Tambah Tindak Lanjut</h3>
      <input type="hidden" name="analisisId" value={analisisId} />
      <IsianDasar id="baru" awal={state.nilai ?? {}} />
      <HasilForm state={state} tersimpan="Tindak Lanjut ditambahkan." />
      <button type="submit" disabled={pending} className={tombolUtama}>
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
    <details open={Boolean(state.error)}>
      <summary className="cursor-pointer text-[13px] font-medium text-primary pointer-coarse:py-2">
        Ubah atau perbarui status
      </summary>
      <form action={action} className="mt-2 grid gap-3">
        <input type="hidden" name="id" value={t.id} />
        <IsianDasar id={t.id} awal={awal} />
        <Kolom label="Status" htmlFor={`status-${t.id}`}>
          {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
          <select key={awal.status} id={`status-${t.id}`} name="status" defaultValue={awal.status} className={kelasBaris}>
            {STATUS_TINDAK_LANJUT.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_TINDAK_LANJUT[s]}
              </option>
            ))}
          </select>
        </Kolom>
        <Kolom label="Catatan (hasil saat Selesai, alasan saat Dibatalkan)" htmlFor={`catatan-${t.id}`}>
          <textarea
            id={`catatan-${t.id}`}
            name="catatan"
            rows={2}
            maxLength={1000}
            defaultValue={awal.catatan}
            className={kelasArea}
          />
        </Kolom>
        <HasilForm state={state} tersimpan="Tindak Lanjut tersimpan." />
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
    </details>
  );
}
