"use server";

import { redirect } from "next/navigation";

import { keluar } from "@/modules/auth/service";
import { getSessionUser, hapusCookieSesi } from "@/server/sesi";

export async function keluarAction() {
  const pengguna = await getSessionUser();
  if (pengguna) await keluar(pengguna);
  await hapusCookieSesi();
  redirect("/masuk");
}
