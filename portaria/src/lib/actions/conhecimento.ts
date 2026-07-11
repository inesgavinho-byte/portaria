"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/tenant";
import {
  gerarEmbedding,
  chatTexto,
  extrairTextoPdf,
  openaiConfigurado,
} from "@/lib/ai/openai";
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
  if (!openaiConfigurado()) return { indisponivel: true };

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
  if (!openaiConfigurado()) return { error: "Falta configurar a OPENAI_API_KEY." };

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
  if (!openaiConfigurado()) return { error: "Falta configurar a OPENAI_API_KEY." };

  const file = formData.get("ficheiro");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione o PDF do regulamento." };
  }
  if (file.type !== "application/pdf") return { error: "O regulamento tem de ser PDF." };
  if (file.size > 15 * 1024 * 1024) return { error: "PDF demasiado grande (máx. 15 MB)." };

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const texto = await extrairTextoPdf(b64);
  if (!texto || texto.trim().length < 50) {
    return { error: "Não foi possível ler o texto do regulamento." };
  }

  const blocos = dividirEmBlocos(texto);
  const supabase = await createClient();

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

export type EstadoConhecimento = {
  openai: boolean;
  legislacao: number;
  regulamento: number;
};

/** Estado da base de conhecimento, para a página de configuração. */
export async function estadoConhecimento(): Promise<EstadoConhecimento> {
  const ctx = await requireAdmin();
  const openai = openaiConfigurado();
  if (!ctx) return { openai, legislacao: 0, regulamento: 0 };

  const supabase = await createClient();
  const [leg, reg] = await Promise.all([
    supabase.from("conhecimento_base").select("id", { count: "exact", head: true })
      .is("tenant_id", null).eq("tipo", "legislacao"),
    supabase.from("conhecimento_base").select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id).eq("tipo", "regulamento"),
  ]);

  return { openai, legislacao: leg.count ?? 0, regulamento: reg.count ?? 0 };
}
