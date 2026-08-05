# Testes de segurança (RLS) — P0

Esta suite exerce o **PostgREST diretamente** (como faria um atacante com a
`anon key` pública), não as server actions. Prova que o isolamento
multi-tenant é imposto pela base de dados (RLS + grants), que é a única
fronteira real de segurança.

## O que cobre

Um teste **negativo** (o ataque é bloqueado) e um **positivo** (o fluxo
legítimo funciona) para cada bloqueador P0 da auditoria:

| ID | Verifica |
|----|----------|
| S1 | anon/membro não injeta notificações; utilizador lê só as suas |
| S2 | anon não chama funções `SECURITY DEFINER`; membro chama as permitidas |
| S3 | RAG (`buscar_chunks`) valida membership; outro tenant obtém 0 linhas |
| S4 | voto único via `registar_voto`; duplo/fechada/INSERT direto rejeitados |
| S5 | reserva no próprio tenant OK; reserva cruzada bloqueada |
| S6 | inquilino sem `conta`/votações; condómino com acesso |
| S8 | `user_permilagem` própria OK; cross-tenant devolve null |
| C2 | condómino não vê `ocorrencia_resolvida`; admin vê |

## Estado esperado

- **Antes** da migração `0028_hardening_multitenant.sql`: vários testes
  **falham** (o ataque passa). É essa a prova de que a migração é necessária.
- **Depois** da `0028` (e das server actions alinhadas): todos passam.

## Como correr

Requer um Supabase alcançável (recomendado: **Supabase local**) com as
migrações `0001`…`0028` aplicadas.

```bash
# 1. Supabase local (Tarefa 2.6) — aplica todas as migrações
supabase start
supabase db reset

# 2. Variáveis de ambiente (as chaves são impressas por `supabase status`)
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="<anon key local>"
export SUPABASE_SERVICE_ROLE_KEY="<service role key local>"

# 3. Correr
npm run test:security
```

> **Nunca** apontar estes testes para produção: criam e apagam utilizadores e
> semeiam/limpam dados. Usar sempre um ambiente local ou de teste descartável.

Sem as variáveis de ambiente definidas, a suite é **ignorada** (skip) em vez
de falhar — para não quebrar ambientes sem Supabase.

## Notas

- Os utilizadores de teste são criados confirmados via admin API (service
  role) e removidos no `afterAll`. As fixtures apagam os tenants (cascade).
- As chamadas usam `fetch` cru a `/rest/v1` e `/rest/v1/rpc` para os casos em
  que interessa o código HTTP (401/403 vs 200), e o cliente `@supabase/
  supabase-js` para asserções sobre linhas devolvidas.
