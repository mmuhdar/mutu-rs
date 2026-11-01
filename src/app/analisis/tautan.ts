/** Alamat halaman Analisis satu Indikator + Lingkup (unit null = RS) + bulan "YYYY-MM". */
export const tautanAnalisis = (indikatorId: string, unitId: string | null, bulan: string) =>
  `/analisis?${new URLSearchParams({ indikator: indikatorId, ...(unitId ? { unit: unitId } : {}), bulan })}`;
