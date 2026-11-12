import { ServiceError } from "@/lib/errors";
import type { Pengguna } from "@/modules/auth/service";
import { daftarIndikator, tambahIndikator, tambahUnitPelapor, unitPelaporAktif } from "@/modules/indikator/service";
import { daftarUnit, tambahUnit } from "@/modules/unit/service";

import type { HasilImpor, Rencana } from "./rencana";

/**
 * Menjalankan rencana impor lewat service sebagai Admin Sistem. Aman diulang: Unit dicari menurut nama (tanpa
 * membedakan huruf besar/kecil), Indikator menurut kode, dan Unit Pelapor hanya ditambah bila Unit itu belum menjadi
 * Unit Pelapor pada bulan peralihan. Penolakan service (Indikator atau Unit Pelapor) dicatat sebagai gagal, sisanya
 * tetap jalan.
 */
export async function jalankanRencana(admin: Pengguna, r: Rencana): Promise<HasilImpor> {
  const hasil: HasilImpor = { dibuat: { unit: 0, indikator: 0, unitPelapor: 0 }, gagal: [] };

  const unitId = new Map((await daftarUnit(admin)).map((u) => [u.nama.toLowerCase(), u.id]));
  for (const nama of r.unit) {
    if (unitId.has(nama.toLowerCase())) continue;
    unitId.set(nama.toLowerCase(), (await tambahUnit(admin, { nama })).id);
    hasil.dibuat.unit++;
  }

  const indikatorId = new Map((await daftarIndikator(admin)).map((i) => [i.kode.toLowerCase(), i.id]));
  for (const i of r.indikator) {
    let id = indikatorId.get(i.kode.toLowerCase());
    if (!id) {
      if (i.kelompok === "INM") throw new Error(`${i.kode} tidak ada di database MutuRS; data awal INM belum terisi.`);
      try {
        id = await tambahIndikator(admin, { ...i.isian, kode: i.kode, kelompok: i.kelompok, target: { nilai: i.target, berlakuMulai: r.mulai } });
      } catch (error) {
        if (!(error instanceof ServiceError)) throw error;
        hasil.gagal.push(`${i.kode}, ${i.nama}: ${error.message}`);
        continue;
      }
      indikatorId.set(i.kode.toLowerCase(), id);
      hasil.dibuat.indikator++;
    }
    const sudah = new Set((await unitPelaporAktif(admin, id, r.mulai)).map((p) => p.unitId));
    for (const nama of i.unit) {
      const u = unitId.get(nama.toLowerCase())!;
      if (sudah.has(u)) continue;
      try {
        await tambahUnitPelapor(admin, id, { unitId: u, bulanMulai: r.mulai });
        hasil.dibuat.unitPelapor++;
      } catch (error) {
        if (!(error instanceof ServiceError)) throw error;
        hasil.gagal.push(`${i.kode}, Unit ${nama}: ${error.message}`);
      }
    }
  }
  return hasil;
}
