# CHANGELOG — Iteração 2: Painel Admin

Esta iteração implementa o **Bloco A** do roadmap: o painel administrativo
para gestão de avisos e documentos.

---

## ✨ Adicionado

### Editor rico (Tiptap)
- `src/components/admin/rich-editor.tsx` — editor WYSIWYG baseado em Tiptap
- Toolbar com: negrito, itálico, títulos H2/H3, listas, citação, links, undo/redo
- O conteúdo é exportado como HTML e guardado na coluna `avisos.conteudo`
- A página pública renderiza com `dangerouslySetInnerHTML` e estilos `prose`
  do plugin `@tailwindcss/typography`

### Server Actions
- `src/lib/actions/avisos.ts` — `criarAviso`, `atualizarAviso`,
  `desativarAviso`, `reativarAviso`
- `src/lib/actions/documentos.ts` — `criarDocumento`, `apagarDocumento`,
  `gerarLinkDownload`
- Todas validam role admin server-side antes de executar
- Validação básica de campos com mensagens em português

### Páginas admin de avisos
- `/configuracao/avisos` — listagem com ações inline (editar, arquivar)
- `/configuracao/avisos/novo` — criar
- `/configuracao/avisos/[id]/editar` — editar
- Soft delete (`ativo = false`) em vez de delete real, para preservar histórico

### Páginas admin de documentos
- `/configuracao/documentos` — listagem com tamanho do ficheiro e ano
- `/configuracao/documentos/novo` — upload com seleção de categoria
- Validação: tamanho máx. 25 MB, ano entre 1900-2100
- Path no Storage: `documentos/{tenant_id}/{documento_id}/{filename_seguro}`
- Sanitização de nome (timestamp + extensão) para evitar problemas com acentos

### Download seguro
- `src/components/app/download-button.tsx` (client) chama
  `gerarLinkDownload` (server action), que gera URL assinado válido por 60s
- Sem URLs públicos permanentes — segurança garantida

### Layout de configuração
- `src/app/(app)/configuracao/layout.tsx` redirecciona não-admins para `/avisos`
- Navegação interna entre Avisos e Documentos

---

## 📦 Dependências adicionadas

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`,
  `@tiptap/extension-link`, `@tiptap/extension-placeholder`
- `@tailwindcss/typography` (devDep) — para classes `prose`

---

## 🔒 Segurança

A defesa em profundidade é mantida:

1. **Cliente** — validação básica nos formulários (`required`, `maxLength`)
2. **Server Action** — verifica role admin, valida campos
3. **RLS Supabase** — políticas rejeitam mutations de não-admins ao nível da DB

Mesmo que alguém contornasse 1 e 2, a base de dados rejeitaria.

---

## 🧪 Como testar

1. `npm install`
2. `npm run dev`
3. Login como admin (criado via SQL no Supabase, ver README)
4. Ir a `/configuracao/avisos` → "Novo aviso"
5. Escrever título, escolher prioridade, escrever conteúdo no editor
6. Publicar → ver na lista admin e na página pública `/avisos`
7. Editar/arquivar a partir da lista admin
8. Repetir para `/configuracao/documentos`

---

## 🔜 Próximo

Bloco B (gestão de utilizadores):
- Convites por email a novos condóminos
- Página de aceitação do convite
- Recuperação de password

Ver `docs/proximos-passos.md` para o roadmap completo.
