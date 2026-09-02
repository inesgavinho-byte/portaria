/**
 * Leituras da base de conhecimento usadas DURANTE O RENDER de Server
 * Components (páginas). São funções normais — NÃO server actions — porque
 * invocar uma "use server" action no render falha em runtime (o endpoint
 * de action é POST). As mutações continuam em @/lib/actions/conhecimento.
 *
 * Só deve ser importado por Server Components.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { embeddingsConfiguradas } from "@/lib/ai/openai";

export type EstadoConhecimento = {
  /** IA de embeddings disponível — MLX local (L-44) ou OpenAI legada. */
  iaConfigurada: boolean;
  legislacao: number;
  regulamento: number;
};

/** Estado da base de conhecimento, para a página de configuração. */
export async function estadoConhecimento(): Promise<EstadoConhecimento> {
  const ctx = await requireAdmin();
  const iaConfigurada = embeddingsConfiguradas();
  if (!ctx) return { iaConfigurada, legislacao: 0, regulamento: 0 };

  const supabase = await createClient();
  const [leg, reg] = await Promise.all([
    supabase.from("conhecimento_base").select("id", { count: "exact", head: true })
      .is("tenant_id", null).eq("tipo", "legislacao"),
    supabase.from("conhecimento_base").select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id).eq("tipo", "regulamento"),
  ]);

  return { iaConfigurada, legislacao: leg.count ?? 0, regulamento: reg.count ?? 0 };
}

/**
 * Texto integral do regulamento do tenant, para a página /regulamento.
 * Acessível a qualquer membro; lê via service-role porque o tenant_perfil
 * está fora do RLS de não-admins.
 */
export async function regulamentoDoTenant(): Promise<{
  texto: string | null;
  temPdf: boolean;
}> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { texto: null, temPdf: false };
  const admin = createAdminClient();
  if (!admin) return { texto: null, temPdf: false };

  const { data } = await admin
    .from("tenant_perfil")
    .select("regulamento_texto, regulamento_pdf_path")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return {
    texto: data?.regulamento_texto ?? null,
    temPdf: Boolean(data?.regulamento_pdf_path),
  };
}
