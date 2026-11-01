import type { Metadata } from "next";

import { daftarUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { pesanAtau } from "../pengukuran/status";
import { BarisUnit, FormTambahUnit } from "./form-unit";

export const metadata: Metadata = { title: "Unit" };

const kelasKartu = "rounded-lg border border-border bg-surface";

export default async function HalamanUnit() {
  const pengguna = await requireUser();
  // Hak akses diperiksa di service; penolakannya ditampilkan sebagai pesan, bukan halaman error.
  const daftar = await pesanAtau(daftarUnit(pengguna));
  if (typeof daftar === "string") {
    return (
      <p role="alert" className={`${kelasKartu} p-5`}>
        {daftar}
      </p>
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Unit</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Daftar baku Unit. Unit nonaktif hilang dari pilihan Unit, tetapi datanya tetap ada.
        </p>
      </div>
      <div className={`${kelasKartu} p-4`}>
        <FormTambahUnit />
      </div>
      <div className={kelasKartu}>
        {daftar.length === 0 ? (
          <p className="p-4 text-muted-foreground">Belum ada Unit.</p>
        ) : (
          <ul className="divide-y divide-border">
            {daftar.map((unit) => (
              <BarisUnit key={`${unit.id}:${unit.nama}`} unit={unit} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
