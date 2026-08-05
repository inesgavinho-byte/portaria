# Relatório — Fase 2 (Rede de segurança de engenharia)

**Branch:** `claude/rls-multi-tenant-audit-ccw5iv` (PR #42)
**Data:** 5 de agosto de 2026
**Produção:** não alterada.

---

## 1. Entregue

| Tarefa | Entregável | Estado |
|---|---|---|
| 2.1 | `docs/security/authorization-matrix.md` — matriz papéis × operações × objetos (após 0028/0029/0030), com lacunas marcadas. | ✅ |
| 2.4 | `.github/workflows/ci.yml` — type-check, lint (não bloqueante), build, Supabase local + `test:security`. | ✅ (ver §3) |
| 2.5 | `docs/engineering/branch-protection.md` — configuração a aplicar no GitHub. | ✅ (doc; não aplicada) |
| 2.6 | `supabase/config.toml` — permite `supabase start`/`db reset`. | ✅ parcial (ver §3) |
| 2.7 | `supabase/migrations/README.md` — saltos 0010–0014/0019, convenções, dívida. | ✅ |
| 0.10/2.2 | `tests/security/` — suites P0 (rls-p0) e P1 (rls-p1) contra PostgREST. | ✅ P0+P1; matriz completa **parcial** (§2) |

## 2. Parcial / a completar

- **2.2 — matriz completa de testes.** Existem suites para **todos os P0
  (S1–S6, S8, C2)** e para os P1 de RLS (**S7, S9, S10**). Falta expandir para
  cobrir **todas** as tabelas multi-tenant e RPC nas seis perspetivas (a
  estrutura `tests/security/` e os helpers já suportam a expansão). Cada
  política deveria ter: um teste de acesso legítimo, um de negação e um
  cross-tenant.
- **2.3 — regressão intencional.** Não executada. Procedimento (a correr com
  Supabase local): reintroduzir temporariamente uma política permissiva (ex.:
  `with check (true)` em `notificacoes`), correr `npm run test:security` e
  confirmar que o teste negativo de S1 **falha**; reverter e confirmar verde.
  Guardar evidência em `docs/security/rls-regression-proof.md`. O mecanismo
  (suite + CI) já existe; falta a demonstração registada.

## 3. Depende de primeira execução real

- **CI (2.4) e `config.toml` (2.6)** foram validados **sintaticamente** (YAML e
  TOML), mas **não** foram corridos num runner GitHub nem com a Supabase CLI
  real. A primeira execução pode exigir ajustes menores:
  - versão da Supabase CLI e nomes de variáveis do `supabase status -o env`
    (assumidos `API_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`);
  - compatibilidade do `config.toml` com a versão da CLI (regenerável com
    `supabase init`).
  - Recomenda-se abrir um PR de teste para o CI correr e afinar.

## 4. Provas já existentes (do trabalho das Fases 0–1)

Embora a suite TypeScript ainda não tenha corrido contra PostgREST live, o
comportamento de RLS foi **provado** por reconstrução do schema (0001→0030) num
cluster PostgreSQL local descartável, com sessões `anon`/`authenticated` e RLS
ativo — ver `docs/security/phase-0-report.md` §3.2 e `docs/beta/phase-1-report.md`
§5. O CI passa a automatizar exatamente esta verificação em cada PR.

## 5. Confirmação

- Produção não alterada. Nenhum segredo commitado.
- `main` ainda **sem** proteção efetiva até a config de branch protection ser
  aplicada no GitHub (requer admin do repositório).
