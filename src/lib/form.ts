/** Isian teks dari form server action; field yang tidak ada = "". */
export const teks = (formData: FormData, nama: string) => String(formData.get(nama) ?? "");

/** Satu isian dari alamat halaman (`searchParams`, mis. form `method="get"`); tidak ada atau berulang = "". */
export const teksAlamat = (alamat: Record<string, string | string[] | undefined>, nama: string) => {
  const nilai = alamat[nama];
  return typeof nilai === "string" ? nilai : "";
};

/** State form `useActionState`: pesan penolakan service beserta isian yang dikirim (React mengosongkan form setelah action). */
export type StateForm = { error?: string; nilai?: Record<string, string> };

/** Penolakan service menjadi pesan form beserta isian yang dikirim, supaya form tidak kosong. */
export const ditolak = (formData: FormData, error: string): StateForm => ({
  error,
  nilai: Object.fromEntries(formData) as Record<string, string>,
});
