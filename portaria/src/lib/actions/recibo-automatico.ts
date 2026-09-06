"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { emitirReciboCore } from "@/lib/financeiro/emitir-recibo";
import {
  resolverDestinatarios,
  decidirEmissao,
  formatarEuros,
} from "@/lib/financeiro/recibo-automatico";
import {
  montarReciboHtml,
  gerarReciboPdf,
  carregarLogoDataUri,
} from "@/lib/pdf/recibo-pdf";
import { enviarEmail, molde } from "@/lib/email";
import type { DadosPerfil } from "@/lib/blueprints";

/**
 * Recibo automático — quando um pagamento é recebido e confirmado
 * (reconciliação do extrato ou registo manual), o sistema emite o recibo,
 * gera o PDF, envia-o por email aos contactos da fração com um link de
 * download assinado (7 dias) e marca o recibo como enviado.
 *
 * Doutrina de robustez: NADA aqui rebenta o fluxo de reconciliação do
 * pagamento — todas as falhas ficam registadas no log e o recibo fica
 * visível na ficha com os botões manuais (Gerar PDF / Enviar por email).
 */

const BUCKET = "documentos";
const VALIDADE_LINK_EMAIL = 60 * 60 * 24 * 7; // 7 dias
const VALIDADE_LINK_UI = 60; // mesmo padrão de gerarLinkDownload (documentos.ts)

type ReciboRow = {
  id: string;
  numero: string;
  valor_cents: number;
  fracao_id: string;
  pagamento_id: string | null;
  pdf_path: string | null;
  estado: string;
};

type Ctx = NonNullable<Awaited<ReturnType<typeof requireAdmin>>>;

/** Gera (se falta) e guarda o PDF do recibo; devolve o path ou null. */
async function garantirPdfRecibo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: Ctx,
  recibo: ReciboRow
): Promise<string | null> {
  if (recibo.pdf_path) return recibo.pdf_path;

  const [{ data: fracao }, { data: perfil }, { data: pagamento }] =
    await Promise.all([
      supabase
        .from("fracoes")
        .select("codigo, proprietario_nome")
        .eq("id", recibo.fracao_id)
        .single(),
      supabase
        .from("tenant_perfil")
        .select("nif, iban, administrador_nome, administrador_empresa")
        .eq("tenant_id", ctx.tenant.id)
        .maybeSingle(),
      recibo.pagamento_id
        ? supabase
            .from("pagamentos")
            .select("metodo, referencia, data_pagamento, quota_ids")
            .eq("id", recibo.pagamento_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);
  if (!fracao) return null;

  // Linhas do recibo: quotas alocadas ao pagamento (período + valor alocado).
  let quotas: { ano: number; mes: number; valorCents: number }[] = [];
  const quotaIds = (pagamento as { quota_ids?: string[] | null } | null)?.quota_ids;
  if (quotaIds && quotaIds.length > 0) {
    const { data: linhas } = await supabase
      .from("pagamento_quotas")
      .select("valor_cents, quotas_mensais!inner(ano, mes)")
      .eq("pagamento_id", recibo.pagamento_id as string);
    if (linhas) {
      quotas = (linhas as unknown as {
        valor_cents: number;
        quotas_mensais: { ano: number; mes: number };
      }[])
        .map((l) => ({
          ano: l.quotas_mensais.ano,
          mes: l.quotas_mensais.mes,
          valorCents: l.valor_cents,
        }))
        .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    }
  }

  const logoDataUri = await carregarLogoDataUri(ctx.tenant.logo_url);
  const hoje = new Date().toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = montarReciboHtml({
    tenant: ctx.tenant,
    perfil: (perfil as DadosPerfil) ?? null,
    logoDataUri,
    hoje,
    recibo: {
      numero: recibo.numero,
      valorCents: recibo.valor_cents,
      emitidoEm: null,
    },
    fracao: { codigo: fracao.codigo, proprietario: fracao.proprietario_nome },
    pagamento: {
      metodo: (pagamento as { metodo?: string | null } | null)?.metodo ?? null,
      referencia:
        (pagamento as { referencia?: string | null } | null)?.referencia ?? null,
      dataPagamento:
        (pagamento as { data_pagamento?: string | null } | null)?.data_pagamento ??
        null,
    },
    quotas,
  });

  let pdf: Buffer;
  try {
    pdf = await gerarReciboPdf(html);
  } catch (err) {
    console.error("[recibo-automatico] Erro a gerar PDF:", err);
    return null;
  }

  const path = `${ctx.tenant.id}/recibos/${recibo.id}/recibo-${recibo.numero}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("[recibo-automatico] Erro no upload do PDF:", uploadError);
    return null;
  }

  const { error: updateError } = await supabase
    .from("recibos")
    .update({ pdf_path: path })
    .eq("id", recibo.id)
    .eq("tenant_id", ctx.tenant.id);
  if (updateError) {
    console.error("[recibo-automatico] Erro a guardar pdf_path:", updateError);
    return null;
  }
  return path;
}

/**
 * Gera o PDF (se falta) e envia o recibo por email aos contactos vigentes
 * da fração. Em sucesso de email marca enviado_em + canal_envio='email'.
 */
async function enviarReciboCore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: Ctx,
  recibo: ReciboRow
): Promise<{ pdfOk: boolean; emailOk: boolean; motivo: string | null }> {
  const [{ data: fracao }, { data: contactos }] = await Promise.all([
    supabase
      .from("fracoes")
      .select("codigo")
      .eq("id", recibo.fracao_id)
      .single(),
    supabase
      .from("fracao_pessoas")
      .select("papel, pessoas(email)")
      .eq("fracao_id", recibo.fracao_id)
      .eq("tenant_id", ctx.tenant.id)
      .is("ate", null),
  ]);

  const destinatarios = resolverDestinatarios(
    ((contactos ?? []) as unknown as {
      papel: string | null;
      pessoas: { email: string | null } | null;
    }[]).map((c) => ({
      papel: c.papel,
      email: c.pessoas?.email ?? null,
    }))
  );
  if (destinatarios.length === 0) {
    return {
      pdfOk: false,
      emailOk: false,
      motivo: "A fração não tem email de contacto.",
    };
  }

  const path = await garantirPdfRecibo(supabase, ctx, recibo);
  if (!path) {
    return { pdfOk: false, emailOk: false, motivo: "Falha a gerar o PDF do recibo." };
  }

  const { data: link } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, VALIDADE_LINK_EMAIL, {
      download: `recibo-${recibo.numero}.pdf`,
    });
  if (!link) {
    return { pdfOk: true, emailOk: false, motivo: "Falha a gerar o link de download." };
  }

  const codigo = fracao?.codigo ?? "";
  const ok = await enviarEmail({
    to: destinatarios,
    subject: `Recibo ${recibo.numero} — ${ctx.tenant.nome}`,
    html: molde({
      titulo: `Recibo ${recibo.numero}`,
      corpo: `<p>Confirmámos a receção do pagamento de <strong>${formatarEuros(
        recibo.valor_cents
      )}</strong> referente às quotas de condomínio da fração <strong>${codigo}</strong>.</p><p>O recibo pode ser descarregado no botão abaixo (ligação válida durante 7 dias) e fica também disponível no portal.</p>`,
      acaoTexto: "Descarregar recibo (PDF)",
      acaoUrl: link.signedUrl,
    }),
  });

  if (ok) {
    await supabase
      .from("recibos")
      .update({ enviado_em: new Date().toISOString(), canal_envio: "email" })
      .eq("id", recibo.id)
      .eq("tenant_id", ctx.tenant.id);
  }

  return {
    pdfOk: true,
    emailOk: ok,
    motivo: ok
      ? null
      : "Envio de email falhou (Resend não configurado ou indisponível).",
  };
}

async function obterRecibo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  reciboId: string
): Promise<ReciboRow | null> {
  const { data } = await supabase
    .from("recibos")
    .select("id, numero, valor_cents, fracao_id, pagamento_id, pdf_path, estado")
    .eq("id", reciboId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as ReciboRow | null) ?? null;
}

/**
 * Ponto de entrada da automação, chamado no fim de
 * registarPagamentoDeMovimento e registarPagamento. NUNCA lança e NUNCA
 * devolve erro — é um efeito pós-confirmação, não parte da transação.
 */
export async function processarReciboAutomatico(pagamentoId: string): Promise<void> {
  try {
    const ctx = await requireAdmin();
    if (!ctx) return;

    const supabase = await createClient();

    // Toggle do condomínio; sem linha de configuração, a automação está ON
    // (é o comportamento pedido e o default da coluna).
    const { data: config } = await supabase
      .from("configuracao_financeira")
      .select("recibo_auto_email")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    const automatico = config ? config.recibo_auto_email !== false : true;
    if (!automatico) return;

    const { data: existente } = await supabase
      .from("recibos")
      .select("id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("pagamento_id", pagamentoId)
      .limit(1)
      .maybeSingle();
    if (!decidirEmissao({ jaTemRecibo: Boolean(existente), automatico })) return;

    const emitido = await emitirReciboCore(supabase, ctx.tenant.id, pagamentoId);
    if (!emitido.ok) {
      console.error("[recibo-automatico] Emissão falhou:", emitido.error);
      return;
    }

    const recibo = await obterRecibo(supabase, ctx.tenant.id, emitido.reciboId);
    if (!recibo) return;

    const resultado = await enviarReciboCore(supabase, ctx, recibo);
    if (!resultado.emailOk) {
      console.warn(
        `[recibo-automatico] Recibo ${recibo.numero} ficou por enviar: ${resultado.motivo}`
      );
    }

    revalidatePath("/configuracao/financeiro");
  } catch (err) {
    console.error("[recibo-automatico] Falha inesperada (pagamento ficará sem recibo automático):", err);
  }
}

/** Envio manual/re-tentativa a partir da UI (recibos antigos ou falhados). */
export async function enviarReciboPorEmail(
  reciboId: string
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();
  const recibo = await obterRecibo(supabase, ctx.tenant.id, reciboId);
  if (!recibo) return { error: "Recibo não encontrado." };
  if (recibo.estado === "anulado") return { error: "Recibo anulado." };

  const resultado = await enviarReciboCore(supabase, ctx, recibo);
  revalidatePath("/configuracao/financeiro");
  if (!resultado.emailOk) return { error: resultado.motivo ?? "Envio falhou." };
  return { ok: true };
}

/** Signed URL de curta duração para o admin abrir/descarregar o PDF. */
export async function verReciboPdf(
  reciboId: string
): Promise<{ url?: string; error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();
  const recibo = await obterRecibo(supabase, ctx.tenant.id, reciboId);
  if (!recibo) return { error: "Recibo não encontrado." };

  const path = await garantirPdfRecibo(supabase, ctx, recibo);
  if (!path) return { error: "Falha a gerar o PDF do recibo." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, VALIDADE_LINK_UI, {
      download: `recibo-${recibo.numero}.pdf`,
    });
  if (error || !data) return { error: "Erro ao gerar o link." };
  return { url: data.signedUrl };
}
