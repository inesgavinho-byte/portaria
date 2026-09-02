"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { garantirFonte } from "@/lib/fornecedores/fontes";
import { validarEstadoPosicao, validarPosicao } from "@/lib/fornecedores/processo";

/**
 * Posições das partes sobre a imputação de um pagamento a uma factura.
 *
 * A regra de ouro (migração 20260826000000, mantida aqui por desenho): uma
 * posição NUNCA cria a ligação movimento → factura. Ela vive ao lado dessa
 * ligação e diz o que cada parte sustenta — o condomínio, a contraparte, um
 * terceiro. O que o processo demonstra continua a viver em
 * `movimentos_bancarios.despesa_id`, e nenhum apuramento financeiro lê
 * posições.
 *
 * A correcção é de estado, nunca de apagamento (B4 do goal): uma posição
 * retirada ou superada mantém-se no histórico — o processo precisa de saber
 * que existiu e quando deixou de ser sustentada.
 */

export type PosicaoFormState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Partial<
    Record<
      "movimento" | "despesa" | "parte" | "tipo" | "fundamento" | "data" | "documento" | "citacao",
      string
    >
  >;
};

function revalidarDossie(rawRedirect: string, fornecedorId: string | null) {
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    revalidatePath(rawRedirect);
  }
  if (fornecedorId) {
    revalidatePath(`/fornecedores/${fornecedorId}`);
    revalidatePath(`/fornecedores/${fornecedorId}/relatorio`);
  }
}

/**
 * Regista a posição de uma parte sobre a imputação de um movimento.
 *
 * Aceita uma evidência opcional — documento do arquivo, localizador e citação.
 * Com documento escolhido, a citação é obrigatória: uma posição de imputação
 * sem a passagem que a sustenta é um argumento sem prova.
 */
export async function registarPosicao(
  _prev: PosicaoFormState,
  formData: FormData,
): Promise<PosicaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const resultado = validarPosicao(formData);
  if (!resultado.ok) return { fieldErrors: resultado.fieldErrors };
  const valores = resultado.valores;

  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;

  const supabase = await createClient();

  // O movimento pertence ao tenant?
  const { data: movimento } = await supabase
    .from("movimentos_bancarios")
    .select("id")
    .eq("id", valores.movimentoId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!movimento) return { error: "Movimento bancário não encontrado." };

  // A factura candidata também — e nunca se toca no movimento.
  if (valores.despesaId) {
    const { data: despesa } = await supabase
      .from("despesas")
      .select("id")
      .eq("id", valores.despesaId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!despesa) return { error: "Factura não encontrada neste condomínio." };
  }

  const { data: posicao, error } = await supabase
    .from("imputacoes_posicoes")
    .insert({
      tenant_id: ctx.tenant.id,
      movimento_id: valores.movimentoId,
      despesa_id: valores.despesaId,
      parte: valores.parte,
      parte_descricao: valores.parteDescricao,
      tipo: valores.tipo,
      fundamento: valores.fundamento,
      estado: "sustentada",
      data_posicao: valores.dataPosicao,
      observacoes: valores.observacoes,
      criado_por: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !posicao) {
    // Unique nulls not distinct em (tenant_id, movimento_id, parte, tipo,
    // despesa_id): a mesma parte não sustenta duas vezes a mesma coisa.
    if (error?.code === "23505") {
      return { error: "Esta parte já sustenta esta posição sobre este pagamento." };
    }
    console.error("[dossier-imputacoes] falha ao registar posição:", error);
    return { error: "Não foi possível registar a posição." };
  }

  if (valores.evidencia) {
    const { fonteId, error: erroFonte } = await garantirFonte(
      supabase,
      ctx.tenant.id,
      ctx.user.id,
      valores.evidencia.documentoId,
    );
    if (erroFonte || !fonteId) {
      return {
        error:
          "A posição ficou registada, mas a evidência não: " +
          (erroFonte ?? "falha ao preparar a fonte."),
      };
    }

    const { error: erroEvidencia } = await supabase.from("imputacoes_posicoes_evidencias").insert({
      tenant_id: ctx.tenant.id,
      posicao_id: posicao.id,
      fonte_id: fonteId,
      localizador: valores.evidencia.localizador,
      citacao: valores.evidencia.citacao,
      criado_por: ctx.user.id,
    });

    if (erroEvidencia) {
      if (erroEvidencia.code === "23505") {
        return { ok: true };
      }
      console.error("[dossier-imputacoes] falha ao anexar evidência:", erroEvidencia);
      return {
        error: "A posição ficou registada, mas a evidência não foi anexada.",
      };
    }
  }

  revalidarDossie(rawRedirect, fornecedorId);
  return { ok: true };
}

/**
 * Muda o estado de uma posição — sustentada, aceite, retirada ou superada.
 *
 * É assim que se corrige uma posição sem escrever migração: a posição
 * permanece, com o seu fundamento e a sua data, e o estado diz o que lhe
 * aconteceu. Uma posição nunca se apaga.
 */
export async function mudarEstadoPosicao(
  _prev: PosicaoFormState,
  formData: FormData,
): Promise<PosicaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const posicaoId = String(formData.get("posicao_id") ?? "").trim();
  if (!posicaoId) return { error: "Posição não identificada." };

  const estado = validarEstadoPosicao(String(formData.get("estado") ?? "").trim());
  if (!estado) return { error: "Estado inválido." };

  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("imputacoes_posicoes")
    .update({ estado, atualizado_em: new Date().toISOString() })
    .eq("id", posicaoId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[dossier-imputacoes] falha ao mudar estado da posição:", error);
    return { error: "Não foi possível mudar o estado da posição." };
  }
  if (!data) return { error: "Posição não encontrada." };

  revalidarDossie(rawRedirect, fornecedorId);
  return { ok: true };
}
