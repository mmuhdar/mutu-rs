/** Isian teks dari form server action; field yang tidak ada = "". */
export const teks = (formData: FormData, nama: string) => String(formData.get(nama) ?? "");

/** Satu isian dari alamat halaman (`searchParams`, mis. form `method="get"`); tidak ada atau berulang = "". */
export const teksAlamat = (alamat: Record<string, string | string[] | undefined>, nama: string) => {
  const nilai = alamat[nama];
  return typeof nilai === "string" ? nilai : "";
};
