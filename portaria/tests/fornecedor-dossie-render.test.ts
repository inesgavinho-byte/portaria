/**
 * Regressão do hotfix P0 "dossiê de fornecedor não renderiza em produção"
 * (digest 1775551007).
 *
 * Causa raiz: `DossierArquivo` (Client Component) recebia `children` como uma
 * FUNÇÃO passada a partir de um Server Component
 * (`{(item) => <DownloadButton documentoId={item.id} />}` em
 * `src/app/(app)/fornecedores/[id]/page.tsx`). Uma função não é serializável
 * através da fronteira Server → Client Component do React Server Components;
 * o erro ocorre na serialização da árvore devolvida por `CorpoFornecedor`,
 * fora do `try/catch` da página — daí o "Server Components render failure"
 * com apenas um digest, indiagnosticável.
 *
 * Correcção: `DossierArquivo` deixa de aceitar `children`; renderiza
 * `DownloadButton` internamente (Client → Client, sem fronteira a atravessar).
 *
 * Reforço adicional (item 4 do hotfix): a secção "Imputação de pagamentos" do
 * relatório é complementar — uma falha a apurá-la não deve derrubar o
 * relatório inteiro. `RelatorioFornecedor` passa a isolar essa chamada num
 * try/catch próprio.
 *
 * Não há forma de reproduzir aqui, em vitest/Node, o erro exacto de
 * serialização do React Flight (isso só existe no runtime RSC do Next.js).
 * O que se prova:
 *   1. `DossierArquivo` já não tem `children` no seu contrato de props — a
 *      chamada com uma função deixou de compilar (garantia ao nível de tipos).
 *   2. `DossierArquivo` renderiza sozinho, com e sem itens, sem qualquer prop
 *      função.
 *   3. `RelatorioFornecedor` renderiza com o shape real do fornecedor
 *      "Pinturas Verticais" (mesmo id da réplica em fornecedor-timeline.test.ts):
 *      imputações por despesa e por movimento aparecem, sem duplicados;
 *      fornecedor sem imputações e sem movimentos continuam a renderizar;
 *      uma posição com dado corrompido não derruba o relatório — a secção
 *      fica assinalada como indisponível e o resto do documento é servido.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierArquivo, type ArquivoItem } from "../src/components/admin/dossier-arquivo";
import { RelatorioFornecedor, type MovimentoRelatorio } from "../src/components/relatorios/relatorio-fornecedor";
import { apurarTotais } from "../src/lib/relatorios/apuramentos";
import { agruparImputacoes, PARTE_LABEL } from "../src/lib/relatorios/imputacoes";
import type {
  Contrato,
  ContratoMemoriaEvento,
  Despesa,
  Fornecedor,
  PosicaoImputacao,
} from "../src/types/database";

const FORNECEDOR = "688136ff-7562-4dc0-ba0a-1f427debab16";
const CONTRATO = "95dad36e-c84d-42ce-aab4-7f376ca83f68";
const DESPESA_4 = "d-2026-4";
const MOVIMENTO_11_06 = "m-11-06";

function fornecedor(over: Partial<Fornecedor> = {}): Fornecedor {
  return {
    id: FORNECEDOR,
    tenant_id: "t",
    nome: "Pinturas Verticais",
    categoria: "obras",
    contacto_nome: null,
    telefone: null,
    email: null,
    nif: null,
    morada: null,
    notas: null,
    ativo: true,
    criado_em: "2025-06-03T00:00:00Z",
    atualizado_em: "2025-06-03T00:00:00Z",
    ...over,
  };
}

function contrato(over: Partial<Contrato> = {}): Contrato {
  return {
    id: CONTRATO,
    tenant_id: "t",
    titulo: "Reabilitação e pintura das fachadas",
    contacto_id: null,
    fornecedor_id: FORNECEDOR,
    descricao: null,
    data_inicio: "2025-06-03",
    data_fim: null,
    renovacao_automatica: false,
    valor: null,
    valor_anual: null,
    referencia: "Orçamento 010125-R",
    notas_internas: null,
    notas: null,
    criado_em: "2025-06-03T00:00:00Z",
    atualizado_em: "2025-06-03T00:00:00Z",
    ...over,
  };
}

function despesa(id: string, numero: string, cents: number): Despesa {
  return {
    id,
    tenant_id: "t",
    fornecedor_id: FORNECEDOR,
    contrato_id: CONTRATO,
    numero_documento: numero,
    referencia: null,
    descricao: `Factura ${numero}`,
    valor_cents: cents,
    estado: "a_reconciliar",
    data_documento: "2026-05-26",
    data_vencimento: null,
    criado_em: "2026-05-26T00:00:00Z",
  } as Despesa;
}

function movimento(over: Partial<MovimentoRelatorio> = {}): MovimentoRelatorio {
  return {
    id: MOVIMENTO_11_06,
    fornecedor_id: FORNECEDOR,
    despesa_id: DESPESA_4,
    data_movimento: "2026-06-11",
    tipo: "debito",
    valor_cents: 636_000,
    descricao: "Transferência",
    contraparte: "Pinturas Verticais",
    referencia_externa: null,
    confirmado: true,
    estado_reconciliacao: "parcial",
    ...over,
  };
}

function evento(over: Partial<ContratoMemoriaEvento> & { id: string; data_evento: string }): ContratoMemoriaEvento {
  return {
    tipo: "outro",
    titulo: "Evento",
    resumo: "Resumo",
    natureza: "facto",
    valor_cents: null,
    despesa_id: null,
    movimento_id: null,
    efeito: null,
    criado_em: over.data_evento,
    contrato_memoria_evidencias: [],
    ...over,
  };
}

function posicao(over: Partial<PosicaoImputacao> & { id: string }): PosicaoImputacao {
  return {
    tenant_id: "t",
    movimento_id: MOVIMENTO_11_06,
    despesa_id: DESPESA_4,
    parte: "condominio",
    parte_descricao: null,
    tipo: "imputa",
    fundamento: "fundamento",
    estado: "sustentada",
    data_posicao: "2026-08-24T00:00:00Z",
    observacoes: null,
    criado_em: "2026-08-24T00:00:00Z",
    atualizado_em: "2026-08-24T00:00:00Z",
    imputacoes_posicoes_evidencias: [],
    ...over,
  };
}

/** Props completas de RelatorioFornecedor, com defaults sobrepostáveis. */
function propsRelatorio(over: {
  movimentos?: MovimentoRelatorio[];
  posicoes?: PosicaoImputacao[];
  eventos?: ContratoMemoriaEvento[];
}) {
  const despesas = [despesa(DESPESA_4, "2026/4", 636_000)];
  const movimentos = over.movimentos ?? [movimento()];
  const eventos = over.eventos ?? [];
  const contratos = [contrato()];
  const totais = apurarTotais({
    id: FORNECEDOR,
    despesasPeriodo: despesas,
    movimentosPeriodo: movimentos,
    eventosPeriodo: eventos,
    contratos,
  });

  return {
    fornecedorId: FORNECEDOR,
    fornecedor: fornecedor(),
    tenantNome: "Edifício Europa",
    contratos,
    despesas,
    movimentos,
    eventos,
    posicoes: over.posicoes ?? [],
    anos: ["2026"],
    ano: "",
    financeiro: false,
    totais,
    geradoEm: "2026-08-27T00:00:00Z",
    hrefFiltro: (novos: { ano?: string; modo?: string }) => `/fornecedores/${FORNECEDOR}/relatorio?${JSON.stringify(novos)}`,
  };
}

describe("hotfix P0 — dossiê de fornecedor (digest 1775551007)", () => {
  describe("DossierArquivo — sem children função", () => {
    const itens: ArquivoItem[] = [
      { id: "doc-1", titulo: "Contrato assinado", categoria: "contrato", data_documento: "2025-06-03", contraparte: null, n_mensagens: null, citado: 2 },
      { id: "doc-2", titulo: "Troca de emails", categoria: "comunicacao", data_documento: "2026-06-09", contraparte: "Pinturas Verticais", n_mensagens: 4, citado: 0 },
    ];

    it("renderiza com itens, sem qualquer prop função, e mostra um botão de download por item", () => {
      const html = renderToStaticMarkup(
        createElement(DossierArquivo, { fornecedorId: FORNECEDOR, redirectTo: `/fornecedores/${FORNECEDOR}`, itens }),
      );
      expect(html).toContain("Contrato assinado");
      expect(html).toContain("Troca de emails");
      expect((html.match(/Descarregar/g) ?? []).length).toBe(2);
    });

    it("renderiza sem itens (fornecedor sem arquivo)", () => {
      const html = renderToStaticMarkup(
        createElement(DossierArquivo, { fornecedorId: FORNECEDOR, redirectTo: `/fornecedores/${FORNECEDOR}`, itens: [] }),
      );
      expect(html).toContain("Sem documentos no arquivo");
    });
  });

  describe("RelatorioFornecedor — secção de imputações isolada", () => {
    it("renderiza com o shape real (2 posições, 1 movimento) — imputações por despesa e por movimento aparecem, sem duplicados", () => {
      const posicoes = [
        posicao({ id: "p-condominio", parte: "condominio", tipo: "imputa" }),
        posicao({
          id: "p-contraparte",
          parte: "contraparte",
          parte_descricao: "Rui Machado da Silva, mandatário",
          tipo: "nao_imputa",
        }),
      ];
      const html = renderToStaticMarkup(createElement(RelatorioFornecedor, propsRelatorio({ posicoes })));
      expect(html).toContain("Imputação de pagamentos");
      expect(html).not.toContain("Secção indisponível");
      expect(html).toContain(PARTE_LABEL.condominio);
      expect(html).toContain(PARTE_LABEL.contraparte);
      // Uma parte imputa e a outra não-imputa a mesma factura: é divergência,
      // e é UM bloco (por movimento), não dois (não duplica por posição).
      expect(html).toContain("1 em divergência");
      expect((html.match(/Imputação do pagamento de/g) ?? []).length).toBe(1);
    });

    it("fornecedor sem posições de imputação: secção não aparece, resto do relatório renderiza", () => {
      const html = renderToStaticMarkup(createElement(RelatorioFornecedor, propsRelatorio({ posicoes: [] })));
      expect(html).not.toContain("Imputação de pagamentos");
      expect(html).toContain("Pinturas Verticais");
    });

    it("fornecedor sem movimentos bancários: posições órfãs são ignoradas, relatório renderiza", () => {
      const html = renderToStaticMarkup(
        createElement(
          RelatorioFornecedor,
          propsRelatorio({ movimentos: [], posicoes: [posicao({ id: "p-orfa" })] }),
        ),
      );
      expect(html).not.toContain("Imputação de pagamentos");
      expect(html).toContain("Pinturas Verticais");
    });

    it("uma posição com dado corrompido não derruba o relatório — secção fica assinalada como indisponível", () => {
      // `data_posicao` nulo é impossível pelo tipo, mas não pelo runtime (coluna
      // NOT NULL só é garantida pela base — este teste prova o que acontece se
      // uma migração futura ou dado legado a violar). Duas posições da mesma
      // parte forçam `agruparImputacoes` a ordenar por `data_posicao`, onde o
      // `.localeCompare` sobre um valor nulo lança.
      const posicoesCorrompidas = [
        posicao({ id: "p-corrompida-1", parte: "condominio", data_posicao: null as unknown as string }),
        posicao({ id: "p-corrompida-2", parte: "condominio", data_posicao: null as unknown as string }),
      ];
      expect(() => agruparImputacoesDireta(posicoesCorrompidas)).toThrow();

      const html = renderToStaticMarkup(
        createElement(RelatorioFornecedor, propsRelatorio({ posicoes: posicoesCorrompidas })),
      );
      expect(html).toContain("Secção indisponível nesta geração do relatório");
      // O resto do documento continua servido.
      expect(html).toContain("Pinturas Verticais");
      expect(html).toContain("Resumo executivo");
    });
  });
});

/**
 * Reexecuta a mesma chamada que RelatorioFornecedor faz internamente, para
 * confirmar a premissa do teste acima (que o dado corrompido de facto lança).
 */
function agruparImputacoesDireta(posicoes: PosicaoImputacao[]) {
  return agruparImputacoes(posicoes, [movimento()], [despesa(DESPESA_4, "2026/4", 636_000)]);
}
