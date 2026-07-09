import { createClient } from "@/lib/supabase/server";

export type ResultadoGrupo = {
  tipo: string;
  itens: { titulo: string; detalhe?: string; href: string }[];
};

/** Escapa % e _ para uso seguro em ilike. */
function likeSafe(termo: string): string {
  return termo.replace(/[%_\\]/g, "\\$&");
}

/**
 * Pesquisa global (admin) sobre documentos, ocorrências, assembleias,
 * contactos e avisos. ilike simples — suficiente à escala Foundation.
 */
export async function pesquisar(
  tenantId: string,
  termo: string
): Promise<ResultadoGrupo[]> {
  const q = `%${likeSafe(termo.trim())}%`;
  if (termo.trim().length < 2) return [];

  const supabase = await createClient();
  const [docs, ocs, asms, cts, avs] = await Promise.all([
    supabase.from("documentos").select("id, titulo").eq("tenant_id", tenantId)
      .or(`titulo.ilike.${q},descricao.ilike.${q}`).limit(10),
    supabase.from("ocorrencias").select("id, titulo").eq("tenant_id", tenantId)
      .or(`titulo.ilike.${q},descricao.ilike.${q}`).limit(10),
    supabase.from("assembleias").select("id, titulo").eq("tenant_id", tenantId)
      .ilike("titulo", q).limit(10),
    supabase.from("contactos").select("id, nome, empresa").eq("tenant_id", tenantId)
      .or(`nome.ilike.${q},empresa.ilike.${q},papel.ilike.${q}`).limit(10),
    supabase.from("avisos").select("id, titulo").eq("tenant_id", tenantId)
      .ilike("titulo", q).limit(10),
  ]);

  const grupos: ResultadoGrupo[] = [];

  if (docs.data?.length) {
    grupos.push({ tipo: "Documentos", itens: docs.data.map((d) => ({ titulo: d.titulo, href: "/configuracao/documentos" })) });
  }
  if (ocs.data?.length) {
    grupos.push({ tipo: "Ocorrências", itens: ocs.data.map((o) => ({ titulo: o.titulo, href: `/configuracao/ocorrencias/${o.id}` })) });
  }
  if (asms.data?.length) {
    grupos.push({ tipo: "Assembleias", itens: asms.data.map((a) => ({ titulo: a.titulo, href: `/configuracao/assembleias/${a.id}` })) });
  }
  if (cts.data?.length) {
    grupos.push({ tipo: "Contactos", itens: cts.data.map((c) => ({ titulo: c.nome, detalhe: c.empresa ?? undefined, href: `/configuracao/contactos/${c.id}/editar` })) });
  }
  if (avs.data?.length) {
    grupos.push({ tipo: "Avisos", itens: avs.data.map((a) => ({ titulo: a.titulo, href: "/configuracao/avisos" })) });
  }

  return grupos;
}
