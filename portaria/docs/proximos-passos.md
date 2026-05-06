# Próximos passos

Lista de tarefas para concretizar a v1, organizadas em ordem sugerida de execução.

---

## 🟢 Setup inicial (1-2 horas)

- [ ] `npm install` — instalar dependências
- [ ] Criar projeto Supabase no dashboard (se ainda não criado)
- [ ] Copiar `.env.example` → `.env.local` e preencher credenciais Supabase
- [ ] Correr migration `supabase/migrations/0001_initial_schema.sql` no SQL Editor
- [ ] Criar utilizador admin (ver README, secção 5)
- [ ] `npm run dev` — confirmar que o site abre em localhost:3000
- [ ] Fazer login com o utilizador admin criado

---

## 🟡 Funcionalidades em falta na v1 (estimativa: 2-3 semanas)

### Painel de admin para avisos
- [ ] Página `/configuracao/avisos` listando todos os avisos do tenant
- [ ] Formulário `/configuracao/avisos/novo` para criar
- [ ] Server Action para inserir aviso (validar role admin)
- [ ] Funcionalidade de editar/desativar avisos existentes
- [ ] Restrição de acesso à página: só admins (ver layout `(app)/configuracao/`)

### Painel de admin para documentos
- [ ] Página `/configuracao/documentos` com listagem
- [ ] Formulário de upload (multipart, com seleção de categoria e ano)
- [ ] Server Action para upload no Storage + insert na tabela
- [ ] Geração de URL assinado para download (em `documentos/page.tsx`, função `DownloadButton` está incompleta)
- [ ] Funcionalidade de eliminar documento

### Recuperação de password
- [ ] Página `/recuperar` com formulário (email)
- [ ] Email de reset (configurar template no Supabase dashboard)
- [ ] Página `/recuperar/confirmar` para definir nova password

### Convites a novos condóminos
- [ ] Página `/configuracao/membros` com lista
- [ ] Formulário para enviar convite (email + fração + role)
- [ ] Email de convite com link único
- [ ] Página de aceitação do convite (registo + associação ao tenant)

### Páginas públicas em falta
- [ ] `/historia` — texto sobre o edifício
- [ ] `/contactos` — formulário de contacto + info da administração

---

## 🔵 Polimento e qualidade (1 semana)

- [ ] Estados de loading (skeletons) em todas as páginas
- [ ] Mensagens de erro amigáveis (não expor erros técnicos do Supabase)
- [ ] Validação de formulários (idealmente com Zod)
- [ ] Confirmação antes de ações destrutivas (apagar aviso, apagar documento)
- [ ] Empty states bonitos quando não há dados
- [ ] Responsividade móvel testada em iPhone e Android
- [ ] Acessibilidade (labels nos inputs, ordem de tabs, contraste)
- [ ] Favicon e ícones (Apple touch icon, etc.)
- [ ] Open Graph tags para partilha em redes sociais

---

## 🟣 Deploy (1 dia)

- [ ] Push do código para GitHub (repo privado)
- [ ] Conectar Netlify ao repo
- [ ] Configurar variáveis de ambiente no Netlify
- [ ] Primeiro deploy
- [ ] Adquirir domínio (`edificioeuropa.pt` ou similar)
- [ ] Configurar domínio custom no Netlify
- [ ] Configurar DNS no registar do domínio
- [ ] Testar em produção com utilizador real

---

## ⚪ Testes antes de anunciar aos condóminos

- [ ] Criar 2-3 utilizadores de teste com roles diferentes
- [ ] Testar fluxo: login → ver avisos → ver documentos → logout
- [ ] Testar fluxo admin: criar aviso → publicar → confirmar visibilidade
- [ ] Testar acesso negado: utilizador comum não consegue aceder a `/configuracao`
- [ ] Testar isolamento: criar segundo tenant fictício e garantir que não há fugas
- [ ] Testar em múltiplos browsers e dispositivos
- [ ] Pedir a 1-2 condóminos de confiança para testar antes de anunciar a todos

---

## 💡 Dicas para vibe coding com Claude / Cursor

- Quando pedires ajuda à IA, **menciona sempre a stack** (Next.js 15 App Router,
  Supabase, TypeScript) — orienta as respostas.
- Se a IA sugerir Pages Router (`pages/`), corrige — usamos App Router (`app/`).
- Para bugs de RLS: verifica as políticas no Supabase Dashboard → Authentication
  → Policies. Os erros costumam ser políticas em falta.
- Para Server Actions, lembra-te de adicionar `"use server"` no topo do ficheiro
  ou da função.
- Se uma página devolve "no rows" mesmo havendo dados, é quase sempre RLS.
  Testa a query no SQL Editor (que ignora RLS) para confirmar.
