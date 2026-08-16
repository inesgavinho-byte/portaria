import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type CaixaConfigurada = {
  tenantId: string;
  caixaId: string;
  mailboxResourceId: string;
  endereco: string;
  webhookSecret: string;
};

type HostingerAddress = { name?: string; address?: string };
type HostingerAttachment = {
  id: string;
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  inline?: boolean;
};
type HostingerMessage = {
  uid: number;
  date?: string;
  flags?: string[];
  size?: number;
  subject?: string;
  from?: HostingerAddress;
  to?: HostingerAddress[];
  cc?: HostingerAddress[];
  messageId?: string;
  inReplyTo?: string;
  attachments?: HostingerAttachment[];
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function readCaixasConfiguradas(): CaixaConfigurada[] {
  const raw = Deno.env.get("HOSTINGER_MAILBOXES_JSON");
  if (!raw) throw new Error("HOSTINGER_MAILBOXES_JSON não configurado");

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("HOSTINGER_MAILBOXES_JSON tem formato inválido");
  }

  return parsed.filter((item): item is CaixaConfigurada => {
    if (!item || typeof item !== "object") return false;
    const value = item as Record<string, unknown>;
    return ["tenantId", "caixaId", "mailboxResourceId", "endereco", "webhookSecret"]
      .every((key) => typeof value[key] === "string" && value[key].length > 0);
  });
}

function comparaSegredo(recebido: string, esperado: string): boolean {
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(esperado);
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

async function listarMensagensRecentes(
  mailboxResourceId: string,
  apiToken: string,
): Promise<HostingerMessage[]> {
  const endpoint = new URL(
    `https://api.mail.hostinger.com/api/v1/mailboxes/${encodeURIComponent(mailboxResourceId)}/folders/${encodeURIComponent("INBOX")}/messages`,
  );
  endpoint.searchParams.set("page", "1");
  endpoint.searchParams.set("per_page", "100");
  endpoint.searchParams.set("sort", "-uid");

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Hostinger Mail devolveu ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = await response.json() as { data?: HostingerMessage[] };
  return Array.isArray(payload.data) ? payload.data : [];
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const authorization = request.headers.get("authorization") ?? "";
    const receivedSecret = authorization.replace(/^Bearer\s+/i, "").trim();
    const caixas = readCaixasConfiguradas();
    const caixa = caixas.find((candidate) =>
      comparaSegredo(receivedSecret, candidate.webhookSecret),
    );

    if (!caixa) {
      return json({ error: "Webhook não autorizado" }, 401);
    }

    // O corpo é deliberadamente tratado como uma notificação não confiável.
    // A fonte de verdade é a API Hostinger consultada com token restrito às caixas.
    await request.text().catch(() => "");

    const apiToken = Deno.env.get("HOSTINGER_MAIL_API_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiToken || !supabaseUrl || !serviceRole) {
      throw new Error("Segredos de integração não configurados");
    }

    const mensagens = await listarMensagensRecentes(caixa.mailboxResourceId, apiToken);
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = mensagens
      .filter((mensagem) => Number.isInteger(mensagem.uid))
      .map((mensagem) => ({
        tenant_id: caixa.tenantId,
        caixa_id: caixa.caixaId,
        pasta: "INBOX",
        fornecedor_uid: mensagem.uid,
        message_id_externo: mensagem.messageId ?? null,
        em_resposta_a: mensagem.inReplyTo ?? null,
        assunto: mensagem.subject ?? "",
        remetente: mensagem.from ?? {},
        destinatarios: mensagem.to ?? [],
        cc: mensagem.cc ?? [],
        recebido_em: mensagem.date ?? null,
        flags: mensagem.flags ?? [],
        tamanho_bytes: mensagem.size ?? null,
      }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("email_mensagens")
        .upsert(rows, { onConflict: "caixa_id,pasta,fornecedor_uid" });
      if (error) throw new Error(`Falha ao guardar mensagens: ${error.message}`);

      const uids = rows.map((row) => row.fornecedor_uid);
      const { data: mensagensGuardadas, error: mensagensErro } = await supabase
        .from("email_mensagens")
        .select("id, fornecedor_uid")
        .eq("caixa_id", caixa.caixaId)
        .eq("pasta", "INBOX")
        .in("fornecedor_uid", uids);
      if (mensagensErro) throw new Error(`Falha ao ler mensagens guardadas: ${mensagensErro.message}`);

      const idPorUid = new Map(
        (mensagensGuardadas ?? []).map((mensagem) => [mensagem.fornecedor_uid, mensagem.id]),
      );
      const anexos = mensagens.flatMap((mensagem) =>
        (mensagem.attachments ?? []).map((anexo) => ({
          tenant_id: caixa.tenantId,
          mensagem_id: idPorUid.get(mensagem.uid),
          fornecedor_anexo_id: anexo.id,
          nome: anexo.filename ?? "anexo",
          content_type: anexo.contentType ?? null,
          tamanho_bytes: anexo.sizeBytes ?? null,
          inline: anexo.inline ?? false,
        })).filter((anexo) => Boolean(anexo.mensagem_id)),
      );

      if (anexos.length > 0) {
        const { error: anexosErro } = await supabase
          .from("email_anexos")
          .upsert(anexos, { onConflict: "mensagem_id,fornecedor_anexo_id" });
        if (anexosErro) throw new Error(`Falha ao guardar anexos: ${anexosErro.message}`);
      }
    }

    const { error: caixaErro } = await supabase
      .from("email_caixas")
      .update({ ultimo_evento_em: new Date().toISOString() })
      .eq("id", caixa.caixaId);
    if (caixaErro) throw new Error(`Falha ao atualizar caixa: ${caixaErro.message}`);

    return json({ ok: true, sincronizadas: rows.length });
  } catch (error) {
    console.error("[hostinger-inbox-webhook]", error);
    return json({ error: "Falha ao processar aviso de e-mail" }, 500);
  }
});
