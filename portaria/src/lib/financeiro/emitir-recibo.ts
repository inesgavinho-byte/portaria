import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Core da emissão de recibo (sem requireAdmin, sem revalidate) — usado
 * pela server action emitirRecibo (financeiro.ts) e pelo fluxo automático
 * (actions/recibo-automatico.ts). Vive fora do ficheiro de actions para
 * não criar importações circulares.
 *
 * Idempotente por pagamento: se o pagamento já tem recibo, devolve o
 * existente em vez de criar um segundo.
 */

export type ReciboEmitido =
  | { ok: true; reciboId: string; existente: boolean }
  | { ok: false; error: string };

type PagamentoCore = {
  id: string;
  fracao_id: string;
  quota_ids: string[] | null;
  valor_cents: number;
};

export async function emitirReciboCore(
  supabase: SupabaseClient,
  tenantId: string,
  pagamentoId: string
): Promise<ReciboEmitido> {
  // Idempotência: um pagamento tem um só recibo.
  const { data: existente } = await supabase
    .from("recibos")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("pagamento_id", pagamentoId)
    .limit(1)
    .maybeSingle();

  if (existente) return { ok: true, reciboId: existente.id, existente: true };

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, fracao_id, quota_ids, valor_cents")
    .eq("id", pagamentoId)
    .eq("tenant_id", tenantId)
    .single();

  if (!pagamento) return { ok: false, error: "Pagamento não encontrado." };
  const pg = pagamento as PagamentoCore;

  // Numeração atómica (incrementa configuracao_financeira.ultimo_numero_recibo)
  const { data: numeroRecibo, error: numError } = await supabase.rpc(
    "obter_proximo_numero_recibo",
    { p_tenant_id: tenantId }
  );
  if (numError || !numeroRecibo) {
    return { ok: false, error: "Erro ao gerar número de recibo." };
  }

  // Período coberto, a partir das quotas alocadas ao pagamento.
  let periodoInicio: string | null = null;
  let periodoFim: string | null = null;
  if (pg.quota_ids && pg.quota_ids.length > 0) {
    const { data: quotas } = await supabase
      .from("quotas_mensais")
      .select("ano, mes")
      .in("id", pg.quota_ids)
      .order("ano", { ascending: true })
      .order("mes", { ascending: true });

    if (quotas && quotas.length > 0) {
      const primeiro = quotas[0];
      const ultimo = quotas[quotas.length - 1];
      periodoInicio = `${primeiro.ano}-${String(primeiro.mes).padStart(2, "0")}-01`;
      periodoFim = `${ultimo.ano}-${String(ultimo.mes).padStart(2, "0")}-01`;
    }
  }

  const { data: recibo, error: insertError } = await supabase
    .from("recibos")
    .insert({
      tenant_id: tenantId,
      fracao_id: pg.fracao_id,
      pagamento_id: pagamentoId,
      numero: numeroRecibo,
      valor_cents: pg.valor_cents,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      estado: "emitido",
    })
    .select("id")
    .single();

  if (insertError || !recibo) {
    console.error("Erro emitir recibo:", insertError);
    return { ok: false, error: "Erro ao emitir recibo." };
  }

  return { ok: true, reciboId: recibo.id, existente: false };
}
