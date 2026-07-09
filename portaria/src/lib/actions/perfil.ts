"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type PerfilFormState = {
  error?: string;
  sucesso?: boolean;
  fieldErrors?: Partial<
    Record<
      | "nome"
      | "morada"
      | "email"
      | "telefone"
      | "num_fracoes"
      | "ano_construcao"
      | "seguradora_validade"
      | "administrador_email",
      string
    >
  >;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(formData: FormData, campo: string, max: number): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  if (!v) return null;
  return v.slice(0, max);
}

/**
 * Atualiza o perfil do condomínio atual (Slice 01).
 * Escreve nos dados públicos (tenants) e no perfil interno
 * (tenant_perfil, upsert). Só admins — imposto por requireAdmin + RLS.
 */
export async function atualizarPerfilCondominio(
  _prev: PerfilFormState,
  formData: FormData
): Promise<PerfilFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  // ----- Dados gerais (públicos) -----
  const nome = String(formData.get("nome") ?? "").trim();
  const morada = texto(formData, "morada", 300);
  const email = texto(formData, "email", 200);
  const telefone = texto(formData, "telefone", 30);
  const numFracoesStr = String(formData.get("num_fracoes") ?? "").trim();
  const anoStr = String(formData.get("ano_construcao") ?? "").trim();

  const fieldErrors: PerfilFormState["fieldErrors"] = {};

  if (!nome) fieldErrors.nome = "O nome do condomínio é obrigatório.";
  else if (nome.length > 200) fieldErrors.nome = "Nome demasiado longo (máx. 200).";
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Email inválido.";

  let numFracoes: number | null = null;
  if (numFracoesStr) {
    const n = parseInt(numFracoesStr, 10);
    if (isNaN(n) || n < 0 || n > 10000) fieldErrors.num_fracoes = "Número inválido.";
    else numFracoes = n;
  }

  let anoConstrucao: number | null = null;
  if (anoStr) {
    const a = parseInt(anoStr, 10);
    const anoLimite = 2100;
    if (isNaN(a) || a < 1800 || a > anoLimite) {
      fieldErrors.ano_construcao = "Ano inválido.";
    } else {
      anoConstrucao = a;
    }
  }

  // ----- Perfil interno (seguradora + administrador) -----
  const seguradoraNome = texto(formData, "seguradora_nome", 200);
  const seguradoraApolice = texto(formData, "seguradora_apolice", 100);
  const seguradoraContacto = texto(formData, "seguradora_contacto", 200);
  const seguradoraValidadeStr = String(
    formData.get("seguradora_validade") ?? ""
  ).trim();
  const administradorNome = texto(formData, "administrador_nome", 200);
  const administradorEmpresa = texto(formData, "administrador_empresa", 200);
  const administradorEmail = texto(formData, "administrador_email", 200);
  const administradorTelefone = texto(formData, "administrador_telefone", 30);

  let seguradoraValidade: string | null = null;
  if (seguradoraValidadeStr) {
    // input type=date entrega YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seguradoraValidadeStr)) {
      fieldErrors.seguradora_validade = "Data inválida.";
    } else {
      seguradoraValidade = seguradoraValidadeStr;
    }
  }
  if (administradorEmail && !EMAIL_RE.test(administradorEmail)) {
    fieldErrors.administrador_email = "Email inválido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  const { error: tenantError } = await supabase
    .from("tenants")
    .update({
      nome,
      morada,
      email,
      telefone,
      num_fracoes: numFracoes,
      ano_construcao: anoConstrucao,
    })
    .eq("id", ctx.tenant.id);

  if (tenantError) {
    console.error("Erro update tenant:", tenantError);
    return { error: "Erro ao guardar os dados gerais. Tente novamente." };
  }

  const { error: perfilError } = await supabase.from("tenant_perfil").upsert(
    {
      tenant_id: ctx.tenant.id,
      seguradora_nome: seguradoraNome,
      seguradora_apolice: seguradoraApolice,
      seguradora_contacto: seguradoraContacto,
      seguradora_validade: seguradoraValidade,
      administrador_nome: administradorNome,
      administrador_empresa: administradorEmpresa,
      administrador_email: administradorEmail,
      administrador_telefone: administradorTelefone,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  if (perfilError) {
    console.error("Erro upsert tenant_perfil:", perfilError);
    return { error: "Erro ao guardar o perfil interno. Tente novamente." };
  }

  // O nome/morada alimentam páginas públicas e o cabeçalho
  revalidatePath("/", "layout");
  revalidatePath("/configuracao/perfil");

  return { sucesso: true };
}
