#!/usr/bin/env bash
# Mede o custo de contexto de tarefas reais do PORTARIA resolvidas graph-first
# contra a mesma tarefa por leitura tradicional (grep + ler os ficheiros).
#
# Mede duas coisas, porque volume sem correccao nao vale nada: os bytes que
# entrariam na janela de contexto, e se a resposta do grafo esta certa face a
# uma verdade conhecida. Uma resposta 100x mais barata e errada nao e um ganho.
#
# Unidade: bytes exactos -- essa parte nao e estimada. Tokens = bytes/4, que e
# aproximacao convencional e assumida como tal; substituir por contagem real
# quando houver contador disponivel, sem tocar no resto da medicao.
# Reproduzivel: correr de qualquer directorio.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
GRAFO=".graphify/graph.json"

bytes() { wc -c | tr -d ' '; }

# Bytes totais dos caminhos lidos do stdin, resolvidos a partir de portaria/.
bytes_dos_ficheiros() {
  local total=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    f="${f#portaria/}"
    [ -f "$RAIZ/portaria/$f" ] || continue
    total=$((total + $(wc -c <"$RAIZ/portaria/$f")))
  done
  echo "$total"
}

# Invoca uma ferramenta read-only do servidor MCP e devolve so o texto.
mcp() {
  local ferramenta=$1 argumentos=$2
  printf '%s\n' \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"medicao","version":"0"}}}' \
    '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
    "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"$ferramenta\",\"arguments\":$argumentos}}" \
  | timeout 30 graphify serve "$GRAFO" 2>/dev/null | tail -1 \
  | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{process.stdout.write(JSON.parse(s).result.content.map(c=>c.text).join("\n"))}catch(e){}})'
}

linha() {
  local nome=$1 g=$2 t=$3 veredicto=$4 fator="n/d"
  [ "$g" -gt 0 ] && fator="$(awk -v t="$t" -v g="$g" 'BEGIN{printf "%.0fx", t/g}')"
  printf '%-40s %8d %7d %9d %7d %6s  %s\n' \
    "$nome" "$g" "$((g / 4))" "$t" "$((t / 4))" "$fator" "$veredicto"
}

printf '%-40s %8s %7s %9s %7s %6s  %s\n' \
  TAREFA GRAFO_B GRAFO_T TRAD_B TRAD_T FATOR CORRECCAO
printf '%.0s-' $(seq 1 100); echo

# --------------------------------------------------------------- T1 (estreita)
# "Que ficheiros tem de mudar para acrescentar uma categoria de documento?"
# Verdade: types/database.ts, lib/documentos.ts, components/admin/dossier-arquivo.tsx
T1_OUT=$(graphify query "DocumentoCategoria categoria de documento" 2>/dev/null)
T1_ACERTOS=$(printf '%s' "$T1_OUT" \
  | grep -cE "types/database\.ts|lib/documentos\.ts|dossier-arquivo\.tsx")
T1_G=$(printf '%s' "$T1_OUT" | bytes)
T1_T=$((
  $(cd portaria && grep -rn "DocumentoCategoria" src/ 2>/dev/null | bytes) +
  $(cd portaria && grep -rl "DocumentoCategoria" src/ 2>/dev/null | bytes_dos_ficheiros)
))
linha "T1 nova categoria de documento" "$T1_G" "$T1_T" "$T1_ACERTOS/3 ficheiros"

# ----------------------------------------------------------------- T2 (larga)
# "O que rebenta se mudar a assinatura de requireAdmin?"
# Verdade: 74 ficheiros mencionam requireAdmin (grep -rl).
T2_ALVO=$(cd portaria && grep -rl "requireAdmin" src/ 2>/dev/null | wc -l | tr -d ' ')
T2_GREP=$(cd portaria && grep -rn "requireAdmin" src/ 2>/dev/null | bytes)
T2_FICH=$(cd portaria && grep -rl "requireAdmin" src/ 2>/dev/null | bytes_dos_ficheiros)

# Via `query`: o BFS encontra a definicao mas nao enumera quem importa.
T2_Q=$(graphify query "requireAdmin quem chama autorizacao de administrador" 2>/dev/null)
linha "T2 requireAdmin via query" "$(printf '%s' "$T2_Q" | bytes)" \
  "$((T2_GREP + T2_FICH))" "0/$T2_ALVO (so define)"

# Via `get_neighbors`: a ferramenta certa. Enumera os importadores.
T2_N=$(mcp get_neighbors '{"label":"requireAdmin"}')
T2_VIZ=$(printf '%s' "$T2_N" | grep -c "imports")
linha "T2 requireAdmin via get_neighbors" "$(printf '%s' "$T2_N" | bytes)" \
  "$((T2_GREP + T2_FICH))" "$T2_VIZ/$T2_ALVO importadores"
linha "  ^ contra o piso do grep (sem ler)" "$(printf '%s' "$T2_N" | bytes)" \
  "$T2_GREP" "idem"

# ------------------------------------------------------------- T3 (relacional)
# "Qual a cadeia entre juntar uma evidencia e a pagina do fornecedor?"
# O grep nao responde a perguntas transitivas; o custo tradicional e seguir a
# cadeia salto a salto. Mas o grafo tambem falha aqui -- ver CORRECCAO.
T3_OUT=$(graphify path "juntarEvidencia" "fornecedores" 2>/dev/null)
# A cadeia real e dossier-evidencias.ts -> evidencia-juntar.tsx -> a pagina.
# Se o caminho devolvido passar por um teste ou pelo cliente Supabase, e um
# atalho por hub: valido no grafo, inutil como resposta.
if printf '%s' "$T3_OUT" | grep -qE "\.test\.|server\.ts"; then
  T3_VER="ERRADA (atalho por hub)"
else
  T3_VER="plausivel"
fi
T3_T=$((
  $(cd portaria && grep -rn "juntarEvidencia\|EvidenciaJuntar" src/ 2>/dev/null | bytes) +
  $(bytes_dos_ficheiros <<'EOF'
src/lib/actions/dossier-evidencias.ts
src/components/admin/evidencia-juntar.tsx
src/app/(app)/fornecedores/[id]/page.tsx
EOF
)
))
linha "T3 cadeia evidencia -> pagina" "$(printf '%s' "$T3_OUT" | bytes)" "$T3_T" "$T3_VER"

# ------------------------------------------------------- cobertura da extraccao
echo
echo "Cobertura da extraccao (porque T2 nao chega a 74/74):"
PAGES_DISCO=$(find portaria/src/app -name 'page.tsx' | wc -l | tr -d ' ')
PAGES_DISCO="$PAGES_DISCO" node -e '
const g=JSON.parse(require("fs").readFileSync(".graphify/graph.json","utf8"));
const temImport=(n)=>g.links.some(l=>(l.source===n.id||l.target===n.id)&&/import/.test(l.relation));
const grupos={};
for(const n of g.nodes){
  const k=/\/app\//.test(n.source_file||"")?"  app/ (rotas)   ":"  resto de src/  ";
  grupos[k]=grupos[k]||{nos:0,com:0};
  grupos[k].nos++;
  if(temImport(n))grupos[k].com++;
}
for(const [k,v] of Object.entries(grupos))
  console.log(k+v.nos+" nos, "+v.com+" com aresta de import ("+(v.com/v.nos*100).toFixed(0)+"%)");
// Ficheiros distintos, nao simbolos: varios nos partilham o mesmo page.tsx.
const ficheiros=new Set(g.nodes.map(n=>n.source_file).filter(f=>/\/page\.tsx$/.test(f||"")));
console.log("  page.tsx: "+process.env.PAGES_DISCO+" em disco, "+ficheiros.size+" presentes no grafo");
'

TODO_SRC=$(cd portaria && find src -type f \( -name '*.ts' -o -name '*.tsx' \) | bytes_dos_ficheiros)
echo
echo "Referencia: ler src/ por inteiro custa $TODO_SRC bytes (~$((TODO_SRC / 4)) tokens)."
echo "O grafo tem $(wc -c <"$GRAFO") bytes e nenhuma consulta o carrega:"
echo "o servidor le-o em disco e devolve so o subgrafo."
