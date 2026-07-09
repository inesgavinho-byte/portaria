"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { UserTenant } from "@/types/database";

const ROLES_VALIDOS: UserTenant["role"][] = ["admin", "comissao", "condomino"];

export type ConviteFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "fracao" | "role", string>>;
};

/**
 * URL base da request atual (domain-agnostic, conforme ADR-007:
 * funciona no domínio do prédio hoje e no workspace amanhã).
 */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost")
    ? "http"
    : h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Convida um membro para o tenant atual.
 *
 * - Utilizador novo: regista o convite e envia email via Supabase Auth;
 *   ao definir password, aceitar_convites() cria o membership.
 * - Utilizador já existente na plataforma: associa-o imediatamente.
 */
export async function convidarMembro(
  _prev: ConviteFormState,
  formData: FormData
): Promise<ConviteFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fracao = String(formData.get("fracao") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "condomino");

  const fieldErrors: ConviteFormState["fieldErrors"] = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Indique um email válido.";
  }
  if (fracao && fracao.length > 50) {
    fieldErrors.fracao = "Fração demasiado longa.";
  }
  if (!ROLES_VALIDOS.includes(role as UserTenant["role"])) {
    fieldErrors.role = "Papel inválido.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Envio de convites não configurado (falta a chave de serviço no servidor).",
    };
  }

  // 1. Regista o convite (o índice único rejeita pendentes duplicados)
  const supabase = await createClient();
  const { data: convite, error: insertError } = await supabase
    .from("convites")
    .insert({
      tenant_id: ctx.tenant.id,
      email,
      fracao,
      role: role as UserTenant["role"],
      criado_por: ctx.user.id,
    })
    .select()
    .single();

  if (insertError || !convite) {
    if (insertError?.code === "23505") {
      return { fieldErrors: { email: "Já existe um convite pendente para este email." } };
    }
    console.error("Erro insert convite:", insertError);
    return { error: "Erro ao criar o convite. Tente novamente." };
  }

  // 2. Envia o convite via Supabase Auth
  const redirectTo = `${await baseUrl()}/auth/confirm?next=/convite`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo }
  );

  if (!inviteError) {
    revalidatePath("/configuracao/membros");
    redirect("/configuracao/membros");
  }

  // 3. Utilizador já registado na plataforma → associação imediata
  if (
    inviteError.code === "email_exists" ||
    inviteError.message.toLowerCase().includes("already been registered")
  ) {
    const userId = await encontrarUserIdPorEmail(admin, email);
    if (!userId) {
      await supabase.from("convites").delete().eq("id", convite.id);
      console.error("Utilizador existente não encontrado via admin API:", email);
      return { error: "Não foi possível associar este utilizador. Tente novamente." };
    }

    const { error: membroError } = await admin.from("user_tenants").insert({
      user_id: userId,
      tenant_id: ctx.tenant.id,
      fracao,
      role: role as UserTenant["role"],
    });

    if (membroError?.code === "23505") {
      await supabase.from("convites").delete().eq("id", convite.id);
      return { fieldErrors: { email: "Este utilizador já é membro deste condomínio." } };
    }
    if (membroError) {
      await supabase.from("convites").delete().eq("id", convite.id);
      console.error("Erro ao associar membro existente:", membroError);
      return { error: "Erro ao associar o utilizador." };
    }

    await supabase
      .from("convites")
      .update({ aceite_em: new Date().toISOString() })
      .eq("id", convite.id);

    revalidatePath("/configuracao/membros");
    redirect("/configuracao/membros");
  }

  // 4. Falha real no envio — remove o convite órfão
  await supabase.from("convites").delete().eq("id", convite.id);
  console.error("Erro inviteUserByEmail:", inviteError);
  return { error: "Não foi possível enviar o convite. Tente novamente." };
}

async function encontrarUserIdPorEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
): Promise<string | null> {
  // A admin API não filtra por email nesta versão; pagina-se (escala
  // Foundation: centenas de utilizadores, não milhares)
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) return null;

    const encontrado = data.users.find(
      (u) => u.email?.toLowerCase() === email
    );
    if (encontrado) return encontrado.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Remove um membro do tenant. Proteções: ninguém se remove a si próprio;
 * o último admin não pode ser removido.
 */
export async function removerMembro(membershipId: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("user_tenants")
    .select("*")
    .eq("id", membershipId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!membro) throw new Error("Membro não encontrado.");
  if (membro.user_id === ctx.user.id) {
    throw new Error("Não pode remover o seu próprio acesso.");
  }

  if (membro.role === "admin") {
    const { count } = await supabase
      .from("user_tenants")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id)
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      throw new Error("O condomínio tem de manter pelo menos um administrador.");
    }
  }

  const { error } = await supabase
    .from("user_tenants")
    .delete()
    .eq("id", membershipId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao remover o membro.");

  revalidatePath("/configuracao/membros");
}

/**
 * Define (ou limpa) a fração de um membro. Guarda o FK e o rótulo
 * denormalizado (fracao texto) que o próprio condómino vê.
 */
export async function definirFracaoMembro(
  membershipId: string,
  fracaoId: string | null
) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();

  let codigo: string | null = null;
  if (fracaoId) {
    const { data: fracao } = await supabase
      .from("fracoes")
      .select("codigo")
      .eq("id", fracaoId)
      .eq("tenant_id", ctx.tenant.id)
      .single();
    if (!fracao) throw new Error("Fração não encontrada.");
    codigo = fracao.codigo;
  }

  const { error } = await supabase
    .from("user_tenants")
    .update({ fracao_id: fracaoId, fracao: codigo })
    .eq("id", membershipId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao definir a fração.");

  revalidatePath("/configuracao/membros");
}

/**
 * Anula um convite pendente.
 */
export async function anularConvite(conviteId: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("convites")
    .delete()
    .eq("id", conviteId)
    .eq("tenant_id", ctx.tenant.id)
    .is("aceite_em", null);

  if (error) throw new Error("Erro ao anular o convite.");

  revalidatePath("/configuracao/membros");
}
