/** Untuk peran yang hanya boleh melihat Indikator. Service tetap menolak bila form dikirim langsung. */
export function HanyaPengelola() {
  return (
    <p role="alert" className="rounded-lg border border-border bg-surface p-5">
      Hanya Komite Mutu dan Admin Sistem yang boleh mengelola Indikator.
    </p>
  );
}
