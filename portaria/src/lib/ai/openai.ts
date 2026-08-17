/**
 * Utilitários OpenAI partilhados (embeddings + chat).
 * Só deve ser importado em Server Actions / Route Handlers.
 *
 * Tudo degrada graciosamente: sem OPENAI_API_KEY ou em caso de falha,
 * devolve null e quem chama decide o fallback. Nunca lança.
 */

const BASE = "https://api.openai.com/v1";
export const EMBEDDING_MODELO = "text-embedding-3-small"; // 1536 dimensões
export const CHAT_MODELO = "gpt-4o";

export function openaiConfigurado(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Gera o embedding de um texto. Devolve null em falha. */
export async function gerarEmbedding(texto: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const limpo = texto.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!limpo) return null;

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

/** Extrai o texto de um PDF (base64) via gpt-4o. Devolve null em falha. */
export async function extrairTextoPdf(b64: string): Promise<string | null> {
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
        model: CHAT_MODELO,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcreve integralmente o texto deste documento, mantendo a estrutura por secções/artigos. Devolve apenas o texto.",
              },
              {
                type: "file",
                file: {
                  filename: "regulamento.pdf",
                  file_data: `data:application/pdf;base64,${b64}`,
                },
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("OpenAI extrair texto erro:", res.status);
      return null;
    }
    const json = await res.json();
    const txt = json?.choices?.[0]?.message?.content;
    return typeof txt === "string" ? txt : null;
  } catch (err) {
    console.error("Erro extrair texto PDF:", err);
    return null;
  }
}
