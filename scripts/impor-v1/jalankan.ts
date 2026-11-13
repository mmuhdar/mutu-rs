import { geserBulan, labelBulan } from "@/lib/bulan";
import { ServiceError } from "@/lib/errors";
import type { Pengguna } from "@/modules/auth/service";
import { ambilIndikator, daftarIndikator, tambahIndikator, tambahUnitPelapor } from "@/modules/indikator/service";
import { imporPengukuranLama } from "@/modules/pengukuran/service";
import { daftarUnit, tambahUnit } from "@/modules/unit/service";

import type { HasilImpor, Rencana, Riwayat } from "./rencana";

/**
 * Menjalankan rencana impor lewat service sebagai Admin Sistem. Aman diulang: Unit dicari menurut nama (tanpa
 * membedakan huruf besar/kecil), Indikator menurut kode, Unit Pelapor hanya ditambah bila belum ada periode yang
 * mencakup bulan mulainya, dan Pengukuran riwayat yang sudah ada dilewati. Penolakan service dicatat sebagai gagal,
 * sisanya tetap jalan.
 *
 * Unit Pelapor mulai bulan peralihan, atau sejak bulan isian pertama bila Indikator + Unit itu punya riwayat isian;
 * bila sudah ada periode yang mulai lebih belakangan (impor sebelumnya), periode baru berhenti tepat sebelum periode itu.
 */
export async function jalankanRencana(admin: Pengguna, r: Rencana, riwayat?: Riwayat): Promise<HasilImpor> {
  const hasil: HasilImpor = { dibuat: { unit: 0, indikator: 0, unitPelapor: 0, pengukuran: 0 }, gagal: [] };

  const unitId = new Map((await daftarUnit(admin)).map((u) => [u.nama.toLowerCase(), u.id]));
  for (const nama of r.unit) {
    if (unitId.has(nama.toLowerCase())) continue;
    unitId.set(nama.toLowerCase(), (await tambahUnit(admin, { nama })).id);
    hasil.dibuat.unit++;
  }

  const kunci = (kode: string, unit: string) => `${kode}|${unit.toLowerCase()}`;
  const awalRiwayat = new Map<string, string>();
  for (const p of riwayat?.pengukuran ?? []) {
    const k = kunci(p.kode, p.unit);
    if (!awalRiwayat.has(k) || p.bulan < awalRiwayat.get(k)!) awalRiwayat.set(k, p.bulan);
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
    const periode = (await ambilIndikator(admin, id)).unitPelapor;
    for (const nama of i.unit) {
      const u = unitId.get(nama.toLowerCase())!;
      const awal = [awalRiwayat.get(kunci(i.kode, nama)), r.mulai].filter((b): b is string => Boolean(b)).sort()[0];
      const milikUnit = periode.filter((p) => p.unitId === u);
      if (milikUnit.some((p) => p.bulanMulai <= awal && (!p.bulanBerhenti || p.bulanBerhenti >= awal))) continue;
      const berikutnya = milikUnit.map((p) => p.bulanMulai).filter((b) => b > awal).sort()[0];
      try {
        await tambahUnitPelapor(admin, id, { unitId: u, bulanMulai: awal, bulanBerhenti: berikutnya ? geserBulan(berikutnya, -1) : null });
        hasil.dibuat.unitPelapor++;
      } catch (error) {
        if (!(error instanceof ServiceError)) throw error;
        hasil.gagal.push(`${i.kode}, Unit ${nama}: ${error.message}`);
      }
    }
  }

  for (const p of riwayat?.pengukuran ?? []) {
    const id = indikatorId.get(p.kode.toLowerCase());
    if (!id) continue; // Indikator-nya gagal dibuat; sudah tercatat di atas.
    try {
      const baru = await imporPengukuranLama(admin, { indikatorId: id, unitId: unitId.get(p.unit.toLowerCase())!, bulan: p.bulan, n: p.n, d: p.d });
      if (baru) hasil.dibuat.pengukuran++;
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
      hasil.gagal.push(`${p.kode}, Unit ${p.unit}, ${labelBulan(p.bulan)}: ${error.message} (N ${p.n}, D ${p.d} dari ${p.isian} isian)`);
    }
  }
  return hasil;
}
