import type { Metadata } from "next";

import { requireUser } from "@/server/sesi";

import { Halaman, Kartu, KepalaHalaman } from "../ui";
import { FormSandi } from "./form-sandi";

export const metadata: Metadata = { title: "Ganti sandi" };

export default async function HalamanSandi() {
  await requireUser();
  return (
    <Halaman area="brand">
      <KepalaHalaman judul="Ganti sandi" sub="Ganti sandi sementara dari Admin Sistem dengan sandi Anda sendiri." />
      <Kartu className="max-w-lg">
        <FormSandi />
      </Kartu>
    </Halaman>
  );
}
