import type { Metadata } from "next";

import { ServiceError } from "@/lib/errors";
import { daftarPengguna } from "@/modules/pengguna/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { BarisPengguna, FormTambahPengguna } from "./form-pengguna";

export const metadata: Metadata = { title: "Pengguna" };

const kelasKartu = "rounded-lg border border-border bg-surface shadow-xs";

export default async function HalamanPengguna() {
  const pengguna = await requireUser();
  // Hak akses diperiksa di service; penolakannya ditampilkan sebagai pesan, bukan halaman error.
  const daftar = await daftarPengguna(pengguna).catch((error) => {
    if (error instanceof ServiceError) return error.message;
    throw error;
  });
  if (typeof daftar === "string") {
    return (
      <p role="alert" className={`${kelasKartu} p-5`}>
        {daftar}
      </p>
    );
  }
  const unit = await pilihanUnit(pengguna);

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Pengguna</h1>
        <p className="mt-1 max-w-prose text-[13.5px] text-muted-foreground">
          Pengguna tidak dihapus, hanya dinonaktifkan: Pengguna nonaktif tidak bisa masuk, tetapi jejaknya tetap ada.
        </p>
      </div>
      <div className={`${kelasKartu} p-4`}>
        <FormTambahPengguna unit={unit} />
      </div>
      <ul className={`${kelasKartu} divide-y divide-border`}>
        {daftar.map((p) => (
          <BarisPengguna key={JSON.stringify(p)} pengguna={p} unit={unit} />
        ))}
      </ul>
    </section>
  );
}
