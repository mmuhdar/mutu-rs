"use client";

import { useActionState } from "react";

import { INPUT_BULAN } from "@/lib/bulan";
import {
  KEPUTUSAN_PDSA,
  LABEL_KEPUTUSAN_PDSA,
  LABEL_TAHAP_PDSA,
  tahapBerikutnya,
  type KeputusanPdsa,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";

import type { PlanPdsa } from "@/modules/perbaikan/service";

import { kelasArea, kelasInput, PesanError, tombolGaris, tombolUtama } from "../form";
import { buatPdsaAction, simpanTahapPdsaAction } from "./actions";

function Kolom(p: { label: string; htmlFor: string; petunjuk?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={p.htmlFor} className="text-[13px] font-medium">
        {p.label}
      </label>
      {p.petunjuk && <p className="text-[12.5px] text-muted-foreground">{p.petunjuk}</p>}
      {p.children}
    </div>
  );
}

function Teks({ nama, label, petunjuk, awal, baris = 3 }: { nama: string; label: string; petunjuk?: string; awal?: string; baris?: number }) {
  return (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <textarea id={nama} name={nama} rows={baris} required maxLength={4000} defaultValue={awal} className={kelasArea} />
    </Kolom>
  );
}

type AwalPlan = Partial<PlanPdsa>;

/** Isian Plan. `judulTetap` = siklus berikutnya: judul disalin dari siklus sebelumnya, tidak diisi. */
function IsianPlan({ awal, judulTetap = false }: { awal: AwalPlan; judulTetap?: boolean }) {
  return (
    <>
      {judulTetap ? (
        <input type="hidden" name="judul" value={awal.judul ?? ""} />
      ) : (
        <Kolom label="Judul" htmlFor="judul" petunjuk="Perubahan yang diuji coba, mis. Uji coba handrub di setiap tempat tidur ICU.">
          <input id="judul" name="judul" required maxLength={200} defaultValue={awal.judul} className={kelasInput} />
        </Kolom>
      )}
      <Teks nama="masalah" label="Masalah" petunjuk="Apa yang ingin diperbaiki, dari Analisis atau data Capaian." awal={awal.masalah} />
      <Teks nama="tujuan" label="Tujuan" petunjuk="Hasil yang ingin dicapai, sebisa mungkin dengan angka." awal={awal.tujuan} baris={2} />
      <Teks nama="prediksi" label="Prediksi" petunjuk="Apa yang diperkirakan terjadi bila perubahan dijalankan." awal={awal.prediksi} baris={2} />
      <Teks
        nama="rencana"
        label="Rencana perubahan"
        petunjuk="Apa yang diubah, siapa, di mana, dan bagaimana mengukurnya. Uji coba dalam skala kecil dulu."
        awal={awal.rencana}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom label="Bulan mulai uji coba" htmlFor="bulanMulai">
          <input id="bulanMulai" name="bulanMulai" {...INPUT_BULAN} required defaultValue={awal.bulanMulai} className={kelasInput} />
        </Kolom>
        <Kolom label="Bulan akhir uji coba" htmlFor="bulanAkhir">
          <input id="bulanAkhir" name="bulanAkhir" {...INPUT_BULAN} required defaultValue={awal.bulanAkhir} className={kelasInput} />
        </Kolom>
      </div>
    </>
  );
}

/**
 * Form memulai PDSA: Indikator, Lingkup ("" = RS), judul, dan Plan. Dengan `sebelumnyaId` (siklus berikutnya)
 * Indikator, Lingkup, dan judul ikut siklus sebelumnya, jadi tidak dipilih.
 */
export function FormPdsaBaru(p: {
  sebelumnyaId?: string;
  indikator: { id: string; label: string }[];
  lingkup: { id: string; label: string }[];
  awal: AwalPlan & { indikatorId?: string; unitId?: string };
}) {
  const [state, action, pending] = useActionState(buatPdsaAction, {});
  const awal = { ...p.awal, ...state.nilai };
  return (
    <form action={action} className="grid gap-3">
      {p.sebelumnyaId ? (
        <input type="hidden" name="sebelumnyaId" value={p.sebelumnyaId} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Kolom label="Indikator" htmlFor="indikatorId">
            {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
            <select key={awal.indikatorId} id="indikatorId" name="indikatorId" required defaultValue={awal.indikatorId ?? ""} className={kelasInput}>
              <option value="" disabled>
                Pilih Indikator
              </option>
              {p.indikator.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </Kolom>
          <Kolom label="Lingkup" htmlFor="unitId">
            <select key={awal.unitId} id="unitId" name="unitId" defaultValue={awal.unitId} className={kelasInput}>
              {p.lingkup.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Kolom>
        </div>
      )}
      <IsianPlan awal={awal} judulTetap={Boolean(p.sebelumnyaId)} />
      <PesanError pesan={state.error} />
      <button type="submit" disabled={pending} className={tombolUtama}>
        {pending ? "Menyimpan…" : "Simpan Plan dan mulai Do"}
      </button>
    </form>
  );
}

/** Isian tahap Do, Study, atau Act. */
function IsianTahap({ tahap, awal }: { tahap: Exclude<TahapIsianPdsa, "plan">; awal: Record<string, string | null> }) {
  if (tahap === "do") {
    return (
      <Teks
        nama="pelaksanaan"
        label="Pelaksanaan"
        petunjuk="Apa yang benar-benar dijalankan dalam uji coba, dan apa yang diamati (termasuk masalah yang muncul)."
        awal={awal.pelaksanaan ?? ""}
        baris={4}
      />
    );
  }
  if (tahap === "study") {
    return (
      <Teks
        nama="hasil"
        label="Hasil dibanding prediksi"
        petunjuk="Bandingkan data selama uji coba (grafik di atas) dengan prediksi di Plan. Apa yang dipelajari?"
        awal={awal.hasil ?? ""}
        baris={4}
      />
    );
  }
  return (
    <>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium">Keputusan</legend>
        {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
        <div key={awal.keputusan ?? ""} className="flex flex-wrap gap-x-5 gap-y-1">
          {KEPUTUSAN_PDSA.map((k: KeputusanPdsa) => (
            <label key={k} className="flex min-h-11 items-center gap-2">
              <input type="radio" name="keputusan" value={k} required defaultChecked={awal.keputusan === k} className="size-4" />
              {LABEL_KEPUTUSAN_PDSA[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <Teks
        nama="penjelasan"
        label="Penjelasan"
        petunjuk="Adopsi: perubahan yang diterapkan luas (SPO atau regulasi baru). Adaptasi: apa yang diubah untuk siklus berikutnya. Tinggalkan: alasannya."
        awal={awal.penjelasan ?? ""}
        baris={4}
      />
    </>
  );
}

/**
 * Form satu tahap PDSA yang sudah dicapai. `aktif` = tahap aktif: ada tombol "Simpan dan lanjut". `awal` = isian
 * tersimpan (Plan: semua field Plan).
 */
export function FormTahap({
  id,
  tahap,
  aktif,
  awal,
}: {
  id: string;
  tahap: TahapIsianPdsa;
  aktif: boolean;
  awal: Record<string, string | null>;
}) {
  const [state, action, pending] = useActionState(simpanTahapPdsaAction, {});
  const nilai = { ...awal, ...state.nilai };
  const berikut = tahapBerikutnya(tahap);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tahap" value={tahap} />
      {tahap === "plan" ? (
        <IsianPlan awal={nilai as AwalPlan} />
      ) : (
        <IsianTahap tahap={tahap} awal={nilai} />
      )}
      <PesanError pesan={state.error} />
      <div className="flex flex-wrap gap-2">
        {aktif && (
          <button type="submit" name="lanjut" value="ya" disabled={pending} className={tombolUtama}>
            {berikut === "selesai" ? "Simpan dan selesaikan PDSA" : `Simpan dan lanjut ke ${LABEL_TAHAP_PDSA[berikut]}`}
          </button>
        )}
        <button type="submit" disabled={pending} className={aktif ? tombolGaris : tombolUtama}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
