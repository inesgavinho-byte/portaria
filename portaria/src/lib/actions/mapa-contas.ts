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
  exercicio: {
    id: string;
    estado: string;
    titulo: string | null;
    saldoInicialCents: number | null;
    fonteReferencia: string | null;
    observacoes: string | null;
  } | null;
  linhas: LinhaMapaContas[];
  resumo: {
    orcamentoDespesasCents: number;
    realizadoDespesasCents: number;
    comprometidoDespesasCents: number;
    orcamentoReceitasCents: number;
    realizadoReceitasCents: number;
    saldoProjetadoCents: number;
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
    .select("id,ano,estado,titulo,saldo_inicial_cents,fonte_referencia,observacoes")
    .eq("tenant_id", ctx.tenant.id)
    .order("ano", { ascending: false });

  const exercicios = exerciciosData ?? [];
  const anos = exercicios.map((e) => Number(e.ano));
  const ano = anoPedido && anos.includes(anoPedido) ? anoPedido : (anos[0] ?? new Date().getFullYear());
  const exercicio = exercicios.find((e) => Number(e.ano) === ano) ?? null;

  if (!exercicio) {
    return {
      anos,
      ano,
      exercicio: null,
      linhas: [],
      resumo: { orcamentoDespesasCents: 0, realizadoDespesasCents: 0, comprometidoDespesasCents: 0, orcamentoReceitasCents: 0, realizadoReceitasCents: 0, saldoProjetadoCents: 0 },
    };
  }

  const { data: contasData } = await supabase
    .from("financeiro_contas_anuais")
    .select("id,codigo,descricao,grupo,ordem,orcamento_cents,realizado_declarado_cents,comprometido_declarado_cents,previsao_declarado_cents,desvio_declarado_cents,fonte_calculo,filtro_calculo,estado_reconciliacao,fonte_referencia")
    .eq("tenant_id", ctx.tenant.id)
    .eq("exercicio_id", exercicio.id)
    .order("ordem", { ascending: true });

  const contas = contasData ?? [];

  const { data: despesasData } = await supabase
    .from("despesas")
    .select("categoria,valor_cents,estado,data_documento,data_pagamento")
    .eq("tenant_id", ctx.tenant.id);

  const { data: pagamentosData } = await supabase
    .from("pagamentos")
    .select("valor_cents,data_pagamento")
    .eq("tenant_id", ctx.tenant.id);

  const despesasAno = (despesasData ?? []).filter((d) => {
    const data = d.data_pagamento ?? d.data_documento;
    return data ? Number(String(data).slice(0, 4)) === ano : false;
  });
  const pagamentosAno = (pagamentosData ?? []).filter((p) => Number(String(p.data_pagamento).slice(0, 4)) === ano);

  const linhas: LinhaMapaContas[] = contas.map((c) => {
    const fonte = c.fonte_calculo as "manual" | "despesas" | "pagamentos";
    const filtros = Array.isArray(c.filtro_calculo) ? c.filtro_calculo : [];
    let realizado = n(c.realizado_declarado_cents);
    let comprometido = n(c.comprometido_declarado_cents);

    if (fonte === "despesas") {
      const matches = despesasAno.filter((d) => filtros.length === 0 || filtros.includes(d.categoria));
      realizado = matches.filter((d) => d.estado === "pago").reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
      comprometido = matches.filter((d) => ["pendente", "vencido", "a_reconciliar"].includes(d.estado)).reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
    } else if (fonte === "pagamentos") {
      realizado = pagamentosAno.reduce((acc, p) => acc + Number(p.valor_cents ?? 0), 0);
      comprometido = 0;
    }

    const orcamento = n(c.orcamento_cents);
    const previsaoDeclarada = n(c.previsao_declarado_cents);
    const previsao = previsaoDeclarada ?? (realizado !== null ? realizado + (comprometido ?? 0) : null);
    const desvio = orcamento !== null && previsao !== null ? orcamento - previsao : null;

    return {
      id: c.id,
      codigo: c.codigo,
      descricao: c.descricao,
      grupo: c.grupo,
      ordem: Number(c.ordem),
      orcamentoCents: orcamento,
      realizadoCents: realizado,
      realizadoDeclaradoCents: n(c.realizado_declarado_cents),
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
  const despesasCorrentes = byCode.get("1");
  const poupanca = byCode.get("1.10");
  const extraordinarias = byCode.get("2");
  const receitasCorrentes = byCode.get("3");
  const receitasExtra = byCode.get("4");

  const soma = (...vals: Array<number | null | undefined>) => vals.reduce<number>((a, v) => a + (v ?? 0), 0);
  const orcamentoDespesas = soma(despesasCorrentes?.orcamentoCents, poupanca?.orcamentoCents, extraordinarias?.orcamentoCents);
  const realizadoDespesas = soma(despesasCorrentes?.realizadoCents, poupanca?.realizadoCents, extraordinarias?.realizadoCents);
  const comprometidoDespesas = soma(despesasCorrentes?.comprometidoCents, poupanca?.comprometidoCents, extraordinarias?.comprometidoCents);
  const orcamentoReceitas = soma(receitasCorrentes?.orcamentoCents, receitasExtra?.orcamentoCents);
  const realizadoReceitas = soma(receitasCorrentes?.realizadoCents, receitasExtra?.realizadoCents);

  return {
    anos,
    ano,
    exercicio: {
      id: exercicio.id,
      estado: exercicio.estado,
      titulo: exercicio.titulo,
      saldoInicialCents: n(exercicio.saldo_inicial_cents),
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
      saldoProjetadoCents: realizadoReceitas - realizadoDespesas - comprometidoDespesas,
    },
  };
}
