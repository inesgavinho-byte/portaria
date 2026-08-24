import { describe, expect, it } from "vitest";
import {
  agruparTimelinePorAno,
  construirTimelineFornecedor,
  resumirFinanceiroFornecedor,
  unirMovimentos,
  type MemoriaEventoTimeline,
  type MovimentoTimeline,
  type SupplierTimelineInput,
} from "../src/lib/fornecedores/timeline";

const FORNECEDOR = "688136ff-7562-4dc0-ba0a-1f427debab16";
const CONTRATO = "95dad36e-c84d-42ce-aab4-7f376ca83f68";

function memoria(over: Partial<MemoriaEventoTimeline> & { id: string; data_evento: string }): MemoriaEventoTimeline {
  return {
    contrato_id: CONTRATO,
    tipo: "outro",
    titulo: "Evento",
    resumo: "Resumo",
    natureza: "facto",
    valor_cents: null,
    despesa_id: null,
    movimento_id: null,
    efeito: null,
    contrato_memoria_evidencias: [],
    ...over,
  };
}

function movimento(over: Partial<MovimentoTimeline> & { id: string; data_movimento: string; valor_cents: number }): MovimentoTimeline {
  return {
    fornecedor_id: FORNECEDOR,
    despesa_id: null,
    tipo: "debito",
    descricao: "Movimento",
    contraparte: null,
    confirmado: true,
    estado_reconciliacao: "parcial",
    ...over,
  };
}

/** Réplica da relação Pinturas Verticais tal como existe na base. */
function cenarioPinturasVerticais(): SupplierTimelineInput {
  const despesa4 = "d-2026-4";
  const despesa7 = "d-2026-7";
  const despesa8 = "d-2026-8";
  const movimento6360 = "m-11-06";

  return {
    fornecedorId: FORNECEDOR,
    contratos: [
      {
        id: CONTRATO,
        titulo: "Reabilitação e pintura das fachadas",
        referencia: "Orçamento 010125-R / adjudicação 03-06-2025",
        descricao: null,
        data_inicio: "2025-06-03",
        data_fim: null,
        criado_em: "2025-06-03T00:00:00Z",
      },
    ],
    despesas: [
      { id: despesa4, descricao: "Factura 2026/4", numero_documento: "2026/4", referencia: null, data_documento: "2026-05-26", valor_cents: 636000, estado: "a_reconciliar", criado_em: "2026-05-26T00:00:00Z" },
      { id: despesa7, descricao: "Factura 2026/7", numero_documento: "2026/7", referencia: null, data_documento: "2026-06-09", valor_cents: 636000, estado: "a_reconciliar", criado_em: "2026-06-09T00:00:00Z" },
      { id: despesa8, descricao: "Factura 2026/8", numero_documento: "2026/8", referencia: null, data_documento: "2026-06-15", valor_cents: 318000, estado: "a_reconciliar", criado_em: "2026-06-15T00:00:00Z" },
    ],
    movimentos: [movimento({ id: movimento6360, data_movimento: "2026-06-11", valor_cents: 636000, contraparte: "Pinturas Verticais" })],
    obrigacoes: [],
    memoria: [
      memoria({ id: "e-proposta-2025", data_evento: "2025-01-07T00:00:00Z", tipo: "proposta", titulo: "Proposta 010125-R", valor_cents: 6300000 }),
      memoria({ id: "e-pag-1", data_evento: "2025-09-05T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 1)", natureza: "pendente", valor_cents: 1200000 }),
      memoria({ id: "e-pag-2", data_evento: "2025-10-20T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 2)", natureza: "pendente", valor_cents: 1200000 }),
      memoria({ id: "e-pag-3", data_evento: "2025-10-20T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 3)", natureza: "pendente", valor_cents: 200000 }),
      memoria({ id: "e-pag-4", data_evento: "2025-11-14T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 4)", natureza: "pendente", valor_cents: 400000 }),
      memoria({ id: "e-pag-5", data_evento: "2025-12-09T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 5)", natureza: "pendente", valor_cents: 600000 }),
      memoria({ id: "e-pag-6", data_evento: "2025-12-09T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 6)", natureza: "pendente", valor_cents: 600000 }),
      memoria({ id: "e-pag-7", data_evento: "2026-02-24T00:00:00Z", tipo: "pagamento", titulo: "Pagamento histórico declarado (n.º 7)", natureza: "pendente", valor_cents: 300000 }),
      memoria({ id: "e-exec-1405", data_evento: "2026-05-14T00:00:00Z", tipo: "execucao", titulo: "Frente e tardoz executadas" }),
      memoria({ id: "e-mapa", data_evento: "2026-05-15T00:00:00Z", tipo: "pagamento", titulo: "Mapa consolida 45.000 EUR pagos" }),
      memoria({ id: "e-conflito-titulares", data_evento: "2026-05-15T00:00:00Z", tipo: "conflito", titulo: "Titulares distintos do fornecedor", natureza: "conflito" }),
      memoria({ id: "e-conflito-valor", data_evento: "2026-05-15T00:00:00Z", tipo: "conflito", titulo: "Divergência documental do valor global da obra", natureza: "conflito" }),
      memoria({ id: "e-proposta-lateral", data_evento: "2026-05-25T00:00:00Z", tipo: "proposta", titulo: "Orçamento 010125-ADIT" }),
      memoria({ id: "e-ft4", data_evento: "2026-05-26T00:00:00Z", tipo: "fatura", titulo: "Emissão e envio da Factura 2026/4", valor_cents: 636000, despesa_id: despesa4, efeito: "emissao" }),
      memoria({ id: "e-adj", data_evento: "2026-05-26T00:00:00Z", tipo: "adjudicacao", titulo: "Adjudicação da empena direita" }),
      memoria({ id: "e-suspensao", data_evento: "2026-05-27T00:00:00Z", tipo: "decisao", titulo: "Pagamento suspenso", despesa_id: despesa4, efeito: "suspensao" }),
      memoria({ id: "e-exec-0906", data_evento: "2026-06-09T00:00:00Z", tipo: "execucao", titulo: "Metade dos trabalhos ultrapassada" }),
      memoria({ id: "e-pag-banco", data_evento: "2026-06-11T00:00:00Z", tipo: "pagamento", titulo: "Pagamento bancário de 6.360 EUR imputado à Factura 2026/4", natureza: "inferencia", valor_cents: 636000, movimento_id: movimento6360, despesa_id: despesa4, efeito: "confirmacao_pagamento" }),
      memoria({ id: "e-ft8", data_evento: "2026-06-15T00:00:00Z", tipo: "fatura", titulo: "Emissão e envio da Factura 2026/8", natureza: "inferencia", valor_cents: 318000, despesa_id: despesa8, efeito: "emissao" }),
      memoria({ id: "e-retencao", data_evento: "2026-07-07T00:00:00Z", tipo: "decisao", titulo: "Retenção do pagamento final", despesa_id: despesa8, efeito: "retencao" }),
      memoria({ id: "e-reconciliacao", data_evento: "2026-08-23T00:00:00Z", tipo: "decisao", titulo: "Reconciliação financeira", natureza: "pendente" }),
    ],
  };
}

describe("resumo financeiro do fornecedor", () => {
  it("apura os KPIs da fachada lateral de Pinturas Verticais", () => {
    const resumo = resumirFinanceiroFornecedor(cenarioPinturasVerticais());
    expect(resumo.despesasRegistadasCents).toBe(1590000); // €15.900
    expect(resumo.saidasConfirmadasCents).toBe(636000); //   €6.360
    expect(resumo.emAbertoCents).toBe(954000); //            €9.540
    expect(resumo.condicionadoCents).toBe(318000); //        €3.180
    expect(resumo.excedenteCents).toBe(0);
    expect(resumo.incoerencias).toEqual([]);
  });

  it("não conta pagamentos históricos declarados como saídas bancárias", () => {
    const resumo = resumirFinanceiroFornecedor(cenarioPinturasVerticais());
    expect(resumo.pagamentosDeclaradosCents).toBe(4500000); // €45.000 do mapa
    expect(resumo.saidasConfirmadasCents).toBe(636000);
  });

  it("ignora movimentos não confirmados e movimentos de outro fornecedor", () => {
    const entrada = cenarioPinturasVerticais();
    entrada.movimentos.push(
      movimento({ id: "m-nao-confirmado", data_movimento: "2026-07-01", valor_cents: 100000, confirmado: false }),
      movimento({ id: "m-outro", data_movimento: "2026-07-02", valor_cents: 500000, fornecedor_id: "outro-fornecedor" }),
    );
    const resumo = resumirFinanceiroFornecedor(entrada);
    expect(resumo.saidasConfirmadasCents).toBe(636000);
    expect(resumo.emAbertoCents).toBe(954000);
  });

  it("não exige despesa_id para contar uma saída confirmada", () => {
    const entrada = cenarioPinturasVerticais();
    expect(entrada.movimentos.every((m) => m.despesa_id === null)).toBe(true);
    expect(resumirFinanceiroFornecedor(entrada).saidasConfirmadasCents).toBe(636000);
  });

  it("desconta entradas confirmadas do pago líquido em vez de as somar", () => {
    const entrada = cenarioPinturasVerticais();
    entrada.movimentos.push(movimento({ id: "m-estorno", data_movimento: "2026-07-05", valor_cents: 100000, tipo: "credito" }));
    const resumo = resumirFinanceiroFornecedor(entrada);
    expect(resumo.entradasConfirmadasCents).toBe(100000);
    expect(resumo.emAbertoCents).toBe(954000 + 100000);
  });

  it("nunca devolve saldo negativo e expõe o excedente como incoerência", () => {
    const entrada = cenarioPinturasVerticais();
    entrada.movimentos.push(movimento({ id: "m-adiantamento", data_movimento: "2026-07-06", valor_cents: 2000000 }));
    const resumo = resumirFinanceiroFornecedor(entrada);
    expect(resumo.emAbertoCents).toBe(0);
    expect(resumo.excedenteCents).toBe(1046000);
    expect(resumo.incoerencias.length).toBeGreaterThan(0);
  });

  it("mantém a retenção como classificação do saldo e não como pagamento", () => {
    const resumo = resumirFinanceiroFornecedor(cenarioPinturasVerticais());
    expect(resumo.condicionadoCents).toBeLessThanOrEqual(resumo.emAbertoCents);
    expect(resumo.emAbertoCents + resumo.saidasConfirmadasCents).toBe(resumo.despesasRegistadasCents);
  });

  it("sinaliza movimentos sem fornecedor atribuído em vez de os contar", () => {
    const entrada = cenarioPinturasVerticais();
    entrada.movimentos.push(movimento({ id: "m-orfao", data_movimento: "2026-07-07", valor_cents: 999, fornecedor_id: null, despesa_id: "d-2026-7" }));
    const resumo = resumirFinanceiroFornecedor(entrada);
    expect(resumo.saidasConfirmadasCents).toBe(636000);
    expect(resumo.incoerencias.some((aviso) => aviso.includes("não têm fornecedor atribuído"))).toBe(true);
  });
});

describe("união de movimentos de consultas distintas", () => {
  it("não conta duas vezes um movimento devolvido pelas duas consultas", () => {
    const porFornecedor = [movimento({ id: "m-1", data_movimento: "2026-06-11", valor_cents: 636000, despesa_id: "d-1" })];
    const porDespesa = [movimento({ id: "m-1", data_movimento: "2026-06-11", valor_cents: 636000, despesa_id: "d-1" })];
    const unidos = unirMovimentos(porFornecedor, porDespesa);
    expect(unidos).toHaveLength(1);
    const resumo = resumirFinanceiroFornecedor({
      fornecedorId: FORNECEDOR,
      contratos: [],
      memoria: [],
      obrigacoes: [],
      despesas: [{ id: "d-1", descricao: "Factura", numero_documento: "1", referencia: null, data_documento: "2026-06-01", valor_cents: 636000, estado: "pago", criado_em: "2026-06-01T00:00:00Z" }],
      movimentos: unidos,
    });
    expect(resumo.saidasConfirmadasCents).toBe(636000);
    expect(resumo.emAbertoCents).toBe(0);
  });

  it("ordena do mais recente para o mais antigo", () => {
    const unidos = unirMovimentos(
      [movimento({ id: "m-antigo", data_movimento: "2026-01-01", valor_cents: 100 })],
      [movimento({ id: "m-recente", data_movimento: "2026-09-01", valor_cents: 200 })],
    );
    expect(unidos.map((m) => m.id)).toEqual(["m-recente", "m-antigo"]);
  });
});

describe("cronologia unificada do fornecedor", () => {
  it("integra memória, contrato, facturas e movimento bancário", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const origens = new Set(eventos.map((evento) => evento.sourceType));
    expect(origens).toContain("memoria");
    expect(origens).toContain("contrato");
    expect(origens).toContain("despesa");
    expect(eventos.length).toBeGreaterThan(20);
  });

  it("mostra o pagamento de 11/06 com a imputação classificada como inferência", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const pagamento = eventos.find((evento) => evento.date.startsWith("2026-06-11"));
    expect(pagamento).toBeDefined();
    expect(pagamento?.amountCents).toBe(636000);
    expect(pagamento?.confirmation).toBe("banco");
    // O débito é facto bancário; a imputação a uma factura concreta não é
    // promovida a facto documental.
    expect(pagamento?.nature).toBe("inferencia");
  });

  it("não deixa o evento de pagamento absorver a factura que imputa", () => {
    // O pagamento refere a Factura 2026/4, mas quem a emite é o evento de
    // 26/05. Emissão e liquidação são acontecimentos distintos e a factura
    // não pode desaparecer da cronologia por ser referida por um pagamento.
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const pagamento = eventos.find((evento) => evento.sourceId === "e-pag-banco");
    expect(pagamento?.mergedFrom).toEqual([{ sourceType: "movimento", sourceId: "m-11-06" }]);

    const emissao = eventos.find((evento) => evento.sourceId === "e-ft4");
    expect(emissao?.date).toContain("2026-05-26");
    expect(emissao?.mergedFrom).toEqual([{ sourceType: "despesa", sourceId: "d-2026-4" }]);
    expect(eventos.filter((evento) => evento.amountCents === 636000)).toHaveLength(3);
  });

  it("funde memória e despesa da mesma factura em vez de duplicar", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const de2605 = eventos.filter((evento) => evento.date.startsWith("2026-05-26") && evento.kind === "fatura");
    expect(de2605).toHaveLength(1);
    expect(de2605[0].sourceType).toBe("memoria");
    expect(de2605[0].mergedFrom).toEqual([{ sourceType: "despesa", sourceId: "d-2026-4" }]);
  });

  it("mostra a factura 2026/7 mesmo sem evento de memória dedicado", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const ft7 = eventos.filter((evento) => evento.sourceType === "despesa" && evento.sourceId === "d-2026-7");
    expect(ft7).toHaveLength(1);
    expect(ft7[0].amountCents).toBe(636000);
  });

  it("não funde acontecimentos distintos com a mesma data e o mesmo valor", () => {
    const entrada: SupplierTimelineInput = {
      fornecedorId: FORNECEDOR,
      contratos: [],
      obrigacoes: [],
      despesas: [
        { id: "d-a", descricao: "Factura A", numero_documento: "A", referencia: null, data_documento: "2026-03-01", valor_cents: 50000, estado: "aprovada", criado_em: "2026-03-01T00:00:00Z" },
      ],
      movimentos: [movimento({ id: "m-a", data_movimento: "2026-03-01", valor_cents: 50000 })],
      memoria: [],
    };
    const eventos = construirTimelineFornecedor(entrada);
    expect(eventos).toHaveLength(2);
  });

  it("distingue pagamento declarado de pagamento confirmado no banco", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const declarados = eventos.filter((evento) => evento.kind === "pagamento_declarado");
    expect(declarados).toHaveLength(8); // 7 do mapa + o evento de consolidação
    expect(declarados.every((evento) => evento.confirmation === "por_confirmar_no_banco")).toBe(true);
    const confirmados = eventos.filter((evento) => evento.kind === "pagamento" && evento.confirmation === "banco");
    expect(confirmados).toHaveLength(1);
  });

  it("não esconde conflitos e mantém a divergência de valor global", () => {
    const eventos = construirTimelineFornecedor(cenarioPinturasVerticais());
    const conflitos = eventos.filter((evento) => evento.nature === "conflito");
    expect(conflitos).toHaveLength(2);
    expect(conflitos.some((evento) => evento.title.includes("valor global"))).toBe(true);
    expect(conflitos.every((evento) => evento.group === "conflitos")).toBe(true);
  });

  it("distribui os acontecimentos por ano, do mais recente para o mais antigo", () => {
    const porAno = agruparTimelinePorAno(construirTimelineFornecedor(cenarioPinturasVerticais()));
    expect(porAno.map(([ano]) => ano)).toEqual(["2026", "2025"]);
    expect(porAno[0][1].length).toBe(15);
    expect(porAno[1][1].length).toBe(8);
  });

  it("devolve cronologia vazia e resumo a zero para um fornecedor sem actividade", () => {
    const vazio: SupplierTimelineInput = { fornecedorId: FORNECEDOR, contratos: [], memoria: [], despesas: [], movimentos: [], obrigacoes: [] };
    expect(construirTimelineFornecedor(vazio)).toEqual([]);
    const resumo = resumirFinanceiroFornecedor(vazio);
    expect(resumo.despesasRegistadasCents).toBe(0);
    expect(resumo.saidasConfirmadasCents).toBe(0);
    expect(resumo.emAbertoCents).toBe(0);
    expect(resumo.condicionadoCents).toBe(0);
    expect(resumo.incoerencias).toEqual([]);
  });

  it("cobre um fornecedor com contrato mas sem memória nem financeiro", () => {
    const entrada: SupplierTimelineInput = {
      fornecedorId: FORNECEDOR,
      contratos: [{ id: "c-1", titulo: "Manutenção anual", referencia: "REF-1", descricao: null, data_inicio: "2026-01-01", data_fim: null, criado_em: "2026-01-01T00:00:00Z" }],
      memoria: [],
      despesas: [],
      movimentos: [],
      obrigacoes: [{ id: "o-1", titulo: "Manutenção trimestral", periodicidade: "trimestral", valor_estimado_cents: 25000, proximo_vencimento: "2026-04-01", estado: "ativa", criado_em: "2026-01-01T00:00:00Z" }],
    };
    const eventos = construirTimelineFornecedor(entrada);
    expect(eventos.map((evento) => evento.kind).sort()).toEqual(["contrato", "obrigacao"]);
    expect(resumirFinanceiroFornecedor(entrada).emAbertoCents).toBe(0);
  });

  it("cobre um fornecedor com despesas pagas e movimento reconciliado", () => {
    const entrada: SupplierTimelineInput = {
      fornecedorId: FORNECEDOR,
      contratos: [],
      memoria: [],
      obrigacoes: [],
      despesas: [{ id: "d-1", descricao: "Manutenção Jan–Mar", numero_documento: "F1", referencia: null, data_documento: "2026-02-01", valor_cents: 77645, estado: "pago", criado_em: "2026-02-01T00:00:00Z" }],
      movimentos: [movimento({ id: "m-1", data_movimento: "2026-02-18", valor_cents: 77645, despesa_id: "d-1", estado_reconciliacao: "parcial" })],
    };
    const resumo = resumirFinanceiroFornecedor(entrada);
    expect(resumo.despesasRegistadasCents).toBe(77645);
    expect(resumo.saidasConfirmadasCents).toBe(77645);
    expect(resumo.emAbertoCents).toBe(0);
    const eventos = construirTimelineFornecedor(entrada);
    expect(eventos.find((evento) => evento.sourceType === "movimento")?.title).toBe("Saída bancária confirmada");
  });
});
