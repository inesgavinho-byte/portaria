"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type {
  ConfiguracaoFinanceira,
  QuotaMensal,
  Pagamento,
  Recibo,
  Despesa,
  ObrigacaoRecorrente,
  EstadoDespesa,
  CategoriaDespesa,
  VwQuotasResumoMes,
  VwInadimplencia,
  AlertaOperacional,
  EventoCalendarioAdministrativo,
} from "@/types/database";

// ============================================================================
// TIPOS
// ============================================================================

export type FinanceiroFormState = {
  error?: string;
  success?: boolean;
  id?: string;
};

export type DespesaResumo = {
  totalPendente: number;
  totalPago: number;
  totalReconciliar: number;
  totalVencido: number;
};

export type OpcaoFinanceira = { id: string; nome: string };

export type CalendarioAdministrativo = {
  eventos: EventoCalendarioAdministrativo[];
  alertasAbertos: AlertaOperacional[];
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


// ============================================================================
// DESPESAS E OBRIGAÇÕES — ADMIN
// ============================================================================

const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  "seguranca_social", "salario", "elevadores", "seguro", "manutencao",
  "obras", "servicos", "impostos", "outro",
];

const ESTADOS_DESPESA: EstadoDespesa[] = [
  "rascunho", "pendente", "em_aprovacao", "aprovada", "pago", "vencido", "cancelado", "rejeitada", "a_reconciliar",
];

function valorParaCents(valor: FormDataEntryValue | null) {
  const normalizado = String(valor ?? "").trim().replace(".", "").replace(",", ".");
  return Math.round(Number(normalizado) * 100);
}

function textoOpcional(valor: FormDataEntryValue | null) {
  const resultado = String(valor ?? "").trim();
  return resultado || null;
}

async function validarRelacaoDoTenant(
  tabela: "fornecedores" | "contratos" | "obrigacoes_recorrentes",
  id: string | null,
  tenantId: string
) {
  if (!id) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from(tabela)
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return Boolean(data);
}

export async function listarDespesas(): Promise<Despesa[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("despesas")
    .select("*, fornecedores(nome), contratos(titulo), obrigacoes_recorrentes(titulo)")
    .eq("tenant_id", ctx.tenant.id)
    .order("data_vencimento", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false });

  return (data ?? []) as unknown as Despesa[];
}

export async function listarObrigacoes(): Promise<ObrigacaoRecorrente[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("obrigacoes_recorrentes")
    .select("*, fornecedores(nome), contratos(titulo)")
    .eq("tenant_id", ctx.tenant.id)
    .order("proximo_vencimento", { ascending: true, nullsFirst: false })
    .order("titulo");

  return (data ?? []) as unknown as ObrigacaoRecorrente[];
}

export async function listarFornecedoresFinanceiro(): Promise<OpcaoFinanceira[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("fornecedores")
    .select("id, nome")
    .eq("tenant_id", ctx.tenant.id)
    .eq("ativo", true)
    .order("nome");

  return (data ?? []) as OpcaoFinanceira[];
}

export async function listarContratosFinanceiro(): Promise<OpcaoFinanceira[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos")
    .select("id, titulo")
    .eq("tenant_id", ctx.tenant.id)
    .order("titulo");

  return (data ?? []).map((contrato) => ({ id: contrato.id, nome: contrato.titulo }));
}

export async function listarDocumentosAdministracaoFinanceiro(): Promise<OpcaoFinanceira[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos_administracao")
    .select("id, titulo")
    .eq("tenant_id", ctx.tenant.id)
    .order("upload_em", { ascending: false })
    .limit(100);

  return (data ?? []).map((documento) => ({ id: documento.id, nome: documento.titulo }));
}

export async function obterResumoDespesas(): Promise<DespesaResumo> {
  const ctx = await requireAdmin();
  if (!ctx) return { totalPendente: 0, totalPago: 0, totalReconciliar: 0, totalVencido: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("despesas")
    .select("valor_cents, estado")
    .eq("tenant_id", ctx.tenant.id);

  return (data ?? []).reduce<DespesaResumo>((resumo, despesa) => {
    if (despesa.estado === "pago") resumo.totalPago += despesa.valor_cents;
    if (despesa.estado === "pendente") resumo.totalPendente += despesa.valor_cents;
    if (despesa.estado === "a_reconciliar") resumo.totalReconciliar += despesa.valor_cents;
    if (despesa.estado === "vencido") resumo.totalVencido += despesa.valor_cents;
    return resumo;
  }, { totalPendente: 0, totalPago: 0, totalReconciliar: 0, totalVencido: 0 });
}

export async function criarDespesa(formData: FormData): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const fornecedorId = textoOpcional(formData.get("fornecedor_id"));
  const contratoId = textoOpcional(formData.get("contrato_id"));
  const obrigacaoId = textoOpcional(formData.get("obrigacao_id"));
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "outro") as CategoriaDespesa;
  const estado = String(formData.get("estado") ?? "a_reconciliar") as EstadoDespesa;
  const valorCents = valorParaCents(formData.get("valor"));
  const dataPagamento = textoOpcional(formData.get("data_pagamento"));
  const documentoAdministracaoId = textoOpcional(formData.get("documento_administracao_id"));
  const papelDocumento = String(formData.get("papel_documento") ?? "outro") as "fatura" | "comprovativo" | "nota_credito" | "correspondencia" | "outro";

  if (!descricao) return { error: "Descrição é obrigatória." };
  if (!CATEGORIAS_DESPESA.includes(categoria)) return { error: "Categoria inválida." };
  if (!ESTADOS_DESPESA.includes(estado)) return { error: "Estado inválido." };
  if (!["rascunho", "pendente", "a_reconciliar"].includes(estado)) return { error: "Uma nova despesa só pode começar em rascunho, pendente ou a reconciliar." };
  if (!Number.isFinite(valorCents) || valorCents <= 0) return { error: "Valor deve ser superior a zero." };
  if (dataPagamento) return { error: "O pagamento só pode ser registado depois da aprovação e de um comprovativo associado." };

  const relacoesValidas = await Promise.all([
    validarRelacaoDoTenant("fornecedores", fornecedorId, ctx.tenant.id),
    validarRelacaoDoTenant("contratos", contratoId, ctx.tenant.id),
    validarRelacaoDoTenant("obrigacoes_recorrentes", obrigacaoId, ctx.tenant.id),
  ]);
  if (relacoesValidas.some((valida) => !valida)) return { error: "Uma relação selecionada não pertence a este condomínio." };
  if (!["fatura", "comprovativo", "nota_credito", "correspondencia", "outro"].includes(papelDocumento)) return { error: "Tipo de documento inválido." };

  const supabase = await createClient();
  if (documentoAdministracaoId) {
    const { data: documento } = await supabase
      .from("documentos_administracao")
      .select("id")
      .eq("id", documentoAdministracaoId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!documento) return { error: "Documento confidencial não encontrado neste condomínio." };
  }

  const { data, error } = await supabase
    .from("despesas")
    .insert({
      tenant_id: ctx.tenant.id,
      fornecedor_id: fornecedorId,
      contrato_id: contratoId,
      obrigacao_id: obrigacaoId,
      descricao,
      categoria,
      numero_documento: textoOpcional(formData.get("numero_documento")),
      referencia: textoOpcional(formData.get("referencia")),
      data_documento: textoOpcional(formData.get("data_documento")),
      data_vencimento: textoOpcional(formData.get("data_vencimento")),
      valor_cents: valorCents,
      estado,
      data_pagamento: dataPagamento,
      metodo_pagamento: textoOpcional(formData.get("metodo_pagamento")),
      referencia_pagamento: textoOpcional(formData.get("referencia_pagamento")),
      notas: textoOpcional(formData.get("notas")),
      criado_por: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Não foi possível criar a despesa." };

  if (documentoAdministracaoId) {
    const { error: documentoError } = await supabase
      .from("despesas_documentos")
      .insert({
        tenant_id: ctx.tenant.id,
        despesa_id: data.id,
        documento_administracao_id: documentoAdministracaoId,
        papel: papelDocumento,
        criado_por: ctx.user.id,
      });
    if (documentoError) return { error: `Despesa criada, mas o documento não foi associado: ${documentoError.message}`, id: data.id };
  }

  revalidatePath("/configuracao/financeiro");
  return { success: true, id: data.id };
}

export async function atualizarEstadoDespesa(
  despesaId: string,
  estado: EstadoDespesa
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!["pendente", "a_reconciliar", "cancelado"].includes(estado)) {
    return { error: "Use o fluxo de aprovação para submeter, aprovar, rejeitar ou confirmar pagamentos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("despesas")
    .update({ estado })
    .eq("id", despesaId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function submeterDespesaParaAprovacao(despesaId: string): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("despesas")
    .update({ estado: "em_aprovacao" })
    .eq("id", despesaId)
    .eq("tenant_id", ctx.tenant.id)
    .in("estado", ["rascunho", "pendente", "a_reconciliar", "vencido"]);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function decidirAprovacaoDespesa(
  despesaId: string,
  decisao: "aprovada" | "rejeitada",
  motivo?: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!motivo?.trim()) return { error: "Indique um motivo para a decisão." };

  const supabase = await createClient();
  const payload = decisao === "aprovada"
    ? { estado: "aprovada", aprovado_em: new Date().toISOString(), aprovado_por: ctx.user.id, motivo_aprovacao: motivo.trim(), rejeitado_em: null, rejeitado_por: null, motivo_rejeicao: null }
    : { estado: "rejeitada", rejeitado_em: new Date().toISOString(), rejeitado_por: ctx.user.id, motivo_rejeicao: motivo.trim() };

  const { error } = await supabase
    .from("despesas")
    .update(payload)
    .eq("id", despesaId)
    .eq("tenant_id", ctx.tenant.id)
    .eq("estado", "em_aprovacao");

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function confirmarPagamentoDespesa(
  despesaId: string,
  dataPagamento: string,
  referenciaPagamento: string
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!dataPagamento) return { error: "Indique a data de pagamento." };
  if (!referenciaPagamento.trim()) return { error: "Indique a referência de pagamento." };

  const supabase = await createClient();
  const { data: comprovativos } = await supabase
    .from("despesas_documentos")
    .select("id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("despesa_id", despesaId)
    .eq("papel", "comprovativo")
    .limit(1);

  if (!comprovativos?.length) return { error: "Associe primeiro um comprovativo no Arquivo confidencial." };

  const { error } = await supabase
    .from("despesas")
    .update({ estado: "pago", data_pagamento: dataPagamento, referencia_pagamento: referenciaPagamento.trim() })
    .eq("id", despesaId)
    .eq("tenant_id", ctx.tenant.id)
    .eq("estado", "aprovada");

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function listarCalendarioAdministrativo(): Promise<CalendarioAdministrativo> {
  const ctx = await requireAdmin();
  if (!ctx) return { eventos: [], alertasAbertos: [] };

  const supabase = await createClient();
  const [despesas, obrigacoes, alertas] = await Promise.all([
    supabase.from("despesas").select("id, descricao, data_vencimento, estado, notas").eq("tenant_id", ctx.tenant.id).not("data_vencimento", "is", null).order("data_vencimento", { ascending: true }).limit(100),
    supabase.from("obrigacoes_recorrentes").select("id, titulo, proximo_vencimento, estado, notas").eq("tenant_id", ctx.tenant.id).eq("estado", "ativa").not("proximo_vencimento", "is", null).order("proximo_vencimento", { ascending: true }).limit(100),
    supabase.from("alertas_operacionais").select("*").eq("tenant_id", ctx.tenant.id).is("reconhecido_em", null).order("data_referencia", { ascending: true, nullsFirst: false }).limit(100),
  ]);

  const eventos: EventoCalendarioAdministrativo[] = [
    ...(despesas.data ?? []).map((item) => ({ id: `despesa-${item.id}`, tipo: "despesa" as const, titulo: item.descricao, data: item.data_vencimento!, estado: item.estado, severidade: item.data_vencimento! < new Date().toISOString().slice(0, 10) ? "alta" as const : "normal" as const, entidade_id: item.id, descricao: item.notas })),
    ...(obrigacoes.data ?? []).map((item) => ({ id: `obrigacao-${item.id}`, tipo: "obrigacao" as const, titulo: item.titulo, data: item.proximo_vencimento!, estado: item.estado, severidade: item.proximo_vencimento! < new Date().toISOString().slice(0, 10) ? "alta" as const : "normal" as const, entidade_id: item.id, descricao: item.notas })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return { eventos, alertasAbertos: (alertas.data ?? []) as AlertaOperacional[] };
}

export async function reconhecerAlertaOperacional(alertaId: string): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("alertas_operacionais")
    .update({ reconhecido_em: new Date().toISOString(), reconhecido_por: ctx.user.id })
    .eq("id", alertaId)
    .eq("tenant_id", ctx.tenant.id)
    .is("reconhecido_em", null);
  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function criarObrigacao(formData: FormData): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const fornecedorId = textoOpcional(formData.get("fornecedor_id"));
  const contratoId = textoOpcional(formData.get("contrato_id"));
  const categoria = String(formData.get("categoria") ?? "outro") as CategoriaDespesa;
  const periodicidade = String(formData.get("periodicidade") ?? "mensal");
  const valorEstimadoCents = formData.get("valor_estimado") ? valorParaCents(formData.get("valor_estimado")) : null;

  if (!titulo) return { error: "Título é obrigatório." };
  if (!CATEGORIAS_DESPESA.includes(categoria)) return { error: "Categoria inválida." };
  if (!["mensal", "trimestral", "semestral", "anual", "pontual"].includes(periodicidade)) return { error: "Periodicidade inválida." };
  if (valorEstimadoCents !== null && (!Number.isFinite(valorEstimadoCents) || valorEstimadoCents <= 0)) return { error: "Valor estimado inválido." };

  const relacoesValidas = await Promise.all([
    validarRelacaoDoTenant("fornecedores", fornecedorId, ctx.tenant.id),
    validarRelacaoDoTenant("contratos", contratoId, ctx.tenant.id),
  ]);
  if (relacoesValidas.some((valida) => !valida)) return { error: "Uma relação selecionada não pertence a este condomínio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obrigacoes_recorrentes")
    .insert({
      tenant_id: ctx.tenant.id,
      fornecedor_id: fornecedorId,
      contrato_id: contratoId,
      titulo,
      categoria,
      periodicidade,
      valor_estimado_cents: valorEstimadoCents,
      proximo_vencimento: textoOpcional(formData.get("proximo_vencimento")),
      estado: "ativa",
      notas: textoOpcional(formData.get("notas")),
      criado_por: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Não foi possível criar a obrigação." };
  revalidatePath("/configuracao/financeiro");
  return { success: true, id: data.id };
}

export async function atualizarEstadoObrigacao(
  obrigacaoId: string,
  estado: "ativa" | "suspensa" | "terminada"
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("obrigacoes_recorrentes")
    .update({ estado })
    .eq("id", obrigacaoId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}

export async function associarDocumentoDespesa(
  despesaId: string,
  documentoAdministracaoId: string,
  papel: "fatura" | "comprovativo" | "nota_credito" | "correspondencia" | "outro" = "outro"
): Promise<FinanceiroFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("despesas_documentos")
    .upsert({
      tenant_id: ctx.tenant.id,
      despesa_id: despesaId,
      documento_administracao_id: documentoAdministracaoId,
      papel,
      criado_por: ctx.user.id,
    }, { onConflict: "despesa_id,documento_administracao_id" });

  if (error) return { error: error.message };
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}
