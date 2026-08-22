"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type EstadoReconciliacao = "nao_reconciliado" | "parcial" | "reconciliado" | "discrepancia";

export type LinhaMapaContas = {
  id: string;
  codigo: string;
  descricao: string;
  grupo: string;
  ordem: number;
  orcamentoCents: number | null;
  realizadoCents: number | null;
  realizadoDeclaradoCents: number | null;
  comprometidoCents: number | null;
  previsaoCents: number | null;
  desvioCents: number | null;
  desvioDeclaradoCents: number | null;
  fonteCalculo: "manual" | "despesas" | "pagamentos";
  estadoReconciliacao: EstadoReconciliacao;
  fonteReferencia: string | null;
};

export type MapaContasAnual = {
  anos: number[];
  ano: number;
  historico: boolean;
  exercicio: {
    id: string;
    estado: string;
    titulo: string | null;
    saldoInicialCents: number | null;
    saldoFinalBancarioCents: number | null;
    fonteReferencia: string | null;
    observacoes: string | null;
  } | null;
  linhas: LinhaMapaContas[];
  resumo: {
    orcamentoDespesasCents: number;
    realizadoDespesasCents: number;
    comprometidoDespesasCents: number | null;
    orcamentoReceitasCents: number;
    realizadoReceitasCents: number;
    resultadoExercicioCents: number;
    resultadoProjetadoCents: number | null;
  };
};

function n(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function obterMapaContasAnual(anoPedido?: number): Promise<MapaContasAnual> {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const supabase = await createClient();
  const { data: exerciciosData } = await supabase
    .from("financeiro_exercicios")
    .select("id,ano,estado,titulo,saldo_inicial_cents,saldo_final_bancario_cents,fonte_referencia,observacoes")
    .eq("tenant_id", ctx.tenant.id)
    .order("ano", { ascending: false });

  const exercicios = exerciciosData ?? [];
  const anos = exercicios.map((e) => Number(e.ano));
  const ano = anoPedido && anos.includes(anoPedido) ? anoPedido : (anos[0] ?? new Date().getFullYear());
  const exercicio = exercicios.find((e) => Number(e.ano) === ano) ?? null;
  const historico = exercicio?.estado === "historico" || ano < new Date().getFullYear();

  if (!exercicio) {
    return {
      anos,
      ano,
      historico,
      exercicio: null,
      linhas: [],
      resumo: {
        orcamentoDespesasCents: 0,
        realizadoDespesasCents: 0,
        comprometidoDespesasCents: historico ? null : 0,
        orcamentoReceitasCents: 0,
        realizadoReceitasCents: 0,
        resultadoExercicioCents: 0,
        resultadoProjetadoCents: historico ? null : 0,
      },
    };
  }

  const [
    { data: contasData },
    { data: despesasData },
    { data: pagamentosData },
    { data: movimentosBancariosData },
  ] = await Promise.all([
    supabase
      .from("financeiro_contas_anuais")
      .select("id,codigo,descricao,grupo,ordem,orcamento_cents,realizado_declarado_cents,comprometido_declarado_cents,previsao_declarado_cents,desvio_declarado_cents,fonte_calculo,filtro_calculo,estado_reconciliacao,fonte_referencia")
      .eq("tenant_id", ctx.tenant.id)
      .eq("exercicio_id", exercicio.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("despesas")
      .select("id,categoria,valor_cents,estado,data_documento,data_pagamento")
      .eq("tenant_id", ctx.tenant.id),
    supabase
      .from("pagamentos")
      .select("valor_cents,data_pagamento")
      .eq("tenant_id", ctx.tenant.id),
    supabase
      .from("movimentos_bancarios")
      .select("despesa_id,tipo,confirmado,data_movimento")
      .eq("tenant_id", ctx.tenant.id)
      .eq("confirmado", true),
  ]);

  const contas = contasData ?? [];
  const despesasAno = (despesasData ?? []).filter((d) => {
    const data = d.data_pagamento ?? d.data_documento;
    return data ? Number(String(data).slice(0, 4)) === ano : false;
  });
  const pagamentosAno = (pagamentosData ?? []).filter((p) => Number(String(p.data_pagamento).slice(0, 4)) === ano);
  const movimentosDebitoAno = (movimentosBancariosData ?? []).filter(
    (m) => m.tipo === "debito" && Number(String(m.data_movimento).slice(0, 4)) === ano,
  );
  const despesasComDebitoConfirmado = new Set(
    movimentosDebitoAno.map((m) => m.despesa_id).filter((id): id is string => Boolean(id)),
  );

  const despesaEstaRealizada = (d: { id: string; estado: string }) =>
    d.estado === "pago" || despesasComDebitoConfirmado.has(d.id);

  const linhas: LinhaMapaContas[] = contas.map((c) => {
    const fonte = c.fonte_calculo as "manual" | "despesas" | "pagamentos";
    const filtros = Array.isArray(c.filtro_calculo) ? c.filtro_calculo : [];
    const realizadoDeclarado = n(c.realizado_declarado_cents);
    let realizado = realizadoDeclarado;
    let comprometido = historico ? null : n(c.comprometido_declarado_cents);

    // Um exercício histórico mantém a fotografia declarada pela fonte.
    // Apenas exercícios vivos são recalculados a partir dos movimentos PORTARIA.
    // Um movimento bancário confirmado prova que o dinheiro já saiu da conta,
    // mesmo que a despesa permaneça documentalmente "a_reconciliar" até o
    // comprovativo original ser associado ao arquivo.
    if (!historico && fonte === "despesas") {
      const matches = despesasAno.filter((d) => filtros.length === 0 || filtros.includes(d.categoria));
      realizado = matches
        .filter(despesaEstaRealizada)
        .reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
      comprometido = matches
        .filter((d) => !despesaEstaRealizada(d) && ["pendente", "vencido", "a_reconciliar"].includes(d.estado))
        .reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
    } else if (!historico && fonte === "pagamentos") {
      realizado = pagamentosAno.reduce((acc, p) => acc + Number(p.valor_cents ?? 0), 0);
      comprometido = 0;
    }

    const orcamento = n(c.orcamento_cents);
    const previsaoDeclarada = n(c.previsao_declarado_cents);
    const previsao = historico
      ? null
      : previsaoDeclarada ?? (realizado !== null ? realizado + (comprometido ?? 0) : null);

    // Convenção única: execução/previsão - orçamento.
    // Numa despesa, positivo significa derrapagem; numa receita, positivo significa superar o orçamento.
    const baseDesvio = historico ? realizado : previsao;
    const desvio = orcamento !== null && baseDesvio !== null ? baseDesvio - orcamento : null;

    return {
      id: c.id,
      codigo: c.codigo,
      descricao: c.descricao,
      grupo: c.grupo,
      ordem: Number(c.ordem),
      orcamentoCents: orcamento,
      realizadoCents: realizado,
      realizadoDeclaradoCents: realizadoDeclarado,
      comprometidoCents: comprometido,
      previsaoCents: previsao,
      desvioCents: desvio,
      desvioDeclaradoCents: n(c.desvio_declarado_cents),
      fonteCalculo: fonte,
      estadoReconciliacao: c.estado_reconciliacao as EstadoReconciliacao,
      fonteReferencia: c.fonte_referencia,
    };
  });

  const byCode = new Map(linhas.map((l) => [l.codigo, l]));
  const soma = (...vals: Array<number | null | undefined>) => vals.reduce<number>((a, v) => a + (v ?? 0), 0);
  const orcamentoDespesas = soma(byCode.get("1")?.orcamentoCents, byCode.get("1.10")?.orcamentoCents, byCode.get("2")?.orcamentoCents);
  const orcamentoReceitas = soma(byCode.get("3")?.orcamentoCents, byCode.get("4")?.orcamentoCents);

  const realizadoDespesas = historico
    ? soma(byCode.get("1")?.realizadoCents, byCode.get("1.10")?.realizadoCents, byCode.get("2")?.realizadoCents)
    : despesasAno.filter(despesaEstaRealizada).reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
  const comprometidoDespesas = historico
    ? null
    : despesasAno
        .filter((d) => !despesaEstaRealizada(d) && ["pendente", "vencido", "a_reconciliar"].includes(d.estado))
        .reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
  const realizadoReceitas = historico
    ? soma(byCode.get("3")?.realizadoCents, byCode.get("4")?.realizadoCents)
    : pagamentosAno.reduce((acc, p) => acc + Number(p.valor_cents ?? 0), 0);

  const resultadoExercicio = realizadoReceitas - realizadoDespesas;
  const resultadoProjetado = historico ? null : resultadoExercicio - (comprometidoDespesas ?? 0);

  return {
    anos,
    ano,
    historico,
    exercicio: {
      id: exercicio.id,
      estado: exercicio.estado,
      titulo: exercicio.titulo,
      saldoInicialCents: n(exercicio.saldo_inicial_cents),
      saldoFinalBancarioCents: n(exercicio.saldo_final_bancario_cents),
      fonteReferencia: exercicio.fonte_referencia,
      observacoes: exercicio.observacoes,
    },
    linhas,
    resumo: {
      orcamentoDespesasCents: orcamentoDespesas,
      realizadoDespesasCents: realizadoDespesas,
      comprometidoDespesasCents: comprometidoDespesas,
      orcamentoReceitasCents: orcamentoReceitas,
      realizadoReceitasCents: realizadoReceitas,
      resultadoExercicioCents: resultadoExercicio,
      resultadoProjetadoCents: resultadoProjetado,
    },
  };
}
