/**
 * Utilitários OpenAI partilhados (embeddings + chat).
 * Só deve ser importado em Server Actions / Route Handlers.
 *
 * Tudo degrada graciosamente: sem OPENAI_API_KEY ou em caso de falha,
 * devolve null e quem chama decide o fallback. Nunca lança.
 *
 * L-44 (processamento local): quando `MLX_EMBEDDINGS_URL`/`MLX_CHAT_URL`
 * estão definidos, gerarEmbedding/chatTexto delegam no cliente MLX
 * (src/lib/ai/local.ts) e a OpenAI DEIXA DE SER CHAMADA — nenhum dado
 * pessoal sai da infraestrutura própria. Sem variáveis locais definidas,
 * mantém-se o comportamento legado (com OpenAI) para ambientes que ainda
 * não migraram.
 */

import { chatLocal, embeddingsLocais, mlxChatConfigurado, mlxEmbeddingsConfigurado } from "@/lib/ai/local";

const BASE = "https://api.openai.com/v1";
export const EMBEDDING_MODELO = "text-embedding-3-small"; // 1536 dimensões (legado; local = bge-m3, 1024)
export const CHAT_MODELO = "gpt-4o";

export function openaiConfigurado(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Embeddings disponíveis: MLX local (preferido, L-44) ou OpenAI. */
export function embeddingsConfiguradas(): boolean {
  return mlxEmbeddingsConfigurado() || openaiConfigurado();
}

/** Chat disponível: MLX local (preferido, L-44) ou OpenAI. */
export function chatConfigurado(): boolean {
  return mlxChatConfigurado() || openaiConfigurado();
}

/** Gera o embedding de um texto. Devolve null em falha. */
export async function gerarEmbedding(texto: string): Promise<number[] | null> {
  const limpo = texto.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!limpo) return null;

  // L-44: com o servidor MLX configurado, o embedding é sempre local.
  if (mlxEmbeddingsConfigurado()) {
    const vetores = await embeddingsLocais([limpo]);
    return vetores?.[0] ?? null;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODELO, input: limpo }),
    });
    if (!res.ok) {
      console.error("OpenAI embeddings erro:", res.status);
      return null;
    }
    const json = await res.json();
    const vec = json?.data?.[0]?.embedding;
    return Array.isArray(vec) ? (vec as number[]) : null;
  } catch (err) {
    console.error("Erro embeddings:", err);
    return null;
  }
}

/** Chat completion simples de texto. Devolve null em falha. */
export async function chatTexto(
  system: string,
  user: string,
  modelo = CHAT_MODELO
): Promise<string | null> {
  // L-44: com o servidor MLX configurado, o chat é sempre local (o parâmetro
  // `modelo`, específico da OpenAI, é ignorado).
  if (mlxChatConfigurado()) {
    const local = await chatLocal([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return local?.content ?? null;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error("OpenAI chat erro:", res.status, corpo.slice(0, 300));
      return null;
    }
    const json = await res.json();
    const txt = json?.choices?.[0]?.message?.content;
    return typeof txt === "string" ? txt : null;
  } catch (err) {
    console.error("Erro chat:", err);
    return null;
  }
}
