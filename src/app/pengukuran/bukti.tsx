import { LABEL_JENIS_BUKTI, labelUkuran, type JenisBukti } from "@/lib/bukti";

import { Ikon } from "../ikon";
import { Kartu } from "../ui";
import { FormUnggahBukti, TombolHapusBukti } from "./kelola-bukti";
import { formatWaktu } from "./status";

type Bukti = { id: string; nama: string; jenis: JenisBukti; ukuran: number; diunggahOleh: string; diunggahPada: Date };

/**
 * Bukti satu Pengukuran. Setiap berkas dibuka di tab baru lewat `/pengukuran/bukti/[id]`. Dengan `ubah` (isian Draf):
 * tombol Hapus per berkas dan form unggah; tanpa `pengukuranId` (belum disimpan) hanya petunjuk menyimpan Draf dulu.
 */
export function DaftarBukti(p: { bukti: Bukti[]; ubah?: boolean; pengukuranId?: string }) {
  const bisaUnggah = p.ubah && p.pengukuranId;
  return (
    <Kartu judul="Bukti" sub="Foto atau PDF asal angka N dan D, dibuka Kepala Unit saat Verifikasi.">
      {p.ubah && !p.pengukuranId ? (
        <p className="px-5 pb-5 text-[15px] text-ink-2">Simpan sebagai Draf dulu untuk melampirkan Bukti.</p>
      ) : p.bukti.length === 0 ? (
        <p className="px-5 pb-5 text-[15px] text-ink-2">{p.ubah ? "Belum ada Bukti." : "Tidak ada Bukti dilampirkan."}</p>
      ) : (
        <ul className="mx-5 mb-5 grid border-t border-rule">
          {p.bukti.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule py-3">
              <Ikon nama={b.jenis === "application/pdf" ? "dokumen" : "gambar"} className="size-5 shrink-0 text-ink-3" />
              <span className="grid min-w-0 flex-1 gap-0.5">
                {/* Tautan biasa: tujuannya route handler yang mengirim berkas. */}
                <a href={`/pengukuran/bukti/${b.id}`} target="_blank" rel="noopener" className="text-primary-ink break-words">
                  {b.nama}
                </a>
                <span className="text-[13px] text-ink-3">
                  {LABEL_JENIS_BUKTI[b.jenis]}, <span className="terukur">{labelUkuran(b.ukuran)}</span>,{" "}
                  <span className="text-signal">{b.diunggahOleh}</span>{" "}
                  <span className="terukur text-cool">{formatWaktu(b.diunggahPada)}</span>
                </span>
              </span>
              {p.ubah && <TombolHapusBukti buktiId={b.id} nama={b.nama} />}
            </li>
          ))}
        </ul>
      )}
      {/* Tanpa key: pesan penolakan sebagian berkas harus tetap tampil walau berkas lain masuk daftar. */}
      {bisaUnggah && <FormUnggahBukti pengukuranId={p.pengukuranId!} />}
    </Kartu>
  );
}
