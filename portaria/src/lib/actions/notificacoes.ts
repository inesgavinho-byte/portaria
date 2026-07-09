"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

export type PreferenciaState = { ok?: boolean; error?: string };

/**
 * Atualiza a preferência de notificações por email do próprio utilizador
 * no prédio atual. É uma escolha pessoal — qualquer membro pode fazê-la.
 *
 * Usa o cliente service-role porque o RLS de user_tenants só permite
 * escrita a admins (para evitar escalonamento de role via self-update).
 * Aqui a escrita é sempre limitada à linha do próprio utilizador e à
 * coluna notificacoes_email, pelo que não há risco de escalonamento.
 */
export async function atualizarPreferenciaNotificacoes(
  _prev: PreferenciaState,
  formData: FormData
): Promise<PreferenciaState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Sessão inválida. Inicie sessão novamente." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "As notificações por email ainda não estão ativas nesta instalação.",
    };
  }

  const receber = formData.get("notificacoes_email") === "on";

  const { error } = await admin
    .from("user_tenants")
    .update({ notificacoes_email: receber })
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro update preferência notificações:", error);
    return { error: "Não foi possível guardar a preferência." };
  }

  revalidatePath("/configuracao/notificacoes");
  return { ok: true };
}
