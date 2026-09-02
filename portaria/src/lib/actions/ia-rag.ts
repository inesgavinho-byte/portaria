"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserInTenant, requireAdmin } from "@/lib/supabase/tenant";
import { gerarEmbedding } from "@/lib/ai/openai";
import { ePdf, extrairTextoPdfLocal } from "@/lib/ai/pdf-texto";
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
 * Substitui de forma SEGURA os embeddings de uma origem (A2 — reindexação
 * não destrutiva).
 *
 * Computa PRIMEIRO todos os novos vetores; só depois apaga os antigos e
 * insere os novos, numa janela mínima. Se o serviço de embeddings estiver em
 * baixo (nenhum vetor gerado), a base anterior é PRESERVADA — nunca se apaga
 * tudo antes de confirmar que há uma nova geração.
 *
 * Casos:
 *   • fonte vazia (0 itens)        → limpa a origem (nada a indexar) e devolve 0.
 *   • itens > 0 mas 0 embeddings   → mantém a base anterior e devolve erro.
 *   • itens > 0 e ≥1 embedding     → substitui.
 */
async function reindexarOrigem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  origem: string,
  itens: { origem_id: string; conteudo: string; metadata: Record<string, unknown> }[],
  opts?: { origemId?: string }
): Promise<{ inseridos: number; error?: string }> {
  const apagarAntigos = async () => {
    let del = supabase
      .from("conhecimento_embeddings")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("origem", origem);
    if (opts?.origemId) del = del.eq("origem_id", opts.origemId);
    await del;
  };

  if (itens.length === 0) {
    // Fonte legitimamente vazia: limpar o que existisse.
    await apagarAntigos();
    return { inseridos: 0 };
  }

  // 1) Computar todos os embeddings ANTES de tocar na base.
  const rows: Record<string, unknown>[] = [];
  for (const it of itens) {
    const embedding = await gerarEmbedding(it.conteudo);
    if (!embedding) continue;
    rows.push({
      tenant_id: tenantId,
      origem,
      origem_id: it.origem_id,
      conteudo: it.conteudo,
      embedding: JSON.stringify(embedding),
      metadata: it.metadata,
    });
  }

  // 2) Nenhum vetor gerado (serviço em baixo) → preservar a base anterior.
  if (rows.length === 0) {
    return {
      inseridos: 0,
      error: "Não foi possível gerar embeddings. A base de conhecimento anterior foi preservada.",
    };
  }

  // 3) Só agora substituir (janela mínima: um delete + um insert em lote).
  await apagarAntigos();
  const { error } = await supabase.from("conhecimento_embeddings").insert(rows);
  if (error) return { inseridos: 0, error: "Erro ao gravar embeddings." };
  return { inseridos: rows.length };
}

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

  const chunks = chunkTexto(perfil.regulamento_texto);
  const itens = chunks.map((chunk, i) => ({
    origem_id: "regulamento",
    conteudo: chunk,
    metadata: { chunk_index: i, total_chunks: chunks.length },
  }));

  return reindexarOrigem(supabase, ctx.tenant.id, "regulamento", itens);
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
  return ingerirDocumentoEm(supabase, ctx.tenant.id, documentoId);
}

/**
 * Ingestão de um documento, com o cliente já autenticado — usada pela action
 * pública acima e pela reindexação em série de reindexarTenant (evita repetir
 * requireAdmin/createClient por documento).
 *
 * C1 (Fase C): para PDFs, o texto integral é extraído LOCALMENTE (pdf.js via
 * unpdf — sem LLM, ver src/lib/ai/pdf-texto.ts) e indexado junto do título e
 * da descrição. A extração nunca bloqueia a ingestão:
 *
 *   • texto extraído               → indexacao: "texto" (+ páginas, extrator)
 *   • PDF digitalizado/corrompido  → indexacao: "metadados" + extracao:
 *                                    "sem_texto" | "falha" — o documento
 *                                    continua indexável e reindexável depois.
 *   • chunks legados (sem campo)   → tratados como "metadados" pela UI.
 */
async function ingerirDocumentoEm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  documentoId: string
): Promise<{ inseridos: number; error?: string }> {
  // Buscar documento
  const { data: doc } = await supabase
    .from("documentos")
    .select("titulo, descricao, ficheiro_tipo, ficheiro_path")
    .eq("id", documentoId)
    .eq("tenant_id", tenantId)
    .single();

  if (!doc) return { inseridos: 0, error: "Documento não encontrado." };

  const baseTexto = `${doc.titulo}\n\n${doc.descricao ?? ""}`;
  let texto = baseTexto;
  let indexacao: "texto" | "metadados" = "metadados";
  let infoExtracao: Record<string, unknown> = {};

  if (ePdf(doc.ficheiro_tipo) && doc.ficheiro_path && doc.ficheiro_path !== "pending") {
    // Download server-side do ficheiro já validado no upload (RLS de Storage).
    let dados: Uint8Array | null = null;
    try {
      const { data: blob } = await supabase.storage
        .from("documentos")
        .download(doc.ficheiro_path);
      if (blob) dados = new Uint8Array(await blob.arrayBuffer());
    } catch (err) {
      console.error("[ia-rag] download do PDF para extração falhou:", err);
    }

    if (dados) {
      const resultado = await extrairTextoPdfLocal(dados);
      if (resultado.estado === "texto") {
        texto = `${baseTexto}\n\n${resultado.texto}`;
        indexacao = "texto";
        infoExtracao = {
          extrator: "local",
          paginas_total: resultado.paginasTotal,
          paginas_extraidas: resultado.paginasExtraidas,
          ...(resultado.truncado ? { truncado: true } : {}),
        };
      } else {
        // "sem_texto" (PDF digitalizado) ou "falha" (corrompido/ilegível):
        // segue com metadados, estado registado para a UI.
        infoExtracao = { extracao: resultado.estado };
      }
    } else {
      infoExtracao = { extracao: "falha" };
    }
  }

  if (!texto.trim()) {
    return { inseridos: 0, error: "Documento sem conteúdo indexável." };
  }

  const chunks = chunkTexto(texto);
  const itens = chunks.map((chunk, i) => ({
    origem_id: documentoId,
    conteudo: chunk,
    metadata: {
      titulo: doc.titulo,
      chunk_index: i,
      indexacao,
      ...infoExtracao,
    },
  }));

  return reindexarOrigem(supabase, tenantId, "documento", itens, {
    origemId: documentoId,
  });
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

  const itens = (ocorrencias ?? []).map((ocorrencia) => ({
    origem_id: ocorrencia.id,
    conteudo: `Ocorrência: ${ocorrencia.titulo}\nCategoria: ${ocorrencia.categoria}\nDescrição: ${ocorrencia.descricao ?? ""}`,
    metadata: { categoria: ocorrencia.categoria },
  }));

  return reindexarOrigem(supabase, ctx.tenant.id, "ocorrencia_resolvida", itens);
}

/**
 * Reindexar todo o conhecimento do tenant.
 *
 * C1 (Fase C): os documentos entram na reindexação — PDFs existentes passam a
 * ter o texto extraído e indexado pelo mesmo caminho de ingerirDocumento. A
 * reindexação é feita documento a documento, em série, para conter memória e
 * duração numa função serverless; cada documento é substituído de forma não
 * destrutiva (nova geração antes de apagar a anterior — A2).
 */
export async function reindexarTenant(): Promise<{
  regulamento: number;
  ocorrencias: number;
  documentos: number;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx)
    return { regulamento: 0, ocorrencias: 0, documentos: 0, error: "Sem permissões." };

  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("documentos")
    .select("id")
    .eq("tenant_id", ctx.tenant.id);

  let documentos = 0;
  let erroDocumentos: string | undefined;
  for (const doc of docs ?? []) {
    const resultado = await ingerirDocumentoEm(supabase, ctx.tenant.id, doc.id);
    documentos += resultado.inseridos;
    // Continua os restantes documentos; guarda o primeiro erro para reportar.
    if (resultado.error && !erroDocumentos) erroDocumentos = resultado.error;
  }

  const [regResult, ocorResult] = await Promise.all([
    ingerirRegulamento(),
    ingerirOcorrenciasResolvidas(),
  ]);

  revalidatePath("/ia/configuracao");

  // "Regulamento não encontrado" não é falha de reindexação (pode não existir).
  const erroReal =
    (regResult.error && regResult.error !== "Regulamento não encontrado."
      ? regResult.error
      : undefined) ?? ocorResult.error ?? erroDocumentos;

  return {
    regulamento: regResult.inseridos,
    ocorrencias: ocorResult.inseridos,
    documentos,
    ...(erroReal ? { error: erroReal } : {}),
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

  // S10: mensagens `assistant` só podem ser escritas pelo servidor. O RLS
  // (migração 0029) restringe os INSERT do cliente a role='user'; a resposta
  // do assistente é persistida via service role para não poder ser forjada.
  const adminMsg = createAdminClient();
  if (adminMsg) {
    await adminMsg.from("conversas_ia_mensagens").insert({
      conversa_id: conversaId,
      tenant_id: ctx.tenant.id,
      role: "assistant",
      conteudo: resposta,
      contexto: fontes as unknown as Record<string, unknown>[],
    });
  } else {
    console.error("[ia-rag] service role indisponível: resposta não persistida.");
  }

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
  // C2: a sugestão baseia-se em ocorrências resolvidas (descrições de queixas
  // de terceiros). Só admins podem invocá-la. Ao nível da BD, buscar_chunks já
  // devolve 0 chunks de ocorrencia_resolvida a não-admins (migração 0028), mas
  // a action recusa explicitamente para não expor sequer o caminho.
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Apenas administradores podem obter sugestões." };

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
