import { createClient } from "@/lib/supabase/server";

/**
 * Ação importante do Centro de Trabalho.
 * Fonte determinística — derivada dos dados, sem IA. Cada slice futuro
 * pode acrescentar fontes a `reunirAcoes` sem alterar a página.
 */
export type AcaoImportante = {
  chave: string;
  texto: string;
  href: string;
};

/**
 * Reúne as ações pendentes do tenant para o administrador.
 * Pluggable: acrescentar novas fontes aqui à medida que existirem
 * (assembleias por publicar, contratos a renovar, prazos, etc.).
 */
export async function reunirAcoes(tenantId: string): Promise<AcaoImportante[]> {
  const supabase = await createClient();
  const acoes: AcaoImportante[] = [];

  const daqui30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);

  const [
    { count: ocorrenciasAbertas },
    { count: convitesPendentes },
    { count: assembleiasRascunho },
    { count: contratosARenovar },
  ] = await Promise.all([
    supabase
      .from("ocorrencias")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("estado", ["novo", "em_curso", "aguarda_fornecedor"]),
    supabase
      .from("convites")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("aceite_em", null)
      .gt("expira_em", new Date().toISOString()),
    supabase
      .from("assembleias")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("estado", "rascunho"),
    supabase
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("data_fim", "is", null)
      .gte("data_fim", hoje)
      .lte("data_fim", daqui30),
  ]);

  if (ocorrenciasAbertas && ocorrenciasAbertas > 0) {
    acoes.push({
      chave: "ocorrencias",
      texto:
        ocorrenciasAbertas === 1
          ? "1 ocorrência por resolver"
          : `${ocorrenciasAbertas} ocorrências por resolver`,
      href: "/configuracao/ocorrencias",
    });
  }

  if (convitesPendentes && convitesPendentes > 0) {
    acoes.push({
      chave: "convites",
      texto:
        convitesPendentes === 1
          ? "1 convite por aceitar"
          : `${convitesPendentes} convites por aceitar`,
      href: "/configuracao/membros",
    });
  }

  if (assembleiasRascunho && assembleiasRascunho > 0) {
    acoes.push({
      chave: "assembleias",
      texto:
        assembleiasRascunho === 1
          ? "1 assembleia por publicar"
          : `${assembleiasRascunho} assembleias por publicar`,
      href: "/configuracao/assembleias",
    });
  }

  if (contratosARenovar && contratosARenovar > 0) {
    acoes.push({
      chave: "contratos",
      texto:
        contratosARenovar === 1
          ? "1 contrato a renovar nos próximos 30 dias"
          : `${contratosARenovar} contratos a renovar nos próximos 30 dias`,
      href: "/contratos",
    });
  }

  return acoes;
}

/** Saudação conforme a hora do dia. */
export function saudacao(): string {
  const h = new Date().getHours();
  if (h < 13) return "Bom dia.";
  if (h < 20) return "Boa tarde.";
  return "Boa noite.";
}
