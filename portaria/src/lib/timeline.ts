import { createClient } from "@/lib/supabase/server";

export type EventoTimeline = {
  data: string;
  tipo: "aviso" | "ocorrencia" | "assembleia" | "documento" | "contrato";
  titulo: string;
  detalhe?: string;
  href: string;
};

const TIPO_LABEL: Record<EventoTimeline["tipo"], string> = {
  aviso: "Aviso",
  ocorrencia: "Ocorrência",
  assembleia: "Assembleia",
  documento: "Documento",
  contrato: "Contrato",
};

export function tipoLabel(t: EventoTimeline["tipo"]): string {
  return TIPO_LABEL[t];
}

/**
 * Memória operacional: agrega os eventos dos vários módulos numa única
 * linha temporal, do mais recente para o mais antigo. Read-only.
 * Admin-facing (agrega dados internos do tenant).
 */
export async function reunirTimeline(
  tenantId: string,
  limite = 100
): Promise<EventoTimeline[]> {
  const supabase = await createClient();

  const [avisos, ocorrencias, assembleias, documentos, contratos] =
    await Promise.all([
      supabase.from("avisos").select("id, titulo, publicado_em")
        .eq("tenant_id", tenantId).order("publicado_em", { ascending: false }).limit(limite),
      supabase.from("ocorrencias").select("id, titulo, criado_em")
        .eq("tenant_id", tenantId).order("criado_em", { ascending: false }).limit(limite),
      supabase.from("assembleias").select("id, titulo, criado_em, data_hora")
        .eq("tenant_id", tenantId).order("criado_em", { ascending: false }).limit(limite),
      supabase.from("documentos").select("id, titulo, upload_em")
        .eq("tenant_id", tenantId).order("upload_em", { ascending: false }).limit(limite),
      supabase.from("contratos").select("id, titulo, criado_em")
        .eq("tenant_id", tenantId).order("criado_em", { ascending: false }).limit(limite),
    ]);

  const eventos: EventoTimeline[] = [];

  for (const a of avisos.data ?? []) {
    eventos.push({ data: a.publicado_em, tipo: "aviso", titulo: a.titulo, href: "/configuracao/avisos" });
  }
  for (const o of ocorrencias.data ?? []) {
    eventos.push({ data: o.criado_em, tipo: "ocorrencia", titulo: o.titulo, href: `/configuracao/ocorrencias/${o.id}` });
  }
  for (const s of assembleias.data ?? []) {
    eventos.push({ data: s.criado_em, tipo: "assembleia", titulo: s.titulo, href: `/configuracao/assembleias/${s.id}` });
  }
  for (const d of documentos.data ?? []) {
    eventos.push({ data: d.upload_em, tipo: "documento", titulo: d.titulo, href: "/configuracao/documentos" });
  }
  for (const c of contratos.data ?? []) {
    eventos.push({ data: c.criado_em, tipo: "contrato", titulo: c.titulo, href: "/configuracao/contratos" });
  }

  eventos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return eventos.slice(0, limite);
}
