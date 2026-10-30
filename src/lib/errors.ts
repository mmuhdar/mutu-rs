/** Penolakan dari service: `status` mengikuti kode HTTP, `message` siap ditampilkan ke Pengguna. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
