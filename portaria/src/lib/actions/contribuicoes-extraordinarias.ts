"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

type PrestacaoInput = {
  designacao: string;
  vencimento: string;
  valorCents: number;
};

export type CriarContribuicaoExtraordinariaState = {
  error?: string;
  sucesso?: string;
  fieldErrors?: Partial<Record<"titulo" | "total" | "prestacoes", string>>;
};

function distribuirValor(valorCents: number, fracoes: Array<{ id: string; permilagem: number | null }>) {
  const totalPermilagem = fracoes.reduce((soma, fracao) => soma + Number(fracao.permilagem ?? 0), 0);
  if (totalPermilagem <= 0) throw new Error("A permilagem das frações não está configurada.");

  const distribuicao = fracoes.map((fracao) => ({
    fracao_id: fracao.id,
    valor_cents: Math.floor((valorCents * Number(fracao.permilagem ?? 0)) / totalPermilagem),
  }));
  const diferenca = valorCents - distribuicao.reduce((soma, linha) => soma + linha.valor_cents, 0);
  if (diferenca > 0 && distribuicao[distribuicao.length - 1]) distribuicao[distribuicao.length - 1].valor_cents += diferenca;
  return distribuicao;
}

/**
 * Cria uma receita extraordinária e as suas posições por fração. O registo é
 * financeiro-administrativo: não emite recibos, não altera quotas ordinárias e
 * não inicia qualquer cobrança automática.
 */
export async function criarContribuicaoExtraordinaria(
  _prev: CriarContribuicaoExtraordinariaState,
  formData: FormData
): Promise<CriarContribuicaoExtraordinariaState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const referencia = String(formData.get("referencia") ?? "").trim() || null;
  const totalCents = Number(formData.get("total_cents"));
  const prestacoesRaw = String(formData.get("prestacoes") ?? "");
  const fieldErrors: CriarContribuicaoExtraordinariaState["fieldErrors"] = {};

  if (!titulo || titulo.length > 240) fieldErrors.titulo = "Indique um título até 240 caracteres.";
  if (!Number.isInteger(totalCents) || totalCents <= 0) fieldErrors.total = "Indique um total válido.";

  let prestacoes: PrestacaoInput[] = [];
  try {
    const parsed = JSON.parse(prestacoesRaw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 24) throw new Error();
    prestacoes = parsed.map((item) => {
      const linha = item as PrestacaoInput;
      if (!linha || typeof linha.designacao !== "string" || !linha.designacao.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(linha.vencimento) || !Number.isInteger(linha.valorCents) || linha.valorCents <= 0) throw new Error();
      return { designacao: linha.designacao.trim().slice(0, 160), vencimento: linha.vencimento, valorCents: linha.valorCents };
    });
    if (prestacoes.reduce((soma, linha) => soma + linha.valorCents, 0) !== totalCents) throw new Error();
  } catch {
    fieldErrors.prestacoes = "As prestações devem ter data, montante e total igual à contribuição.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { data: fracoes, error: fracoesError } = await supabase
    .from("fracoes").select("id, permilagem").eq("tenant_id", ctx.tenant.id).order("codigo");
  if (fracoesError || !fracoes?.length) return { error: "Não foi possível obter as frações para distribuição." };

  const { data: contribuicao, error: contribuicaoError } = await supabase
    .from("contribuicoes_extraordinarias")
    .insert({ tenant_id: ctx.tenant.id, titulo, descricao, referencia, estado: "ativa", total_cents: totalCents, criado_por: ctx.user.id })
    .select("id").single();
  if (contribuicaoError || !contribuicao) return { error: "Não foi possível criar a contribuição." };

  for (const [indice, prestacao] of prestacoes.entries()) {
    const { data: prestacaoCriada, error: prestacaoError } = await supabase
      .from("contribuicao_prestacoes")
      .insert({ tenant_id: ctx.tenant.id, contribuicao_id: contribuicao.id, ordem: indice + 1, designacao: prestacao.designacao, vencimento: prestacao.vencimento, valor_cents: prestacao.valorCents, estado: "prevista" })
      .select("id").single();
    if (prestacaoError || !prestacaoCriada) return { error: "A contribuição foi criada, mas uma prestação não pôde ser registada." };

    const posicoes = distribuirValor(prestacao.valorCents, fracoes).map((linha) => ({
      tenant_id: ctx.tenant.id,
      prestacao_id: prestacaoCriada.id,
      fracao_id: linha.fracao_id,
      valor_cents: linha.valor_cents,
    }));
    const { error: posicoesError } = await supabase.from("contribuicao_prestacao_fracoes").insert(posicoes);
    if (posicoesError) return { error: "A contribuição foi criada, mas a distribuição por fração não pôde ser concluída." };
  }

  revalidatePath("/contribuicoes-extraordinarias");
  revalidatePath("/fracoes");
  return { sucesso: "Contribuição extraordinária criada. As posições por fração foram distribuídas por permilagem." };
}
