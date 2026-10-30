import type { Arah } from "./indikator";

/*
 * Aturan Capaian (bagian murni modul Capaian; pembacaan data dan hak akses ada di `src/modules/capaian/service.ts`).
 * Satu-satunya tempat rumus Capaian, Capaian RS, Kelengkapan, dan Status Capaian.
 */

/** Status Capaian. Capaian kosong tidak punya Status Capaian. */
export const STATUS_CAPAIAN = ["tercapai", "belumTercapai"] as const;
export type StatusCapaian = (typeof STATUS_CAPAIAN)[number];
export const LABEL_STATUS_CAPAIAN: Record<StatusCapaian, string> = {
  tercapai: "Tercapai",
  belumTercapai: "Belum Tercapai",
};

/**
 * Capaian = N/D × faktor; kosong (null) bila D = 0. Dikalikan dulu baru dibagi: (57/100) × 100 = 56,999…, sedangkan
 * 57 × 100 / 100 tepat 57, jadi Capaian yang sama dengan Target tidak dinilai Belum Tercapai.
 */
export const hitungCapaian = (n: number, d: number, faktor: number) => (d === 0 ? null : (n * faktor) / d);

/** Angka untuk tampilan: "90,5", paling banyak dua desimal. */
export const formatAngka = (angka: number) => angka.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** "90,5 %"; null (D = 0) = "kosong". */
export const formatCapaian = (capaian: number | null, satuan: string) =>
  capaian === null ? "kosong" : `${formatAngka(capaian)} ${satuan}`;

/** Kelengkapan: Pengukuran Terverifikasi dibanding Unit Pelapor yang aktif bulan itu. */
export type Kelengkapan = { terverifikasi: number; wajib: number };

/**
 * Capaian satu Indikator pada satu bulan. `pengukuran` = satu baris per Unit Pelapor yang aktif bulan itu beserta
 * Pengukuran Terverifikasi-nya (n dan d null = belum Terverifikasi). Capaian RS = semua Unit Pelapor itu (ΣN/ΣD,
 * bukan rata-rata Capaian Unit); Capaian Unit = baris Unit itu saja (kosong bila bukan Unit Pelapor bulan itu).
 * Status Capaian menurut Arah dan Target yang berlaku bulan itu; Capaian kosong tidak punya status.
 */
export function capaianDari(
  pengukuran: readonly { n: number | null; d: number | null }[],
  indikator: { faktor: number; arah: Arah },
  target: number,
) {
  let [n, d, terverifikasi] = [0, 0, 0];
  for (const p of pengukuran) {
    if (p.n === null || p.d === null) continue;
    n += p.n;
    d += p.d;
    terverifikasi += 1;
  }
  const capaian = hitungCapaian(n, d, indikator.faktor);
  const tercapai = capaian !== null && (indikator.arah === "makinTinggi" ? capaian >= target : capaian <= target);
  return {
    target,
    n,
    d,
    capaian,
    selisih: capaian === null ? null : capaian - target,
    status: capaian === null ? null : tercapai ? ("tercapai" as const) : ("belumTercapai" as const),
    kelengkapan: { terverifikasi, wajib: pengukuran.length } satisfies Kelengkapan,
  };
}
