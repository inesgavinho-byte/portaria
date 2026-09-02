#!/usr/bin/env node
/**
 * Poda os nós de histórico git do grafo de conhecimento.
 *
 * Porquê: o extractor do graphify ingere commits como nós (`source_file: "git"`)
 * ligados por ON_BRANCH / PARENT_OF / MODIFIES. No PORTARIA isso são 179 nós que
 * arrastam 2325 das 4732 arestas — metade do grafo — sem valor arquitectural: um
 * nó "Merge pull request #26" diz QUANDO algo mudou, não COMO o código está
 * ligado. Pior, por estar ligado a tudo o que passou no ramo, comporta-se como
 * um hub falso: o Louvain agrupa por commit em vez de por módulo e o BFS do
 * `query` gasta metade dos resultados em SHAs.
 *
 * O `graphify update` não tem interruptor para isto (só --exclude, que filtra
 * caminhos), daí a poda ser um passo à parte. Faz parte da receita de
 * reconstrução documentada em CLAUDE.md e AGENTS.md; correr `graphify update`
 * sozinho volta a introduzir os commits.
 *
 * Uso: node scripts/graphify-podar-git.mjs [caminho/para/graph.json]
 * Depois: graphify cluster-only .   (recalcula comunidades sobre o grafo podado)
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";

const caminho = process.argv[2] ?? ".graphify/graph.json";
const bytesAntes = statSync(caminho).size;
const grafo = JSON.parse(readFileSync(caminho, "utf8"));

const historico = new Set(
  grafo.nodes.filter((no) => no.source_file === "git").map((no) => no.id),
);

if (historico.size === 0) {
  console.log(`${caminho}: sem nós de histórico git, nada a podar.`);
  process.exit(0);
}

const nosAntes = grafo.nodes.length;
const arestasAntes = grafo.links.length;

grafo.nodes = grafo.nodes.filter((no) => !historico.has(no.id));
grafo.links = grafo.links.filter(
  (aresta) => !historico.has(aresta.source) && !historico.has(aresta.target),
);

// Uma aresta órfã — apontando para um nó que já não existe — quebra o BFS do
// query e o cálculo de caminhos. A poda acima remove-as por construção; esta
// verificação garante que não sobra nenhuma, seja qual for a versão do extractor.
const vivos = new Set(grafo.nodes.map((no) => no.id));
const orfas = grafo.links.filter(
  (aresta) => !vivos.has(aresta.source) || !vivos.has(aresta.target),
);
if (orfas.length > 0) {
  console.error(`Abortado: ${orfas.length} arestas órfãs após a poda.`);
  process.exit(1);
}

writeFileSync(caminho, `${JSON.stringify(grafo, null, 2)}\n`);
const bytesDepois = statSync(caminho).size;

const pct = (parte, todo) => `${((parte / todo) * 100).toFixed(1)}%`;
console.log(`${caminho}`);
console.log(
  `  nós     ${nosAntes} -> ${grafo.nodes.length}  (-${historico.size}, ${pct(historico.size, nosAntes)})`,
);
console.log(
  `  arestas ${arestasAntes} -> ${grafo.links.length}  (-${arestasAntes - grafo.links.length}, ${pct(arestasAntes - grafo.links.length, arestasAntes)})`,
);
console.log(
  `  bytes   ${bytesAntes} -> ${bytesDepois}  (${pct(bytesAntes - bytesDepois, bytesAntes)} menos)`,
);
