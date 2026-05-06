# portaria

Plataforma digital multi-tenant para administração de condomínios.

Stack: **Next.js 15** (App Router, TypeScript) + **Supabase** (Postgres, Auth, Storage) + **Tailwind CSS** + **Netlify** (hosting).

---

## Arranque rápido

### 1. Pré-requisitos

- Node.js 20+ instalado
- Conta Supabase (com projeto criado)
- Conta Netlify
- Git

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copia o `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preenche os valores com os do teu projeto Supabase (Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (apenas para operações privilegiadas; nunca expor ao cliente)

### 4. Aplicar a migration inicial no Supabase

No dashboard Supabase do teu projeto:
1. Vai a **SQL Editor → New Query**
2. Copia o conteúdo de `supabase/migrations/0001_initial_schema.sql`
3. Cola e corre

Esta migration cria todas as tabelas, políticas RLS (Row-Level Security), o bucket de storage, e insere o tenant inicial (Edifício Europa).

### 5. Criar o teu utilizador admin

a) Inscreve-te através do Supabase Dashboard (**Authentication → Users → Add user**) ou via app no `/registo` (a implementar).

b) No SQL Editor, associa o utilizador ao tenant como admin:

```sql
insert into public.user_tenants (user_id, tenant_id, fracao, role)
values (
  '<copia o UUID do teu utilizador da tabela auth.users>',
  (select id from public.tenants where slug = 'europa'),
  '3.º Direito',
  'admin'
);
```

### 6. Correr em desenvolvimento

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). O middleware está configurado para resolver `localhost` como tenant `europa`.

---

## Arquitetura multi-tenant

### Identificação do tenant

O tenant é resolvido pelo **hostname** da request. O middleware (`src/middleware.ts`) faz esse mapeamento e passa o `slug` do tenant via header `x-tenant-slug`.

| Hostname | Tenant |
|---|---|
| `edificioeuropa.pt` | `europa` |
| `localhost:3000` | `europa` (default em dev) |
| `<futuro>.pt` | a configurar |

Para acrescentar um novo tenant: edita `resolveTenantFromHostname()` no middleware e insere uma linha na tabela `tenants` no Supabase.

### Isolamento de dados

O isolamento é feito **na base de dados**, via Row-Level Security (RLS) — não confiamos apenas no código. Mesmo que um bug no frontend tente ler dados de outro tenant, as políticas RLS impedem.

As políticas-chave:
- Cada utilizador só vê linhas das tabelas onde `tenant_id` está nos seus tenants (via função `user_tenant_ids()`).
- Apenas utilizadores com `role = 'admin'` no tenant podem fazer `INSERT/UPDATE/DELETE` em `avisos`, `documentos`, `tenants` (via função `is_tenant_admin()`).
- Storage segue convenção: ficheiros guardados em `documentos/{tenant_id}/{documento_id}/{filename}`, com políticas de acesso baseadas no path.

### Roles

- **`condomino`** — utilizador comum; vê avisos e documentos do seu prédio
- **`comissao`** — funcionalidades adicionais (a definir; ex: comissão de obras)
- **`admin`** — administração; pode publicar avisos, fazer upload de documentos, gerir membros

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (public)/         → páginas públicas (sem auth)
│   ├── (auth)/           → login, registo, recuperação de password
│   ├── (app)/            → área autenticada (avisos, documentos, etc.)
│   ├── globals.css       → CSS global + variáveis de tema
│   └── layout.tsx        → root layout
│
├── components/
│   ├── ui/               → componentes primitivos (botões, inputs, etc.)
│   ├── layout/           → headers, footers
│   ├── public/           → componentes específicos das páginas públicas
│   └── app/              → componentes da área autenticada
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts     → cliente para Client Components
│   │   ├── server.ts     → cliente para Server Components
│   │   └── tenant.ts     → helpers para resolver tenant atual
│   └── utils/            → utilidades genéricas
│
├── types/
│   └── database.ts       → tipos das tabelas Supabase
│
└── middleware.ts         → middleware central (auth refresh + tenant resolution)

supabase/
└── migrations/           → migrations SQL versionadas

public/                   → assets estáticos (logos, imagens)
docs/                     → documentação do projeto
```

---

## Roadmap

### v1 — MVP utilizável (4-6 semanas)

- [x] Estrutura base + multi-tenancy
- [x] Páginas públicas (homepage, história, contactos)
- [x] Autenticação (login)
- [x] Mural de avisos (read-only para condóminos)
- [x] Repositório de documentos (read-only para condóminos)
- [ ] Painel de admin para publicar avisos
- [ ] Painel de admin para upload de documentos
- [ ] Recuperação de password
- [ ] Convites por email para novos condóminos

### v2 — Operacional

- Caixa de sugestões digital
- Formulários estruturados de pedidos à administração (com ticket ID)
- Calendário de intervenções técnicas
- FAQ alimentada com perguntas reais
- Newsletter trimestral integrada

### v3 — Avançada

- Votações eletrónicas
- Gestão financeira pessoal por fração
- Aplicação móvel (PWA)
- Inquéritos de satisfação

---

## Deploy no Netlify

1. Faz push do código para um repositório Git (GitHub recomendado)
2. No Netlify, **Add new site → Import an existing project**
3. Liga ao repo
4. Configura as variáveis de ambiente (mesmas do `.env.local`, sem `NEXT_PUBLIC_APP_URL`)
5. Deploy

### Domínios

Para cada prédio, adicionar o domínio em **Site settings → Domain management** e atualizar o mapeamento em `src/middleware.ts`.

---

## Notas de segurança

- **Nunca commitar `.env.local`** — está no `.gitignore`
- A `SUPABASE_SERVICE_ROLE_KEY` ignora RLS — usar apenas em código server-side seguro
- Auditar políticas RLS sempre que se adicionar nova tabela ou role
- Testar isolamento entre tenants regularmente (criar 2 tenants, garantir que um não vê dados do outro)

---

## Licença

Proprietária. Desenvolvido por Arq.ª Inês Gavinho (GAVINHO).
