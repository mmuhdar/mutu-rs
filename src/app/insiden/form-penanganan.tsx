"use client";

import { Fragment, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  DAMPAK,
  FAKTOR_KONTRIBUTOR,
  LABEL_FAKTOR_KONTRIBUTOR,
  LABEL_TIPE_INSIDEN,
  LABEL_WARNA_GRADING,
  PROBABILITAS,
  TIPE_INSIDEN,
  warnaGrading,
  type FaktorKontributor,
} from "@/lib/insiden";

import { kelasPetunjuk, Kolom, PesanError } from "../form";
import { PilihCari } from "../pilih-cari";
import { bukanInsidenAction, ereportAction, gradingAction, investigasiAction, tinjauAction } from "./actions";
import { SEL_WARNA } from "./label";

/*
 * Form penanganan Insiden di halaman detail (client, `useActionState`). Grading = satu sel matriks dampak × probabilitas
 * (RadioGroup; nilai "dampak-probabilitas"), warna tiap sel ditulis di selnya.
 */

type Grading = { dampak: number; probabilitas: number } | null;

/**
 * Matriks grading KKP-RS 2008: baris = probabilitas (5 di atas), kolom = dampak. Satu sel dipilih; selnya bertuliskan
 * warna. Di HP judul baris/kolom hanya angka, keterangannya di daftar di bawah matriks.
 */
export function MatriksGrading({ nilai }: { nilai: Grading }) {
  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="text-sm font-medium">Grading risiko</legend>
      <p className={kelasPetunjuk}>
        Pilih sel pertemuan dampak (kolom) dan probabilitas (baris): seberapa sering kejadian serupa terjadi di RS.
      </p>
      {/* key: pilihan awal (mis. grading tersimpan) dipasang ulang bila berubah. */}
      <RadioGroup
        key={nilai ? `${nilai.dampak}-${nilai.probabilitas}` : "kosong"}
        name="grading"
        required
        aria-label="Matriks grading risiko"
        defaultValue={nilai ? `${nilai.dampak}-${nilai.probabilitas}` : undefined}
        className="grid max-w-2xl grid-cols-[minmax(0,1.1fr)_repeat(5,minmax(0,1fr))] gap-px overflow-hidden rounded-md border border-rule bg-rule"
      >
        {/* Di HP sudut ini kosong: petunjuk di atas sudah menyebut baris dan kolomnya. */}
        <div className="bg-paper-3 p-2 text-[12px] leading-4 text-ink-3">
          <span className="block max-sm:sr-only">Probabilitas</span>
          <span className="block text-right max-sm:sr-only">Dampak</span>
        </div>
        {DAMPAK.map((d) => (
          <div key={d.nilai} className="bg-paper-3 p-2 text-center text-[12px] leading-4">
            <span className="terukur block text-ink">{d.nilai}</span>
            <span className="text-ink-3 max-sm:sr-only">{d.label}</span>
          </div>
        ))}
        {PROBABILITAS.toReversed().map((p) => (
          <Fragment key={p.nilai}>
            <div className="bg-paper-3 p-2 text-[12px] leading-4">
              <span className="terukur text-ink">{p.nilai}</span> <span className="text-ink-3 max-sm:sr-only">{p.label}</span>
            </div>
            {DAMPAK.map((d) => {
              const w = warnaGrading(d.nilai, p.nilai);
              return (
                <label
                  key={d.nilai}
                  className={`flex min-h-11 cursor-pointer items-center justify-center px-1 text-center text-[13px] ${SEL_WARNA[w]} has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-inset has-data-[state=checked]:font-medium has-data-[state=checked]:shadow-[inset_0_0_0_2px_var(--color-ink)]`}
                >
                  <RadioGroupItem
                    value={`${d.nilai}-${p.nilai}`}
                    className="sr-only"
                    aria-label={`Dampak ${d.nilai} ${d.label}, probabilitas ${p.nilai} ${p.label}: ${LABEL_WARNA_GRADING[w]}`}
                  />
                  {LABEL_WARNA_GRADING[w]}
                </label>
              );
            })}
          </Fragment>
        ))}
      </RadioGroup>
      <dl className="grid max-w-2xl gap-x-8 gap-y-1 text-[13px] leading-5 text-ink-3 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-ink-2">Dampak</dt>
          {DAMPAK.map((d) => (
            <dd key={d.nilai}>
              <span className="terukur text-ink-2">{d.nilai}</span> {d.label}: {d.keterangan}
            </dd>
          ))}
        </div>
        <div>
          <dt className="font-medium text-ink-2">Probabilitas</dt>
          {PROBABILITAS.map((p) => (
            <dd key={p.nilai}>
              <span className="terukur text-ink-2">{p.nilai}</span> {p.label}: {p.keterangan}
            </dd>
          ))}
        </div>
      </dl>
    </fieldset>
  );
}

/** Grading awal (Kepala Unit dari Unit itu atau Komite Mutu). `petunjuk` = akibat menurut laporan. */
export function FormGrading({ id, petunjuk }: { id: string; petunjuk: string }) {
  const [state, action, pending] = useActionState(gradingAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-[14px] text-ink-2">{petunjuk}</p>
      <MatriksGrading nilai={null} />
      <p className={kelasPetunjuk}>Biru dan hijau: Investigasi Sederhana oleh Kepala Unit. Kuning, merah, dan Kejadian Sentinel: RCA oleh Komite Mutu.</p>
      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan grading"}
      </Button>
    </form>
  );
}

export type AwalInvestigasi = {
  tipeInsiden: string;
  faktorKontributor: FaktorKontributor[];
  penyebabLangsung: string;
  akarMasalah: string;
  rekomendasi: string;
};

/**
 * Isian investigasi (Investigasi Sederhana atau RCA). `rca` = RCA oleh Komite Mutu: matriks grading akhir ikut, tombol
 * utama "Selesaikan RCA"; selain itu tombol utama mengirim ke Komite Mutu.
 */
export function FormInvestigasi(p: { id: string; awal: AwalInvestigasi | null; rca: boolean; grading: Grading }) {
  const [state, action, pending] = useActionState(investigasiAction, {});
  const a = { ...p.awal, ...state.nilai };
  const faktor: readonly string[] = p.awal?.faktorKontributor ?? [];
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={p.id} />
      <Kolom label="Tipe insiden" htmlFor="tipeInsiden">
        <PilihCari
          key={a.tipeInsiden}
          id="tipeInsiden"
          nama="tipeInsiden"
          wajib
          nilai={a.tipeInsiden}
          placeholder="Pilih tipe insiden"
          cari="Cari tipe…"
          pilihan={TIPE_INSIDEN.map((t) => ({ nilai: t, label: LABEL_TIPE_INSIDEN[t] }))}
        />
      </Kolom>
      <fieldset className="grid min-w-0 gap-1.5">
        <legend className="text-sm font-medium">Faktor kontributor</legend>
        <p className={kelasPetunjuk}>Boleh lebih dari satu.</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {FAKTOR_KONTRIBUTOR.map((f) => (
            <label
              // key memuat pilihan bawaan supaya Checkbox (Radix) kembali ke pilihan itu setelah form di-reset.
              key={`${f}:${faktor.includes(f)}`}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill border border-rule-2 bg-paper-3 px-3 text-[14px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink has-data-[state=checked]:border-signal-rule has-data-[state=checked]:bg-signal-soft has-data-[state=checked]:text-ink has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <Checkbox name="faktorKontributor" value={f} defaultChecked={faktor.includes(f)} />
              {LABEL_FAKTOR_KONTRIBUTOR[f]}
            </label>
          ))}
        </div>
      </fieldset>
      <Kolom label="Penyebab langsung" htmlFor="penyebabLangsung" petunjuk="Penyebab yang langsung berhubungan dengan insiden.">
        <Textarea id="penyebabLangsung" name="penyebabLangsung" rows={3} required maxLength={4000} defaultValue={a.penyebabLangsung} className="leading-6" />
      </Kolom>
      <Kolom label="Akar masalah" htmlFor="akarMasalah" petunjuk="Tanyakan mengapa berulang sampai menemukan penyebab sistem, bukan kesalahan orang.">
        <Textarea id="akarMasalah" name="akarMasalah" rows={3} required maxLength={4000} defaultValue={a.akarMasalah} className="leading-6" />
      </Kolom>
      <Kolom label="Rekomendasi dan tindakan perbaikan" htmlFor="rekomendasi" petunjuk="Menjadi umpan balik ke Unit dan Pembuat Laporan setelah Selesai.">
        <Textarea id="rekomendasi" name="rekomendasi" rows={4} required maxLength={4000} defaultValue={a.rekomendasi} className="leading-6" />
      </Kolom>
      {p.rca && <MatriksGrading nilai={p.grading} />}
      <PesanError pesan={state.error} />
      <div className="grid gap-2.5 sm:grid-flow-col sm:justify-start">
        <Button type="submit" name="lanjut" value={p.rca ? "selesai" : "kirim"} size="lg" disabled={pending} className="w-full sm:w-auto">
          {p.rca ? "Selesaikan RCA" : "Kirim ke Komite Mutu"}
        </Button>
        <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

/** Tinjauan Komite Mutu: grading akhir (terisi grading terakhir) dan catatan opsional. */
export function FormTinjau({ id, grading }: { id: string; grading: Grading }) {
  const [state, action, pending] = useActionState(tinjauAction, {});
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <MatriksGrading nilai={grading} />
      <Kolom label="Catatan Komite Mutu" htmlFor="catatan" petunjuk="Opsional; umpan balik untuk Unit.">
        <Textarea id="catatan" name="catatan" rows={3} maxLength={1000} defaultValue={state.nilai?.catatan} className="leading-6" />
      </Kolom>
      <p className={kelasPetunjuk}>Biru atau hijau: Insiden Selesai. Kuning atau merah: dialihkan ke RCA, paling lama 45 hari.</p>
      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Simpan tinjauan"}
      </Button>
    </form>
  );
}

/** Komite Mutu menutup laporan yang bukan insiden keselamatan pasien; alasan wajib. */
export function FormBukanInsiden({ id }: { id: string }) {
  const [state, action, pending] = useActionState(bukanInsidenAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <Kolom label="Alasan" htmlFor="alasan" petunjuk="Mis. insiden pada pengunjung (ke K3 RS), atau laporan ganda.">
        <Textarea id="alasan" name="alasan" rows={2} required maxLength={1000} defaultValue={state.nilai?.alasan} className="leading-6" />
      </Kolom>
      <PesanError pesan={state.error} />
      <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : "Tandai Bukan Insiden"}
      </Button>
    </form>
  );
}

/** Tanggal laporan dikirim ke e-report Kemenkes; kosong = hapus tanda. */
export function FormEreport({ id, tanggal, maks }: { id: string; tanggal: string | null; maks: string }) {
  const [state, action, pending] = useActionState(ereportAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2.5">
        <Kolom label="Tanggal dikirim ke e-report" htmlFor="tanggal">
          {/* key: nilai tersimpan terbaru dipasang ulang setelah berhasil. */}
          <Input key={tanggal} id="tanggal" name="tanggal" type="date" max={maks} defaultValue={state.nilai?.tanggal ?? tanggal ?? ""} className="sm:w-48" />
        </Kolom>
        <Button type="submit" variant="outline" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
      <PesanError pesan={state.error} />
    </form>
  );
}
