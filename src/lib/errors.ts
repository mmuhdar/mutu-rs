/** Penolakan dari service: `status` mengikuti kode HTTP, `message` siap ditampilkan ke Pengguna. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Pelanggaran indeks unik PostgreSQL (kode 23505); drizzle membungkus error pg di `cause`. */
export function isUniqueViolation(error: unknown) {
  const asal = (error as { cause?: unknown } | null)?.cause ?? error;
  return (asal as { code?: string } | null)?.code === "23505";
}
