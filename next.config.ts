import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  // Unggah Bukti: sampai 5 berkas × 10 MB (MAKS_BUKTI, MAKS_UKURAN_BUKTI) sekali kirim, ditambah overhead multipart.
  // Bawaan: server action 1 MB; proxy hanya menyimpan 10 MB body (sisanya terpotong).
  experimental: {
    serverActions: { bodySizeLimit: "52mb" },
    proxyClientMaxBodySize: "52mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
