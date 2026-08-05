# Relatório de Conclusão — Fase 0 (Isolamento multi-tenant)

**Âmbito:** bloqueadores P0 de segurança da auditoria (S1–S6, C2, S8).
**Branch:** `claude/rls-multi-tenant-audit-ccw5iv`
**Data:** 5 de agosto de 2026
**Estado da produção:** **NÃO alterada.** Nenhuma migração aplicada, nenhum dado tocado.

---

## 1. Resumo executivo

Todos os oito bloqueadores técnicos P0 da auditoria estão **corrigidos ao nível do código**, numa única migração de hardening (`0028_hardening_multitenant.sql`) mais dois alinhamentos mínimos de server actions. As correções foram validadas por reconstrução do schema num PostgreSQL local descartável e por testes de comportamento com RLS ativo. Falta apenas o passo de **aplicação controlada** (staging → produção), que carece de autorização (Decisão D-D) e de um ambiente Supabase local para correr a suite TypeScript end-to-end.

Os bloqueadores **legais** P0 (L-28 contrato art. 28.º, L-44 transferência para a China) **não** são desta fase — são tratados na Fase 3. A recomendação da auditoria de **retirar votações e IA do âmbito do Beta** mantém-se como decisão da Inês (D-A, D-B); as correções desta fase tornam ambos os módulos defensáveis ao nível do isolamento, mas não resolvem as questões jurídicas.

---

## 2. O que foi ALTERADO

### 2.1 Migração `supabase/migrations/0028_hardening_multitenant.sql` (nova)

> Numerada **0028** e não 0027: `0027_financeiro.sql` já existia. Ver `docs/security/rls-audit-0027.md`, secção 0.

| Bloco | Achado | Alteração |
|---|---|---|
| 0 | infra | `user_tem_papel(tenant, papéis[])` (RLS por papel) e `try_uuid()` (cast seguro em storage). |
| 1 | **S1** | Remove a policy `INSERT` permissiva (`with check (true)`) de `notificacoes`. Notificações passam a nascer só de triggers/funções definer/service_role. |
| 2 | **S2** | `revoke execute … from public, anon` nas 8 funções `SECURITY DEFINER`; `notificar_todos`/`notificar_admins` revogadas também de `authenticated`. Validação de membership no corpo de `total_permilagem_tenant`, `verificar_disponibilidade`, `contar_reservas_semana`. |
| 3 | **S3** | `buscar_chunks`/`estado_conhecimento` validam internamente que `auth.uid()` pertence a `p_tenant_id` (0 linhas caso contrário). |
| 4 | **S4** | Nova RPC transacional `registar_voto` (lock do participante, valida votação aberta + participação + opção + unicidade, insere voto e marca `votou_em` atomicamente). Remove o `INSERT` direto de `votos` e o `UPDATE` de membro em `votacao_participantes`. Devolve o hash de comprovativo. |
| 5 | **S5** | `INSERT`/`UPDATE` de `reservas` exigem coerência `user_id=auth.uid()` **e** tenant do utilizador **e** espaço pertencente a esse tenant. |
| 6 | **S6** | `inquilino` deixa de ler documentos sensíveis (`conta`/`ata`/`contrato`/`apolice`), assembleias, pontos e votações — via `user_tem_papel`. Política de storage alinhada. |
| 7 | **C2** | Embeddings `ocorrencia_resolvida` passam a admin-only (na tabela e no RAG). |
| 8 | **S8** | `user_permilagem` só devolve dados ao próprio utilizador ou a admin do tenant. |

### 2.2 Server actions (alinhamento mínimo com a migração)

Sem isto, a migração parte fluxos existentes:

- **`src/lib/actions/votacoes.ts` — `votar()`**: deixa de inserir em `votos` e de atualizar `votacao_participantes` pelo cliente; chama `rpc('registar_voto')` e traduz as exceções da função em mensagens. Removido o helper de hash agora não usado.
- **`src/lib/actions/ia-rag.ts` — `sugerirResolucao()`**: passa de `getCurrentUserInTenant()` para `requireAdmin()` (C2).

### 2.3 Testes e tooling (nova infraestrutura)

- `tests/security/{helpers,fixtures,rls-p0.test}.ts` + `README.md` — suite P0 contra PostgREST direto.
- `vitest.config.ts`; scripts `test` e `test:security`; `vitest` como devDependency.

**Nenhuma funcionalidade fora do âmbito P0 foi alterada.** S7, S9, S10, S11, S12, A1, A2, A4 (P1) ficam para a Fase 1.

---

## 3. O que foi TESTADO

### 3.1 Aplicação da migração (harness SQL local descartável)

Ambiente: PostgreSQL 16 local, efémero, com stubs das peças Supabase (`auth`, `storage`, roles `anon`/`authenticated`/`service_role`), shim do tipo `vector` e `btree_gist`; schema reconstruído a partir das migrações reais 0001–0026 e depois `0028`.

| Verificação | Resultado |
|---|---|
| `0028` aplica sem erros de sintaxe nem referências a objetos inexistentes | ✅ (critério de aceitação da Tarefa 0.1) |
| Reaplicação (idempotência) | ✅ limpo |
| Grants: `PUBLIC`/`anon` sem `EXECUTE`; `notificar_*` só owner | ✅ confirmado via `pg_proc.proacl` |
| Políticas: `notificacoes` sem INSERT; `votos` sem INSERT; `votacao_participantes` sem UPDATE de membro; `reservas` com coerência; `conhecimento_embeddings` com exclusão de origem | ✅ confirmado via `pg_policies` |

### 3.2 Comportamento com RLS ativo (sessões anon/authenticated simuladas)

| ID | Caso | Resultado |
|---|---|---|
| S1 | anon insere notificação | **bloqueado** (RLS) ✅ |
| S4 | 1.º voto legítimo | OK (devolve hash) ✅ |
| S4 | 2.º voto do mesmo participante | **bloqueado** ("Já votou") ✅ |
| S4 | voto em votação fechada (participante) | **bloqueado** ("não está aberta") ✅ |
| S4 | não-participante vota | **bloqueado** ✅ |
| S5 | reserva cruzada (espaço de outro tenant) | **bloqueado** (RLS) ✅ |
| S5 | tenant/espaço incoerentes | **bloqueado** (RLS) ✅ |
| S5 | reserva legítima no próprio tenant | OK ✅ (controlo positivo) |
| S3 | condómino vê `regulamento` | OK ✅ |
| C2 | condómino NÃO vê `ocorrencia_resolvida` | ✅ |
| C2 | admin vê `ocorrencia_resolvida` | ✅ |
| S3 | membro de outro tenant lê tenant A | **0 linhas** ✅ |
| S6 | inquilino no RAG só vê `regulamento` (sem ocorrências) | ✅ |
| S8 | leitura cross-tenant de permilagem | **NULL** ✅ |

### 3.3 Aplicação (código)

- `npm run type-check` (`tsc --noEmit`): **limpo**.
- `npm run build` (`next build`): **verde**.
- `registar_voto` (versão `returns text`): testada em cluster local — devolve SHA-256 de 64 hex.
- Suite vitest: **carrega** e faz **skip** limpo dos 22 testes sem env (comportamento pretendido).

---

## 4. O que ficou apenas INFERIDO / não executado

- **Suite TypeScript contra PostgREST live (Tarefa 0.10):** escrita e validada quanto a tipos/carregamento, mas **não executada** contra um Supabase real — o ambiente não tem Supabase CLI nem Docker para levantar PostgREST+GoTrue. A prova de comportamento RLS foi obtida pelo harness SQL direto (secção 3.2), que testa a mesma fronteira. Correr a suite TS é o passo de CI (Tarefa 2.4) / Supabase local (Tarefa 2.6).
- **Interação de triggers ↔ novas políticas em produção real:** validado que os triggers `SECURITY DEFINER` continuam a inserir em `notificacoes` (correm como owner, contornam RLS), mas não exercido contra a instância real.

---

## 5. O que DEPENDE de configuração externa

- **Variáveis Supabase local** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) para correr a suite P0. Ver `tests/security/README.md`.
- **Autorização explícita para aplicar a migração** em qualquer ambiente partilhado (Decisão D-D).

---

## 6. Funcionalidades que devem permanecer DESLIGADAS no Beta

Recomendação da auditoria, mantida (decisão da Inês — D-A, D-B):

1. **Votações eletrónicas** — S4 está tecnicamente resolvido e testado, mas o valor probatório/jurídico da urna (C5/L6) é decisão à parte. A auditoria recomenda não lançar até integridade **e** verificabilidade estarem demonstradas end-to-end.
2. **Assistente de IA** — o isolamento (S3/C2) está corrigido, mas a transferência para a China (L-44) e a expectativa de indexação de PDF (A1) são bloqueadores próprios (Fases 1 e 3). Alternativa: manter só sobre o regulamento, sem ingestão de ocorrências, com provedor UE.

Nada nesta fase liga ou desliga estes módulos — é decisão de produto.

---

## 7. Passos manuais para aplicação (proposta, pendente de autorização)

1. **Alinhar server actions primeiro** (já neste branch): `votar()`→`registar_voto`, `sugerirResolucao()`→`requireAdmin()`. Deploy do código **antes** da migração, ou em conjunto.
2. **Staging:** aplicar `0028` num ambiente de staging que espelhe produção.
3. **Correr a suite P0** (`npm run test:security`) contra staging: deve passar a 100%.
4. **Smoke manual em staging:** votar (uma vez; 2.ª rejeitada), reservar (próprio tenant OK; cruzado falha), inquilino sem contas/atas, RAG sem ocorrências para condómino.
5. **Produção:** aplicar `0028` fora de horas; repetir o smoke reduzido.
6. **Registo:** anotar a migração aplicada (preparar Supabase CLI — Tarefa 2.6 — para deixar de aplicar à mão, D3).

---

## 8. Plano de ROLLBACK

A `0028` só cria/reforça restrições e revoga grants — não altera dados. O rollback é reverter para o estado de políticas/grants anterior:

- **Preferível — recriar o estado anterior por migração de reversão** (`00xx_revert_hardening.sql`): repor as políticas antigas (`system insert notifications`, `system inserts votos`, `users update own participacao`, `users create own reservas` sem coerência, `members read embeddings` sem exclusão, `members see …` sem `user_tem_papel`) e os grants originais (`grant execute … to anon` — **não recomendado**, reabre os vetores), e `drop function registar_voto/user_tem_papel/try_uuid`. Isto **reabre os bloqueadores** — só usar se a aplicação partir de forma crítica.
- **Antes de aplicar:** capturar o estado atual de políticas e grants (`pg_policies`, `pg_proc.proacl`) para reconstrução fiel.
- **Reversão parcial recomendada em caso de incidente:** em vez de reverter tudo, reverter apenas o bloco problemático (as alterações são independentes por tabela/função). Ex.: se `registar_voto` falhar, repor temporariamente a policy de INSERT de `votos` **restrita a authenticated** (não a permissiva original) enquanto se corrige.
- **Server actions:** reverter os dois commits de alinhamento repõe o comportamento antigo (mas volta a inserir em `votos` diretamente — só faz sentido em conjunto com a reversão SQL).

> Nota: como nada foi aplicado em produção, o "rollback" é hoje apenas `git revert` do branch. O plano acima é para o momento da aplicação.

---

## 9. Confirmação final

- **Produção não foi alterada.** Nenhuma migração aplicada; nenhum dado tocado; nenhuma configuração de produção mexida.
- Toda a validação decorreu em cluster PostgreSQL local **descartável**, removido no fim.
- A migração e as alterações estão no branch `claude/rls-multi-tenant-audit-ccw5iv` (PR #42), prontas para revisão e aplicação controlada.
