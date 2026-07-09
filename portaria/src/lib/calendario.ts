import { createClient } from "@/lib/supabase/server";

export type EventoFuturo = {
  data: string; // YYYY-MM-DD
  tipo: "assembleia" | "contrato" | "seguro";
  titulo: string;
  href: string;
};

const TIPO_LABEL: Record<EventoFuturo["tipo"], string> = {
  assembleia: "Assembleia",
  contrato: "Contrato",
  seguro: "Seguro",
};

export function tipoLabel(t: EventoFuturo["tipo"]): string {
  return TIPO_LABEL[t];
}

/**
 * Obrigações futuras: agrega itens datados a partir de hoje —
 * assembleias agendadas, fim de contratos, validade do seguro.
 * (Tarefas como entidade ainda não existem; entram quando existirem.)
 */
export async function reunirCalendario(tenantId: string): Promise<EventoFuturo[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const agora = new Date().toISOString();
  const supabase = await createClient();

  const [assembleias, contratos, perfil] = await Promise.all([
    supabase.from("assembleias").select("id, titulo, data_hora")
      .eq("tenant_id", tenantId).not("data_hora", "is", null)
      .gte("data_hora", agora).order("data_hora", { ascending: true }),
    supabase.from("contratos").select("id, titulo, data_fim")
      .eq("tenant_id", tenantId).not("data_fim", "is", null)
      .gte("data_fim", hoje).order("data_fim", { ascending: true }),
    supabase.from("tenant_perfil").select("seguradora_nome, seguradora_validade")
      .eq("tenant_id", tenantId).single(),
  ]);

  const eventos: EventoFuturo[] = [];

  for (const a of assembleias.data ?? []) {
    if (a.data_hora) {
      eventos.push({ data: a.data_hora.slice(0, 10), tipo: "assembleia", titulo: a.titulo, href: `/configuracao/assembleias/${a.id}` });
    }
  }
  for (const c of contratos.data ?? []) {
    if (c.data_fim) {
      eventos.push({ data: c.data_fim, tipo: "contrato", titulo: `Fim/renovação: ${c.titulo}`, href: "/contratos" });
    }
  }
  const val = perfil.data?.seguradora_validade;
  if (val && val >= hoje) {
    eventos.push({
      data: val, tipo: "seguro",
      titulo: `Validade do seguro${perfil.data?.seguradora_nome ? ` (${perfil.data.seguradora_nome})` : ""}`,
      href: "/configuracao/perfil",
    });
  }

  eventos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  return eventos;
}
