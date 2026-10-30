/** Dipanggil sekali saat server Next mulai, sebelum melayani request: migrasi + data awal. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrapDatabase } = await import("./db/bootstrap");
  await bootstrapDatabase();
}
