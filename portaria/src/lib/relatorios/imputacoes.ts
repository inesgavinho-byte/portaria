/**
 * Imputações controvertidas: o que cada parte sustenta sobre um pagamento.
 *
 * A regra que este módulo existe para manter, e que os testes fixam: uma
 * posição NUNCA cria a ligação movimento → factura. O que o relatório mostra
 * como reconciliado continua a sair de `movimento.despesa_id`; o que as partes
 * sustentam sai daqui, ao lado, identificado como posição.
 *
 * Note-se o que não está nas entradas desta função nem na de `apurarTotais`:
 * uma não vê apuramentos e a outra não vê posições. É a garantia estrutural de
 * que o saldo não pode mudar em função de quem tem razão — não há caminho pelo
 * qual isso aconteça.
 */

import type { Despesa, PosicaoImputacao, PosicaoParte, PosicaoTipo } from "@/types/database";
import type { MovimentoRelatorio } from "@/components/relatorios/relatorio-fornecedor";

export type PosicaoApresentada = {
  id: string;
  parte: PosicaoParte;
  parteDescricao: string | null;
  tipo: PosicaoTipo;
  /** Número da factura a que a posição respeita, quando identificada. */
  facturaNumero: string | null;
  fundamento: string;
  estado: PosicaoImputacao["estado"];
  data: string;
  observacoes: string | null;
  evidencias: { id: string; citacao: string; localizador: string | null; fonte: string | null }[];
};

export type ImputacaoDeMovimento = {
  movimentoId: string;
  dataMovimento: string;
  valorCents: number;
  confirmado: boolean;
  /**
   * Factura que o processo demonstra ter sido liquidada por este movimento.
   * Nula quando nenhuma o é — e é assim que fica quando só há posições.
   */
  facturaReconciliada: string | null;
  posicoes: PosicaoApresentada[];
  /** Há posições que se excluem entre si sobre a mesma factura. */
  controvertida: boolean;
};

const ORDEM_PARTE: Record<PosicaoParte, number> = { condominio: 0, contraparte: 1, terceiro: 2 };

/**
 * Agrupa as posições pelo movimento a que respeitam.
 *
 * Só devolve movimentos que tenham pelo menos uma posição: um pagamento pacífico
 * não precisa de secção de divergência, e um fornecedor sem posições nenhumas
 * devolve lista vazia sem que nada mais mude.
 */
export function agruparImputacoes(
  posicoes: PosicaoImputacao[],
  movimentos: MovimentoRelatorio[],
  despesas: Despesa[],
): ImputacaoDeMovimento[] {
  const movimentosPorId = new Map(movimentos.map((movimento) => [movimento.id, movimento]));
  const numeroDaDespesa = new Map(
    despesas.map((despesa) => [despesa.id, despesa.numero_documento ?? despesa.referencia ?? null]),
  );

  const porMovimento = new Map<string, PosicaoImputacao[]>();
  for (const posicao of posicoes) {
    // Uma posição sobre um movimento fora do período não tem onde ser mostrada.
    if (!movimentosPorId.has(posicao.movimento_id)) continue;
    const lista = porMovimento.get(posicao.movimento_id);
    if (lista) lista.push(posicao);
    else porMovimento.set(posicao.movimento_id, [posicao]);
  }

  const resultado: ImputacaoDeMovimento[] = [];
  for (const [movimentoId, lista] of porMovimento) {
    const movimento = movimentosPorId.get(movimentoId) as MovimentoRelatorio;
    const apresentadas = lista
      .map((posicao) => ({
        id: posicao.id,
        parte: posicao.parte,
        parteDescricao: posicao.parte_descricao,
        tipo: posicao.tipo,
        facturaNumero: posicao.despesa_id ? (numeroDaDespesa.get(posicao.despesa_id) ?? null) : null,
        fundamento: posicao.fundamento,
        estado: posicao.estado,
        data: posicao.data_posicao,
        observacoes: posicao.observacoes,
        evidencias: (posicao.imputacoes_posicoes_evidencias ?? []).map((evidencia) => ({
          id: evidencia.id,
          citacao: evidencia.citacao,
          localizador: evidencia.localizador,
          fonte: (evidencia.ia_documental_fontes ?? [])[0]?.titulo ?? null,
        })),
      }))
      .sort((a, b) => ORDEM_PARTE[a.parte] - ORDEM_PARTE[b.parte] || a.data.localeCompare(b.data));

    resultado.push({
      movimentoId,
      dataMovimento: movimento.data_movimento,
      valorCents: movimento.valor_cents,
      confirmado: movimento.confirmado,
      // Sai do movimento, não das posições. É o ponto todo.
      facturaReconciliada: movimento.despesa_id
        ? (numeroDaDespesa.get(movimento.despesa_id) ?? null)
        : null,
      posicoes: apresentadas,
      controvertida: haDivergencia(apresentadas),
    });
  }

  return resultado.sort((a, b) => a.dataMovimento.localeCompare(b.dataMovimento));
}

/**
 * Há divergência quando duas partes distintas sustentam coisas incompatíveis
 * sobre a mesma factura — uma imputa, a outra nega.
 *
 * Duas partes a imputar à mesma factura concordam, e não é divergência. Uma
 * reserva também não é: declarar que não se toma posição não contradiz ninguém.
 */
function haDivergencia(posicoes: PosicaoApresentada[]): boolean {
  const activas = posicoes.filter((posicao) => posicao.estado === "sustentada");
  return activas.some((uma) =>
    activas.some(
      (outra) =>
        uma.parte !== outra.parte &&
        uma.facturaNumero !== null &&
        uma.facturaNumero === outra.facturaNumero &&
        uma.tipo === "imputa" &&
        outra.tipo === "nao_imputa",
    ),
  );
}

export const PARTE_LABEL: Record<PosicaoParte, string> = {
  condominio: "Condomínio",
  contraparte: "Contraparte",
  terceiro: "Terceiro",
};

export const TIPO_LABEL: Record<PosicaoTipo, string> = {
  imputa: "imputa o pagamento a",
  nao_imputa: "sustenta que continua por liquidar",
  reserva: "reserva posição",
};
