import type { Metadata } from "next";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs } from "@/modules/capaian/service";
import { bolehBacaLingkup, daftarTindakLanjut, type SaringanStatusTindakLanjut } from "@/modules/perbaikan/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { kelasInput, kelasKartu, Pesan, pesanAtau } from "../pengukuran/status";
import { TabelTindakLanjut } from "./tabel";

export const metadata: Metadata = { title: "Tindak Lanjut" };

const PILIHAN_STATUS: [SaringanStatusTindakLanjut, string][] = [
  ["terbuka", "Direncanakan dan Berjalan"],
  ...STATUS_TINDAK_LANJUT.map((s) => [s, LABEL_STATUS_TINDAK_LANJUT[s]] as [SaringanStatusTindakLanjut, string]),
  ["semua", "Semua status"],
];

/** Daftar Tindak Lanjut yang boleh dilihat: lewat tenggat paling atas, lalu urut tenggat. `?status=&unit=` (unit "rs" = Lingkup RS). */
export default async function HalamanTindakLanjut({ searchParams }: PageProps<"/tindak-lanjut">) {
  const pengguna = await requireUser();
  const sp = await searchParams;
  const status = (teksAlamat(sp, "status") || "terbuka") as SaringanStatusTindakLanjut;
  const unit = teksAlamat(sp, "unit");
  const semuaLingkup = melihatCapaianRs(pengguna);
  // Pilihan Lingkup: Unit aktif yang boleh dibaca aktor (dan Lingkup RS bagi yang melihat semua).
  const pilihan = (await pilihanUnit(pengguna)).filter((u) => bolehBacaLingkup(pengguna, u.id));
  // Status dan Lingkup di luar hak/daftar ditolak service.
  const daftar = await pesanAtau(
    daftarTindakLanjut(pengguna, { status, lingkup: unit === "rs" ? null : unit || undefined }),
  );

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Tindak Lanjut</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Tindakan perbaikan dari Analisis. Yang lewat tenggat paling atas. Status diubah di halaman Analisis-nya.
        </p>
      </div>

      <form method="get" className={`${kelasKartu} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="status" className="text-[13px] font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={kelasInput}>
            {PILIHAN_STATUS.map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="unit" className="text-[13px] font-medium">
            Lingkup
          </label>
          <select id="unit" name="unit" defaultValue={unit} className={kelasInput}>
            <option value="">{semuaLingkup ? "Semua Lingkup" : "Semua Unit saya"}</option>
            {semuaLingkup && <option value="rs">{labelLingkup(null)}</option>}
            {pilihan.map((u) => (
              <option key={u.id} value={u.id}>
                {labelLingkup(u)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-11 rounded-md border border-border px-4 font-semibold hover:bg-background">
          Tampilkan
        </button>
      </form>

      {typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : daftar.length === 0 ? (
        <Pesan>Tidak ada Tindak Lanjut dengan saringan ini.</Pesan>
      ) : (
        <div className={`${kelasKartu} overflow-hidden`}>
          <TabelTindakLanjut
            daftar={daftar}
            atas={(t) => `${t.indikator.kode} · ${labelLingkup(t.unit)} · Analisis ${labelBulan(t.bulan, { pendek: true })}`}
            href={(t) => tautanAnalisis(t.indikator.id, t.unit?.id ?? null, t.bulan)}
          />
        </div>
      )}
    </section>
  );
}
