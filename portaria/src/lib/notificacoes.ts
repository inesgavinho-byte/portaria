import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, molde } from "@/lib/email";
import type { Tenant } from "@/types/database";

/**
 * Camada de notificações da Portaria.
 *
 * As funções abaixo resolvem os destinatários (respeitando a preferência
 * user_tenants.notificacoes_email) e enviam o email. São sempre
 * "fire-and-forget": nunca lançam, para que uma falha de email jamais
 * quebre a operação principal (criar ocorrência, mudar estado, etc.).
 *
 * A resolução de emails usa o cliente service-role porque os endereços
 * vivem em auth.users, fora do alcance do RLS.
 */

function baseUrl(): string {
  const raiz = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return raiz || "https://app.portaria.pt";
}

/**
 * Emails dos membros de um tenant com um dado role e com notificações
 * ligadas. Devolve [] em qualquer falha (inclui service-role em falta).
 */
async function emailsDeRole(
  tenantId: string,
  role: "admin" | "condomino" | "comissao"
): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[notificacoes] service-role em falta — sem destinatários.");
    return [];
  }

  const { data: memberships, error } = await admin
    .from("user_tenants")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("notificacoes_email", true);

  if (error || !memberships || memberships.length === 0) return [];

  const emails: string[] = [];
  for (const m of memberships) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

/**
 * Email de um utilizador específico, se pertencer ao tenant e tiver
 * notificações ligadas. Devolve null caso contrário.
 */
async function emailDeUtilizador(
  tenantId: string,
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: membership } = await admin
    .from("user_tenants")
    .select("notificacoes_email")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .single();

  if (!membership || membership.notificacoes_email === false) return null;

  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

const ESTADO_LABEL: Record<string, string> = {
  novo: "Novo",
  em_curso: "Em curso",
  aguarda_fornecedor: "Aguarda fornecedor",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

/** Nova ocorrência criada → avisa a administração. */
export async function notificarNovaOcorrencia(
  tenant: Pick<Tenant, "id" | "slug" | "nome">,
  ocorrencia: { id: string; titulo: string; categoria: string }
): Promise<void> {
  try {
    const destinatarios = await emailsDeRole(tenant.id, "admin");
    if (destinatarios.length === 0) return;

    const url = `${baseUrl()}/ocorrencias/${ocorrencia.id}`;
    await enviarEmail({
      to: destinatarios,
      subject: `Nova ocorrência: ${ocorrencia.titulo}`,
      html: molde({
        titulo: "Nova ocorrência",
        corpo: `<p>Foi registada uma nova ocorrência em <strong>${escapeHtml(tenant.nome)}</strong>.</p>
          <p style="margin-top:16px"><strong>${escapeHtml(ocorrencia.titulo)}</strong><br>
          <span style="color:#9a9384;font-size:13px">${escapeHtml(ocorrencia.categoria)}</span></p>`,
        acaoTexto: "Ver ocorrência",
        acaoUrl: url,
      }),
    });
  } catch (err) {
    console.error("[notificacoes] notificarNovaOcorrencia falhou:", err);
  }
}

/** Estado de ocorrência alterado → avisa quem a criou. */
export async function notificarEstadoOcorrencia(
  tenant: Pick<Tenant, "id" | "slug" | "nome">,
  ocorrencia: { id: string; titulo: string; criado_por: string },
  estadoNovo: string
): Promise<void> {
  try {
    const email = await emailDeUtilizador(tenant.id, ocorrencia.criado_por);
    if (!email) return;

    const label = ESTADO_LABEL[estadoNovo] ?? estadoNovo;
    const url = `${baseUrl()}/ocorrencias/${ocorrencia.id}`;
    await enviarEmail({
      to: email,
      subject: `A sua ocorrência está: ${label}`,
      html: molde({
        titulo: "Atualização da sua ocorrência",
        corpo: `<p>A ocorrência <strong>${escapeHtml(ocorrencia.titulo)}</strong> passou ao estado:</p>
          <p style="margin-top:12px;font-size:18px"><strong>${label}</strong></p>`,
        acaoTexto: "Ver detalhe",
        acaoUrl: url,
      }),
    });
  } catch (err) {
    console.error("[notificacoes] notificarEstadoOcorrencia falhou:", err);
  }
}

/** Contrato a renovar → avisa a administração (usado pelo cron). */
export async function notificarRenovacaoContrato(
  tenant: Pick<Tenant, "id" | "slug" | "nome">,
  contrato: { id: string; titulo: string; data_fim: string },
  diasRestantes: number
): Promise<boolean> {
  try {
    const destinatarios = await emailsDeRole(tenant.id, "admin");
    if (destinatarios.length === 0) return false;

    const dataFim = new Date(contrato.data_fim).toLocaleDateString("pt-PT");
    const url = `${baseUrl()}/contratos/${contrato.id}`;
    return await enviarEmail({
      to: destinatarios,
      subject: `Contrato a renovar em ${diasRestantes} dias: ${contrato.titulo}`,
      html: molde({
        titulo: "Contrato a renovar",
        corpo: `<p>O contrato <strong>${escapeHtml(contrato.titulo)}</strong> termina a
          <strong>${dataFim}</strong> (dentro de ${diasRestantes} dias).</p>
          <p style="margin-top:12px;color:#9a9384;font-size:13px">Reveja as condições e decida sobre a renovação.</p>`,
        acaoTexto: "Ver contrato",
        acaoUrl: url,
      }),
    });
  } catch (err) {
    console.error("[notificacoes] notificarRenovacaoContrato falhou:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
