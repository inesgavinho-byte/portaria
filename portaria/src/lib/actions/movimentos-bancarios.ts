"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { normalizar } from "@/lib/financeiro/atribuicao-movimentos";

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
      // Explícito: uma correcção humana sobrescreve sempre a proveniência
      // 'regra' — uma decisão de pessoa vale mais do que uma regra.
      fornecedor_origem: "manual",
      fornecedor_atribuido_em: fornecedorId ? new Date().toISOString() : null,
      fornecedor_atribuido_por: fornecedorId ? ctx.user.id : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id,fornecedor_id,contraparte")
    .maybeSingle();

  if (error) {
    console.error("Erro ao atribuir fornecedor ao movimento:", error);
    return { ok: false, error: "Erro ao guardar a atribuição." };
  }
  if (!data) return { ok: false, error: "Movimento não encontrado." };

  // A memória dos aliases: quando uma pessoa confirma uma atribuição manual,
  // a contraparte normalizada fica guardada como variante de nome do
  // fornecedor — da próxima vez a sugestão nasce "exacta". É escrita SOZINHA
  // aqui porque é literalmente o que a pessoa acabou de confirmar; falhar o
  // alias não falha a atribuição (é um acelerador, não um dado de negócio).
  // Em marcarMovimentoSemFornecedor nunca se grava alias: "sem fornecedor"
  // não confirma contraparte nenhuma.
  if (fornecedorId && data.contraparte) {
    const alias = normalizar(data.contraparte);
    if (alias) {
      // Última confirmação ganha: um alias pode ter nascido de uma atribuição
      // errada (ex.: transferência de um condómino cujo nome coincide com o
      // de um fornecedor); re-atribuir a outro fornecedor sobrescreve o alias
      // e auto-cura as sugestões. First-write-wins envenenava-as para sempre.
      const { error: aliasError } = await supabase
        .from("fornecedores_aliases")
        .upsert(
          { tenant_id: ctx.tenant.id, fornecedor_id: fornecedorId, alias },
          { onConflict: "tenant_id,alias", ignoreDuplicates: false },
        );
      if (aliasError) console.error("Erro ao gravar alias de contraparte:", aliasError);
    }
  }

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
      // Decisão humana explícita: sobrescreve a proveniência 'regra'. Alias
      // nunca é gravado aqui — ver comentário em atribuirFornecedorMovimento.
      fornecedor_origem: "manual",
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

/**
 * Imputa — ou des-imputa — um movimento bancário a uma factura, pela UI.
 *
 * `movimentos_bancarios.despesa_id` significa uma só coisa: a factura que o
 * processo demonstra ter sido liquidada por aquele movimento (migração
 * 20260826000000). Só se imputa o que o processo demonstra; as posições
 * sustentadas pelas partes vivem em `imputacoes_posicoes`, ao lado, e nunca
 * por esta via.
 *
 * O estado de reconciliação segue o padrão fixado nas migrações de
 * reconciliação (20260824160000 / 20260825120000): imputar marca
 * `reconciliado`; des-imputar volta a `parcial` — o movimento continua
 * atribuído ao fornecedor, deixa de estar ligado à factura exacta. Nada é
 * apagado: des-imputar é anular a ligação, o histórico do dossiê permanece.
 */
export async function imputarMovimentoADespesa(
  movimentoId: string,
  despesaId: string | null,
): Promise<AtribuicaoResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const supabase = await createClient();

  if (despesaId) {
    const { data: despesa } = await supabase
      .from("despesas")
      .select("id,fornecedor_id")
      .eq("id", despesaId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!despesa) return { ok: false, error: "Factura não encontrada neste condomínio." };

    // Uma imputação atravessa fornecedores quando o movimento e a factura
    // dizem contrapartes diferentes. Se ambos os lados já têm fornecedor e
    // não coincide, é quase de certeza a factura errada — recusar aqui evita
    // reconciliar um pagamento a uma factura de outro fornecedor.
    const { data: movimento } = await supabase
      .from("movimentos_bancarios")
      .select("id,fornecedor_id")
      .eq("id", movimentoId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!movimento) return { ok: false, error: "Movimento não encontrado." };

    if (
      movimento.fornecedor_id &&
      despesa.fornecedor_id &&
      movimento.fornecedor_id !== despesa.fornecedor_id
    ) {
      return {
        ok: false,
        error: "O movimento e a factura pertencem a fornecedores diferentes — verifique antes de imputar.",
      };
    }
  }

  const { data, error } = await supabase
    .from("movimentos_bancarios")
    .update({
      despesa_id: despesaId,
      estado_reconciliacao: despesaId ? "reconciliado" : "parcial",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id,fornecedor_id")
    .maybeSingle();

  if (error) {
    console.error("Erro ao imputar movimento a factura:", error);
    return { ok: false, error: "Erro ao guardar a imputação." };
  }
  if (!data) return { ok: false, error: "Movimento não encontrado." };

  revalidar(data.fornecedor_id);
  return { ok: true };
}
