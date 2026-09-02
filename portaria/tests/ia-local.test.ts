import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatLocal, embeddingsLocais } from "@/lib/ai/local";
import { gerarEmbedding, chatTexto } from "@/lib/ai/openai";
import { deepseekChat } from "@/lib/ai/deepseek";

// -------------------------------------------------------------------------
// Mock de fetch — captura pedidos para verificar URL/headers/body e simular
// sucesso, 401, corpo malformado e timeout (via AbortSignal do cliente).
// -------------------------------------------------------------------------

type PedidoCapturado = { url: string; init: RequestInit };

function mockFetchResposta(resposta: unknown, status = 200) {
  const pedidos: PedidoCapturado[] = [];
  const fn = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    pedidos.push({ url: String(url), init });
    return new Response(JSON.stringify(resposta), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return pedidos;
}

function mockFetchQueAborta() {
  const fn = vi.fn(
    (_url: string | URL, init: RequestInit = {}) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError"))
        );
      })
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const EMBEDDINGS_OK = {
  object: "list",
  data: [
    { object: "embedding", index: 1, embedding: [0.3, 0.4] },
    { object: "embedding", index: 0, embedding: [0.1, 0.2] },
  ],
  model: "mlx-community/bge-m3-mlx-8bit",
};

const CHAT_OK = {
  choices: [
    { message: { role: "assistant", content: "Resposta do modelo local." } },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5 },
};

// vitest 2 não tem vi.deleteEnv — gestão manual de process.env com restauro.
const envOriginal: Record<string, string | undefined> = {};

function definirEnv(chave: string, valor: string | undefined) {
  if (!(chave in envOriginal)) envOriginal[chave] = process.env[chave];
  if (valor === undefined) delete process.env[chave];
  else process.env[chave] = valor;
}

beforeEach(() => {
  definirEnv("MLX_EMBEDDINGS_URL", "http://127.0.0.1:8099");
  definirEnv("MLX_EMBEDDINGS_KEY", "chave-teste");
  definirEnv("MLX_EMBEDDINGS_MODEL", undefined);
  definirEnv("MLX_CHAT_URL", "http://127.0.0.1:8098");
  definirEnv("MLX_CHAT_KEY", undefined);
  definirEnv("MLX_CHAT_MODEL", undefined);
});

afterEach(() => {
  for (const [chave, valor] of Object.entries(envOriginal)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
    delete envOriginal[chave];
  }
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// embeddingsLocais
// ---------------------------------------------------------------------------

describe("embeddingsLocais", () => {
  it("sucesso: devolve vetores na ordem de entrada (reordena por index) e envia key/model", async () => {
    const pedidos = mockFetchResposta(EMBEDDINGS_OK);

    const vetores = await embeddingsLocais(["primeiro", "segundo"]);

    expect(vetores).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toBe("http://127.0.0.1:8099/v1/embeddings");
    const headers = new Headers(pedidos[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer chave-teste");
    const body = JSON.parse(String(pedidos[0].init.body));
    expect(body.model).toBe("mlx-community/bge-m3-mlx-8bit");
    expect(body.input).toEqual(["primeiro", "segundo"]);
  });

  it("sem MLX_EMBEDDINGS_URL: devolve null e não chama fetch", async () => {
    definirEnv("MLX_EMBEDDINGS_URL", "");
    const pedidos = mockFetchResposta(EMBEDDINGS_OK);

    const vetores = await embeddingsLocais(["texto"]);

    expect(vetores).toBeNull();
    expect(pedidos).toHaveLength(0);
  });

  it("401 (key errada): devolve null sem lançar", async () => {
    mockFetchResposta({ error: "unauthorized" }, 401);

    const vetores = await embeddingsLocais(["texto"]);

    expect(vetores).toBeNull();
  });

  it("corpo malformado (sem data): devolve null sem lançar", async () => {
    mockFetchResposta({ object: "list" });

    const vetores = await embeddingsLocais(["texto"]);

    expect(vetores).toBeNull();
  });

  it("corpo com nº de vetores diferente do pedido: devolve null", async () => {
    mockFetchResposta({
      data: [{ index: 0, embedding: [1, 2] }],
    });

    const vetores = await embeddingsLocais(["um", "dois"]);

    expect(vetores).toBeNull();
  });

  it("timeout do servidor: devolve null sem lançar", async () => {
    mockFetchQueAborta();

    const vetores = await embeddingsLocais(["texto"], { timeoutMs: 20 });

    expect(vetores).toBeNull();
  });

  it("só espaços em branco: devolve null e não chama fetch", async () => {
    const pedidos = mockFetchResposta(EMBEDDINGS_OK);

    const vetores = await embeddingsLocais(["   ", "\n\t"]);

    expect(vetores).toBeNull();
    expect(pedidos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// chatLocal
// ---------------------------------------------------------------------------

describe("chatLocal", () => {
  it("sucesso: devolve o conteúdo e envia o body OpenAI-compatible", async () => {
    const pedidos = mockFetchResposta(CHAT_OK);

    const res = await chatLocal(
      [
        { role: "system", content: "Sistema." },
        { role: "user", content: "Pergunta." },
      ],
      { temperature: 0.2, maxTokens: 64 }
    );

    expect(res?.content).toBe("Resposta do modelo local.");
    expect(res?.usage?.completion_tokens).toBe(5);
    expect(pedidos[0].url).toBe("http://127.0.0.1:8098/v1/chat/completions");
    const body = JSON.parse(String(pedidos[0].init.body));
    expect(body.model).toBe("mlx-community/Qwen3-8B-4bit");
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(64);
    expect(body.messages).toHaveLength(2);
    // MLX_CHAT_KEY apagada no beforeEach → sem header Authorization.
    const headers = new Headers(pedidos[0].init.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("envia Authorization quando MLX_CHAT_KEY está definida", async () => {
    definirEnv("MLX_CHAT_KEY", "segredo");
    const pedidos = mockFetchResposta(CHAT_OK);

    await chatLocal([{ role: "user", content: "olá" }]);

    const headers = new Headers(pedidos[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer segredo");
  });

  it("remove o bloco de raciocínio <think> do Qwen3", async () => {
    mockFetchResposta({
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "<think>Vou pensar bem sobre isto…</think>\n\nResposta final.",
          },
        },
      ],
    });

    const res = await chatLocal([{ role: "user", content: "olá" }]);

    expect(res?.content).toBe("Resposta final.");
  });

  it("conteúdo só com <think> (vazio depois da limpeza): devolve null", async () => {
    mockFetchResposta({
      choices: [
        { message: { role: "assistant", content: "<think>só raciocínio</think>" } },
      ],
    });

    const res = await chatLocal([{ role: "user", content: "olá" }]);

    expect(res).toBeNull();
  });

  it("401: devolve null sem lançar", async () => {
    mockFetchResposta({ error: "unauthorized" }, 401);

    const res = await chatLocal([{ role: "user", content: "olá" }]);

    expect(res).toBeNull();
  });

  it("corpo malformado (sem choices): devolve null sem lançar", async () => {
    mockFetchResposta({ object: "chat.completion" });

    const res = await chatLocal([{ role: "user", content: "olá" }]);

    expect(res).toBeNull();
  });

  it("timeout do servidor: devolve null sem lançar", async () => {
    mockFetchQueAborta();

    const res = await chatLocal([{ role: "user", content: "olá" }], {
      timeoutMs: 20,
    });

    expect(res).toBeNull();
  });

  it("sem mensagens: devolve null e não chama fetch", async () => {
    const pedidos = mockFetchResposta(CHAT_OK);

    const res = await chatLocal([]);

    expect(res).toBeNull();
    expect(pedidos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ROUTING L-44 — com MLX_* definidos, OpenAI/DeepSeek deixam de ser chamados
// ---------------------------------------------------------------------------

describe("routing para o cliente local (L-44)", () => {
  it("gerarEmbedding usa o servidor local e não chama a OpenAI", async () => {
    definirEnv("OPENAI_API_KEY", "sk-openai");
    const pedidos = mockFetchResposta({
      data: [{ index: 0, embedding: [1, 2, 3] }],
    });

    const vetor = await gerarEmbedding("  pergunta   do   utilizador  ");

    expect(vetor).toEqual([1, 2, 3]);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toContain("127.0.0.1:8099");
    expect(pedidos[0].url).not.toContain("api.openai.com");
    // limpeza de texto idêntica à legada
    const body = JSON.parse(String(pedidos[0].init.body));
    expect(body.input).toEqual(["pergunta do utilizador"]);
  });

  it("sem MLX_EMBEDDINGS_URL, gerarEmbedding mantém o caminho legado OpenAI", async () => {
    definirEnv("OPENAI_API_KEY", "sk-openai");
    definirEnv("MLX_EMBEDDINGS_URL", "");
    const pedidos = mockFetchResposta({
      data: [{ embedding: [9, 9] }],
    });

    const vetor = await gerarEmbedding("pergunta");

    expect(vetor).toEqual([9, 9]);
    expect(pedidos[0].url).toBe("https://api.openai.com/v1/embeddings");
  });

  it("chatTexto usa o servidor local e não chama a OpenAI", async () => {
    definirEnv("OPENAI_API_KEY", "sk-openai");
    const pedidos = mockFetchResposta(CHAT_OK);

    const texto = await chatTexto("system", "user");

    expect(texto).toBe("Resposta do modelo local.");
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toContain("127.0.0.1:8098");
    expect(pedidos[0].url).not.toContain("api.openai.com");
  });

  it("deepseekChat usa o servidor local e não chama a DeepSeek", async () => {
    definirEnv("DEEPSEEK_API_KEY", "sk-deepseek");
    const pedidos = mockFetchResposta(CHAT_OK);

    const res = await deepseekChat(
      [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
      { temperature: 0.3 }
    );

    expect(res?.content).toBe("Resposta do modelo local.");
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].url).toContain("127.0.0.1:8098");
    expect(pedidos[0].url).not.toContain("api.deepseek.com");
  });

  it("sem MLX_CHAT_URL nem chaves, os clientes degradam para null", async () => {
    definirEnv("MLX_CHAT_URL", "");
    definirEnv("OPENAI_API_KEY", undefined);
    definirEnv("DEEPSEEK_API_KEY", undefined);
    const pedidos = mockFetchResposta(CHAT_OK);

    const chat = await chatTexto("s", "u");
    const ds = await deepseekChat([{ role: "user", content: "u" }]);

    expect(chat).toBeNull();
    expect(ds).toBeNull();
    expect(pedidos).toHaveLength(0);
  });
});
