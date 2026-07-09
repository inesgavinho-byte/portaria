"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Vista = "admin" | "condomino";

/**
 * Alterna a vista (admin ↔ condómino) de um utilizador que é ambos.
 * É apenas contexto visual: NÃO altera autorização — o RLS continua a
 * ser a garantia real. Persiste num cookie de sessão.
 */
export async function definirVista(vista: Vista) {
  const c = await cookies();
  c.set("portaria-vista", vista, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
