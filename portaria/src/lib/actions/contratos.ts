"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type ContratoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"titulo" | "data_inicio" | "data_fim" | "valor", string>>;
};

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function ler(fd: FormData): {
  fieldErrors: Record<string, string>;
  valores: Record<string, unknown>;
} {
  const titulo = String(fd.get("titulo") ?? "").trim();
  const contactoId = String(fd.get("contacto_id") ?? "").trim() || null;
  const descricao = String(fd.get("descricao") ?? "").trim() || null;
  const dataInicio = String(fd.get("data_inicio") ?? "").trim();
  const dataFim = String(fd.get("data_fim") ?? "").trim();
  const renovacao = fd.get("renovacao_automatica") === "on";
  const valorStr = String(fd.get("valor") ?? "").trim();
  const notas = String(fd.get("notas") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (dataInicio && !DATA_RE.test(dataInicio)) fieldErrors.data_inicio = "Data inválida.";
  if (dataFim && !DATA_RE.test(dataFim)) fieldErrors.data_fim = "Data inválida.";

  let valor: number | null = null;
  if (valorStr) {
    const v = Number(valorStr.replace(",", "."));
    if (isNaN(v) || v < 0) fieldErrors.valor = "Valor inválido.";
    else valor = v;
  }

  return {
    fieldErrors,
    valores: {
      titulo,
      contacto_id: contactoId,
      descricao,
      data_inicio: dataInicio && DATA_RE.test(dataInicio) ? dataInicio : null,
      data_fim: dataFim && DATA_RE.test(dataFim) ? dataFim : null,
      renovacao_automatica: renovacao,
      valor,
      notas,
    },
  };
}

export async function criarContrato(
  _prev: ContratoFormState,
  formData: FormData
): Promise<ContratoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .insert({ tenant_id: ctx.tenant.id, ...valores });
  if (error) {
    console.error("Erro insert contrato:", error);
    return { error: "Erro ao criar o contrato." };
  }

  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function atualizarContrato(
  id: string,
  _prev: ContratoFormState,
  formData: FormData
): Promise<ContratoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .update({ ...valores, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) {
    console.error("Erro update contrato:", error);
    return { error: "Erro ao atualizar o contrato." };
  }

  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function apagarContrato(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Erro ao apagar o contrato.");

  revalidatePath("/contratos");
}
