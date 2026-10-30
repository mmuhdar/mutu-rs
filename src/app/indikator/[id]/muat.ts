import { notFound } from "next/navigation";

import { ServiceError } from "@/lib/errors";
import { ambilIndikator } from "@/modules/indikator/service";
import { requireUser } from "@/server/sesi";

/** Pengguna + Indikator untuk halaman detail/ubah; id yang tidak ada menjadi halaman 404. */
export async function muatIndikator(id: string) {
  const pengguna = await requireUser();
  try {
    return { pengguna, indikator: await ambilIndikator(pengguna, id) };
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) notFound();
    throw error;
  }
}
