import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: send-notification-email
 *
 * Chamada via Supabase Database Webhook quando uma notificação é inserida.
 * Envia email apenas se o utilizador tiver notificacoes_email = true.
 *
 * Variáveis de ambiente necessárias:
 *   RESEND_API_KEY — chave da API Resend
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — para ler user_tenants
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    tenant_id: string;
    user_id: string;
    tipo: string;
    titulo: string;
    corpo: string | null;
    entidade_tipo: string | null;
    entidade_id: string | null;
    metadata: Record<string, unknown>;
    criado_em: string;
  } | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload: WebhookPayload = await req.json();

  if (payload.table !== "notificacoes" || payload.type !== "INSERT" || !payload.record) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const n = payload.record;

  // Buscar preferência do utilizador via service_role
  const prefRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_tenants?select=notificacoes_email,users!inner(email)&user_id=eq.${n.user_id}&tenant_id=eq.${n.tenant_id}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
      },
    }
  );

  const prefs = (await prefRes.json()) as Array<{
    notificacoes_email: boolean;
    users: { email: string };
  }>;

  if (!prefs || prefs.length === 0 || !prefs[0].notificacoes_email) {
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: "user_disabled" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const userEmail = prefs[0].users?.email;
  if (!userEmail) {
    return new Response(
      JSON.stringify({ ok: true, sent: false, reason: "no_email" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Construir email
  const tipoLabel: Record<string, string> = {
    ocorrencia_criada: "Nova ocorrência",
    ocorrencia_resolvida: "Ocorrência resolvida",
    aviso_publicado: "Novo aviso",
    votacao_aberta: "Votação aberta",
    sistema: "Notificação",
  };

  const subject = `[Portaria] ${tipoLabel[n.tipo] ?? n.tipo}: ${n.titulo}`;
  const bodyHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;color:#1a1a1a;margin-bottom:8px;">${n.titulo}</h2>
      <p style="color:#666;font-size:14px;line-height:1.6;">${n.corpo ?? ""}</p>
      <hr style="border:0;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:12px;color:#999;">
        Recebeste esta notificação porque tens as notificações por email ativas.
        <a href="${SUPABASE_URL?.replace('.supabase.co', '')}" style="color:#666;">Ver na app</a>
      </p>
    </div>
  `;

  // Enviar via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Portaria <notificacoes@portaria.app>",
      to: userEmail,
      subject,
      html: bodyHtml,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return new Response(
      JSON.stringify({ ok: false, error: err }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sent: true, to: userEmail }),
    { headers: { "Content-Type": "application/json" } }
  );
});
