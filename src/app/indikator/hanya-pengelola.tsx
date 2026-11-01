import { Pesan } from "../pengukuran/status";

/** Untuk peran yang hanya boleh melihat Indikator. Service tetap menolak bila form dikirim langsung. */
export function HanyaPengelola() {
  return <Pesan>Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator.</Pesan>;
}
