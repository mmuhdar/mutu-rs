"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INPUT_BULAN } from "@/lib/bulan";
import {
  KEPUTUSAN_PDSA,
  LABEL_KEPUTUSAN_PDSA,
  LABEL_TAHAP_PDSA,
  tahapBerikutnya,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";
import type { PlanPdsa } from "@/modules/perbaikan/service";

import { Kolom, PesanError, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";
import { Ikon } from "../ikon";
import { buatPdsaAction, simpanTahapPdsaAction } from "./actions";

function Teks({ nama, label, petunjuk, awal, baris = 3 }: { nama: string; label: string; petunjuk?: string; awal?: string; baris?: number }) {
  return (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <Textarea id={nama} name={nama} rows={baris} required maxLength={4000} defaultValue={awal} className="leading-6" />
    </Kolom>
  );
}

type AwalPlan = Partial<PlanPdsa>;

/** Isian Plan. `judulTetap` = siklus berikutnya: judul disalin dari siklus sebelumnya, tidak diisi. */
function IsianPlan({ awal, judulTetap = false }: { awal: AwalPlan; judulTetap?: boolean }) {
  return (
    <div className="grid gap-4">
      {judulTetap ? (
        <input type="hidden" name="judul" value={awal.judul ?? ""} />
      ) : (
        <Kolom label="Judul" htmlFor="judul" petunjuk="Perubahan yang diuji coba, mis. Uji coba handrub di setiap tempat tidur ICU.">
          <Input id="judul" name="judul" required maxLength={200} defaultValue={awal.judul} className="text-[16px] font-semibold" />
        </Kolom>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Teks nama="masalah" label="Masalah" petunjuk="Apa yang ingin diperbaiki, dari Analisis atau data Capaian." awal={awal.masalah} />
        <Teks nama="tujuan" label="Tujuan" petunjuk="Hasil yang ingin dicapai, sebisa mungkin dengan angka." awal={awal.tujuan} />
        <Teks nama="prediksi" label="Prediksi" petunjuk="Apa yang diperkirakan terjadi bila perubahan dijalankan." awal={awal.prediksi} />
        <Teks
          nama="rencana"
          label="Rencana perubahan"
          petunjuk="Apa yang diubah, siapa, di mana, dan cara mengukurnya. Mulai dari skala kecil."
          awal={awal.rencana}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:max-w-xl">
        <Kolom label="Uji coba mulai" htmlFor="bulanMulai">
          <Input id="bulanMulai" name="bulanMulai" {...INPUT_BULAN} required defaultValue={awal.bulanMulai} />
        </Kolom>
        <Kolom label="Uji coba sampai" htmlFor="bulanAkhir">
          <Input id="bulanAkhir" name="bulanAkhir" {...INPUT_BULAN} required defaultValue={awal.bulanAkhir} />
        </Kolom>
      </div>
    </div>
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
    <form action={action} className="grid gap-5">
      {p.sebelumnyaId ? (
        <input type="hidden" name="sebelumnyaId" value={p.sebelumnyaId} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Kolom label="Indikator" htmlFor="indikatorId">
            {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
            <PilihCari
              key={awal.indikatorId}
              id="indikatorId"
              nama="indikatorId"
              wajib
              nilai={awal.indikatorId ?? ""}
              placeholder="Pilih Indikator"
              cari="Cari kode atau nama Indikator…"
              pilihan={p.indikator.map((i) => ({ nilai: i.id, label: i.label }))}
            />
          </Kolom>
          {p.lingkup.length <= 4 ? (
            <Segmen
              key={awal.unitId}
              nama="unitId"
              label="Lingkup"
              pilihan={p.lingkup.map((l) => ({ nilai: l.id, label: l.label }))}
              nilai={awal.unitId}
              wajib
            />
          ) : (
            <Kolom label="Lingkup" htmlFor="unitId">
              {/* Tanpa pilihan kosong: nilai awalnya Lingkup pertama, seperti select sebelumnya. */}
              <PilihCari
                key={awal.unitId}
                id="unitId"
                nama="unitId"
                nilai={awal.unitId ?? p.lingkup[0]?.id}
                cari="Cari Lingkup…"
                pilihan={p.lingkup.map((l) => ({ nilai: l.id, label: l.label }))}
              />
            </Kolom>
          )}
        </div>
      )}
      <IsianPlan awal={awal} judulTetap={Boolean(p.sebelumnyaId)} />
      <PesanError pesan={state.error} />
      <div className="grid border-t border-border pt-5">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
          {pending ? "Menyimpan…" : "Simpan Plan dan mulai Do"}
          <Ikon nama="kanan" className="size-[18px]" />
        </Button>
      </div>
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
        baris={5}
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
        baris={5}
      />
    );
  }
  return (
    <>
      {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
      <Segmen
        key={awal.keputusan ?? ""}
        nama="keputusan"
        label="Keputusan"
        pilihan={KEPUTUSAN_PDSA.map((k) => ({ nilai: k, label: LABEL_KEPUTUSAN_PDSA[k] }))}
        nilai={awal.keputusan}
        wajib
      />
      <Teks
        nama="penjelasan"
        label="Penjelasan"
        petunjuk="Adopsi: perubahan yang diterapkan luas (SPO atau regulasi baru). Adaptasi: apa yang diubah untuk siklus berikutnya. Tinggalkan: alasannya."
        awal={awal.penjelasan ?? ""}
        baris={5}
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
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tahap" value={tahap} />
      {tahap === "plan" ? <IsianPlan awal={nilai as AwalPlan} /> : <IsianTahap tahap={tahap} awal={nilai} />}
      <PesanError pesan={state.error} />
      <div className="grid gap-2.5 sm:grid-flow-col sm:justify-start">
        {aktif && (
          <Button type="submit" name="lanjut" value="ya" size="lg" disabled={pending} className="w-full sm:w-auto">
            {berikut === "selesai" ? "Simpan dan selesaikan PDSA" : `Simpan dan lanjut ke ${LABEL_TAHAP_PDSA[berikut]}`}
            <Ikon nama={berikut === "selesai" ? "centang" : "kanan"} className="size-[18px]" />
          </Button>
        )}
        <Button type="submit" variant={aktif ? "outline" : "default"} size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
