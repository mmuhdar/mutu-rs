import type { NextRequest } from "next/server";

import { contentDisposition } from "@/lib/bukti";
import { responsPenolakan } from "@/lib/errors";
import { ambilBerkasBukti } from "@/modules/pengukuran/service";
import { getSessionUser } from "@/server/sesi";

/**
 * Membuka satu Bukti di browser; hak akses sama dengan detail Pengukuran (di service). Jenis dari kolom yang diperiksa
 * dari isi berkas saat diunggah; `sandbox` mencegah isi berkas menjalankan skrip di origin aplikasi.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/pengukuran/bukti/[id]">) {
  try {
    const bukti = await ambilBerkasBukti(await getSessionUser(), (await ctx.params).id);
    return new Response(new Uint8Array(bukti.isi), {
      headers: {
        "Content-Type": bukti.jenis,
        "Content-Disposition": contentDisposition("inline", bukti.nama),
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return responsPenolakan(error);
  }
}
