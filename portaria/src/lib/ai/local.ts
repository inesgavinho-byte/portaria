/**
 * Cliente de IA LOCAL (MLX, Apple Silicon) — decisão L-44
 * (docs/legal/decisao-ia-l44.md, Opção D — Processamento local).
 *
 * Dois servidores OpenAI-compatible na infraestrutura própria da GAVINHO:
 *   • Embeddings — bge-m3 (1024 dims), porta 8099, launchd do projeto DECIMA.
 *   • Chat       — Qwen3-8B-4bit, porta 8098 (ver scripts/mlx-local/README.md).
 *
 * Quando `MLX_EMBEDDINGS_URL` / `MLX_CHAT_URL` estão definidos, os módulos
 * `openai.ts` e `deepseek.ts` delegam aqui e os provedores externos (OpenAI,
 * DeepSeek) deixam de ser chamados: nenhum dado pessoal sai da
 * infraestrutura — os arts. 44.º–49.º do RGPD não se aplicam.
 *
 * Degradação graciosa, como nos restantes clientes de IA: indisponibilidade
 * (servidor em baixo, timeout, 401, corpo malformado) devolve null e quem
 * chama decide o fallback. Nunca lança.
 *
 * NUNCA importar em código com "use client" — lê variáveis de ambiente e
 * só faz sentido no servidor.
 */

// Endpoints documentados (defaults do ecossistema — o valor real é lido das
// envs; sem env definida, a função correspondente nem chega a chamar fetch).
const EMBEDDINGS_URL_DEFAULT = "http://127.0.0.1:8099";
const CHAT_URL_DEFAULT = "http://127.0.0.1:8098";

const EMBEDDINGS_MODELO_DEFAULT = "mlx-community/bge-m3-mlx-8bit"; // 1024 dims
const CHAT_MODELO_DEFAULT = "mlx-community/Qwen3-8B-4bit";

/** Teto para gerar embeddings (lote incl.; bge-m3 local responde em <1 s/ck). */
const EMBEDDINGS_TIMEOUT_MS = 30_000;
/** Teto para uma resposta de chat (Qwen3-8B-4bit local: dezenas de tok/s). */
const CHAT_TIMEOUT_MS = 120_000;

export function mlxEmbeddingsConfigurado(): boolean {
  return urlDe(process.env.MLX_EMBEDDINGS_URL) !== null;
}

export function mlxChatConfigurado(): boolean {
  return urlDe(process.env.MLX_CHAT_URL) !== null;
}

/**
 * URL de um servidor local a partir da env: null se não definida ou vazia
 * (env definida-mas-vazia é comum em painéis de hosting e não significa
 * "configurada"). Apara barras finais para não gerar `//v1/...`.
 */
function urlDe(valor: string | undefined): string | null {
  const t = valor?.trim();
  return t ? t.replace(/\/+$/, "") : null;
}

export type MensagemIA = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RespostaChatLocal = {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

type OptsComuns = { timeoutMs?: number };

function timeoutDe(opts: OptsComuns | undefined, padrão: number): number {
  return opts?.timeoutMs ?? padrão;
}

/**
 * Remove o bloco de raciocínio do Qwen3 (<think>…</think>). O chat template
 * do modelo pode emitir o raciocínio no próprio conteúdo quando o servidor
 * não o separa; é ruído para quem consome a resposta.
 */
function stripThink(texto: string): string {
  return texto.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Gera embeddings para um lote de textos no servidor local (bge-m3, 1024
 * dimensões). Devolve os vetores na ordem dos textos de entrada, ou null em
 * indisponibilidade/falha.
 */
export async function embeddingsLocais(
  textos: string[],
  opts?: OptsComuns
): Promise<number[][] | null> {
  // Sem MLX_EMBEDDINGS_URL a IA local está desligada: nem chamada há
  // (o default documentado é o valor a pôr na env — ver .env.example).
  const url = urlDe(process.env.MLX_EMBEDDINGS_URL);
  if (!url) {
    console.warn(
      `[mlx] MLX_EMBEDDINGS_URL não definida — embeddings locais desligados (default: ${EMBEDDINGS_URL_DEFAULT}).`
    );
    return null;
  }

  // Mesma limpeza de gerarEmbedding (openai.ts): espaços colapsados,
  // teto de 8000 carateres (bge-m3 aceita ~8192 tokens).
  const limpos = textos
    .map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000))
    .filter((t) => t.length > 0);
  if (limpos.length === 0) return null;

  try {
    const res = await fetch(`${url}/v1/embeddings`, {
      method: "POST",
      headers: {
        ...(process.env.MLX_EMBEDDINGS_KEY
          ? { Authorization: `Bearer ${process.env.MLX_EMBEDDINGS_KEY}` }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MLX_EMBEDDINGS_MODEL ?? EMBEDDINGS_MODELO_DEFAULT,
        input: limpos,
      }),
      signal: AbortSignal.timeout(timeoutDe(opts, EMBEDDINGS_TIMEOUT_MS)),
    });
    if (!res.ok) {
      console.error("[mlx] embeddings erro:", res.status);
      return null;
    }

    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data) || data.length !== limpos.length) {
      console.error("[mlx] embeddings: resposta inesperada.");
      return null;
    }

    // O formato OpenAI permite devolver fora de ordem; reordenar por index.
    const porIndice = [...data]
      .sort(
        (a: { index?: number }, b: { index?: number }) =>
          (a.index ?? 0) - (b.index ?? 0)
      )
      .map((d: { embedding?: unknown }) =>
        Array.isArray(d?.embedding) ? (d.embedding as number[]) : null
      );
    if (porIndice.some((v) => v === null || v.length === 0)) {
      console.error("[mlx] embeddings: vetor inválido na resposta.");
      return null;
    }
    return porIndice as number[][];
  } catch (err) {
    console.error("[mlx] exceção embeddings:", err);
    return null;
  }
}

/**
 * Chat completion no servidor local (Qwen3-8B-4bit). Devolve null em
 * indisponibilidade/falha.
 */
export async function chatLocal(
  mensagens: MensagemIA[],
  opts?: OptsComuns & { temperature?: number; maxTokens?: number }
): Promise<RespostaChatLocal | null> {
  const url = urlDe(process.env.MLX_CHAT_URL);
  if (!url) {
    console.warn(
      `[mlx] MLX_CHAT_URL não definida — chat local desligado (default: ${CHAT_URL_DEFAULT}).`
    );
    return null;
  }
  if (mensagens.length === 0) return null;

  try {
    const res = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        ...(process.env.MLX_CHAT_KEY
          ? { Authorization: `Bearer ${process.env.MLX_CHAT_KEY}` }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MLX_CHAT_MODEL ?? CHAT_MODELO_DEFAULT,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 2048,
        messages: mensagens,
      }),
      signal: AbortSignal.timeout(timeoutDe(opts, CHAT_TIMEOUT_MS)),
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error("[mlx] chat erro:", res.status, corpo.slice(0, 300));
      return null;
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("[mlx] chat: resposta inesperada.");
      return null;
    }

    const limpo = stripThink(content);
    if (!limpo) {
      console.error("[mlx] chat: resposta vazia (só bloco de raciocínio?).");
      return null;
    }

    return {
      content: limpo,
      usage: json?.usage,
    };
  } catch (err) {
    console.error("[mlx] exceção chat:", err);
    return null;
  }
}
