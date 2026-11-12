/** Penolakan dari service: `status` mengikuti kode HTTP, `message` siap ditampilkan ke Pengguna. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Kode error PostgreSQL (mis. "23505" unik, "23503" foreign key); Drizzle membungkus error aslinya di `cause`. */
export const kodePg = (error: unknown) => (((error as { cause?: unknown }).cause ?? error) as { code?: string }).code;

/**
 * Untuk server action: hasil service, atau `{ error }` berisi pesan penolakannya (`ServiceError`) untuk form. Error
 * lain tetap dilempar (halaman error).
 */
export async function hasilAtauError<T>(janji: Promise<T>): Promise<{ hasil: T } | { error: string }> {
  try {
    return { hasil: await janji };
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

/** Untuk route handler: penolakan service (`ServiceError`) menjadi respons teks berstatus; error lain tetap dilempar. */
export function responsPenolakan(error: unknown): Response {
  if (error instanceof ServiceError) {
    return new Response(error.message, { status: error.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  throw error;
}
