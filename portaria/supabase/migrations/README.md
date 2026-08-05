# Migrações — Portaria

Ordem de aplicação = ordem numérica dos ficheiros. Aplicar sempre com a
Supabase CLI (`supabase db reset` em local; ver `docs/engineering/`), nunca à
mão no SQL Editor (achado D3).

## Saltos de numeração (D5) — NÃO há schema em falta

A numeração salta alguns intervalos. **Estes números nunca foram usados** —
não representam migrações perdidas nem schema em falta. Confirmado no histórico
de git:

- **0010–0014** — nunca existiram.
- **0019** — nunca existiu.

Não reutilizar estes números. As migrações novas continuam a partir do
**último número existente** (atualmente a próxima livre é a seguir à mais alta
presente nesta pasta).

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
