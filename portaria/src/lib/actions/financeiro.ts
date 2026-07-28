"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type {
  ConfiguracaoFinanceira,
  QuotaMensal,
  Pagamento,
  Recibo,
  VwQuotasResumoMes,
  VwInadimplencia,
} from "@/types/database";

// ============================================================================
// TIPOS
// ============================================================================

export type FinanceiroFormState = {
  error?: string;
  success?: boolean;
  id?: string;
};

export type DashboardFinanceiro = {
  resumoMes: VwQuotasResumoMes | null;
  topDevedores: VwInadimplencia[];
  configuracao: ConfiguracaoFinanceira | null;
};

// ============================================================================
// CONFIGURAÇÃO FINANCEIRA
// ============================================================================

export async function obterConfiguracaoFinanceira(): Promise<ConfiguracaoFinanceira | null> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("configuracao_financeira")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return (data as ConfiguracaoFinanceira) ?? null;
}

export async function configurarFinanceiro(
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const payload = {
    tenant_id: ctx.tenant.id,
    dia_vencimento_padrao: parseInt(String(formData.get("dia_vencimento_padrao") ?? "8")) || 8,
    metodo_pagamento_padrao: String(formData.get("metodo_pagamento_padrao") ?? "transferencia"),
    iban: String(formData.get("iban") ?? "").trim() || null,
    mbway_telefone: String(formData.get("mbway_telefone") ?? "").trim() || null,
    email_financeiro: String(formData.get("email_financeiro") ?? "").trim() || null,
    moeda: String(formData.get("moeda") ?? "EUR"),
    taxa_juros_mora: parseFloat(String(formData.get("taxa_juros_mora") ?? "0")) || 0,
  };

  const { error } = await supabase
    .from("configuracao_financeira")
    .upsert(payload, { onConflict: "tenant_id" });

  if (error) {
    console.error("Erro configurar financeiro:", error);
    return { error: error.message };
  }

  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

// ============================================================================
// QUOTAS MENSAIS — ADMIN
// ============================================================================

export async function listarQuotas(ano?: number, mes?: number): Promise<QuotaMensal[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  let query = supabase
    .from("quotas_mensais")
    .select("*, fracoes!inner(codigo, proprietario_nome)")
    .eq("tenant_id", ctx.tenant.id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .order("fracao_id");

  if (ano) query = query.eq("ano", ano);
  if (mes) query = query.eq("mes", mes);

  const { data } = await query;
  return (data ?? []) as unknown as QuotaMensal[];
}

export async function gerarQuotasMensais(
  ano: number,
  mes: number,
  valorBaseCents?: number
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("gerar_quotas_mes", {
    p_tenant_id: ctx.tenant.id,
    p_ano: ano,
    p_mes: mes,
    p_valor_base_cents: valorBaseCents ?? null,
  });

  if (error) {
    console.error("Erro gerar quotas:", error);
    return { error: error.message };
  }

  revalidatePath("/configuracao/financeiro");
  return { success: true, id: String(data) };
}

export async function atualizarQuota(
  quotaId: string,
  formData: FormData
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const payload = {
    valor_cents: parseInt(String(formData.get("valor_cents") ?? "0")) || 0,
    vencimento: String(formData.get("vencimento") ?? "").trim() || null,
    estado: String(formData.get("estado") ?? "pendente") as QuotaMensal["estado"],
    notas: String(formData.get("notas") ?? "").trim() || null,
  };

  const { error } = await supabase
    .from("quotas_mensais")
    .update(payload)
    .eq("id", quotaId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function isentarQuota(
  quotaId: string,
  motivo: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("quotas_mensais")
    .update({ estado: "isento", notas: motivo })
    .eq("id", quotaId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

// ============================================================================
// PAGAMENTOS — ADMIN
// ============================================================================

export async function listarPagamentos(fracaoId?: string): Promise<Pagamento[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  let query = supabase
    .from("pagamentos")
    .select("*, fracoes!inner(codigo, proprietario_nome)")
    .eq("tenant_id", ctx.tenant.id)
    .order("data_pagamento", { ascending: false });

  if (fracaoId) query = query.eq("fracao_id", fracaoId);

  const { data } = await query;
  return (data ?? []) as unknown as Pagamento[];
}

export async function registarPagamento(
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const fracaoId = String(formData.get("fracao_id") ?? "").trim();
  const quotaIdsRaw = String(formData.get("quota_ids") ?? "").trim();
  const valorCents = Math.round(parseFloat(String(formData.get("valor") ?? "0")) * 100);
  const metodo = String(formData.get("metodo") ?? "transferencia");
  const dataPagamento = String(formData.get("data_pagamento") ?? "").trim() || new Date().toISOString().split("T")[0];
  const referencia = String(formData.get("referencia") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!fracaoId) return { error: "Fração é obrigatória." };
  if (valorCents <= 0) return { error: "Valor deve ser superior a zero." };

  let quotaIds: string[] = [];
  if (quotaIdsRaw) {
    try {
      quotaIds = JSON.parse(quotaIdsRaw);
    } catch {
      return { error: "Formato de quota IDs inválido." };
    }
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      tenant_id: ctx.tenant.id,
      fracao_id: fracaoId,
      quota_ids: quotaIds,
      valor_cents: valorCents,
      metodo,
      data_pagamento: dataPagamento,
      referencia,
      notas,
      registado_por: ctx.user.id,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Erro registar pagamento:", error);
    return { error: error?.message ?? "Erro ao registar pagamento." };
  }

  revalidatePath("/configuracao/financeiro");
  return { success: true, id: data.id };
}

export async function anularPagamento(
  pagamentoId: string,
  motivo: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  // Marcar quotas como pendentes novamente
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("quota_ids")
    .eq("id", pagamentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (pagamento?.quota_ids && Array.isArray(pagamento.quota_ids)) {
    for (const quotaId of pagamento.quota_ids) {
      await supabase
        .from("quotas_mensais")
        .update({ estado: "pendente" })
        .eq("id", quotaId)
        .eq("tenant_id", ctx.tenant.id);
    }
  }

  const { error } = await supabase
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

// ============================================================================
// RECIBOS — ADMIN
// ============================================================================

export async function listarRecibos(fracaoId?: string): Promise<Recibo[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  let query = supabase
    .from("recibos")
    .select("*, fracoes!inner(codigo, proprietario_nome)")
    .eq("tenant_id", ctx.tenant.id)
    .order("emitido_em", { ascending: false });

  if (fracaoId) query = query.eq("fracao_id", fracaoId);

  const { data } = await query;
  return (data ?? []) as unknown as Recibo[];
}

export async function emitirRecibo(
  pagamentoId: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  // Buscar pagamento
  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("*, fracoes!inner(codigo, proprietario_nome)")
    .eq("id", pagamentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!pagamento) return { error: "Pagamento não encontrado." };

  // Obter próximo número de recibo
  const { data: numeroRecibo, error: numError } = await supabase.rpc(
    "obter_proximo_numero_recibo",
    { p_tenant_id: ctx.tenant.id }
  );

  if (numError || !numeroRecibo) {
    return { error: "Erro ao gerar número de recibo." };
  }

  // Calcular período das quotas
  let periodoInicio: string | null = null;
  let periodoFim: string | null = null;

  if (pagamento.quota_ids && Array.isArray(pagamento.quota_ids) && pagamento.quota_ids.length > 0) {
    const { data: quotas } = await supabase
      .from("quotas_mensais")
      .select("ano, mes")
      .in("id", pagamento.quota_ids)
      .order("ano", { ascending: true })
      .order("mes", { ascending: true });

    if (quotas && quotas.length > 0) {
      const primeiro = quotas[0];
      const ultimo = quotas[quotas.length - 1];
      periodoInicio = `${primeiro.ano}-${String(primeiro.mes).padStart(2, "0")}-01`;
      periodoFim = `${ultimo.ano}-${String(ultimo.mes).padStart(2, "0")}-01`;
    }
  }

  // Criar registo do recibo (PDF será gerado separadamente)
  const { data: recibo, error: insertError } = await supabase
    .from("recibos")
    .insert({
      tenant_id: ctx.tenant.id,
      fracao_id: pagamento.fracao_id,
      pagamento_id: pagamentoId,
      numero: numeroRecibo,
      valor_cents: pagamento.valor_cents,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      estado: "emitido",
    })
    .select()
    .single();

  if (insertError || !recibo) {
    console.error("Erro emitir recibo:", insertError);
    return { error: "Erro ao emitir recibo." };
  }

  revalidatePath("/configuracao/financeiro");
  return { success: true, id: recibo.id };
}

export async function anularRecibo(
  reciboId: string,
  motivo: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("recibos")
    .update({
      estado: "anulado",
      anulado_em: new Date().toISOString(),
      anulado_por: ctx.user.id,
      motivo_anulacao: motivo,
    })
    .eq("id", reciboId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

// ============================================================================
// DASHBOARD — ADMIN
// ============================================================================

export async function dashboardFinanceiro(
  ano?: number,
  mes?: number
): Promise<DashboardFinanceiro> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { resumoMes: null, topDevedores: [], configuracao: null };
  }

  const supabase = await createClient();
  const anoAtual = ano ?? new Date().getFullYear();
  const mesAtual = mes ?? new Date().getMonth() + 1;

  // Resumo do mês
  const { data: resumo } = await supabase
    .from("vw_quotas_resumo_mes")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("ano", anoAtual)
    .eq("mes", mesAtual)
    .single();

  // Top devedores
  const { data: devedores } = await supabase
    .from("vw_inadimplencia")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .gt("divida_total", 0)
    .order("divida_total", { ascending: false })
    .limit(10);

  // Configuração
  const { data: config } = await supabase
    .from("configuracao_financeira")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return {
    resumoMes: (resumo as VwQuotasResumoMes) ?? null,
    topDevedores: (devedores ?? []) as VwInadimplencia[],
    configuracao: (config as ConfiguracaoFinanceira) ?? null,
  };
}

// ============================================================================
// CONDÓMINO — Minhas quotas, pagamentos e recibos
// ============================================================================

export async function minhasQuotas(): Promise<QuotaMensal[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || !ctx.membership.fracao_id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("quotas_mensais")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("fracao_id", ctx.membership.fracao_id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });

  return (data ?? []) as QuotaMensal[];
}

export async function meusPagamentos(): Promise<Pagamento[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || !ctx.membership.fracao_id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("fracao_id", ctx.membership.fracao_id)
    .order("data_pagamento", { ascending: false });

  return (data ?? []) as Pagamento[];
}

export async function meusRecibos(): Promise<Recibo[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || !ctx.membership.fracao_id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("recibos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("fracao_id", ctx.membership.fracao_id)
    .eq("estado", "emitido")
    .order("emitido_em", { ascending: false });

  return (data ?? []) as Recibo[];
}

export async function totalEmDivida(): Promise<number> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || !ctx.membership.fracao_id) return 0;

  const supabase = await createClient();
  const { data } = await supabase.rpc("calcular_divida_fracao", {
    p_fracao_id: ctx.membership.fracao_id,
  });

  return (data as number) ?? 0;
}

export async function resumoFinanceiroCondomino(): Promise<{
  quotas: QuotaMensal[];
  pagamentos: Pagamento[];
  recibos: Recibo[];
  divida: number;
  configuracao: ConfiguracaoFinanceira | null;
}> {
  const [quotas, pagamentos, recibos, divida, configuracao] = await Promise.all([
    minhasQuotas(),
    meusPagamentos(),
    meusRecibos(),
    totalEmDivida(),
    obterConfiguracaoFinanceira(),
  ]);

  return { quotas, pagamentos, recibos, divida, configuracao };
}
