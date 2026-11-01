import type { Metadata } from "next";

import { labelBulan } from "@/lib/bulan";
import { teksAlamat } from "@/lib/form";
import { LABEL_STATUS_TINDAK_LANJUT, labelLingkup, STATUS_TINDAK_LANJUT } from "@/lib/perbaikan";
import { melihatCapaianRs } from "@/modules/capaian/service";
import { bolehBacaLingkup, daftarTindakLanjut, type SaringanStatusTindakLanjut } from "@/modules/perbaikan/service";
import { pilihanUnit } from "@/modules/unit/service";
import { requireUser } from "@/server/sesi";

import { tautanAnalisis } from "../analisis/tautan";
import { kelasInput, kelasLabel, Segmen, tombolUtama } from "../form";
import { Pesan, pesanAtau } from "../pengukuran/status";
import { Halaman, Kartu, KepalaHalaman, Ubin } from "../ui";
import { TabelTindakLanjut } from "./tabel";

export const metadata: Metadata = { title: "Tindak Lanjut" };

const PILIHAN_STATUS: { nilai: SaringanStatusTindakLanjut; label: string }[] = [
  { nilai: "terbuka", label: "Terbuka" },
  ...STATUS_TINDAK_LANJUT.map((s) => ({ nilai: s, label: LABEL_STATUS_TINDAK_LANJUT[s] })),
  { nilai: "semua", label: "Semua" },
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
  const lingkup = unit === "rs" ? null : unit || undefined;
  // Status dan Lingkup di luar hak/daftar ditolak service. Ringkasan status dihitung dari semua status Lingkup itu.
  const [daftar, semua] = await Promise.all([
    pesanAtau(daftarTindakLanjut(pengguna, { status, lingkup })),
    pesanAtau(daftarTindakLanjut(pengguna, { status: "semua", lingkup })),
  ]);
  const hitung = (cocok: (t: { status: string; lewatTenggat: boolean }) => boolean) =>
    typeof semua === "string" ? 0 : semua.filter(cocok).length;
  const alamat = (s: string) => `/tindak-lanjut?${new URLSearchParams({ status: s, unit })}`;

  return (
    <Halaman area="tindak">
      <KepalaHalaman judul="Tindak Lanjut" sub="Tindakan perbaikan dari Analisis. Yang lewat tenggat paling atas; status diubah di halaman Analisis-nya.">
        <form method="get" className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-end">
          {/* key: pilihan saringan mengikuti alamat. */}
          <Segmen key={status} nama="status" label="Status" pilihan={PILIHAN_STATUS} nilai={status} />
          <label className={`grid min-w-0 gap-1.5 ${kelasLabel}`}>
            Lingkup
            <select name="unit" defaultValue={unit} className={kelasInput}>
              <option value="">{semuaLingkup ? "Semua Lingkup" : "Semua Unit saya"}</option>
              {semuaLingkup && <option value="rs">{labelLingkup(null)}</option>}
              {pilihan.map((u) => (
                <option key={u.id} value={u.id}>
                  {labelLingkup(u)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={tombolUtama}>
            Tampilkan
          </button>
        </form>
      </KepalaHalaman>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Ubin
          nada={hitung((t) => t.lewatTenggat) > 0 ? "neg" : "netral"}
          href={alamat("terbuka")}
          label="Lewat tenggat"
          nilai={hitung((t) => t.lewatTenggat)}
          keterangan="masih Direncanakan atau Berjalan"
        />
        <Ubin nada="netral" href={alamat("direncanakan")} label="Direncanakan" nilai={hitung((t) => t.status === "direncanakan")} />
        <Ubin nada="tindak" href={alamat("berjalan")} label="Berjalan" nilai={hitung((t) => t.status === "berjalan")} />
        <Ubin nada="pos" href={alamat("selesai")} label="Selesai" nilai={hitung((t) => t.status === "selesai")} />
      </div>

      {typeof daftar === "string" ? (
        <Pesan>{daftar}</Pesan>
      ) : daftar.length === 0 ? (
        <Pesan>Tidak ada Tindak Lanjut dengan saringan ini.</Pesan>
      ) : (
        <Kartu judul={`${daftar.length} Tindak Lanjut`} sub={PILIHAN_STATUS.find((p) => p.nilai === status)?.label}>
          <TabelTindakLanjut
            daftar={daftar}
            atas={(t) => `${t.indikator.kode} · ${labelLingkup(t.unit)} · Analisis ${labelBulan(t.bulan, { pendek: true })}`}
            href={(t) => tautanAnalisis(t.indikator.id, t.unit?.id ?? null, t.bulan)}
          />
        </Kartu>
      )}
    </Halaman>
  );
}
