import { Pil } from "../ui";

/** Hasil validasi sebagai teks (warna hanya pelengkap): Valid, Tidak valid (belum diulang), atau Tidak valid, diulang. */
export function LabelHasilValidasi({ valid, belumValid }: { valid: boolean; belumValid: boolean }) {
  if (valid) return <Pil nada="pos">Valid</Pil>;
  return belumValid ? <Pil nada="neg">Tidak valid</Pil> : <Pil nada="redup">Tidak valid, sudah diulang</Pil>;
}

/** Kesesuaian dalam huruf ukur: "93,8%" beserta "15/16". */
export function Kesesuaian({ persen, sesuai, sampel }: { persen: number; sesuai: number; sampel: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="terukur text-[15px] text-cool">{persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>{" "}
      <span className="terukur text-[12px] text-ink-3">
        {sesuai}/{sampel}
      </span>
    </span>
  );
}
