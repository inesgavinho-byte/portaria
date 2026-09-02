/**
 * Apuramentos financeiros do relatório do fornecedor.
 *
 * Fora da rota por duas razões: o Next.js não admite exportações avulsas num
 * ficheiro de página, e isto é lógica pura sobre listas — o sítio certo para
 * ser testada sem levantar um render.
 *
 * A regra que atravessa tudo: nenhum valor é inferido de texto livre. O
 * facturado vem das despesas, a saída confirmada vem do extracto bancário, e a
 * retenção vem de um acontecimento com efeito de retenção que referencia uma
 * despesa concreta.
 */

import type { Contrato, ContratoMemoriaEvento, Despesa } from "@/types/database";
import type { MovimentoRelatorio, TotaisRelatorio } from "@/components/relatorios/relatorio-fornecedor";

export function apurarTotais({
  id,
  despesasPeriodo,
  movimentosPeriodo,
  eventosPeriodo,
  contratos,
}: {
  id: string;
  despesasPeriodo: Despesa[];
  movimentosPeriodo: MovimentoRelatorio[];
  eventosPeriodo: ContratoMemoriaEvento[];
  contratos: Contrato[];
}): TotaisRelatorio {
  const facturado = despesasPeriodo.reduce((soma, d) => soma + d.valor_cents, 0);
  const saidasConfirmadas = movimentosPeriodo.filter(
    (m) => m.fornecedor_id === id && m.tipo === "debito" && m.confirmado,
  );
  const pagoConfirmado = saidasConfirmadas.reduce((soma, m) => soma + m.valor_cents, 0);
  const despesasRetidas = new Set(
    eventosPeriodo.filter((e) => e.efeito === "retencao" && e.despesa_id).map((e) => e.despesa_id as string),
  );
  return {
    facturado,
    pagoConfirmado,
    pagoDocumental: despesasPeriodo.filter((d) => d.estado === "pago").reduce((soma, d) => soma + d.valor_cents, 0),
    emAberto: Math.max(0, facturado - pagoConfirmado),
    condicionado: despesasPeriodo
      .filter((d) => despesasRetidas.has(d.id))
      .reduce((soma, d) => soma + d.valor_cents, 0),
    contratado: contratos.some((c) => c.valor !== null)
      ? contratos.reduce((soma, c) => soma + (c.valor ?? 0) * 100, 0)
      : null,
    // Uma saída confirmada sem `despesa_id` é dinheiro que saiu sem factura
    // identificada. É a ressalva que o relatório deve fazer — e só quando é
    // verdade: se o movimento estiver ligado a uma despesa, afirmar o contrário
    // seria inventar uma dúvida que os dados não têm.
    confirmadoSemFactura: saidasConfirmadas
      .filter((m) => !m.despesa_id)
      .reduce((soma, m) => soma + m.valor_cents, 0),
  };
}
