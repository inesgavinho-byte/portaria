# IA local (MLX) — servidor de chat Qwen3-8B-4bit

Servidor de chat **local** da PORTARIA (Apple Silicon, MLX), parte da decisão
**L-44** (`docs/legal/decisao-ia-l44.md`, Opção D — processamento local):
os dados de condóminos nunca saem da infraestrutura da GAVINHO, logo os
arts. 44.º–49.º do RGPD (transferências para países terceiros) não se aplicam.

| Servidor | Modelo | Porta | Como corre |
|---|---|---|---|
| Embeddings | `mlx-community/bge-m3-mlx-8bit` (1024 dims) | 8099 | launchd do projeto **DECIMA** (`com.decima.mlx-embeddings`) — já instalado nesta máquina |
| **Chat** | `mlx-community/Qwen3-8B-4bit` | **8098** | este directório (`install.sh` ou arranque manual) |

Ambos falam protocolo OpenAI-compatible (`/v1/chat/completions`,
`/v1/embeddings`). A app só os usa quando as variáveis `MLX_CHAT_URL` /
`MLX_EMBEDDINGS_URL` estão definidas (ver `.env.example`); sem elas recai — em
desenvolvimento — no comportamento legado.

## Arranque manual (desenvolvimento / teste)

Pré-requisitos: `uv` (`brew install uv`, em `/opt/homebrew/bin/uv`); o modelo
fica em cache em `~/.cache/huggingface/hub/` no primeiro arranque
(~5 GB; em 24 GB de RAM corre confortavelmente).

```sh
uv run --with mlx-lm python -m mlx_lm.server \
  --model mlx-community/Qwen3-8B-4bit \
  --host 127.0.0.1 \
  --port 8098 \
  --chat-template-args '{"enable_thinking": false}'
```

A flag `--chat-template-args` desativa o modo de raciocínio do Qwen3: sem
ela, o modelo gasta tokens a «pensar» (num campo `reasoning`) antes do
`content` — mau para respostas RAG concisas e para a extracção de JSON.
Verificado nesta máquina (mlx-lm 0.31.3): com a flag, resposta directa em
~1,5 s; sem a flag, 64 tokens esgotavam-se no raciocínio.

O servidor demora alguns segundos a carregar o modelo. Teste:

```sh
curl -s http://127.0.0.1:8098/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"mlx-community/Qwen3-8B-4bit","messages":[{"role":"user","content":"Diz olá."}],"max_tokens":32}'
```

Parar: `Ctrl-C` (arranque manual) ou `launchctl unload` (launchd).

## Arranque permanente (launchd)

`install.sh` preenche o template `com.portaria.mlx-chat.plist` (placeholders
de caminho do uv, modelo, host/porta e logs) e copia-o para
`~/Library/LaunchAgents/com.portaria.mlx-chat.plist` — **não** faz load; o
arranque é decisão de quem instala:

```sh
cd scripts/mlx-local
./install.sh
launchctl load ~/Library/LaunchAgents/com.portaria.mlx-chat.plist   # arrancar
launchctl unload ~/Library/LaunchAgents/com.portaria.mlx-chat.plist # parar
```

Logs: `~/.portaria/mlx-chat/server.log` e `server.err.log`.
Com o launchd, o servidor re-arranca sozinho (`KeepAlive`) e arranca ao login
(`RunAtLoad`).

## Variáveis na app (`.env.local` / Netlify)

```
MLX_CHAT_URL=http://127.0.0.1:8098        # liga o chat local
MLX_CHAT_KEY=...                          # só se o servidor estiver atrás de proxy com bearer
MLX_CHAT_MODEL=mlx-community/Qwen3-8B-4bit # default do código; normalmente desnecessário
MLX_EMBEDDINGS_URL=http://127.0.0.1:8099  # liga os embeddings locais
MLX_EMBEDDINGS_KEY=...                    # EMBED_API_KEY do launchd DECIMA
MLX_EMBEDDINGS_MODEL=mlx-community/bge-m3-mlx-8bit # default do código
```

Com `MLX_CHAT_URL`/`MLX_EMBEDDINGS_URL` definidos, `OPENAI_API_KEY` e
`DEEPSEEK_API_KEY` ficam **obsoletos** — os provedores externos deixam de ser
chamados (ver `src/lib/ai/local.ts`).

## Exposição para produção (a decisão da Inês)

A app em produção corre na Netlify; o servidor local está na rede da GAVINHO.
Para o chat funcionar em produção é necessário um túnel da infraestrutura
própria. **Nunca expor a porta publicamente sem autenticação** — o
`mlx_lm.server` não implementa autenticação própria.

1. **Só-rede-local / Tailscale (recomendado).** Manter o servidor em
   `127.0.0.1` (ou LAN) e, para acesso externo, usar a rede privada
   Tailscale: a Netlify não consegue ligar-se directamente, pelo que esta
   opção serve para uso interno/administração. Sem túnel, a IA opera em
   desenvolvimento e degrada em produção (equivalente operacional à Opção B
   da decisão L-44).
2. **Cloudflare Tunnel com bearer key.** `cloudflared` aponta um hostname
   para `http://127.0.0.1:8098`; na frente, um proxy (Caddy/nginx) valida o
   header `Authorization: Bearer <MLX_CHAT_KEY>` antes de encaminhar — ou
   Cloudflare Access com política restrita. A chave gera-se com
   `openssl rand -hex 24` e configura-se na Netlify como `MLX_CHAT_KEY`.

Em ambos os casos, definir `MLX_CHAT_KEY`/`MLX_EMBEDDINGS_KEY` na app quando
houver um proxy a exigir a chave (o cliente local envia o header se a
variável estiver definida).

## Reindexação obrigatória após migrar embeddings

A mudança OpenAI (1536 dims) → bge-m3 (1024 dims) invalida **todos** os
vetores antigos (migração `20260902510000_embeddings_bge_m3.sql` nulifica-os).
Depois de ligar o servidor de embeddings, por condomínio:

1. `/ia/configuracao` → reindexar (regulamento, documentos, ocorrências
   resolvidas — `reindexarTenant`);
2. `/configuracao/conselheira` → recarregar legislação e regulamento
   (`semearLegislacao`, `carregarRegulamento`).

Sem reindexação, a pesquisa semântica devolve vazio/indisponível (degradação
graciosa, sem erro).
