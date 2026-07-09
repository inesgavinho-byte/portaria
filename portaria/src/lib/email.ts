/**
 * Envio de email transacional via Resend (https://resend.com).
 * Só deve ser importado em Server Actions / Route Handlers.
 *
 * Configuração (variáveis de ambiente):
 *   RESEND_API_KEY  — chave da API Resend (re_...)
 *   EMAIL_FROM      — remetente verificado, ex.: "Portaria <avisos@portaria.pt>"
 *
 * Se as variáveis não estiverem definidas, o envio degrada para um
 * no-op com aviso no log — a aplicação nunca quebra por causa de email.
 * Escolhemos Resend por ser uma API HTTP simples (uma só chave, sem SMTP),
 * alinhada com "simplicidade primeiro".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type Email = {
  to: string | string[];
  subject: string;
  html: string;
};

/**
 * Envia um email. Devolve true em sucesso, false caso contrário.
 * Nunca lança — quem chama pode ignorar o resultado com segurança.
 */
export async function enviarEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_KEY/EMAIL_FROM não configurados — email não enviado:",
      email.subject
    );
    return false;
  }

  const destinatarios = Array.isArray(email.to) ? email.to : [email.to];
  if (destinatarios.length === 0) return false;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: destinatarios,
        subject: email.subject,
        html: email.html,
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error("[email] Resend devolveu erro:", res.status, corpo);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Falha ao contactar o Resend:", err);
    return false;
  }
}

/**
 * Molde HTML sóbrio, alinhado com a linguagem visual da Portaria.
 * Mantemos estilos inline porque os clientes de email ignoram CSS externo.
 */
export function molde({
  titulo,
  corpo,
  acaoTexto,
  acaoUrl,
}: {
  titulo: string;
  corpo: string;
  acaoTexto?: string;
  acaoUrl?: string;
}): string {
  const botao =
    acaoTexto && acaoUrl
      ? `<p style="margin:28px 0 0"><a href="${acaoUrl}" style="display:inline-block;background:#2b2a27;color:#f7f4ee;text-decoration:none;padding:12px 28px;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${acaoTexto}</a></p>`
      : "";
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#f7f4ee;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#2b2a27">
  <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e6ddcf;padding:40px">
    <h1 style="font-size:22px;font-weight:normal;margin:0 0 20px;color:#2b2a27">${titulo}</h1>
    <div style="font-size:15px;line-height:1.65;color:#4a4741">${corpo}</div>
    ${botao}
    <p style="margin:36px 0 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a9384">Portaria</p>
  </div>
</body></html>`;
}
