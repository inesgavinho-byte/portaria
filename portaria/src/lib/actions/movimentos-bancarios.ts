"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";

export type AtribuicaoResultado = { ok: true } | { ok: false; error: string };

const ROTAS_A_REVALIDAR = ["/configuracao/financeiro/movimentos", "/configuracao/financeiro/mapa", "/hoje"];

function revalidar(fornecedorId?: string | null) {
  for (const rota of ROTAS_A_REVALIDAR) revalidatePath(rota);
  revalidatePath("/fornecedores");
  if (fornecedorId) {
    revalidatePath(`/fornecedores/${fornecedorId}`);
    revalidatePath(`/fornecedores/${fornecedorId}/relatorio`);
  }
}

/**
 * Atribui — ou desatribui — o fornecedor de um movimento bancário.
 *
 * Não toca em `despesa_id`: saber a quem se pagou continua a ser independente
 * de saber que factura se pagou. Atribuir um fornecedor nunca reconcilia uma
 * factura por si.
 */
export async function atribuirFornecedorMovimento(
  movimentoId: string,
  fornecedorId: string | null,
): Promise<AtribuicaoResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const supabase = await createClient();

  // O fornecedor tem de pertencer ao mesmo tenant. A FK composta já o garante
  // na base de dados; validar aqui devolve um erro legível em vez de uma
  // violação de constraint.
  if (fornecedorId) {
    const { data: fornecedor } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("id", fornecedorId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!fornecedor) return { ok: false, error: "Fornecedor não encontrado." };
  }

  const { data, error } = await supabase
    .from("movimentos_bancarios")
    .update({
      fornecedor_id: fornecedorId,
      fornecedor_nao_aplicavel: false,
      fornecedor_atribuido_em: fornecedorId ? new Date().toISOString() : null,
      fornecedor_atribuido_por: fornecedorId ? ctx.user.id : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id,fornecedor_id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao atribuir fornecedor ao movimento:", error);
    return { ok: false, error: "Erro ao guardar a atribuição." };
  }
  if (!data) return { ok: false, error: "Movimento não encontrado." };

  revalidar(fornecedorId);
  return { ok: true };
}

/**
 * Marca um movimento como não tendo fornecedor — encargo estatal, comissão
 * bancária, transferência a condómino. Tira-o da fila de triagem sem lhe
 * inventar uma contraparte comercial.
 */
export async function marcarMovimentoSemFornecedor(
  movimentoId: string,
  naoAplicavel: boolean,
): Promise<AtribuicaoResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimentos_bancarios")
    .update({
      fornecedor_id: null,
      fornecedor_nao_aplicavel: naoAplicavel,
      fornecedor_atribuido_em: naoAplicavel ? new Date().toISOString() : null,
      fornecedor_atribuido_por: naoAplicavel ? ctx.user.id : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao marcar movimento sem fornecedor:", error);
    return { ok: false, error: "Erro ao guardar a decisão." };
  }
  if (!data) return { ok: false, error: "Movimento não encontrado." };

  revalidar();
  return { ok: true };
}
