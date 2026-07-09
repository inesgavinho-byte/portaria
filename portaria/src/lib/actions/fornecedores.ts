"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type FornecedorFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"nome" | "email", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(fd: FormData, campo: string, max: number): string | null {
  const v = String(fd.get(campo) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function ler(fd: FormData): {
  fieldErrors: Record<string, string>;
  valores: Record<string, unknown>;
} {
  const nome = String(fd.get("nome") ?? "").trim();
  const email = texto(fd, "email", 200);
  const fieldErrors: Record<string, string> = {};
  if (!nome) fieldErrors.nome = "O nome é obrigatório.";
  else if (nome.length > 200) fieldErrors.nome = "Nome demasiado longo.";
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Email inválido.";

  return {
    fieldErrors,
    valores: {
      nome,
      categoria: texto(fd, "categoria", 60),
      contacto_nome: texto(fd, "contacto_nome", 200),
      telefone: texto(fd, "telefone", 30),
      email,
      nif: texto(fd, "nif", 20),
      morada: texto(fd, "morada", 300),
      notas: texto(fd, "notas", 1000),
    },
  };
}

export async function criarFornecedor(
  _prev: FornecedorFormState,
  formData: FormData
): Promise<FornecedorFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fornecedores")
    .insert({ tenant_id: ctx.tenant.id, ...valores })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Erro insert fornecedor:", error);
    return { error: "Erro ao criar o fornecedor." };
  }

  revalidatePath("/fornecedores");
  redirect(`/fornecedores/${data.id}`);
}

export async function atualizarFornecedor(
  id: string,
  _prev: FornecedorFormState,
  formData: FormData
): Promise<FornecedorFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fornecedores")
    .update({ ...valores, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) {
    console.error("Erro update fornecedor:", error);
    return { error: "Erro ao atualizar o fornecedor." };
  }

  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  redirect(`/fornecedores/${id}`);
}

/** Soft delete: marca inativo (preserva histórico e associações). */
export async function arquivarFornecedor(id: string, ativo: boolean) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("fornecedores")
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Erro ao arquivar o fornecedor.");

  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
}
