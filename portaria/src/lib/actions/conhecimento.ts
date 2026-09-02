"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentUserInTenant } from "@/lib/supabase/tenant";
import {
  gerarEmbedding,
  chatTexto,
  chatConfigurado,
  embeddingsConfiguradas,
} from "@/lib/ai/openai";
import { extrairTextoPdfLocal } from "@/lib/ai/pdf-texto";
import { LEGISLACAO } from "@/lib/ai/legislacao";

export type Fonte = { titulo: string; fonte: string | null };
export type RespostaConselheira = {
  resposta?: string;
  fontes?: Fonte[];
  indisponivel?: boolean;
  error?: string;
};

const SYSTEM = `És a Conselheira da Portaria, uma assistente experiente em gestão de condomínios em Portugal.
Respondes à administração com rigor, num tom sóbrio e prático — como uma conselheira, nunca robótico.
Usa APENAS a informação do CONTEXTO fornecido. Cita sempre a fonte entre parênteses (ex.: "Código Civil, Art. 1432.º").
Se a resposta não constar do contexto, diz com franqueza que não encontraste base na legislação nem no regulamento disponíveis e sugere confirmar com apoio jurídico. Nunca inventes artigos, números ou prazos.
Sê concisa: uma resposta directa, seguida da base legal.`;

/** Pergunta à Conselheira (RAG: embedding → match → resposta com fonte). */
export async function perguntarConselheira(
  pergunta: string,
  contexto?: string
): Promise<RespostaConselheira> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!chatConfigurado() || !embeddingsConfiguradas()) {
    return { indisponivel: true };
  }

  const p = pergunta.trim();
  if (!p) return { error: "Escreva uma pergunta." };

  const embedding = await gerarEmbedding(contexto ? `${contexto}\n${p}` : p);
  if (!embedding) {
    return { error: "Não foi possível analisar a pergunta. Tente de novo." };
  }

  const supabase = await createClient();
  const { data: matches, error } = await supabase.rpc("match_conhecimento", {
    query_embedding: JSON.stringify(embedding),
    p_tenant_id: ctx.tenant.id,
    match_count: 4,
  });

  if (error) {
    console.error("match_conhecimento erro:", error);
    return { error: "Não foi possível consultar a base de conhecimento." };
  }

  const relevantes = (matches ?? []).filter(
    (m: { similaridade: number }) => m.similaridade > 0.15
  );

  if (relevantes.length === 0) {
    return {
      resposta:
        "Não encontrei base sobre isto na legislação nem no regulamento disponíveis. Para uma resposta segura, convém confirmar com apoio jurídico.",
      fontes: [],
    };
  }

  const contextoTexto = relevantes
    .map(
      (m: { fonte: string | null; titulo: string; conteudo_texto: string }) =>
        `[${m.fonte || m.titulo}] ${m.conteudo_texto}`
    )
    .join("\n\n");

  const resposta = await chatTexto(
    SYSTEM,
    `Pergunta: ${p}\n\nCONTEXTO:\n${contextoTexto}`
  );

  if (!resposta) {
    return { error: "A Conselheira não conseguiu responder agora. Tente de novo." };
  }

  const fontes: Fonte[] = relevantes.map(
    (m: { titulo: string; fonte: string | null }) => ({
      titulo: m.titulo,
      fonte: m.fonte,
    })
  );

  return { resposta, fontes };
}

export type SemearState = { ok?: boolean; n?: number; error?: string };

/** Semeia a legislação canónica (uma vez). Usa service-role: as fontes
 *  canónicas têm tenant_id null e ficam fora do RLS de tenant. */
export async function semearLegislacao(
  _prev: SemearState,
  _formData: FormData
): Promise<SemearState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!embeddingsConfiguradas()) {
    return {
      error:
        "IA indisponível: define MLX_EMBEDDINGS_URL (servidor local) ou OPENAI_API_KEY.",
    };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Service-role não configurado." };

  const { count } = await admin
    .from("conhecimento_base")
    .select("id", { count: "exact", head: true })
    .is("tenant_id", null)
    .eq("tipo", "legislacao");
  if ((count ?? 0) > 0) return { ok: true, n: 0 };

  let n = 0;
  for (const item of LEGISLACAO) {
    const emb = await gerarEmbedding(`${item.titulo}. ${item.conteudo_texto}`);
    if (!emb) continue;
    const { error } = await admin.from("conhecimento_base").insert({
      tenant_id: null,
      tipo: "legislacao",
      titulo: item.titulo,
      conteudo_texto: item.conteudo_texto,
      fonte: item.fonte,
      embedding: JSON.stringify(emb),
    });
    if (!error) n++;
  }

  revalidatePath("/configuracao/conselheira");
  return { ok: true, n };
}

export type RegulamentoState = { ok?: boolean; n?: number; error?: string };

/** Divide o texto em blocos com sentido para embeddings. */
function dividirEmBlocos(texto: string, max = 1200): string[] {
  const paragrafos = texto.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const blocos: string[] = [];
  let atual = "";
  for (const par of paragrafos) {
    if ((atual + "\n\n" + par).length > max) {
      if (atual) blocos.push(atual);
      atual = par.length > max ? par.slice(0, max) : par;
    } else {
      atual = atual ? `${atual}\n\n${par}` : par;
    }
  }
  if (atual) blocos.push(atual);
  return blocos.slice(0, 60); // teto de segurança
}

/** Carrega (ou substitui) o Regulamento do Condomínio: extrai o texto do
 *  PDF, divide em blocos, gera embeddings e guarda como conhecimento local. */
export async function carregarRegulamento(
  _prev: RegulamentoState,
  formData: FormData
): Promise<RegulamentoState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!embeddingsConfiguradas()) {
    return {
      error:
        "IA indisponível: define MLX_EMBEDDINGS_URL (servidor local) ou OPENAI_API_KEY.",
    };
  }

  const file = formData.get("ficheiro");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione o PDF do regulamento." };
  }
  if (file.type !== "application/pdf") return { error: "O regulamento tem de ser PDF." };
  if (file.size > 15 * 1024 * 1024) return { error: "PDF demasiado grande (máx. 15 MB)." };

  // L-44: o texto é extraído LOCALMENTE (unpdf — sem LLM, ver
  // src/lib/ai/pdf-texto.ts). PDFs digitalizados (sem camada de texto) ficam
  // com um estado explícito e nada é alterado — nunca lançar.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracao = await extrairTextoPdfLocal(bytes);
  if (extracao.estado === "falha") {
    return { error: "Não foi possível ler o PDF do regulamento." };
  }
  if (extracao.estado === "sem_texto") {
    return {
      error:
        "O PDF não tem texto extraível (digitalizado?). É necessária uma versão com camada de texto.",
    };
  }
  const texto = extracao.texto;

  const blocos = dividirEmBlocos(texto);
  const supabase = await createClient();

  // Guarda o PDF original (para download em /regulamento) e o texto
  // integral no perfil.
  const path = `${ctx.tenant.id}/regulamento/regulamento.pdf`;
  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(path, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: true,
    });
  await supabase
    .from("tenant_perfil")
    .update({
      regulamento_texto: texto,
      regulamento_pdf_path: upErr ? null : path,
      atualizado_em: new Date().toISOString(),
    })
    .eq("tenant_id", ctx.tenant.id);

  // Substitui o regulamento anterior (RLS: admin do tenant).
  await supabase
    .from("conhecimento_base")
    .delete()
    .eq("tenant_id", ctx.tenant.id)
    .eq("tipo", "regulamento");

  let n = 0;
  for (let i = 0; i < blocos.length; i++) {
    const emb = await gerarEmbedding(blocos[i]);
    if (!emb) continue;
    const { error } = await supabase.from("conhecimento_base").insert({
      tenant_id: ctx.tenant.id,
      tipo: "regulamento",
      titulo: `Regulamento do condomínio (${i + 1}/${blocos.length})`,
      conteudo_texto: blocos[i],
      fonte: "Regulamento do condomínio",
      embedding: JSON.stringify(emb),
    });
    if (!error) n++;
  }

  if (n === 0) return { error: "Não foi possível guardar o regulamento." };

  revalidatePath("/configuracao/conselheira");
  return { ok: true, n };
}

/** URL assinado para descarregar o PDF do regulamento (qualquer membro). */
export async function descarregarRegulamento(): Promise<{
  url?: string;
  error?: string;
}> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };
  const admin = createAdminClient();
  if (!admin) return { error: "Download indisponível." };

  const { data: perfil } = await admin
    .from("tenant_perfil")
    .select("regulamento_pdf_path")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  const path = perfil?.regulamento_pdf_path;
  if (!path) return { error: "Regulamento não disponível." };

  const { data, error } = await admin.storage
    .from("documentos")
    .createSignedUrl(path, 60, { download: "Regulamento.pdf" });
  if (error || !data) return { error: "Erro ao gerar o link." };
  return { url: data.signedUrl };
}
