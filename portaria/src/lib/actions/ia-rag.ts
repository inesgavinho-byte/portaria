"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserInTenant, requireAdmin } from "@/lib/supabase/tenant";
import { gerarEmbedding } from "@/lib/ai/openai";
import { deepseekChat, gerarTituloConversa } from "@/lib/ai/deepseek";
import { chatTexto } from "@/lib/ai/openai";
import type { ConversaIA, ConversaIAMensagem, ConhecimentoEmbedding } from "@/types/database";

// ---------------------------------------------------------------------------
// UTILITÁRIOS — Chunking
// ---------------------------------------------------------------------------

/**
 * Divide texto em chunks com overlap.
 * Tamanho ~1000 tokens, overlap 200 tokens.
 * Separadores preferidos: parágrafo, linha, frase.
 */
function chunkTexto(
  texto: string,
  opts: { tamanho?: number; overlap?: number } = {}
): string[] {
  const { tamanho = 4000, overlap = 500 } = opts;
  const separadores = ["\n\n", "\n", ". ", " "];

  const chunks: string[] = [];
  let posicao = 0;

  while (posicao < texto.length) {
    let fim = Math.min(posicao + tamanho, texto.length);

    // Procura separador preferido próximo do fim
    if (fim < texto.length) {
      let melhorFim = fim;
      for (const sep of separadores) {
        const idx = texto.lastIndexOf(sep, fim);
        if (idx > posicao + tamanho * 0.5) {
          melhorFim = idx + sep.length;
          break;
        }
      }
      fim = melhorFim;
    }

    chunks.push(texto.slice(posicao, fim).trim());
    posicao = fim - overlap;
    if (posicao >= texto.length) break;
  }

  return chunks.filter((c) => c.length > 50);
}

// ---------------------------------------------------------------------------
// INGESTÃO — Documentos para embeddings
// ---------------------------------------------------------------------------

/**
 * Ingerir regulamento do tenant. Extrai texto do tenant_perfil.regulamento_texto.
 */
export async function ingerirRegulamento(): Promise<{
  inseridos: number;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { inseridos: 0, error: "Sem permissões." };

  const supabase = await createClient();

  // Buscar regulamento
  const { data: perfil } = await supabase
    .from("tenant_perfil")
    .select("regulamento_texto")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!perfil?.regulamento_texto) {
    return { inseridos: 0, error: "Regulamento não encontrado." };
  }

  // Apagar embeddings antigos do regulamento
  await supabase
    .from("conhecimento_embeddings")
    .delete()
    .eq("tenant_id", ctx.tenant.id)
    .eq("origem", "regulamento");

  // Dividir em chunks
  const chunks = chunkTexto(perfil.regulamento_texto);
  let inseridos = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await gerarEmbedding(chunk);
    if (!embedding) continue;

    const { error } = await supabase.from("conhecimento_embeddings").insert({
      tenant_id: ctx.tenant.id,
      origem: "regulamento",
      origem_id: "regulamento",
      conteudo: chunk,
      embedding: JSON.stringify(embedding),
      metadata: { chunk_index: i, total_chunks: chunks.length },
    });

    if (!error) inseridos++;
  }

  return { inseridos };
}

/**
 * Ingerir um documento específico.
 */
export async function ingerirDocumento(documentoId: string): Promise<{
  inseridos: number;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { inseridos: 0, error: "Sem permissões." };

  const supabase = await createClient();

  // Buscar documento
  const { data: doc } = await supabase
    .from("documentos")
    .select("titulo, descricao")
    .eq("id", documentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!doc) return { inseridos: 0, error: "Documento não encontrado." };

  // Para documentos PDF, precisaríamos de extrair texto — por agora usa título + descrição
  const texto = `${doc.titulo}\n\n${doc.descricao ?? ""}`;
  if (!texto.trim()) {
    return { inseridos: 0, error: "Documento sem conteúdo indexável." };
  }

  // Apagar embeddings antigos deste documento
  await supabase
    .from("conhecimento_embeddings")
    .delete()
    .eq("tenant_id", ctx.tenant.id)
    .eq("origem", "documento")
    .eq("origem_id", documentoId);

  const chunks = chunkTexto(texto);
  let inseridos = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await gerarEmbedding(chunk);
    if (!embedding) continue;

    const { error } = await supabase.from("conhecimento_embeddings").insert({
      tenant_id: ctx.tenant.id,
      origem: "documento",
      origem_id: documentoId,
      conteudo: chunk,
      embedding: JSON.stringify(embedding),
      metadata: { titulo: doc.titulo, chunk_index: i },
    });

    if (!error) inseridos++;
  }

  return { inseridos };
}

/**
 * Ingerir ocorrências resolvidas (para sugestões futuras).
 */
export async function ingerirOcorrenciasResolvidas(): Promise<{
  inseridos: number;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { inseridos: 0, error: "Sem permissões." };

  const supabase = await createClient();

  const { data: ocorrencias } = await supabase
    .from("ocorrencias")
    .select("id, titulo, descricao, categoria, estado")
    .eq("tenant_id", ctx.tenant.id)
    .eq("estado", "resolvido");

  if (!ocorrencias || ocorrencias.length === 0) {
    return { inseridos: 0 };
  }

  // Apagar embeddings antigos
  await supabase
    .from("conhecimento_embeddings")
    .delete()
    .eq("tenant_id", ctx.tenant.id)
    .eq("origem", "ocorrencia_resolvida");

  let inseridos = 0;

  for (const ocorrencia of ocorrencias) {
    const texto = `Ocorrência: ${ocorrencia.titulo}\nCategoria: ${ocorrencia.categoria}\nDescrição: ${ocorrencia.descricao ?? ""}`;
    const embedding = await gerarEmbedding(texto);
    if (!embedding) continue;

    const { error } = await supabase.from("conhecimento_embeddings").insert({
      tenant_id: ctx.tenant.id,
      origem: "ocorrencia_resolvida",
      origem_id: ocorrencia.id,
      conteudo: texto,
      embedding: JSON.stringify(embedding),
      metadata: { categoria: ocorrencia.categoria },
    });

    if (!error) inseridos++;
  }

  return { inseridos };
}

/**
 * Reindexar todo o conhecimento do tenant.
 */
export async function reindexarTenant(): Promise<{
  regulamento: number;
  ocorrencias: number;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { regulamento: 0, ocorrencias: 0, error: "Sem permissões." };

  const supabase = await createClient();

  // Apagar tudo
  await supabase
    .from("conhecimento_embeddings")
    .delete()
    .eq("tenant_id", ctx.tenant.id);

  const [regResult, ocorResult] = await Promise.all([
    ingerirRegulamento(),
    ingerirOcorrenciasResolvidas(),
  ]);

  revalidatePath("/ia/configuracao");

  return {
    regulamento: regResult.inseridos,
    ocorrencias: ocorResult.inseridos,
  };
}

// ---------------------------------------------------------------------------
// CHAT — Conversa com o Assistente
// ---------------------------------------------------------------------------

export type EnviarMensagemResult = {
  resposta?: string;
  fontes?: { origem: string; origem_id: string; conteudo: string }[];
  error?: string;
};

/**
 * Envia uma mensagem para o assistente IA.
 * Pipeline: query → embedding → vector search → contexto → DeepSeek → resposta.
 */
export async function enviarMensagem(
  conversaId: string,
  mensagem: string
): Promise<EnviarMensagemResult> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();

  // 1. Verificar se a conversa pertence ao utilizador
  const { data: conversa } = await supabase
    .from("conversas_ia")
    .select("*")
    .eq("id", conversaId)
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!conversa) return { error: "Conversa não encontrada." };

  // 2. Guardar mensagem do utilizador
  await supabase.from("conversas_ia_mensagens").insert({
    conversa_id: conversaId,
    tenant_id: ctx.tenant.id,
    role: "user",
    conteudo: mensagem,
  });

  // 3. Gerar embedding da query
  const queryEmbedding = await gerarEmbedding(mensagem);
  if (!queryEmbedding) {
    return { error: "Serviço de embeddings indisponível." };
  }

  // 4. Buscar chunks relevantes via RPC (função SQL)
  const { data: chunks } = await supabase.rpc("buscar_chunks", {
    p_tenant_id: ctx.tenant.id,
    p_embedding: JSON.stringify(queryEmbedding),
    p_limite: 5,
    p_threshold: 0.7,
  });

  const chunksRelevantes = (chunks ?? []) as ConhecimentoEmbedding[];

  // 5. Construir contexto
  const contexto = chunksRelevantes
    .map((c, i) => `[${i + 1}] ${c.origem}: ${c.conteudo}`)
    .join("\n\n");

  const systemPrompt = `És o Assistente do Condomínio ${ctx.tenant.nome}. Respondes apenas com base nos documentos fornecidos.
Regras:
1. Se a informação não estiver nos documentos, diz "Não encontrei informação sobre isso nos documentos do condomínio."
2. Cita a fonte usando [n] quando aplicável.
3. Sê conciso e direto.
4. Não inventes informação.

Documentos relevantes:
${contexto || "(nenhum documento encontrado)"}`;

  // 6. Buscar histórico recente da conversa (últimas 10 mensagens)
  const { data: historico } = await supabase
    .from("conversas_ia_mensagens")
    .select("role, conteudo")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: true })
    .limit(10);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(historico ?? []).map((h) => ({
      role: h.role as "user" | "assistant" | "system",
      content: h.conteudo,
    })),
    { role: "user" as const, content: mensagem },
  ];

  // 7. Chamar DeepSeek (fallback para OpenAI)
  let resposta: string | null = null;

  const deepseekRes = await deepseekChat(messages, { temperature: 0.3 });
  if (deepseekRes?.content) {
    resposta = deepseekRes.content;
  } else {
    // Fallback OpenAI
    const openaiRes = await chatTexto(systemPrompt, mensagem);
    resposta = openaiRes;
  }

  if (!resposta) {
    return { error: "Serviço de IA indisponível. Tenta mais tarde." };
  }

  // 8. Guardar resposta do assistente
  const fontes = chunksRelevantes.map((c) => ({
    origem: c.origem,
    origem_id: c.origem_id,
    conteudo: c.conteudo.slice(0, 200),
  }));

  await supabase.from("conversas_ia_mensagens").insert({
    conversa_id: conversaId,
    tenant_id: ctx.tenant.id,
    role: "assistant",
    conteudo: resposta,
    contexto: fontes as unknown as Record<string, unknown>[],
  });

  // 9. Se for a primeira mensagem, gerar título
  const { count } = await supabase
    .from("conversas_ia_mensagens")
    .select("*", { count: "exact", head: true })
    .eq("conversa_id", conversaId);

  if (count === 2) {
    const titulo = await gerarTituloConversa(mensagem);
    if (titulo) {
      await supabase
        .from("conversas_ia")
        .update({ titulo })
        .eq("id", conversaId);
    }
  }

  return { resposta, fontes };
}

// ---------------------------------------------------------------------------
// GESTÃO DE CONVERSAS
// ---------------------------------------------------------------------------

export async function criarConversa(): Promise<{ id?: string; error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversas_ia")
    .insert({
      tenant_id: ctx.tenant.id,
      user_id: ctx.user.id,
    })
    .select()
    .single();

  if (error || !data) return { error: "Erro ao criar conversa." };
  return { id: data.id };
}

export async function listarConversas(): Promise<ConversaIA[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("conversas_ia")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("user_id", ctx.user.id)
    .order("criado_em", { ascending: false });

  return (data ?? []) as ConversaIA[];
}

export async function detalheConversa(conversaId: string): Promise<{
  conversa?: ConversaIA;
  mensagens?: ConversaIAMensagem[];
  error?: string;
}> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();

  const [{ data: conversa }, { data: mensagens }] = await Promise.all([
    supabase
      .from("conversas_ia")
      .select("*")
      .eq("id", conversaId)
      .eq("user_id", ctx.user.id)
      .eq("tenant_id", ctx.tenant.id)
      .single(),
    supabase
      .from("conversas_ia_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: true }),
  ]);

  if (!conversa) return { error: "Conversa não encontrada." };

  return {
    conversa: conversa as ConversaIA,
    mensagens: (mensagens ?? []) as ConversaIAMensagem[],
  };
}

export async function apagarConversa(conversaId: string): Promise<void> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return;

  const supabase = await createClient();
  await supabase
    .from("conversas_ia")
    .delete()
    .eq("id", conversaId)
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/ia");
}

// ---------------------------------------------------------------------------
// BUSCA SEMÂNTICA
// ---------------------------------------------------------------------------

export async function buscarDocumentos(
  query: string,
  limite = 5
): Promise<ConhecimentoEmbedding[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const embedding = await gerarEmbedding(query);
  if (!embedding) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("buscar_chunks", {
    p_tenant_id: ctx.tenant.id,
    p_embedding: JSON.stringify(embedding),
    p_limite: limite,
    p_threshold: 0.6,
  });

  return (data ?? []) as ConhecimentoEmbedding[];
}

// ---------------------------------------------------------------------------
// SUGESTÃO DE RESOLUÇÃO PARA OCORRÊNCIAS
// ---------------------------------------------------------------------------

export async function sugerirResolucao(
  ocorrenciaId: string
): Promise<{
  sugestao?: string;
  ocorrenciasRelacionadas?: { id: string; titulo: string }[];
  error?: string;
}> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();

  // Buscar ocorrência atual
  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("id, titulo, descricao, categoria, estado")
    .eq("id", ocorrenciaId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!ocorrencia) return { error: "Ocorrência não encontrada." };

  // Buscar ocorrências resolvidas similares via vector search
  const query = `Ocorrência: ${ocorrencia.titulo} ${ocorrencia.descricao ?? ""}`;
  const embedding = await gerarEmbedding(query);
  if (!embedding) return { error: "Serviço indisponível." };

  const { data: relacionadas } = await supabase.rpc("buscar_chunks", {
    p_tenant_id: ctx.tenant.id,
    p_embedding: JSON.stringify(embedding),
    p_limite: 3,
    p_threshold: 0.5,
  });

  const similares = (relacionadas ?? []).filter(
    (r: ConhecimentoEmbedding) => r.origem === "ocorrencia_resolvida" && r.origem_id !== ocorrenciaId
  ) as ConhecimentoEmbedding[];

  const contexto = similares.map((s, i) => `[${i + 1}] ${s.conteudo}`).join("\n\n");

  const prompt = `Analisa esta ocorrência e sugere uma resolução com base em ocorrências resolvidas similares.

Ocorrência atual:
- Título: ${ocorrencia.titulo}
- Categoria: ${ocorrencia.categoria}
- Descrição: ${ocorrencia.descricao ?? "N/A"}

Ocorrências resolvidas similares:
${contexto || "Nenhuma ocorrência similar encontrada."}

Sugere de forma concisa:
1. Causa provável
2. Passos de resolução
3. Se relevante, contactos/fornecedores a envolver`;

  let sugestao: string | null = null;

  const deepseekRes = await deepseekChat(
    [
      { role: "system", content: "És um assistente técnico de condomínios. Sê prático e direto." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3 }
  );

  if (deepseekRes?.content) {
    sugestao = deepseekRes.content;
  } else {
    sugestao = await chatTexto(
      "És um assistente técnico de condomínios. Sê prático e direto.",
      prompt
    );
  }

  if (!sugestao) return { error: "Não foi possível gerar sugestão." };

  return {
    sugestao,
    ocorrenciasRelacionadas: similares.map((s) => ({
      id: s.origem_id,
      titulo: (s.metadata?.titulo as string | undefined) ?? s.origem_id,
    })),
  };
}

// ---------------------------------------------------------------------------
// ESTADO DA BASE DE CONHECIMENTO (admin)
// ---------------------------------------------------------------------------

export async function estadoConhecimento(): Promise<{
  dados: Record<string, number>;
  total: number;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { dados: {}, total: 0 };

  const supabase = await createClient();
  const { data } = await supabase.rpc("estado_conhecimento", {
    p_tenant_id: ctx.tenant.id,
  });

  const dados: Record<string, number> = {};
  let total = 0;

  for (const row of (data ?? []) as { origem: string; count: number }[]) {
    dados[row.origem] = row.count;
    total += row.count;
  }

  return { dados, total };
}

/**
 * Wrapper para usar como form action — redireciona com status.
 */
export async function reindexarTenantAction(): Promise<void> {
  const result = await reindexarTenant();
  if (result.error) {
    redirect("/ia/configuracao?status=erro");
  }
  redirect("/ia/configuracao?status=ok");
}
