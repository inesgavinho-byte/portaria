/**
 * Cliente DeepSeek para chat completions.
 * Degrada graciosamente: sem DEEPSEEK_API_KEY ou em caso de falha,
 * devolve null e quem chama decide o fallback.
 *
 * NUNCA importar em código com "use client".
 */

const BASE = "https://api.deepseek.com/v1";

function getKey(): string | null {
  return process.env.DEEPSEEK_API_KEY ?? null;
}

function getModel(): string {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

export function deepseekConfigurado(): boolean {
  return Boolean(getKey());
}

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DeepSeekResponse = {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

/**
 * Chat completion simples. Devolve null em falha.
 */
export async function deepseekChat(
  messages: DeepSeekMessage[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<DeepSeekResponse | null> {
  const key = getKey();
  if (!key) {
    console.warn("[deepseek] DEEPSEEK_API_KEY não configurada.");
    return null;
  }

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 2048,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[deepseek] erro:", res.status, body.slice(0, 300));
      return null;
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("[deepseek] resposta inesperada:", json);
      return null;
    }

    return {
      content,
      usage: json?.usage,
    };
  } catch (err) {
    console.error("[deepseek] exceção:", err);
    return null;
  }
}

/**
 * Gera um título curto para uma conversa com base na primeira mensagem.
 */
export async function gerarTituloConversa(primeiraMensagem: string): Promise<string | null> {
  const res = await deepseekChat(
    [
      {
        role: "system",
        content:
          "Gera um título muito curto (máx. 40 caracteres) para esta conversa. Responde APENAS com o título, sem aspas, sem explicações.",
      },
      { role: "user", content: primeiraMensagem },
    ],
    { temperature: 0.5, maxTokens: 50 }
  );
  return res?.content?.trim().slice(0, 60) ?? null;
}
