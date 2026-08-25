# Graphify no PORTARIA

**Objectivo:** reduzir consumo de tokens e leituras redundantes de código.
Nesta fase o grafo é *code-only* — sem wiki, sem ingestão de documentação ou PDFs.

## O que ficou instalado

| Peça | Onde | Notas |
| --- | --- | --- |
| CLI | global (`@sentropic/graphify` 0.17.1, MIT) | **Fora** de `portaria/package.json`: 42 MB descomprimidos e cinco SDKs de LLM que não podem pesar no build do Netlify, que corre a partir de `portaria/`. |
| Grafo | `.graphify/graph.json` | Committado. É o que dá valor a quem clona: consultar o repositório sem o reprocessar. |
| Integração Claude | `CLAUDE.md`, `.claude/settings.json` | Dois hooks `PreToolUse` consultivos, guardados com `|| true` e inertes enquanto não existir `graph.json`. |
| Integração Codex | `AGENTS.md`, `.codex/hooks.json`, `.agents/skills/graphify/` | Hook `PreToolUse` a chamar `graphify hook-check` (sai 0 sem grafo). |
| MCP read-only | `.codex/config.toml` | `graphify serve .graphify/graph.json` por stdio. |

O `.codex/config.toml` usa caminho **relativo** por desenho: o Codex arranca o
servidor com a raiz do repositório como directório de trabalho, e um caminho
absoluto tornaria o ficheiro dependente da máquina — é precisamente o que o
`graphify portable-check` reprova. Quem preferir registo global corre, na raiz:

```bash
codex mcp add graphify -- graphify serve "$PWD/.graphify/graph.json"
```

O servidor é read-only por superfície, não por promessa: expõe onze ferramentas
— `first_hop_summary`, `review_delta`, `review_analysis`, `recommend_commits`,
`query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`,
`graph_stats`, `shortest_path` — todas de leitura. A única que toca em git,
`recommend_commits`, declara-se *advisory-only*. A reconstrução exige
`graphify update`, que não é exposto por MCP.

## O que ficou de fora, e porquê

**Migrações SQL** (`portaria/supabase/migrations/`, 67 ficheiros). São o registo
histórico do esquema, não a sua forma actual. O esquema que o código usa está
tipado em `src/types/database.ts`, que entra no grafo.

**Documentação e PDFs.** Fora por instrução desta fase.

**Descrições por nó e rótulos de comunidade** (`description-instructions/`,
`label-instructions/`). São prosa gerada por LLM: custo agora para ganho
marginal na consulta, contra o objectivo de reduzir tokens. O grafo tem 100%
`EXTRACTED` e 0% `INFERRED` — a estrutura vem toda de tree-sitter, local, em
6,6 s. O `label-instructions/` contém ainda um caminho absoluto da máquina de
build, que o `portable-check` sinaliza e bem.

**O studio** (`.graphify/studio/`, 4,1 MB de HTML). Visualização para browser
que nenhum agente lê e que não poupa um único token. Reconstrói-se de
`graph.json` com `graphify cluster-only .`.

**Histórico git.** O extractor ingere commits como nós (`source_file: "git"`).
No PORTARIA eram 179 nós — 13% — a arrastar **2325 das 4732 arestas, metade do
grafo**, por `ON_BRANCH` / `PARENT_OF` / `MODIFIES`. Um nó *"Merge pull request
#26"* diz quando algo mudou, não como o código está ligado; e por estar ligado a
tudo o que passou no ramo comporta-se como hub falso — o Louvain agrupa por
commit em vez de por módulo e o BFS gasta metade dos resultados em SHAs. Antes
da poda, metade dos vinte primeiros resultados de uma pergunta de código eram
merge commits. Depois, nenhum: o mesmo orçamento de bytes, todo em sinal.

O `graphify update` não tem interruptor para isto (só `--exclude`, que filtra
caminhos, e os nós de commit não têm caminho), daí a poda ser um passo à parte.

## Reconstruir o grafo

Três passos, nesta ordem — `graphify update` sozinho volta a introduzir os commits:

```bash
graphify update .                      # extracção AST, code-only, ~7 s
node scripts/graphify-podar-git.mjs    # poda o histórico git
graphify cluster-only .                # recalcula comunidades sobre o grafo podado
graphify portable-check .graphify      # confirma caminhos relativos antes de committar
```

## A medição

`scripts/graphify-medicao.sh`, reproduzível. Mede **duas** coisas, porque volume
sem correcção não vale nada — uma resposta 148x mais barata e errada não é ganho.
Unidade: bytes exactos do que entraria na janela de contexto; tokens ≈ bytes/4.

| Tarefa | Grafo | Tradicional | Factor | Correcção |
| --- | --- | --- | --- | --- |
| T1 acrescentar uma categoria de documento | 6 038 B | 41 130 B | **7x** | 3/3 ficheiros certos |
| T2 blast radius de `requireAdmin`, via `query` | 6 038 B | 473 790 B | 78x | **0/74** — só localiza a definição |
| T2 o mesmo, via `get_neighbors` | 2 328 B | 473 790 B | **204x** | 54/74 importadores |
| T2 o mesmo, contra o piso do grep | 2 328 B | 19 309 B | 8x | idem |
| T3 cadeia evidência → página do fornecedor | 324 B | 48 048 B | 148x | **errada** |

Ler `src/` por inteiro custaria 1 118 164 B (~279 541 tokens).

### O que a medição ensinou

**O ganho é real e grande, mas depende da ferramenta.** A mesma pergunta de
blast radius custa 6 038 B e não responde via `query`, ou 2 328 B e responde via
`get_neighbors`. O `query` faz BFS por semelhança de texto: encontra onde o
símbolo *vive*. Quem importa quem é uma pergunta de arestas, e para isso a
ferramenta é `get_neighbors`. Escolher mal a ferramenta gasta mais e acerta menos.

**T3 falhou, e é o resultado mais útil.** À pergunta *"qual a cadeia entre juntar
uma evidência e a página do fornecedor?"*, o `path` devolveu seis saltos
passando pelo cliente Supabase, por uma página não relacionada e por um ficheiro
de teste, para aterrar num nó `FORNECEDORES` que é uma constante, não a página.
O caminho é válido no grafo e inútil como resposta: `server.ts` é importado por
quase tudo, logo quaisquer dois nós ficam a poucos saltos através dele. Podei os
hubs falsos do histórico git, mas `server.ts` é um hub **legítimo** com o mesmo
efeito no `shortest_path`. Conclusão: `shortest_path` não é de confiar num
repositório com hubs de infra-estrutura. A pergunta transitiva responde-se
melhor com `get_neighbors` salto a salto.

**A extracção é mais fraca na camada de rotas.** O `get_neighbors` encontra 54
dos 74 ficheiros que mencionam `requireAdmin`. Os ficheiros estão lá — 86 dos 87
`page.tsx` existem como nó — mas as **arestas** faltam: apenas 30% dos nós sob
`app/` têm aresta de import, contra 62% no resto de `src/`. O extractor lê bem
módulos de biblioteca e acções, e mal os Server Components do App Router.

### Regra de operação que daqui resulta

1. **Orientação e localização:** grafo primeiro. É onde os 7x–204x estão.
2. **Exaustividade** — mudar uma assinatura, uma migração a sério: o grafo dá o
   mapa, o `grep` dá a garantia. Aqueles 54/74 são 20 ficheiros que compilariam
   mal sem aviso.
3. **Perguntas transitivas:** `get_neighbors` salto a salto, não `shortest_path`.
