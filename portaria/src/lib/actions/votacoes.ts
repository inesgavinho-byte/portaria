"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Votacao, VotacaoOpcao } from "@/types/database";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

export type VotacaoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"titulo" | "descricao" | "opcoes", string>>;
};

export type VotarFormState = {
  error?: string;
  success?: boolean;
  hash?: string;
};

export type ResultadoVotacao = {
  votacao: Votacao;
  opcoes: (VotacaoOpcao & { count: number; percentagem: number })[];
  totalVotos: number;
  totalParticipantes: number;
  quorumAtingido: boolean;
  quorumNecessario: string;
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const QUORUM_LABEL: Record<Votacao["tipo_quorum"], string> = {
  maioria_simples: "Maioria simples (>50%)",
  maioria_qualificada: "Maioria qualificada (>2/3)",
  unanimidade: "Unanimidade (100%)",
};

// ---------------------------------------------------------------------------
// ADMIN — Criar votação
// ---------------------------------------------------------------------------

/**
 * Cria uma nova votação com opções e preenche participantes automaticamente.
 * Só em estado 'rascunho'.
 */
export async function criarVotacao(
  assembleiaId: string | null,
  _prev: VotacaoFormState,
  formData: FormData
): Promise<VotacaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tipoQuorum = String(formData.get("tipo_quorum") ?? "maioria_simples");
  const pesoPorPermilagem = String(formData.get("peso_por_permilagem") ?? "true") === "true";
  const opcoesRaw = String(formData.get("opcoes") ?? "").trim();

  // Parse opções (JSON array de strings)
  let opcoes: string[] = [];
  try {
    opcoes = JSON.parse(opcoesRaw);
    if (!Array.isArray(opcoes) || opcoes.length < 2) {
      return { fieldErrors: { opcoes: "A votação precisa de pelo menos 2 opções." } };
    }
    if (opcoes.some((o) => typeof o !== "string" || !o.trim())) {
      return { fieldErrors: { opcoes: "Todas as opções devem ter texto." } };
    }
  } catch {
    return { fieldErrors: { opcoes: "Formato de opções inválido." } };
  }

  if (!titulo) return { fieldErrors: { titulo: "O título é obrigatório." } };
  if (titulo.length > 200) return { fieldErrors: { titulo: "Título demasiado longo." } };
  if (!["maioria_simples", "maioria_qualificada", "unanimidade"].includes(tipoQuorum)) {
    return { error: "Tipo de quórum inválido." };
  }

  const supabase = await createClient();

  // 1. Criar votação
  const { data: votacao, error: insertError } = await supabase
    .from("votacoes")
    .insert({
      tenant_id: ctx.tenant.id,
      assembleia_id: assembleiaId,
      titulo,
      descricao,
      estado: "rascunho",
      tipo_quorum: tipoQuorum as Votacao["tipo_quorum"],
      peso_por_permilagem: pesoPorPermilagem,
      criado_por: ctx.user.id,
    })
    .select()
    .single();

  if (insertError || !votacao) {
    console.error("Erro criar votação:", insertError);
    return { error: "Erro ao criar a votação." };
  }

  // 2. Criar opções
  const opcoesInsert = opcoes.map((texto, i) => ({
    votacao_id: votacao.id,
    tenant_id: ctx.tenant.id,
    texto: texto.trim(),
    ordem: i + 1,
  }));

  const { error: opcoesError } = await supabase.from("votacao_opcoes").insert(opcoesInsert);
  if (opcoesError) {
    console.error("Erro criar opções:", opcoesError);
    // Cleanup
    await supabase.from("votacoes").delete().eq("id", votacao.id);
    return { error: "Erro ao criar as opções da votação." };
  }

  // 3. Preencher participantes automaticamente (todos os membros do tenant)
  const admin = createAdminClient();
  if (admin) {
    const { data: membros } = await admin
      .from("user_tenants")
      .select("user_id")
      .eq("tenant_id", ctx.tenant.id);

    if (membros && membros.length > 0) {
      const participantes = membros.map((m) => ({
        votacao_id: votacao.id,
        tenant_id: ctx.tenant.id,
        user_id: m.user_id,
      }));

      const { error: partError } = await supabase
        .from("votacao_participantes")
        .insert(participantes);

      if (partError) {
        console.error("Erro preencher participantes:", partError);
      }
    }
  }

  revalidatePath("/configuracao/assembleias");
  if (assembleiaId) revalidatePath(`/configuracao/assembleias/${assembleiaId}`);
  redirect(`/configuracao/assembleias/${assembleiaId ?? ""}`);
}

// ---------------------------------------------------------------------------
// ADMIN — Atualizar votação (só em rascunho)
// ---------------------------------------------------------------------------

export async function atualizarVotacao(
  id: string,
  _prev: VotacaoFormState,
  formData: FormData
): Promise<VotacaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tipoQuorum = String(formData.get("tipo_quorum") ?? "maioria_simples");
  const pesoPorPermilagem = String(formData.get("peso_por_permilagem") ?? "true") === "true";

  if (!titulo) return { fieldErrors: { titulo: "O título é obrigatório." } };
  if (titulo.length > 200) return { fieldErrors: { titulo: "Título demasiado longo." } };

  const supabase = await createClient();

  // Só permite atualizar se estiver em rascunho
  const { data: atual } = await supabase
    .from("votacoes")
    .select("estado, assembleia_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!atual) return { error: "Votação não encontrada." };
  if (atual.estado !== "rascunho") return { error: "Só é possível editar votações em rascunho." };

  const { error } = await supabase
    .from("votacoes")
    .update({
      titulo,
      descricao,
      tipo_quorum: tipoQuorum as Votacao["tipo_quorum"],
      peso_por_permilagem: pesoPorPermilagem,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro atualizar votação:", error);
    return { error: "Erro ao atualizar." };
  }

  revalidatePath("/configuracao/assembleias");
  if (atual.assembleia_id) revalidatePath(`/configuracao/assembleias/${atual.assembleia_id}`);
  redirect(`/configuracao/assembleias/${atual.assembleia_id ?? ""}`);
}

// ---------------------------------------------------------------------------
// ADMIN — Abrir votação
// ---------------------------------------------------------------------------

export async function abrirVotacao(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const supabase = await createClient();

  const { data: votacao } = await supabase
    .from("votacoes")
    .select("estado, assembleia_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!votacao) throw new Error("Votação não encontrada.");
  if (votacao.estado !== "rascunho") throw new Error("Só é possível abrir votações em rascunho.");

  const { error } = await supabase
    .from("votacoes")
    .update({ estado: "aberta", aberta_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao abrir votação.");

  revalidatePath("/configuracao/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/configuracao/assembleias/${votacao.assembleia_id}`);
  revalidatePath("/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/assembleias/${votacao.assembleia_id}`);
}

// ---------------------------------------------------------------------------
// ADMIN — Encerrar votação
// ---------------------------------------------------------------------------

export async function encerrarVotacao(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const supabase = await createClient();

  const { data: votacao } = await supabase
    .from("votacoes")
    .select("estado, assembleia_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!votacao) throw new Error("Votação não encontrada.");
  if (votacao.estado !== "aberta") throw new Error("Só é possível encerrar votações abertas.");

  const { error } = await supabase
    .from("votacoes")
    .update({ estado: "encerrada", encerrada_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao encerrar votação.");

  revalidatePath("/configuracao/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/configuracao/assembleias/${votacao.assembleia_id}`);
  revalidatePath("/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/assembleias/${votacao.assembleia_id}`);
}

// ---------------------------------------------------------------------------
// ADMIN — Cancelar votação
// ---------------------------------------------------------------------------

export async function cancelarVotacao(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const supabase = await createClient();

  const { data: votacao } = await supabase
    .from("votacoes")
    .select("estado, assembleia_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!votacao) throw new Error("Votação não encontrada.");
  if (votacao.estado === "encerrada") throw new Error("Não é possível cancelar votações encerradas.");

  const { error } = await supabase
    .from("votacoes")
    .update({ estado: "cancelada" })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao cancelar votação.");

  revalidatePath("/configuracao/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/configuracao/assembleias/${votacao.assembleia_id}`);
}

// ---------------------------------------------------------------------------
// ADMIN — Apagar votação
// ---------------------------------------------------------------------------

export async function apagarVotacao(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const supabase = await createClient();

  const { data: votacao } = await supabase
    .from("votacoes")
    .select("estado, assembleia_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!votacao) throw new Error("Votação não encontrada.");
  if (votacao.estado !== "rascunho") throw new Error("Só é possível apagar votações em rascunho.");

  // Apaga em cascata: opções, participantes, votos (via ON DELETE CASCADE)
  const { error } = await supabase.from("votacoes").delete().eq("id", id).eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Erro ao apagar votação.");

  revalidatePath("/configuracao/assembleias");
  if (votacao.assembleia_id) revalidatePath(`/configuracao/assembleias/${votacao.assembleia_id}`);
}

// ---------------------------------------------------------------------------
// CONDÓMINO — Votar
// ---------------------------------------------------------------------------

/**
 * Regista um voto anónimo.
 * Verifica se o utilizador é participante e ainda não votou.
 * Devolve o hash de verificação.
 */
export async function votar(
  votacaoId: string,
  opcaoId: string
): Promise<VotarFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();

  // Toda a integridade do voto (votação aberta, participação, opção válida,
  // unicidade e atualização atómica de votou_em) é garantida pela função
  // transacional registar_voto no servidor de BD (SECURITY DEFINER, com lock
  // do participante). O cliente já não insere em `votos` diretamente — o RLS
  // bloqueia esse caminho (migração 0028, S4). Devolve o hash de comprovativo.
  const { data: hash, error } = await supabase.rpc("registar_voto", {
    p_votacao_id: votacaoId,
    p_opcao_id: opcaoId,
  });

  if (error) {
    // Traduz as exceções da função para mensagens ao utilizador.
    const msg = error.message ?? "";
    if (msg.includes("Já votou")) return { error: "Já votou nesta votação." };
    if (msg.includes("não está aberta")) return { error: "Esta votação não está aberta." };
    if (msg.includes("autorizado")) return { error: "Não está autorizado a votar nesta votação." };
    if (msg.includes("Opção inválida")) return { error: "Opção inválida." };
    console.error("Erro ao registar voto:", error);
    return { error: "Erro ao registar o voto. Tente novamente." };
  }

  revalidatePath("/assembleias");
  revalidatePath(`/assembleias/${votacaoId}`);
  revalidatePath("/votacoes");

  return { success: true, hash: (hash as string | null) ?? undefined };
}

// ---------------------------------------------------------------------------
// CONDÓMINO — Verificar voto
// ---------------------------------------------------------------------------

/**
 * Permite a um condómino verificar que o voto foi contado corretamente.
 * Não revela o conteúdo do voto, apenas confirma que existe um voto com aquele hash.
 */
export async function verificarVoto(
  votacaoId: string,
  hash: string
): Promise<{ valido: boolean; error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { valido: false, error: "Não autenticado." };

  const supabase = await createClient();

  const { data } = await supabase
    .from("votos")
    .select("id")
    .eq("votacao_id", votacaoId)
    .eq("voto_hash", hash)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return { valido: !!data };
}

// ---------------------------------------------------------------------------
// PÚBLICO (dentro do tenant) — Resultados
// ---------------------------------------------------------------------------

/**
 * Devolve os resultados agregados de uma votação encerrada.
 */
export async function resultadosVotacao(
  votacaoId: string
): Promise<{ resultado?: ResultadoVotacao; error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();

  // Buscar votação
  const { data: rawVotacao } = await supabase
    .from("votacoes")
    .select("*")
    .eq("id", votacaoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  const votacao = rawVotacao as Votacao | null;
  if (!votacao) return { error: "Votação não encontrada." };
  if (votacao.estado !== "encerrada") return { error: "Resultados só disponíveis após encerramento." };

  // Buscar opções
  const { data: opcoes } = await supabase
    .from("votacao_opcoes")
    .select("*")
    .eq("votacao_id", votacaoId)
    .order("ordem");

  if (!opcoes) return { error: "Erro ao carregar opções." };

  // Contar votos por opção (usando service role porque a tabela votos não permite SELECT via RLS)
  const admin = createAdminClient();
  if (!admin) return { error: "Serviço indisponível." };

  const { data: votos } = await admin
    .from("votos")
    .select("opcao_id")
    .eq("votacao_id", votacaoId)
    .eq("tenant_id", ctx.tenant.id);

  const contagem: Record<string, number> = {};
  for (const v of votos ?? []) {
    contagem[v.opcao_id] = (contagem[v.opcao_id] ?? 0) + 1;
  }

  const totalVotos = votos?.length ?? 0;

  // Participantes
  const { count: totalParticipantes } = await supabase
    .from("votacao_participantes")
    .select("*", { count: "exact", head: true })
    .eq("votacao_id", votacaoId);

  // Calcular se quórum foi atingido
  let quorumAtingido = false;
  if (totalParticipantes && totalParticipantes > 0) {
    const taxaParticipacao = totalVotos / totalParticipantes;
    switch (votacao.tipo_quorum) {
      case "maioria_simples":
        quorumAtingido = taxaParticipacao > 0.5;
        break;
      case "maioria_qualificada":
        quorumAtingido = taxaParticipacao > 2 / 3;
        break;
      case "unanimidade":
        quorumAtingido = taxaParticipacao === 1;
        break;
    }
  }

  const opcoesComResultado = opcoes.map((o) => ({
    ...o,
    count: contagem[o.id] ?? 0,
    percentagem: totalVotos > 0 ? Math.round(((contagem[o.id] ?? 0) / totalVotos) * 1000) / 10 : 0,
  }));

  return {
    resultado: {
      votacao,
      opcoes: opcoesComResultado,
      totalVotos,
      totalParticipantes: totalParticipantes ?? 0,
      quorumAtingido,
      quorumNecessario: QUORUM_LABEL[votacao.tipo_quorum],
    },
  };
}

// ---------------------------------------------------------------------------
// LISTAGEM — Votações de uma assembleia (admin)
// ---------------------------------------------------------------------------

export async function listarVotacoesAdmin(assembleiaId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("votacoes")
    .select("*, votacao_opcoes(id), votacao_participantes(id, votou_em)")
    .eq("assembleia_id", assembleiaId)
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: false });

  return data ?? [];
}

// ---------------------------------------------------------------------------
// LISTAGEM — Votações visíveis para condóminos
// ---------------------------------------------------------------------------

export async function listarVotacoesPublicas(): Promise<Votacao[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("votacoes")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .in("estado", ["aberta", "encerrada"])
    .order("criado_em", { ascending: false });

  return data ?? [];
}

// ---------------------------------------------------------------------------
// DETALHE — Votação com opções (para votação em curso)
// ---------------------------------------------------------------------------

export async function detalheVotacao(votacaoId: string) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  const supabase = await createClient();

  const { data: votacao } = await supabase
    .from("votacoes")
    .select("*")
    .eq("id", votacaoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!votacao) return null;

  const { data: opcoes } = await supabase
    .from("votacao_opcoes")
    .select("*")
    .eq("votacao_id", votacaoId)
    .order("ordem");

  // Verificar se o utilizador já votou
  const { data: participante } = await supabase
    .from("votacao_participantes")
    .select("votou_em")
    .eq("votacao_id", votacaoId)
    .eq("user_id", ctx.user.id)
    .single();

  return {
    votacao,
    opcoes: opcoes ?? [],
    jaVotou: !!participante?.votou_em,
  };
}
