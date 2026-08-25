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

### Regras específicas do PORTARIA (medidas, não presumidas)

Estas prevalecem sobre as genéricas acima. Ver `portaria/docs/decisoes/graphify.md`
para os números e `scripts/graphify-medicao.sh` para os reproduzir.

- **Localizar um símbolo ou orientar-se:** `graphify query`. Mede-se 7x menos
  contexto do que grep + ler os ficheiros, com a resposta certa.
- **Quem importa/chama o quê (blast radius):** `get_neighbors`, não `query`. Na
  mesma pergunta o `query` gasta 6 038 B e devolve só a definição; o
  `get_neighbors` gasta 2 328 B e devolve os importadores — 204x menos do que a
  leitura tradicional.
- **Não usar `shortest_path`/`graphify path` neste repositório.** `server.ts` é
  importado por quase tudo e funciona como hub: o caminho mais curto entre dois
  nós atravessa-o e sai válido no grafo mas errado como resposta. Seguir a
  cadeia com `get_neighbors` salto a salto.
- **O grafo não é exaustivo na camada de rotas.** Só 30% dos nós sob `app/` têm
  aresta de import, contra 62% no resto de `src/`. Antes de mudar uma assinatura
  usada em toda a app, confirmar com `grep -rl` — o grafo dá o mapa, o grep dá a
  garantia.
- **Reconstruir são três passos**, não um: `graphify update .` volta a introduzir
  179 nós de histórico git que arrastam metade das arestas. Correr sempre
  `node scripts/graphify-podar-git.mjs` e `graphify cluster-only .` a seguir.
