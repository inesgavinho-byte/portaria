/**
 * Cronologia unificada da relação fornecedor ↔ condomínio.
 *
 * A ficha do fornecedor não é uma lista de contratos somada a uma lista de
 * despesas: é a relação completa entre o fornecedor e o condomínio. Este
 * módulo normaliza todas as origens estruturadas numa única cronologia e
 * apura o resumo financeiro corrente.
 *
 * Regras que este módulo garante:
 *
 *  - a memória da contratação alimenta o histórico (é a camada que explica a
 *    evolução da relação, não um extra);
 *  - a deduplicação usa exclusivamente relações estruturais (IDs), nunca
 *    coincidência de data e valor;
 *  - um pagamento declarado num mapa administrativo nunca é apresentado nem
 *    contabilizado como saída bancária confirmada;
 *  - `tipo === "pagamento"` designa UM movimento de dinheiro. Um mapa que
 *    agrega pagamentos, ou uma mensagem que confirma o recebimento de um
 *    pagamento já registado, descreve-o em vez de o constituir e não é um
 *    pagamento: tipificá-lo como tal soma-o às parcelas que resume e
 *    inflaciona o total de declarados;
 *  - "saídas confirmadas" depende de `movimentos_bancarios.fornecedor_id` e
 *    não exige `despesa_id`: saber a quem se pagou não é saber que factura se
 *    pagou;
 *  - conflitos não são escondidos nem resolvidos automaticamente.
 */

import type {
  ContratoMemoriaEvidencia,
  ContratoMemoriaNatureza,
  ContratoMemoriaTipo,
} from "@/types/database";

export type SupplierTimelineKind =
  | "contrato"
  | "proposta"
  | "adjudicacao"
  | "execucao"
  | "fatura"
  | "pagamento"
  | "pagamento_declarado"
  | "decisao"
  | "garantia"
  | "conflito"
  | "comunicacao"
  | "obrigacao"
  | "documento"
  | "outro";

export type SupplierTimelineNature = ContratoMemoriaNatureza;

export type SupplierTimelineSource =
  | "contrato"
  | "memoria"
  | "despesa"
  | "movimento"
  | "obrigacao";

/** Confirmação financeira do acontecimento, quando aplicável. */
export type SupplierTimelineConfirmation =
  | "banco"
  | "por_confirmar_no_banco"
  | "documental";

export type SupplierTimelineGroup =
  | "financeiro"
  | "contratos"
  | "execucao"
  | "decisoes"
  | "conflitos";

export type SupplierTimelineEvent = {
  id: string;
  /** Data ISO (YYYY-MM-DD ou timestamp) do acontecimento. */
  date: string;
  kind: SupplierTimelineKind;
  title: string;
  summary?: string;
  amountCents?: number;
  nature?: SupplierTimelineNature;
  confirmation?: SupplierTimelineConfirmation;
  /** Estado documental próprio da origem (ex.: estado da despesa). */
  state?: string;
  sourceType: SupplierTimelineSource;
  sourceId: string;
  /** Origens estruturais adicionais fundidas neste acontecimento. */
  mergedFrom?: { sourceType: SupplierTimelineSource; sourceId: string }[];
  evidence: SupplierTimelineEvidence[];
  evidenceCount: number;
  group: SupplierTimelineGroup;
  href?: string;
};

export type SupplierTimelineEvidence = {
  id: string;
  localizador: string | null;
  citacao: string;
  papel: "primaria" | "corroboracao" | "contradicao";
  fonte: { id: string; titulo: string; referencia: string | null; url: string | null } | null;
};

export type MemoriaEventoTimeline = {
  id: string;
  contrato_id: string;
  data_evento: string;
  tipo: ContratoMemoriaTipo;
  titulo: string;
  resumo: string;
  natureza: ContratoMemoriaNatureza;
  valor_cents: number | null;
  despesa_id: string | null;
  movimento_id: string | null;
  efeito: MemoriaEfeito | null;
  contrato_memoria_evidencias: ContratoMemoriaEvidencia[];
};

export type MemoriaEfeito = "emissao" | "confirmacao_pagamento" | "retencao" | "suspensao";

export type ContratoTimeline = {
  id: string;
  titulo: string;
  referencia: string | null;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  criado_em: string;
};

export type DespesaTimeline = {
  id: string;
  descricao: string;
  numero_documento: string | null;
  referencia: string | null;
  data_documento: string | null;
  valor_cents: number;
  estado: string;
  criado_em: string;
};

export type MovimentoTimeline = {
  id: string;
  fornecedor_id: string | null;
  despesa_id: string | null;
  data_movimento: string;
  tipo: "debito" | "credito";
  valor_cents: number;
  descricao: string;
  contraparte: string | null;
  confirmado: boolean;
  estado_reconciliacao: string;
};

export type ObrigacaoTimeline = {
  id: string;
  titulo: string;
  periodicidade: string;
  valor_estimado_cents: number | null;
  proximo_vencimento: string | null;
  estado: string;
  criado_em: string;
};

export type SupplierTimelineInput = {
  fornecedorId: string;
  contratos: ContratoTimeline[];
  memoria: MemoriaEventoTimeline[];
  despesas: DespesaTimeline[];
  movimentos: MovimentoTimeline[];
  obrigacoes: ObrigacaoTimeline[];
};

export type SupplierFinancialSummary = {
  /** Facturas e despesas estruturadas do fornecedor. */
  despesasRegistadasCents: number;
  /** Débitos bancários confirmados atribuídos ao fornecedor. */
  saidasConfirmadasCents: number;
  /** Créditos bancários confirmados (estornos, notas de crédito recebidas). */
  entradasConfirmadasCents: number;
  /** Facturado menos o pago líquido confirmado, com guarda a zero. */
  emAbertoCents: number;
  /** Parcela do saldo em aberto classificada como retida/condicionada. */
  condicionadoCents: number;
  /** Pago líquido acima do facturado (adiantamento ou factura em falta). */
  excedenteCents: number;
  /** Pagamentos declarados em documentos sem prova bancária primária. */
  pagamentosDeclaradosCents: number;
  /** Incoerências que não devem ser mascaradas pelo resumo. */
  incoerencias: string[];
};

const GRUPO_POR_KIND: Record<SupplierTimelineKind, SupplierTimelineGroup> = {
  contrato: "contratos",
  proposta: "contratos",
  adjudicacao: "contratos",
  obrigacao: "contratos",
  execucao: "execucao",
  fatura: "financeiro",
  pagamento: "financeiro",
  pagamento_declarado: "financeiro",
  decisao: "decisoes",
  garantia: "decisoes",
  conflito: "conflitos",
  comunicacao: "execucao",
  documento: "execucao",
  outro: "execucao",
};

const KIND_POR_MEMORIA_TIPO: Record<ContratoMemoriaTipo, SupplierTimelineKind> = {
  proposta: "proposta",
  adjudicacao: "adjudicacao",
  comunicacao: "comunicacao",
  fatura: "fatura",
  pagamento: "pagamento",
  execucao: "execucao",
  decisao: "decisao",
  garantia: "garantia",
  conflito: "conflito",
  outro: "outro",
};

export const GRUPOS_TIMELINE: { valor: SupplierTimelineGroup | "tudo"; label: string }[] = [
  { valor: "tudo", label: "Tudo" },
  { valor: "financeiro", label: "Financeiro" },
  { valor: "contratos", label: "Contratos" },
  { valor: "execucao", label: "Execução" },
  { valor: "decisoes", label: "Decisões" },
  { valor: "conflitos", label: "Conflitos" },
];

function normalizarEvidencias(evidencias: ContratoMemoriaEvidencia[]): SupplierTimelineEvidence[] {
  return evidencias.map((evidencia) => ({
    id: evidencia.id,
    localizador: evidencia.localizador,
    citacao: evidencia.citacao,
    papel: evidencia.papel,
    fonte: evidencia.ia_documental_fontes[0] ?? null,
  }));
}

/**
 * Um evento de memória do tipo `pagamento` só é uma saída bancária quando
 * aponta estruturalmente para um movimento bancário. Sem essa ligação é uma
 * declaração documental — tipicamente um mapa administrativo — e é
 * apresentado como tal.
 */
function kindDeMemoria(evento: MemoriaEventoTimeline): SupplierTimelineKind {
  if (evento.tipo === "pagamento") {
    return evento.movimento_id ? "pagamento" : "pagamento_declarado";
  }
  return KIND_POR_MEMORIA_TIPO[evento.tipo];
}

function confirmacaoDeMemoria(
  evento: MemoriaEventoTimeline,
  movimentosPorId: Map<string, MovimentoTimeline>,
): SupplierTimelineConfirmation | undefined {
  if (evento.tipo !== "pagamento") return undefined;
  if (!evento.movimento_id) return "por_confirmar_no_banco";
  const movimento = movimentosPorId.get(evento.movimento_id);
  return movimento?.confirmado ? "banco" : "documental";
}

function eventoDeMemoria(
  evento: MemoriaEventoTimeline,
  movimentosPorId: Map<string, MovimentoTimeline>,
  despesasPorId: Map<string, DespesaTimeline>,
): SupplierTimelineEvent {
  const kind = kindDeMemoria(evento);
  const movimento = evento.movimento_id ? movimentosPorId.get(evento.movimento_id) : undefined;
  const despesa = evento.despesa_id ? despesasPorId.get(evento.despesa_id) : undefined;
  const mergedFrom: SupplierTimelineEvent["mergedFrom"] = [];
  if (movimento) mergedFrom.push({ sourceType: "movimento", sourceId: movimento.id });
  // A despesa só é absorvida quando o evento é a própria emissão do documento.
  // Uma decisão que retém uma factura refere-se a ela sem a substituir.
  if (despesa && evento.efeito === "emissao") mergedFrom.push({ sourceType: "despesa", sourceId: despesa.id });
  const evidence = normalizarEvidencias(evento.contrato_memoria_evidencias);

  return {
    id: `memoria-${evento.id}`,
    date: evento.data_evento,
    kind,
    title: evento.titulo,
    summary: evento.resumo,
    amountCents: evento.valor_cents ?? undefined,
    nature: evento.natureza,
    confirmation: confirmacaoDeMemoria(evento, movimentosPorId),
    state: evento.efeito === "emissao" ? despesa?.estado : undefined,
    sourceType: "memoria",
    sourceId: evento.id,
    mergedFrom: mergedFrom.length ? mergedFrom : undefined,
    evidence,
    evidenceCount: evidence.length,
    group: GRUPO_POR_KIND[kind],
  };
}

/**
 * Constrói a cronologia unificada.
 *
 * Estratégia de deduplicação — apenas estrutural:
 *  1. um evento de memória com `efeito = 'emissao'` absorve a despesa que
 *     referencia (a factura emitida e a despesa registada são o mesmo
 *     acontecimento);
 *  2. um evento de memória com `movimento_id` absorve esse movimento
 *     bancário;
 *  3. tudo o que não é absorvido por uma relação estrutural é apresentado
 *     como registo próprio. Na dúvida, dois registos complementares são
 *     preferíveis a uma fusão errada.
 *
 * Nunca há fusão por coincidência de data e valor.
 */
export function construirTimelineFornecedor(input: SupplierTimelineInput): SupplierTimelineEvent[] {
  const despesasPorId = new Map(input.despesas.map((despesa) => [despesa.id, despesa]));
  const movimentosPorId = new Map(input.movimentos.map((movimento) => [movimento.id, movimento]));

  const despesasAbsorvidas = new Set(
    input.memoria
      .filter((evento) => evento.efeito === "emissao" && evento.despesa_id)
      .map((evento) => evento.despesa_id as string),
  );
  const movimentosAbsorvidos = new Set(
    input.memoria
      .filter((evento) => evento.movimento_id)
      .map((evento) => evento.movimento_id as string),
  );

  const eventos: SupplierTimelineEvent[] = [
    ...input.contratos.map((contrato) => ({
      id: `contrato-${contrato.id}`,
      date: contrato.data_inicio ?? contrato.criado_em,
      kind: "contrato" as const,
      title: contrato.titulo,
      summary: contrato.descricao ?? undefined,
      nature: "facto" as const,
      sourceType: "contrato" as const,
      sourceId: contrato.id,
      evidence: [],
      evidenceCount: 0,
      group: GRUPO_POR_KIND.contrato,
      href: `/contratos/${contrato.id}`,
      state: contrato.referencia ?? undefined,
    })),

    ...input.memoria.map((evento) => eventoDeMemoria(evento, movimentosPorId, despesasPorId)),

    ...input.despesas
      .filter((despesa) => !despesasAbsorvidas.has(despesa.id))
      .map((despesa) => ({
        id: `despesa-${despesa.id}`,
        date: despesa.data_documento ?? despesa.criado_em,
        kind: "fatura" as const,
        title: despesa.descricao,
        summary: [despesa.numero_documento, despesa.referencia].filter(Boolean).join(" · ") || undefined,
        amountCents: despesa.valor_cents,
        nature: "facto" as const,
        state: despesa.estado,
        sourceType: "despesa" as const,
        sourceId: despesa.id,
        evidence: [],
        evidenceCount: 0,
        group: GRUPO_POR_KIND.fatura,
      })),

    ...input.movimentos
      .filter((movimento) => !movimentosAbsorvidos.has(movimento.id))
      .map((movimento) => ({
        id: `movimento-${movimento.id}`,
        date: movimento.data_movimento,
        kind: "pagamento" as const,
        title:
          movimento.tipo === "debito"
            ? movimento.despesa_id
              ? "Saída bancária confirmada"
              : "Pagamento confirmado no banco — factura exacta por identificar"
            : "Entrada bancária confirmada",
        summary: movimento.descricao,
        amountCents: movimento.valor_cents,
        nature: (movimento.despesa_id ? "facto" : "pendente") as SupplierTimelineNature,
        confirmation: (movimento.confirmado ? "banco" : "documental") as SupplierTimelineConfirmation,
        state: movimento.estado_reconciliacao,
        sourceType: "movimento" as const,
        sourceId: movimento.id,
        evidence: [],
        evidenceCount: 0,
        group: GRUPO_POR_KIND.pagamento,
      })),

    ...input.obrigacoes.map((obrigacao) => ({
      id: `obrigacao-${obrigacao.id}`,
      date: obrigacao.criado_em,
      kind: "obrigacao" as const,
      title: obrigacao.titulo,
      summary: [
        obrigacao.periodicidade,
        obrigacao.proximo_vencimento ? `próximo vencimento ${obrigacao.proximo_vencimento}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      amountCents: obrigacao.valor_estimado_cents ?? undefined,
      nature: "facto" as const,
      state: obrigacao.estado,
      sourceType: "obrigacao" as const,
      sourceId: obrigacao.id,
      evidence: [],
      evidenceCount: 0,
      group: GRUPO_POR_KIND.obrigacao,
    })),
  ];

  return eventos.sort((a, b) => {
    const diferenca = new Date(b.date).getTime() - new Date(a.date).getTime();
    return diferenca !== 0 ? diferenca : a.title.localeCompare(b.title, "pt-PT");
  });
}

/**
 * Resumo financeiro corrente do fornecedor.
 *
 * "Em aberto" não é «despesas cujo estado não é pago» — essa leitura ignora
 * pagamentos bancários confirmados que ainda não estão imputados a uma
 * factura concreta e reproduz o valor facturado por inteiro.
 */
export function resumirFinanceiroFornecedor(input: SupplierTimelineInput): SupplierFinancialSummary {
  const despesasRegistadasCents = input.despesas.reduce((soma, despesa) => soma + despesa.valor_cents, 0);

  // Só entram no resumo os movimentos estruturalmente atribuídos ao
  // fornecedor. Movimentos que chegam por `despesa_id` mas cuja atribuição a
  // fornecedor nunca foi feita ficam de fora e são sinalizados.
  const atribuidos = input.movimentos.filter((movimento) => movimento.fornecedor_id === input.fornecedorId);
  const confirmados = atribuidos.filter((movimento) => movimento.confirmado);
  const saidasConfirmadasCents = confirmados
    .filter((movimento) => movimento.tipo === "debito")
    .reduce((soma, movimento) => soma + movimento.valor_cents, 0);
  const entradasConfirmadasCents = confirmados
    .filter((movimento) => movimento.tipo === "credito")
    .reduce((soma, movimento) => soma + movimento.valor_cents, 0);

  // Entradas confirmadas do fornecedor são estornos/notas de crédito: reduzem
  // o pago líquido em vez de aumentarem o valor liquidado.
  const pagoLiquidoCents = saidasConfirmadasCents - entradasConfirmadasCents;
  const emAbertoCents = Math.max(0, despesasRegistadasCents - pagoLiquidoCents);
  const excedenteCents = Math.max(0, pagoLiquidoCents - despesasRegistadasCents);

  const despesasPorId = new Map(input.despesas.map((despesa) => [despesa.id, despesa]));
  const despesasRetidas = new Set(
    input.memoria
      .filter((evento) => evento.efeito === "retencao" && evento.despesa_id)
      .map((evento) => evento.despesa_id as string),
  );
  const condicionadoBrutoCents = [...despesasRetidas]
    .map((id) => despesasPorId.get(id)?.valor_cents ?? 0)
    .reduce((soma, valor) => soma + valor, 0);
  // A retenção é uma classificação do saldo em aberto, nunca um pagamento:
  // não é subtraída ao valor devido.
  const condicionadoCents = Math.min(condicionadoBrutoCents, emAbertoCents);

  const pagamentosDeclaradosCents = input.memoria
    .filter((evento) => evento.tipo === "pagamento" && !evento.movimento_id)
    .reduce((soma, evento) => soma + (evento.valor_cents ?? 0), 0);

  const incoerencias: string[] = [];
  if (excedenteCents > 0) {
    incoerencias.push(
      "O valor líquido confirmado no banco excede o total facturado. Pode indicar adiantamento ou factura em falta no registo.",
    );
  }
  if (condicionadoBrutoCents > emAbertoCents) {
    incoerencias.push(
      "O valor classificado como retido é superior ao saldo em aberto apurado. Verificar a reconciliação das facturas retidas.",
    );
  }
  const naoAtribuidos = input.movimentos.length - atribuidos.length;
  if (naoAtribuidos > 0) {
    incoerencias.push(
      `${naoAtribuidos} movimento(s) bancário(s) chegam por factura mas não têm fornecedor atribuído: aparecem no histórico e ficam fora deste resumo.`,
    );
  }

  return {
    despesasRegistadasCents,
    saidasConfirmadasCents,
    entradasConfirmadasCents,
    emAbertoCents,
    condicionadoCents,
    excedenteCents,
    pagamentosDeclaradosCents,
    incoerencias,
  };
}

/**
 * Une listas de movimentos vindas de consultas diferentes (por fornecedor e
 * por despesa) mantendo cada movimento exactamente uma vez. Sem esta união o
 * mesmo débito poderia ser contado duas vezes nas saídas confirmadas.
 */
export function unirMovimentos(...listas: MovimentoTimeline[][]): MovimentoTimeline[] {
  const porId = new Map<string, MovimentoTimeline>();
  for (const lista of listas) {
    for (const movimento of lista) porId.set(movimento.id, movimento);
  }
  return [...porId.values()].sort(
    (a, b) => new Date(b.data_movimento).getTime() - new Date(a.data_movimento).getTime(),
  );
}

export function agruparTimelinePorAno(eventos: SupplierTimelineEvent[]) {
  const anos = new Map<string, SupplierTimelineEvent[]>();
  for (const evento of eventos) {
    const ano = String(new Date(evento.date).getFullYear());
    const lista = anos.get(ano);
    if (lista) lista.push(evento);
    else anos.set(ano, [evento]);
  }
  return [...anos.entries()].sort(([a], [b]) => Number(b) - Number(a));
}
