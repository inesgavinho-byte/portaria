"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { sincronizarPessoasDaFracao } from "@/lib/actions/pessoas";

export type FracaoFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      "codigo" | "permilagem" | "proprietario_email",
      string
    >
  >;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(formData: FormData, campo: string, max: number): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function lerCampos(formData: FormData) {
  const codigo = String(formData.get("codigo") ?? "").trim();
  const permilagemStr = String(formData.get("permilagem") ?? "").trim();
  const proprietarioEmail = texto(formData, "proprietario_email", 200);

  const fieldErrors: FracaoFormState["fieldErrors"] = {};
  if (!codigo) fieldErrors.codigo = "A identificação da fração é obrigatória.";
  else if (codigo.length > 50) fieldErrors.codigo = "Identificação demasiado longa.";

  let permilagem: number | null = null;
  if (permilagemStr) {
    const p = Number(permilagemStr.replace(",", "."));
    if (isNaN(p) || p < 0 || p > 1000) fieldErrors.permilagem = "Permilagem entre 0 e 1000.";
    else permilagem = p;
  }

  if (proprietarioEmail && !EMAIL_RE.test(proprietarioEmail)) {
    fieldErrors.proprietario_email = "Email inválido.";
  }

  return {
    codigo,
    fieldErrors,
    valores: {
      codigo,
      descricao: texto(formData, "descricao", 300),
      permilagem,
      piso: texto(formData, "piso", 30),
      tipologia: texto(formData, "tipologia", 30),
      proprietario_nome: texto(formData, "proprietario_nome", 200),
      proprietario_email: proprietarioEmail,
      proprietario_telefone: texto(formData, "proprietario_telefone", 30),
      inquilino_nome: texto(formData, "inquilino_nome", 200),
    },
  };
}

export async function criarFracao(
  _prev: FracaoFormState,
  formData: FormData
): Promise<FracaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = lerCampos(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: novaFracao, error } = await supabase
    .from("fracoes")
    .insert({ tenant_id: ctx.tenant.id, ...valores })
    .select("id")
    .single();

  if (error || !novaFracao) {
    if (error?.code === "23505") {
      return { fieldErrors: { codigo: "Já existe uma fração com esta identificação." } };
    }
    console.error("Erro insert fração:", error);
    return { error: "Erro ao criar a fração. Tente novamente." };
  }

  try {
    await sincronizarPessoasDaFracao(ctx.tenant.id, novaFracao.id);
  } catch (erroSincronizacao) {
    console.error("Sincronização de pessoas falhou (não bloqueia a fração):", erroSincronizacao);
  }

  revalidatePath("/fracoes");
  revalidatePath("/condominos");
  redirect("/fracoes");
}

export async function atualizarFracao(
  id: string,
  _prev: FracaoFormState,
  formData: FormData
): Promise<FracaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { codigo, fieldErrors, valores } = lerCampos(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fracoes")
    .update(valores)
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { codigo: "Já existe uma fração com esta identificação." } };
    }
    console.error("Erro update fração:", error);
    return { error: "Erro ao atualizar a fração." };
  }

  // Mantém o rótulo denormalizado dos membros associados a esta fração
  await supabase
    .from("user_tenants")
    .update({ fracao: codigo })
    .eq("fracao_id", id)
    .eq("tenant_id", ctx.tenant.id);

  try {
    await sincronizarPessoasDaFracao(ctx.tenant.id, id);
  } catch (erroSincronizacao) {
    console.error("Sincronização de pessoas falhou (não bloqueia a fração):", erroSincronizacao);
  }

  revalidatePath("/fracoes");
  revalidatePath("/condominos");
  revalidatePath("/configuracao/membros");
  redirect("/fracoes");
}

export async function apagarFracao(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("fracoes")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao apagar a fração.");

  revalidatePath("/fracoes");
}
