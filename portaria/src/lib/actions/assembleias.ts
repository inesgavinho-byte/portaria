"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ESTADOS } from "@/lib/assembleias";
import type { Assembleia } from "@/types/database";

export type AssembleiaFormState = {
  error?: string;
  sucesso?: boolean;
  fieldErrors?: Partial<Record<"titulo" | "data_hora", string>>;
};

function revalidar(id?: string) {
  revalidatePath("/configuracao/assembleias");
  revalidatePath("/assembleias");
  if (id) {
    revalidatePath(`/configuracao/assembleias/${id}`);
    revalidatePath(`/assembleias/${id}`);
  }
}

export async function criarAssembleia(
  _prev: AssembleiaFormState,
  formData: FormData
): Promise<AssembleiaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "ordinaria");
  if (!titulo) return { fieldErrors: { titulo: "O título é obrigatório." } };
  if (!["ordinaria", "extraordinaria"].includes(tipo)) {
    return { error: "Tipo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assembleias")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      tipo: tipo as Assembleia["tipo"],
      criado_por: ctx.user.id,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro insert assembleia:", error);
    return { error: "Erro ao criar a assembleia." };
  }

  revalidar();
  redirect(`/configuracao/assembleias/${data.id}`);
}

export async function atualizarAssembleia(
  id: string,
  _prev: AssembleiaFormState,
  formData: FormData
): Promise<AssembleiaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "ordinaria");
  const dataHoraStr = String(formData.get("data_hora") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim() || null;
  const convocatoria = String(formData.get("convocatoria") ?? "").trim() || null;
  const ata = String(formData.get("ata") ?? "").trim() || null;

  if (!titulo) return { fieldErrors: { titulo: "O título é obrigatório." } };

  let dataHora: string | null = null;
  if (dataHoraStr) {
    const d = new Date(dataHoraStr);
    if (isNaN(d.getTime())) {
      return { fieldErrors: { data_hora: "Data/hora inválida." } };
    }
    dataHora = d.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assembleias")
    .update({
      titulo,
      tipo: tipo as Assembleia["tipo"],
      data_hora: dataHora,
      local,
      convocatoria,
      ata,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro update assembleia:", error);
    return { error: "Erro ao guardar." };
  }

  revalidar(id);
  return { sucesso: true };
}

export async function alterarEstadoAssembleia(id: string, estado: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");
  if (!ESTADOS.includes(estado as Assembleia["estado"])) {
    throw new Error("Estado inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assembleias")
    .update({ estado, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao alterar o estado.");
  revalidar(id);
}

export async function apagarAssembleia(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("assembleias")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao apagar.");
  revalidar();
  redirect("/configuracao/assembleias");
}

export async function adicionarPonto(assembleiaId: string, formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const titulo = String(formData.get("ponto_titulo") ?? "").trim();
  const descricao = String(formData.get("ponto_descricao") ?? "").trim() || null;
  if (!titulo) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("assembleia_pontos")
    .select("id", { count: "exact", head: true })
    .eq("assembleia_id", assembleiaId);

  await supabase.from("assembleia_pontos").insert({
    tenant_id: ctx.tenant.id,
    assembleia_id: assembleiaId,
    ordem: (count ?? 0) + 1,
    titulo,
    descricao,
  });

  revalidar(assembleiaId);
}

export async function removerPonto(pontoId: string, assembleiaId: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  await supabase
    .from("assembleia_pontos")
    .delete()
    .eq("id", pontoId)
    .eq("tenant_id", ctx.tenant.id);

  revalidar(assembleiaId);
}
