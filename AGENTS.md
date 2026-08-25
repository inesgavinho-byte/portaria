## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- In Codex, the reliable explicit skill invocation is `$graphify ...`; do not rely on `/graphify ...`
- `$graphify ...` is a Codex skill trigger, not a Bash subcommand like `graphify .`
- A successful TypeScript-backed Codex build should leave `.graphify/.graphify_runtime.json` with `runtime: typescript`
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run the graphify skill with --update when appropriate
- If the user asks to build, update, query, path, or explain the graph, use the installed `graphify` skill instead of ad-hoc file traversal
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current

### Regras específicas do PORTARIA (medidas e ratificadas)

Estas prevalecem sobre as genéricas acima. São política decidida, não sugestão.
Números em `portaria/docs/decisoes/graphify.md`; reproduzem-se com
`scripts/graphify-medicao.sh`.

1. **O Graphify é a camada graph-first de redução de contexto.** Para orientação
   e localização, grafo primeiro: mede-se 7x a 204x menos contexto do que grep
   mais leitura dos ficheiros.
2. **A poda de nós git é determinística e obrigatória depois de cada
   `graphify update`.** Reconstruir são três passos, nunca um: `graphify update .`
   volta a introduzir 179 nós de histórico que arrastam metade das arestas;
   correr `node scripts/graphify-podar-git.mjs` e `graphify cluster-only .` a
   seguir.
3. **Blast radius é sempre `get_neighbors`.** Na mesma pergunta o `query` gasta
   6 038 B e devolve só a definição; o `get_neighbors` gasta 2 328 B e devolve os
   importadores.
4. **`query` é para discovery, não para cobertura exaustiva.** Faz BFS por
   semelhança de texto: encontra onde um símbolo vive. Não serve para responder
   «estão aqui todos os sítios afectados».
5. **`shortest_path` / `graphify path` não é fonte de verdade neste repositório.**
   `server.ts` é importado por quase tudo e funciona como hub: o caminho mais
   curto entre dois nós atravessa-o e sai válido no grafo mas errado como
   resposta. Perguntas transitivas resolvem-se com `get_neighbors` salto a salto.
6. **Alteração transversal — três passos, nesta ordem:** Graphify para o mapa,
   `grep` para verificar a cobertura, leitura do código real para confirmar. Só
   30% dos nós sob `app/` têm aresta de import, contra 62% no resto de `src/`:
   o grafo dá o mapa, o grep dá a garantia.
7. **Alteração local em ficheiro já conhecido não obriga a consultar o
   Graphify.** Ir directo ao ficheiro. Os hooks são consultivos, não uma
   barreira: consultar o grafo para editar uma linha num ficheiro já
   identificado gasta contexto em vez de o poupar.
8. **O benchmark mantém-se reproduzível.** Os tokens são hoje bytes/4, uma
   aproximação assumida; substituem-se por contagem real quando houver
   contador disponível. Não alterar o Graphify com o único fim de melhorar os
   números.
