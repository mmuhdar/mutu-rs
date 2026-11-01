import { Pesan } from "../pengukuran/status";
import { Halaman, KepalaHalaman } from "../ui";

/** Untuk peran yang hanya boleh melihat Indikator. Service tetap menolak bila form dikirim langsung. */
export function HanyaPengelola() {
  return (
    <Halaman>
      <KepalaHalaman judul="Indikator" kembali={[{ href: "/indikator", label: "Indikator" }]} />
      <Pesan>Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator.</Pesan>
    </Halaman>
  );
}
