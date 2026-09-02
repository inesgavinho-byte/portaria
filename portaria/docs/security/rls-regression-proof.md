# Prova de regressão RLS — procedimento e evidência

Item 2.3 do `docs/engineering/phase-2-report.md`: demonstração de que a suite
de segurança apanha uma regressão real de RLS. Sem esta prova, uma suite verde
não prova nada — pode estar verde porque nunca falharia.

## Estado

**VERIFICADO localmente** (cluster Supabase local descartável, 2026-09-02;
produção não foi tocada). O procedimento completo foi executado de ponta a
ponta: linha de base verde → política permissiva reintroduzida → suite
**falha** → reverter → verde. Os comandos e saídas reais estão nas secções 3
e 4.

## 1. Pré-requisitos

- Um Supabase **local** descartável com as migrações aplicadas. O porto 54322
  pode estar ocupado por outro projeto; este procedimento usou um stack
  próprio em portos alternativos (API `64321`, Postgres direto `64322` — os
  mesmos mecanismos funcionam com `supabase start` nos portos padrão
  `54321`/`54322`).
- `npm run test:security` corre as suites contra o PostgREST do stack.
- Acesso `psql` ao Postgres do stack (para introduzir e reverter a política
  permissiva).

```bash
export SUPABASE_URL="http://127.0.0.1:<porta-api>"
export SUPABASE_ANON_KEY="<anon/publishable key local>"
export SUPABASE_SERVICE_ROLE_KEY="<service/secret key local>"
```

## 2. O alvo da regressão

`notificacoes` (bloqueador S1 da auditoria): hoje nenhum cliente insere
notificações — a camada de grants tem `INSERT` revogado a `anon` e
`authenticated` (`20260826030000`, bloco 7) e **não existe** política INSERT
(o `with check (true)` de 0001 foi removido em 0028). A regressão simulada é
a reintrodução de ambas as camadas — exatamente a "política permissiva" que o
phase-2-report descreveu, na forma `FOR ALL ... using (true) with check
(true)` (a postura por omissão do Supabase para tabelas novas).

## 3. Procedimento exato

### 3.1 Linha de base — verde

```bash
npx vitest run tests/security/rls-p0.test.ts -t "S1" --reporter=basic
# Test Files  1 passed (1)
#      Tests  3 passed | 19 skipped (22)
```

### 3.2 Reintroduzir a regressão (via psql, como superuser)

```sql
create policy "REGRESSAO TEMPORARIA — for all true"
  on public.notificacoes
  for all
  to anon, authenticated
  using (true) with check (true);

grant insert on public.notificacoes to anon, authenticated;

notify pgrst, 'reload schema';  -- limpa a cache de schema do PostgREST
```

Confirmação de que a porta está aberta (fora da suite):

```bash
curl -o /dev/null -w "HTTP:%{http_code}\n" -X POST \
  "$SUPABASE_URL/rest/v1/notificacoes" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"tenant_id":"<uuid-real>","user_id":"<uuid-real>","tipo":"sistema","titulo":"probe"}'
# HTTP:201
```

### 3.3 A suite deve falhar

```bash
npx vitest run tests/security/rls-p0.test.ts -t "S1" --reporter=basic
#  FAIL  rls-p0.test.ts > S1 > NEG: anon não pode inserir notificação
#    AssertionError: expected 201 to be greater than or equal to 400
#  FAIL  rls-p0.test.ts > S1 > NEG: um membro não pode inserir notificação para outro utilizador
#    AssertionError: expected 201 to be greater than or equal to 400
# Tests  2 failed | 1 passed | 19 skipped (22)
```

Os dois testes NEGATIVOS de S1 falham — o ataque passa e a rede apanha-o. O
teste positivo continua a passar (o fluxo legítimo continua a funcionar),
como esperado.

### 3.4 Reverter e confirmar verde

```sql
drop policy if exists "REGRESSAO TEMPORARIA — for all true" on public.notificacoes;
revoke insert on public.notificacoes from anon;
revoke insert on public.notificacoes from authenticated;
delete from notificacoes where titulo like 'probe%';   -- limpeza das linhas de teste
notify pgrst, 'reload schema';
```

```bash
npx vitest run tests/security/rls-p0.test.ts -t "S1" --reporter=basic
#      Tests  3 passed | 19 skipped (22)
```

## 4. Notas obtidas na execução real (armadilhas)

1. **Política `INSERT` com `with check (true)` sozinha NÃO basta para abrir a
   porta via PostgREST.** As suites inserem com `Prefer:
   return=representation`, que o PostgREST executa como `INSERT ... RETURNING`;
   o `RETURNING` exige que a nova linha satisfaça a política `SELECT`
   (`user_id = auth.uid()`). Sem política `SELECT` permissiva, a instrução
   aborta com `42501` e o teste NEG continua verde **sem** a linha ter sido
   escrita. A regressão realista é `FOR ALL ... using (true) with check (true)`
   — que é, de resto, a postura por omissão do Supabase.
2. **A camada de grants fala primeiro.** Com `INSERT` revogado, qualquer
   política permissiva é irrelevante (`42501` de grants antes do RLS). Uma
   regressão real pode escapar por qualquer uma das duas camadas; a prova
   reintroduz ambas.
3. **`notify pgrst, 'reload schema'` após DDL.** Sem isso, o PostgREST serve a
   cache de schema antiga e os resultados parecem não mudar. Um
   `docker restart` do contentor REST serve o mesmo fim.
4. **Nunca correr isto contra produção.** O procedimento abre
   deliberadamente uma falha de injetação de notificações. Usar apenas um
   ambiente local descartável; a limpeza (3.4) é obrigatória.

## 5. Âmbito e limites da prova

- **Provado (VERIFIED, local):** a suite deteta a reintrodução de uma política
  permissiva em `notificacoes` (S1) e distingue-a de um falso negativo de
  grants — os testes negativos falham com a porta aberta e voltam a passar com
  a reversão exata.
- **Não provado aqui:** a mesma demonstração tabela a tabela para as restantes
  superfícies da matriz. O mecanismo é idêntico (política permissiva → suite
  falha → reverter) e cada tabela da matriz tem agora um teste NEG que serve
  de detector; repetir o ciclo para todas é trabalho mecânico que pode ser
  feito pontualmente quando uma política específica estiver em alteração.
- **Produção:** nenhum comando desta página correu contra produção. O stack de
  verificação foi um Supabase local descartável construído apenas a partir de
  `supabase/migrations/`.
