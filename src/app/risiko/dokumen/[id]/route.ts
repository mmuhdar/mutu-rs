import type { NextRequest } from "next/server";

import { contentDisposition } from "@/lib/bukti";
import { responsPenolakan } from "@/lib/errors";
import { ambilBerkasDokumenRisiko } from "@/modules/risiko/service";
import { getSessionUser } from "@/server/sesi";

/**
 * Membuka satu Dokumen Review; hak akses sama dengan detail Risiko (di service). PDF dibuka di browser, DOC/DOCX
 * diunduh. `sandbox` mencegah isi berkas menjalankan skrip di origin aplikasi.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/risiko/dokumen/[id]">) {
  try {
    const d = await ambilBerkasDokumenRisiko(await getSessionUser(), (await ctx.params).id);
    return new Response(new Uint8Array(d.isi), {
      headers: {
        "Content-Type": d.jenis,
        "Content-Disposition": contentDisposition(d.jenis === "application/pdf" ? "inline" : "attachment", d.nama),
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return responsPenolakan(error);
  }
}
