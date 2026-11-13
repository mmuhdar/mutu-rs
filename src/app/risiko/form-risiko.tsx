"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EFEKTIVITAS,
  KATEGORI_RISIKO,
  LABEL_EFEKTIVITAS,
  LABEL_KATEGORI_RISIKO,
  LABEL_TINGKAT_RISIKO,
  nilaiRisikoAtauNull,
  SKALA_RISIKO,
  tingkatTurun,
  formatBobot,
} from "@/lib/risiko";

import { kelasPetunjuk, Kolom, PesanError, Segmen } from "../form";
import { PilihCari } from "../pilih-cari";
import { simpanRisikoAction } from "./actions";

/** Isian awal form: nama field → nilai teks. Pemantauan dan Efektivitas yang belum diisi = "belum". */
export type AwalRisiko = Partial<Record<string, string>>;

const SKALA = SKALA_RISIKO.map((n) => ({ nilai: String(n), label: String(n) }));
const SKALA_PEMANTAUAN = [{ nilai: "belum", label: "Belum" }, ...SKALA];

/** Pratinjau penilaian dari aturan murni yang sama dengan service. */
function Pratinjau({ p, d }: { p?: string; d?: string }) {
  const n = nilaiRisikoAtauNull(Number(p), Number(d));
  return (
    <p aria-live="polite" className="text-[15px]">
      {n ? (
        <>
          Nilai Risiko <span className="terukur text-cool">{n.nilai}</span>, bobot <span className="terukur">{formatBobot(n.bobot)}</span>:{" "}
          {LABEL_TINGKAT_RISIKO[n.tingkat]}, Prioritas <span className="terukur">{n.prioritas}</span>
        </>
      ) : (
        <span className="text-ink-3">Nilai Risiko dihitung dari matriks Probabilitas × Dampak.</span>
      )}
    </p>
  );
}

/**
 * Form Risiko. Tanpa `id` = Risiko baru (Unit dan tahun dipilih); dengan `id` = mengubah (Unit dan tahun tetap).
 * Hasil Pemantauan dan Efektivitas boleh diisi kemudian.
 */
export function FormRisiko(p: { id?: string; unit: { id: string; label: string }[]; awal: AwalRisiko; tahunMaks: number }) {
  const [state, action, pending] = useActionState(simpanRisikoAction, {});
  const a = { ...p.awal, ...state.nilai };
  const [nilai, setNilai] = useState({
    probabilitas: a.probabilitas,
    dampak: a.dampak,
    probabilitasPemantauan: a.probabilitasPemantauan,
    dampakPemantauan: a.dampakPemantauan,
  });
  const ubah = (nama: keyof typeof nilai) => (v: string) => setNilai((x) => ({ ...x, [nama]: v }));
  const awal = nilaiRisikoAtauNull(Number(nilai.probabilitas), Number(nilai.dampak));
  const turun = awal && tingkatTurun(awal, nilaiRisikoAtauNull(Number(nilai.probabilitasPemantauan), Number(nilai.dampakPemantauan)));

  return (
    <form action={action} className="grid gap-6">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      {!p.id && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
          <Kolom label="Unit" htmlFor="unitId">
            {/* key: pilihan yang ditolak tetap terpilih setelah form di-reset. */}
            <PilihCari key={a.unitId} id="unitId" nama="unitId" wajib nilai={a.unitId} placeholder="Pilih Unit" cari="Cari Unit…" pilihan={p.unit.map((u) => ({ nilai: u.id, label: u.label }))} />
          </Kolom>
          <Kolom label="Tahun" htmlFor="tahun">
            <Input id="tahun" name="tahun" type="number" inputMode="numeric" min={2000} max={p.tahunMaks} required defaultValue={a.tahun} />
          </Kolom>
        </div>
      )}
      <Kolom label="Risiko" htmlFor="uraian" petunjuk="Kejadian yang mungkin terjadi dan akibatnya.">
        <Textarea id="uraian" name="uraian" rows={2} required maxLength={2000} defaultValue={a.uraian} className="leading-6" />
      </Kolom>
      <Segmen
        key={`kategori:${a.kategori}`}
        nama="kategori"
        label="Kategori Risiko"
        wajib
        nilai={a.kategori}
        pilihan={KATEGORI_RISIKO.map((k) => ({ nilai: k, label: LABEL_KATEGORI_RISIKO[k] }))}
      />

      <fieldset className="grid min-w-0 gap-4">
        <legend className="mb-1 font-display text-[17px] font-medium tracking-[-0.01em]">Penilaian Awal</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmen key={`p:${a.probabilitas}`} nama="probabilitas" label="Probabilitas" wajib nilai={a.probabilitas} pilihan={SKALA} onChange={ubah("probabilitas")} />
          <Segmen key={`d:${a.dampak}`} nama="dampak" label="Dampak" wajib nilai={a.dampak} pilihan={SKALA} onChange={ubah("dampak")} />
        </div>
        <Pratinjau p={nilai.probabilitas} d={nilai.dampak} />
      </fieldset>

      <fieldset className="grid min-w-0 gap-4">
        <legend className="mb-1 font-display text-[17px] font-medium tracking-[-0.01em]">Perlakuan</legend>
        <Kolom label="Langkah perlakuan" htmlFor="perlakuan" petunjuk="Satu langkah per baris.">
          <Textarea id="perlakuan" name="perlakuan" rows={4} maxLength={8000} defaultValue={a.perlakuan} className="leading-6" />
        </Kolom>
        <Kolom label="Jadwal pelaksanaan" htmlFor="jadwal" petunjuk="Opsional.">
          <Input id="jadwal" name="jadwal" type="date" defaultValue={a.jadwal} className="sm:max-w-[12rem]" />
        </Kolom>
      </fieldset>

      <fieldset className="grid min-w-0 gap-4">
        <legend className="mb-1 font-display text-[17px] font-medium tracking-[-0.01em]">Hasil Pemantauan</legend>
        <p className={kelasPetunjuk}>Penilaian ulang setelah Perlakuan berjalan. Biarkan Belum bila belum dipantau.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Segmen
            key={`pp:${a.probabilitasPemantauan}`}
            nama="probabilitasPemantauan"
            label="Probabilitas"
            nilai={a.probabilitasPemantauan ?? "belum"}
            pilihan={SKALA_PEMANTAUAN}
            onChange={ubah("probabilitasPemantauan")}
          />
          <Segmen
            key={`dp:${a.dampakPemantauan}`}
            nama="dampakPemantauan"
            label="Dampak"
            nilai={a.dampakPemantauan ?? "belum"}
            pilihan={SKALA_PEMANTAUAN}
            onChange={ubah("dampakPemantauan")}
          />
        </div>
        <Pratinjau p={nilai.probabilitasPemantauan} d={nilai.dampakPemantauan} />
        <Segmen
          key={`e:${a.efektivitas}`}
          nama="efektivitas"
          label="Efektivitas Perlakuan"
          nilai={a.efektivitas ?? "belum"}
          pilihan={[{ nilai: "belum", label: "Belum dinilai" }, ...EFEKTIVITAS.map((e) => ({ nilai: e, label: LABEL_EFEKTIVITAS[e] }))]}
        />
        {turun !== null && (
          <p aria-live="polite" className="text-[15px]">
            Simpulan Tingkat Risiko: <span className={turun ? "text-ok" : "text-bad"}>{turun ? "ada penurunan" : "tidak ada penurunan"}</span>
          </p>
        )}
      </fieldset>

      <PesanError pesan={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {pending ? "Menyimpan…" : p.id ? "Simpan perubahan" : "Simpan Risiko"}
      </Button>
    </form>
  );
}
