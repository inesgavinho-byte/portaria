# CHANGELOG — Iteração 3: Ocorrências end-to-end

Fluxo completo de ocorrências: o condómino reporta (com fotografias),
a administração acompanha até à resolução, e tudo fica registado numa
timeline por ocorrência.

---

## ✨ Adicionado

### Schema (`supabase/migrations/0002_ocorrencias.sql`)
- Tabela `ocorrencias` — título, descrição, categoria, fração (opcional),
  estado (`novo`, `em_curso`, `aguarda_fornecedor`, `resolvido`, `arquivado`)
- Tabela `ocorrencia_eventos` — timeline: criação, fotografias, mudanças
  de estado, notas internas. É a camada de contexto interna do bloco.
- Tabela `ocorrencia_fotografias` + bucket privado `ocorrencias`
  (path `{tenant_id}/{ocorrencia_id}/{filename}`)
- RLS: condómino vê apenas as suas ocorrências e a timeline **sem** notas
  internas; admin vê e gere tudo no seu tenant. Aplicado também no Storage.

### Área do condómino
- `/ocorrencias` — lista das suas ocorrências com estado
- `/ocorrencias/nova` — criar: categoria, descrição, fração (checkbox,
  usa sempre a fração do membership — nunca input livre), até 5 fotografias
- `/ocorrencias/[id]` — detalhe com fotografias, timeline e juntar fotos

### Área de administração
- `/configuracao/ocorrencias` — todas as ocorrências do tenant, filtro por estado
- `/configuracao/ocorrencias/[id]` — detalhe com alteração de estado,
  nota interna, timeline completa (incluindo notas) e fotografias

### Server Actions (`src/lib/actions/ocorrencias.ts`)
- `criarOcorrencia`, `adicionarFotografias`, `alterarEstadoOcorrencia`,
  `adicionarNotaInterna`
- Uploads validados server-side: apenas JPEG/PNG/WebP, máx. 5 MB cada,
  máx. 5 por envio (whitelist de MIME + extensão derivada do MIME)

### Partilhado
- `src/lib/ocorrencias.ts` — fonte única de labels/whitelists de estados
  e categorias (usada por páginas, forms e actions)
- `src/lib/supabase/ocorrencias.ts` — `getOcorrenciaDetalhe` (registo +
  eventos + fotografias com URLs assinados de 1h)
- Componentes: `ocorrencia-detalhe`, `ocorrencia-timeline`,
  `ocorrencia-estado-badge`, `ocorrencia-form`, `fotografia-form`,
  `ocorrencia-admin-controls`
- Navegação: "Ocorrências" no header da app e na configuração

---

## 🔜 Fora de âmbito (deliberado)

Fornecedores, orçamentos, emails/notificações, tarefas automáticas, IA,
dashboard, e "Assuntos" como conceito exposto — a timeline de eventos é a
base interna sobre a qual essa camada de contexto poderá assentar.
