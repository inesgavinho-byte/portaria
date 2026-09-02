/**
 * Teste LIVE (opcional) do cliente de embeddings local — servidor MLX
 * (bge-m3) em 127.0.0.1:8099, launchd do projeto DECIMA.
 *
 * Skippa automaticamente quando a key não está acessível no plist do
 * launchd (ex.: CI, outra máquina) — é exactamente o comportamento
 * pretendido: só corre na máquina da Inês com o serviço activo.
 */
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { chatLocal, embeddingsLocais } from "@/lib/ai/local";

const PLIST =
  process.env.HOME +
  "/Library/LaunchAgents/com.decima.mlx-embeddings.plist";

function chaveEmbeddingsDoPlist(): string | null {
  try {
    const chave = execSync(
      `plutil -extract EnvironmentVariables.EMBED_API_KEY raw '${PLIST}'`,
      { encoding: "utf8" }
    ).trim();
    return chave.length > 0 ? chave : null;
  } catch {
    return null;
  }
}

const chave = chaveEmbeddingsDoPlist();
const servidorAoVivo = chave !== null;

describe.skipIf(!servidorAoVivo)(
  "embeddingsLocais — LIVE contra 127.0.0.1:8099 (bge-m3)",
  () => {
    it("gera vetores de 1024 dimensões (dimensão da migração 20260902510000)", async () => {
      process.env.MLX_EMBEDDINGS_URL = "http://127.0.0.1:8099";
      process.env.MLX_EMBEDDINGS_KEY = chave as string;

      const vetores = await embeddingsLocais(
        ["Olá, mundo.", "Segunda frase para o lote."],
        { timeoutMs: 60_000 }
      );

      expect(vetores).not.toBeNull();
      expect(vetores).toHaveLength(2);
      // bge-m3 → 1024 dims; tem de coincidir com vector(1024) na BD.
      expect(vetores![0]).toHaveLength(1024);
      expect(vetores![1]).toHaveLength(1024);
      // valores finitos (não NaN/Inf)
      for (const v of vetores!) {
        expect(v.every((x) => Number.isFinite(x))).toBe(true);
      }
    });
  }
);

// -------------------------------------------------------------------------
// Chat live — só corre se o servidor Qwen3 estiver de pé em 8098
// (arranque manual ou launchd; ver scripts/mlx-local/README.md).
// -------------------------------------------------------------------------

async function chatServidorNoAr(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:8098/health", {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const chatNoAr = await chatServidorNoAr();

describe.skipIf(!chatNoAr)(
  "chatLocal — LIVE contra 127.0.0.1:8098 (Qwen3-8B-4bit)",
  () => {
    it("devolve content directo (thinking desativado no servidor)", async () => {
      process.env.MLX_CHAT_URL = "http://127.0.0.1:8098";

      const res = await chatLocal(
        [
          {
            role: "system",
            content: "Responde em português de Portugal, numa linha.",
          },
          { role: "user", content: "Qual é a capital de Portugal?" },
        ],
        { temperature: 0, maxTokens: 128, timeoutMs: 60_000 }
      );

      expect(res).not.toBeNull();
      expect(res!.content).toContain("Lisboa");
      expect(res!.content).not.toContain("<think>");
    });
  }
);
