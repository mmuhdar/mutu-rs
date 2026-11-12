"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INPUT_BULAN } from "@/lib/bulan";
import {
  JENIS_SUMBER_DAYA,
  KEPUTUSAN_PDSA,
  LABEL_KEPUTUSAN_PDSA,
  LABEL_SUMBER_DAYA,
  LABEL_TAHAP_PDSA,
  tahapBerikutnya,
  type TahapIsianPdsa,
} from "@/lib/perbaikan";
import type { PlanPdsa } from "@/modules/perbaikan/service";

import { kelasPetunjuk, Kolom, PesanError, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";
import { Ikon } from "../ikon";
import { buatPdsaAction, simpanEfisiensiAction, simpanTahapPdsaAction } from "./actions";

function Teks({ nama, label, petunjuk, awal, baris = 3 }: { nama: string; label: string; petunjuk?: string; awal?: string; baris?: number }) {
  return (
    <Kolom label={label} htmlFor={nama} petunjuk={petunjuk}>
      <Textarea id={nama} name={nama} rows={baris} required maxLength={4000} defaultValue={awal} className="leading-6" />
    </Kolom>
  );
}

/**
 * Satu baris isian Plan seperti baris rekaman Plan di detail PDSA: label dan petunjuk di kiri, isian di kanan (di layar
 * sempit bertumpuk); baris dipisah garis rambut.
 */
function Baris(p: { label: React.ReactNode; htmlFor?: string; petunjuk?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-rule py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
      <div className="grid content-start gap-1">
        {p.htmlFor ? (
          <Label htmlFor={p.htmlFor} className="font-medium">
            {p.label}
          </Label>
        ) : (
          <p className="text-sm font-medium">{p.label}</p>
        )}
        {p.petunjuk && <p className={kelasPetunjuk}>{p.petunjuk}</p>}
      </div>
      {p.children}
    </div>
  );
}

function TeksPlan({ nama, label, petunjuk, awal }: { nama: string; label: string; petunjuk: string; awal?: string }) {
  return (
    <Baris label={label} htmlFor={nama} petunjuk={petunjuk}>
      <Textarea id={nama} name={nama} rows={3} required maxLength={4000} defaultValue={awal} className="leading-6" />
    </Baris>
  );
}

type AwalPlan = Partial<PlanPdsa>;

/** Isian Plan. `judulTetap` = siklus berikutnya: judul disalin dari siklus sebelumnya, tidak diisi. */
function IsianPlan({ awal, judulTetap = false }: { awal: AwalPlan; judulTetap?: boolean }) {
  return (
    <div className="grid">
      {judulTetap ? (
        <input type="hidden" name="judul" value={awal.judul ?? ""} />
      ) : (
        <Baris label="Judul" htmlFor="judul" petunjuk="Perubahan yang diuji coba, mis. Uji coba handrub di setiap tempat tidur ICU.">
          <Input id="judul" name="judul" required maxLength={200} defaultValue={awal.judul} className="text-[16px]" />
        </Baris>
      )}
      <TeksPlan nama="masalah" label="Masalah" petunjuk="Apa yang ingin diperbaiki, dari Analisis atau data Capaian." awal={awal.masalah} />
      <TeksPlan nama="tujuan" label="Tujuan" petunjuk="Hasil yang ingin dicapai, sebisa mungkin dengan angka." awal={awal.tujuan} />
      <TeksPlan nama="prediksi" label="Prediksi" petunjuk="Apa yang diperkirakan terjadi bila perubahan dijalankan." awal={awal.prediksi} />
      <TeksPlan
        nama="rencana"
        label="Rencana perubahan"
        petunjuk="Apa yang diubah, siapa, di mana, dan cara mengukurnya. Mulai dari skala kecil."
        awal={awal.rencana}
      />
      <Baris label="Periode uji coba">
        <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
          <Kolom label="Uji coba mulai" htmlFor="bulanMulai">
            <Input id="bulanMulai" name="bulanMulai" {...INPUT_BULAN} required defaultValue={awal.bulanMulai} />
          </Kolom>
          <Kolom label="Uji coba sampai" htmlFor="bulanAkhir">
            <Input id="bulanAkhir" name="bulanAkhir" {...INPUT_BULAN} required defaultValue={awal.bulanAkhir} />
          </Kolom>
        </div>
      </Baris>
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
        <div className="-mb-5 grid gap-4 border-b border-rule pb-5 md:grid-cols-2">
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
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan Plan dan mulai Do"}
      </Button>
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
            {berikut === "selesai" && <Ikon nama="centang" className="size-[18px]" />}
          </Button>
        )}
        <Button type="submit" variant={aktif ? "outline" : "default"} size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Form Analisis Efisiensi (PMKP 4 g): biaya Rupiah tiap jenis sumber daya sebelum dan sesudah perbaikan, per periode
 * yang sama; jenis yang tidak relevan dikosongkan. `awal` = isian tersimpan (nama field form → nilai).
 */
export function FormEfisiensi({ id, awal }: { id: string; awal: Record<string, string> }) {
  const [state, action, pending] = useActionState(simpanEfisiensiAction, {});
  const a = { ...awal, ...state.nilai };
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <p className={kelasPetunjuk}>
        Biaya dalam Rupiah tanpa titik, untuk periode yang sama sebelum dan sesudah perbaikan (mis. per bulan); jelaskan periodenya di
        kesimpulan. Kosongkan jenis yang tidak terkait.
      </p>
      <div className="grid gap-4">
        {JENIS_SUMBER_DAYA.map((j) => (
          <fieldset key={j} className="min-w-0 border-b border-rule pb-4">
            <legend className="mb-2 text-sm font-medium">{LABEL_SUMBER_DAYA[j]}</legend>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,10rem)_minmax(0,1fr)]">
              <Kolom label="Sebelum (Rp)" htmlFor={`sebelum-${j}`}>
                <Input id={`sebelum-${j}`} name={`sebelum-${j}`} type="number" inputMode="numeric" min={0} defaultValue={a[`sebelum-${j}`]} />
              </Kolom>
              <Kolom label="Sesudah (Rp)" htmlFor={`sesudah-${j}`}>
                <Input id={`sesudah-${j}`} name={`sesudah-${j}`} type="number" inputMode="numeric" min={0} defaultValue={a[`sesudah-${j}`]} />
              </Kolom>
              <Kolom label="Keterangan" htmlFor={`keterangan-${j}`}>
                <Input id={`keterangan-${j}`} name={`keterangan-${j}`} maxLength={1000} defaultValue={a[`keterangan-${j}`]} />
              </Kolom>
            </div>
          </fieldset>
        ))}
      </div>
      <Teks
        nama="kesimpulan"
        label="Kesimpulan efisiensi"
        petunjuk="Periode perhitungan, sumber angka, dan apakah perbaikan lebih efisien tanpa menurunkan Capaian."
        awal={a.kesimpulan}
        baris={4}
      />
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan Analisis Efisiensi"}
      </Button>
    </form>
  );
}
