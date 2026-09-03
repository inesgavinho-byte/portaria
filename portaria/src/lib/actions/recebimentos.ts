"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import {
  sugerirFracoes,
  sugerirQuotas,
  type MovimentoCredito,
  type SugestaoFracao,
  type SugestaoQuotas,
} from "@/lib/financeiro/recebimentos";

export type MovimentoRecebimento = MovimentoCredito & {
  pagamentoId: string | null;
  sugestoes: SugestaoFracao[];
  quotasSugeridas: SugestaoQuotas | null;
};

export type RecebimentosListagem = {
  porClassificar: MovimentoRecebimento[];
  classificados: number;
};

export type RecebimentoResultado = { ok: true } | { ok: false; error: string };

function revalidar() {
  for (const rota of [
    "/configuracao/financeiro/movimentos",
    "/configuracao/financeiro/movimentos/recebimentos",
    "/configuracao/financeiro",
    "/hoje",
  ]) {
    revalidatePath(rota);
  }
}

/**
 * Créditos do tenant e as sugestões de fracção/quotas de cada um.
 *
 * Custo controlado: UMA query a movimentos (créditos, com e sem pagamento —
 * a partição faz-se em memória), UMA a fracções e UMA a quotas pendentes dos
 * anos envolvidos. Toda a sugestão é calculada em memória — nada de N+1.
 */
export async function listarMovimentosRecebimento(): Promise<RecebimentosListagem> {
  const ctx = await requireAdmin();
  if (!ctx) return { porClassificar: [], classificados: 0 };

  const supabase = await createClient();
  const [{ data: movimentosData }, { data: fracoesData }] = await Promise.all([
    supabase
      .from("movimentos_bancarios")
      .select("id,data_movimento,valor_cents,descricao,pagamento_id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("tipo", "credito")
      .order("data_movimento", { ascending: false }),
    supabase
      .from("fracoes")
      .select("id,codigo,proprietario_nome")
      .eq("tenant_id", ctx.tenant.id)
      .order("codigo", { ascending: true }),
  ]);

  const movimentos = movimentosData ?? [];
  const porClassificar: MovimentoRecebimento[] = [];
  let classificados = 0;

  if (movimentos.length === 0) return { porClassificar, classificados };

  // Um único select de quotas: anos distintos dos movimentos carregados; o
  // recorte "do ano do movimento" faz-se depois, em memória, por movimento.
  const anos = [...new Set(movimentos.map((m) => Number(m.data_movimento.slice(0, 4))))];
  const { data: quotasData } = await supabase
    .from("quotas_mensais")
    .select("id,fracao_id,ano,mes,valor_cents")
    .eq("tenant_id", ctx.tenant.id)
    .eq("estado", "pendente")
    .in("ano", anos);

  const quotasPorAnoEFracao = new Map<string, { id: string; ano: number; mes: number; valorCents: number }[]>();
  for (const quota of quotasData ?? []) {
    const chave = `${quota.ano}:${quota.fracao_id}`;
    const lista = quotasPorAnoEFracao.get(chave) ?? [];
    lista.push({ id: quota.id, ano: quota.ano, mes: quota.mes, valorCents: quota.valor_cents });
    quotasPorAnoEFracao.set(chave, lista);
  }

  for (const movimento of movimentos) {
    if (movimento.pagamento_id) {
      classificados += 1;
      continue;
    }
    const ano = Number(movimento.data_movimento.slice(0, 4));
    const candidatas = (fracoesData ?? []).map((fracao) => ({
      id: fracao.id,
      codigo: fracao.codigo,
      proprietarioNome: fracao.proprietario_nome,
      quotasPendentes: (quotasPorAnoEFracao.get(`${ano}:${fracao.id}`) ?? []).sort(
        (a, b) => a.ano - b.ano || a.mes - b.mes,
      ),
    }));

    const credito: MovimentoCredito = {
      id: movimento.id,
      dataMovimento: movimento.data_movimento,
      valorCents: movimento.valor_cents,
      descricao: movimento.descricao,
    };
    const sugestoes = sugerirFracoes(credito, candidatas);
    // As quotas pré-marcadas no formulário vêm da melhor fracção sugerida;
    // se nenhuma fracção for sugerida, nada é pré-marcado.
    const quotasSugeridas = sugestoes[0]
      ? sugerirQuotas(credito, sugestoes[0].fracao.quotasPendentes)
      : null;

    porClassificar.push({
      ...credito,
      pagamentoId: null,
      sugestoes,
      quotasSugeridas,
    });
  }

  return { porClassificar, classificados };
}

const COMPRIMENTO_REFERENCIA = 80;

/**
 * Regista um pagamento de quotas a partir de um crédito bancário e reconcilia
 * o movimento — uma transacção lógica em dois passos com ordem pensada para
 * não duplicar pagamentos nem deixar movimento órfão:
 *
 *  1. INSERT em `pagamentos` (com id gerado aqui);
 *  2. UPDATE condicional do movimento (`pagamento_id IS NULL` + `.select()`
 *     para contar linhas afectadas).
 *
 * Se o passo 2 devolver zero linhas, outro processo reconciliou o movimento
 * entretanto: o pagamento acabado de inserir é APAGADO (acção compensatória —
 * temos o id nas mãos, não há órfão) e a operação aborta. Se o passo 2
 * falhar por outro erro, o mesmo rollback compensatório.
 *
 * Nota de desenho: o enunciado pedia o update PRIMEIRO, mas
 * `movimentos_bancarios.pagamento_id` tem FK para `pagamentos` — apontar para
 * um pagamento inexistente violaria a constraint. A ordem insert→update
 * condicional com rollback compensatório preserva exactamente a intenção
 * (nunca duplicar, nunca órfão) dentro do que a FK permite.
 *
 * Estados das quotas: este código não as altera POR SI — o trigger da BD
 * trg_alocar_pagamento (20260903010000) aloca o valor por quota (quota_ids,
 * ordem cronológica) e mantém pago_cents/estado; o trg_desalocar_pagamento
 * repõe tudo no DELETE — a compensação apaga e o trigger trata do resto.
 *
 * NÃO emite recibo — mesma semântica de `registarPagamento` no financeiro.
 */
export async function registarPagamentoDeMovimento(formData: FormData): Promise<RecebimentoResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const movimentoId = String(formData.get("movimento_id") ?? "").trim();
  const fracaoId = String(formData.get("fracao_id") ?? "").trim();
  let quotaIds: string[] = [];
  try {
    const bruto = JSON.parse(String(formData.get("quota_ids") ?? "[]"));
    if (Array.isArray(bruto)) quotaIds = bruto.map(String);
  } catch {
    return { ok: false, error: "Formato de quotas inválido." };
  }

  if (!movimentoId) return { ok: false, error: "Movimento em falta." };
  if (!fracaoId) return { ok: false, error: "Escolhe a fracção que recebeu o pagamento." };

  const supabase = await createClient();

  // O movimento tem de ser um crédito do tenant, ainda sem pagamento ligado
  // e sem factura imputada — a check da 20260822195500 recusa despesa_id E
  // pagamento_id em simultâneo; recusar aqui dá um erro legível ANTES de
  // inserir um pagamento que depois teria de ser compensado.
  const { data: movimento } = await supabase
    .from("movimentos_bancarios")
    .select("id,tipo,valor_cents,descricao,data_movimento,pagamento_id,despesa_id")
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!movimento) return { ok: false, error: "Movimento não encontrado." };
  if (movimento.tipo !== "credito") return { ok: false, error: "Só créditos bancários podem ser reconciliados como recebimento." };
  if (movimento.pagamento_id) return { ok: false, error: "Este movimento já foi reconciliado com um pagamento." };
  if (movimento.despesa_id) {
    return {
      ok: false,
      error: "Este movimento está imputado a uma factura — desimputa-o primeiro: um movimento não pode estar ligado a uma factura e a um pagamento ao mesmo tempo.",
    };
  }

  // A fracção tem de pertencer ao tenant.
  const { data: fracao } = await supabase
    .from("fracoes")
    .select("id")
    .eq("id", fracaoId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!fracao) return { ok: false, error: "Fração não encontrada neste condomínio." };

  // As quotas têm de existir, pertencer ao tenant E a essa fracção.
  if (quotaIds.length > 0) {
    const { data: quotas } = await supabase
      .from("quotas_mensais")
      .select("id,fracao_id,valor_cents")
      .eq("tenant_id", ctx.tenant.id)
      .in("id", quotaIds);
    if (!quotas || quotas.length !== quotaIds.length) {
      return { ok: false, error: "Uma ou mais quotas não foram encontradas neste condomínio." };
    }
    if (quotas.some((quota) => quota.fracao_id !== fracaoId)) {
      return { ok: false, error: "Todas as quotas têm de pertencer à fracção escolhida." };
    }
    const somaCents = quotas.reduce((total, quota) => total + quota.valor_cents, 0);
    if (somaCents > movimento.valor_cents) {
      const euros = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
      return {
        ok: false,
        error: `A soma das quotas (${euros.format(somaCents / 100)}) excede o valor do movimento (${euros.format(movimento.valor_cents / 100)}).`,
      };
    }
  }

  // Passo 1: o pagamento, com id gerado aqui para o passo 2 poder apontar
  // para ele e para a acção compensatória o saber apagar.
  const pagamentoId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("pagamentos").insert({
    id: pagamentoId,
    tenant_id: ctx.tenant.id,
    fracao_id: fracaoId,
    quota_ids: quotaIds,
    valor_cents: movimento.valor_cents,
    metodo: "transferencia",
    data_pagamento: movimento.data_movimento,
    referencia:
      ("Extrato bancário — " + movimento.descricao).slice(0, COMPRIMENTO_REFERENCIA),
    notas: "Reconciliado do movimento bancário importado.",
    registado_por: ctx.user.id,
  });

  if (insertError) {
    console.error("Erro ao inserir pagamento do movimento:", insertError);
    return { ok: false, error: "Erro ao registar o pagamento. O movimento não foi alterado." };
  }

  // Passo 2: liga o movimento, condicionado a ainda não ter pagamento.
  const { data: atualizados, error: updateError } = await supabase
    .from("movimentos_bancarios")
    .update({ pagamento_id: pagamentoId, confirmado: true })
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .is("pagamento_id", null)
    .select("id");

  if (updateError) {
    console.error("Erro ao reconciliar movimento com pagamento:", updateError);
    const falhaCompensacao = await anularPagamentoProvisorio(supabase, ctx.tenant.id, pagamentoId);
    return {
      ok: false,
      error: falhaCompensacao ?? "Erro ao reconciliar o movimento. O pagamento foi anulado; nada ficou a meio.",
    };
  }
  if (!atualizados || atualizados.length === 0) {
    // Corrida: outro processo reconciliou este movimento entretanto. Abortar
    // SEM duplicar — o pagamento inserido é anulado.
    const falhaCompensacao = await anularPagamentoProvisorio(supabase, ctx.tenant.id, pagamentoId);
    return {
      ok: false,
      error: falhaCompensacao ?? "Este movimento já foi reconciliado por outra operação.",
    };
  }

  revalidar();
  return { ok: true };
}

/**
 * Acção compensatória: anula um pagamento acabado de inserir porque o passo 2
 * não correu. O trigger trg_desalocar_pagamento (20260903010000) des-aloca e
 * recalcula pago_cents/estado das quotas no próprio DELETE — já não há
 * reposição manual de estados aqui (a versão antiga repunha 'pendente' à mão
 * e ficava errada quando outro pagamento cobria parcialmente as mesmas
 * quotas).
 *
 * Devolve null em sucesso; em falha devolve uma mensagem explícita com o id —
 * quem chama NUNCA devolve "nada ficou a meio" quando a compensação falhou.
 */
async function anularPagamentoProvisorio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  pagamentoId: string,
): Promise<string | null> {
  // Apagar o pagamento provisório (temos o id nas mãos — não há órfão); o
  // trigger da BD repõe as quotas no DELETE.
  const { error: deleteError } = await supabase
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId)
    .eq("tenant_id", tenantId);
  if (deleteError) {
    console.error("Erro ao anular pagamento provisório:", deleteError);
    return `Não foi possível anular o pagamento provisório (id ${pagamentoId}) — anula-o manualmente em Financeiro → Pagamentos.`;
  }

  return null;
}

// ============================================================================
// ASSOCIAR QUOTAS A UM PAGAMENTO EXISTENTE (fase 2, follow-up)
// ============================================================================

export type AssociacaoFormState = {
  error?: string;
  sucesso?: boolean;
};

/**
 * Define quais quotas um pagamento existente cobre. Para o caso dos
 * pagamentos registados com quota_ids vazios: escolhe-se as quotas e o
 * trigger trg_alocar_pagamento (20260903010000) distribui o valor no
 * UPDATE — enche remanescentes por ordem cronológica e o que sobra fica
 * sem alocação. Re-associar substitui a seleção anterior (re-alocação
 * limpa, sem duplicar).
 */
export async function associarQuotasAPagamento(
  _prev: AssociacaoFormState,
  formData: FormData
): Promise<AssociacaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const pagamentoId = String(formData.get("pagamento_id") ?? "").trim();
  if (!pagamentoId) return { error: "Pagamento em falta." };

  let quotaIds: string[] = [];
  try {
    const bruto = JSON.parse(String(formData.get("quota_ids") ?? "[]"));
    if (Array.isArray(bruto)) quotaIds = bruto.map(String).filter(Boolean);
  } catch {
    return { error: "Formato de quotas inválido." };
  }
  if (quotaIds.length === 0) return { error: "Escolhe pelo menos uma quota." };

  const supabase = await createClient();

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, fracao_id")
    .eq("id", pagamentoId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!pagamento) return { error: "Pagamento não encontrado neste condomínio." };

  const { data: quotas } = await supabase
    .from("quotas_mensais")
    .select("id, fracao_id, estado")
    .eq("tenant_id", ctx.tenant.id)
    .in("id", quotaIds);
  if (!quotas || quotas.length !== quotaIds.length) {
    return { error: "Uma ou mais quotas não foram encontradas neste condomínio." };
  }
  if (quotas.some((quota) => quota.fracao_id !== pagamento.fracao_id)) {
    return { error: "Todas as quotas têm de pertencer à fração do pagamento." };
  }
  if (quotas.some((quota) => quota.estado === "isento")) {
    return { error: "Quotas isentas não recebem pagamentos — remove-as da seleção." };
  }

  // O UPDATE dispara a re-alocação no trigger; quota_ids fica como registo
  // da intenção, pagamento_quotas fica com a distribuição real.
  const { error } = await supabase
    .from("pagamentos")
    .update({ quota_ids: quotaIds })
    .eq("id", pagamentoId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro a associar quotas:", error);
    return { error: "Erro ao associar quotas ao pagamento." };
  }

  revalidatePath("/configuracao/financeiro");
  revalidatePath("/condominos");
  return { sucesso: true };
}
