"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import {
  aplicarRegrasAMovimentos,
  normalizarPadrao,
  type RegraClassificacao,
} from "@/lib/financeiro/regras-classificacao";

export type RegraFormResultado = { ok: true } | { ok: false; error: string };

export type RegraListada = RegraClassificacao & {
  criadoEm: string;
  fornecedorNome: string | null;
};

const ROTAS_A_REVALIDAR = [
  "/configuracao/financeiro/movimentos",
  "/configuracao/financeiro/movimentos/regras",
  "/configuracao/financeiro/mapa",
  "/hoje",
];

function revalidar() {
  for (const rota of ROTAS_A_REVALIDAR) revalidatePath(rota);
}

/**
 * Lista as regras do tenant POR ORDEM DE CRIAÇÃO — a ordem é a precedência:
 * quando duas regras casam com o mesmo movimento, a primeira criada vence.
 */
export async function listarRegras(): Promise<RegraListada[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("regras_classificacao_movimentos")
    .select("id,padrao,fornecedor_id,sem_fornecedor,criado_em,fornecedores(nome)")
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: true });

  return (data ?? []).map((regra) => ({
    id: regra.id,
    padrao: regra.padrao,
    fornecedorId: regra.fornecedor_id,
    semFornecedor: regra.sem_fornecedor,
    criadoEm: regra.criado_em,
    fornecedorNome: nomeDoEmbed(regra.fornecedores),
  }));
}

/** O embed to-one do PostgREST chega como objecto; por defesa, aceita array. */
function nomeDoEmbed(embed: unknown): string | null {
  const valor = Array.isArray(embed) ? embed[0] : embed;
  if (valor && typeof valor === "object" && "nome" in valor) {
    return String((valor as { nome: unknown }).nome) || null;
  }
  return null;
}

/**
 * Cria uma regra de classificação. O padrão é guardado normalizado (a mesma
 * forma usada no matching) e é a decisão PERMANENTE de uma pessoa — por isso
 * valida tenant, exige padrão ≥ 3 caracteres e exige exactamente uma acção:
 * fornecedor escolhido OU "sem fornecedor".
 */
export async function criarRegra(formData: FormData): Promise<RegraFormResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const padrao = normalizarPadrao(String(formData.get("padrao") ?? ""));
  const semFornecedor = formData.get("sem_fornecedor") === "on";
  const fornecedorId = semFornecedor ? null : String(formData.get("fornecedor_id") ?? "").trim();

  if (padrao.length < 3) {
    return { ok: false, error: "Escreve um padrão com pelo menos 3 caracteres (o texto que aparece na descrição)." };
  }
  if (!semFornecedor && !fornecedorId) {
    return { ok: false, error: "Escolhe um fornecedor ou marca a regra como «sem fornecedor»." };
  }

  const supabase = await createClient();

  if (fornecedorId) {
    const { data: fornecedor } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("id", fornecedorId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!fornecedor) return { ok: false, error: "Fornecedor não encontrado neste condomínio." };
  }

  const { error } = await supabase.from("regras_classificacao_movimentos").insert({
    tenant_id: ctx.tenant.id,
    padrao,
    fornecedor_id: fornecedorId,
    sem_fornecedor: semFornecedor,
    criado_por: ctx.user.id,
  });

  if (error) {
    // 23505 = violação de unique (tenant_id, padrao): uma regra por padrão.
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma regra com esse padrão." };
    }
    console.error("Erro ao criar regra de classificação:", error);
    return { ok: false, error: "Erro ao criar a regra." };
  }

  revalidar();
  return { ok: true };
}

/** Apaga uma regra. Os movimentos que ela classificou não são revertidos: o histórico de proveniência 'regra' permanece visível até alguém o corrigir. */
export async function apagarRegra(id: string): Promise<RegraFormResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Sem permissões para esta operação." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("regras_classificacao_movimentos")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro ao apagar regra de classificação:", error);
    return { ok: false, error: "Erro ao apagar a regra." };
  }

  revalidar();
  return { ok: true };
}

/**
 * Aplica as regras aos movimentos PENDENTES do tenant, agora. Uma regra é a
 * decisão de uma pessoa, por isto escreve sozinho — mas sempre com
 * `fornecedor_origem = 'regra'`, para a proveniência ficar visível na UI e
 * ser reversível com um clique.
 */
export async function aplicarRegrasPendentes(): Promise<{ aplicadas: number } | { error: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const supabase = await createClient();
  const [{ data: regrasData }, { data: movimentosData }] = await Promise.all([
    supabase
      .from("regras_classificacao_movimentos")
      .select("id,padrao,fornecedor_id,sem_fornecedor")
      .eq("tenant_id", ctx.tenant.id)
      .order("criado_em", { ascending: true }),
    supabase
      .from("movimentos_bancarios")
      .select("id,descricao,contraparte,fornecedor_id,fornecedor_nao_aplicavel")
      .eq("tenant_id", ctx.tenant.id)
      .is("fornecedor_id", null)
      .eq("fornecedor_nao_aplicavel", false),
  ]);

  const regras = (regrasData ?? []).map((regra) => ({
    id: regra.id,
    padrao: regra.padrao,
    fornecedorId: regra.fornecedor_id,
    semFornecedor: regra.sem_fornecedor,
  }));
  const movimentos = movimentosData ?? [];
  if (regras.length === 0 || movimentos.length === 0) return { aplicadas: 0 };

  const classificacoes = aplicarRegrasAMovimentos(movimentos, regras);
  const agora = new Date().toISOString();

  let aplicadas = 0;
  for (const classificacao of classificacoes) {
    // Sem regra falhada a interromper a aplicação em série: conta-se o que
    // conseguiu escrever e os erros ficam registados no log.
    const { data, error } = await supabase
      .from("movimentos_bancarios")
      .update({
        fornecedor_id: classificacao.fornecedorId,
        fornecedor_nao_aplicavel: classificacao.semFornecedor,
        fornecedor_origem: "regra",
        fornecedor_atribuido_em: agora,
        // A "pessoa" aqui é a regra, não um utilizador: fica null a par de
        // fornecedor_origem = 'regra', que é o que identifica a proveniência.
        fornecedor_atribuido_por: null,
        atualizado_em: agora,
      })
      .eq("id", classificacao.movimentoId)
      .eq("tenant_id", ctx.tenant.id)
      // Defesa de corrida: se entretanto alguém atribuiu manualmente, a
      // regra perde — quem tria nunca é sobrescrito.
      .is("fornecedor_id", null)
      .eq("fornecedor_nao_aplicavel", false)
      .select("id");
    if (error) {
      console.error("Erro ao aplicar regra a movimento:", error);
      continue;
    }
    // Só conta o que efectivamente escreveu: com a guarda acima, uma corrida
    // devolve zero linhas sem erro.
    aplicadas += data?.length ?? 0;
  }

  revalidar();
  return { aplicadas };
}
