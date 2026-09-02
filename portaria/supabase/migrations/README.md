# Migrações — Portaria

Ordem de aplicação = ordem numérica dos ficheiros. Aplicar sempre com a
Supabase CLI (`supabase db reset` em local; ver `docs/engineering/`), nunca à
mão no SQL Editor (achado D3).

## Saltos de numeração (D5) — NÃO há schema em falta

A numeração salta alguns intervalos. **Estes números nunca foram usados** —
não representam migrações perdidas nem schema em falta. Confirmado no histórico
de git:

- **0010–0014** — nunca existiram.
- ~~**0019** — nunca existiu.~~ **Reocupado a 2026-09-02** por
  `0019_fornecedores_contratos_base.sql` (ver abaixo) — era o número livre
  imediatamente antes da primeira migração que toca em `fornecedores` (0020).

Não reutilizar os restantes números. As migrações novas continuam a partir do
**último número existente** (atualmente a próxima livre é a seguir à mais alta
presente nesta pasta).

## A cadeia é reprouzível (2026-09-02)

`supabase start` / `supabase db reset` aplicam 0001→`20260902400000` do zero
com sucesso, e a suite de segurança completa corre verde contra essa
reconstrução (**262/262**). Para chegar lá foi preciso reparar o histórico que
só existia em produção, aplicado à mão (D3):

- **`0019_fornecedores_contratos_base.sql`** — `fornecedores` e `contratos`
  nunca tinham sido versionadas (lacuna G-1); cria-as de forma idempotente e
  inerte em produção, e repõe a postura de grants-padrão do Supabase
  (`ALL` a anon/authenticated/service_role + `ALTER DEFAULT PRIVILEGES`), que
  o init local não instala. A migração `20260826030000` volta a apertar os
  defaults no fim da cadeia («tabelas novas nascem fechadas»).
- **`0024_ia_rag.sql`** — pgvector passa a instalar-se explicitamente em
  `extensions` (onde produção o tem) e as funções que usam `<=>` passam a
  `search_path = public, extensions`.
- **`0026_reservas.sql`** — cria `btree_gist` (necessário ao constraint GIST
  de sobreposição de reservas; em produção existia instalado à mão).
- **`0028` / `20260826030000` / `20260902310000`** — `buscar_chunks` e
  `estado_conhecimento` com `search_path = public, extensions` (o `<=>` vive
  no schema da extensão).
- **`20260824200000`** — `tenant_id` ambíguo num JOIN qualificado
  (`c.tenant_id`).
- **`20260825030000`** — o UUID do tenant era um literal de produção; passa a
  derivar-se do contrato do processo, com guarda: numa reconstrução limpa o
  bloco é um no-op (o que a migração guarda é a memória do processo real,
  não um requisito de schema).

Reconstrução local de referência: projeto CLI com os mesmos ficheiros,
`supabase start`, depois `npm run test:security` com o env de
`supabase status -o env`.

## Convenções

- Nome: `NNNN_descricao_curta.sql` (4 dígitos, `snake_case`).
- Idempotência sempre que razoável (`create ... if not exists`,
  `drop policy if exists` antes de `create policy`, `create or replace function`).
- Cada bloco de segurança comentado com o identificador da auditoria
  (S1…S12, C2, A1…, etc.) quando aplicável.
- **Nunca** `supabase db push` para produção sem autorização explícita
  (Decisão D-D). **Nunca** usar `service_role` no browser.

## Migrações de hardening (Fases 0–1)

- `0028_hardening_multitenant.sql` — P0 (S1–S6, C2, S8). *Numerada 0028 porque
  0027 já estava ocupado por `0027_financeiro.sql`.*
- `0029_p1_hardening.sql` — P1 RLS (S7, S10).
- `0030_reservas_minimizacao.sql` — P1 (S9).

Ver `docs/security/rls-audit-0027.md`, `docs/security/phase-0-report.md` e
`docs/beta/phase-1-report.md`.

## Dívida conhecida

- `0027_financeiro.sql` cria funções `SECURITY DEFINER` (`gerar_quotas_mes`,
  `calcular_divida_fracao`, `obter_proximo_numero_recibo`) **sem** `revoke`/
  `grant` — mesmo padrão de S2, fora do âmbito 0023–0026. Fechar antes de o
  módulo financeiro entrar no Beta.
