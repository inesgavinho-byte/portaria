# Relatório — Fase 1 (Falhas visíveis ao utilizador)

**Branch:** `claude/rls-multi-tenant-audit-ccw5iv` (PR #42)
**Data:** 5 de agosto de 2026
**Produção:** **NÃO alterada.** Nenhuma migração aplicada.

---

## 1. Resumo

Corrigidos os achados P1 de produto/segurança da auditoria que estavam prontos para correção segura: **S7, S9, S10, S12, A1, A2, A4, D4**. Cada correção com validação (SQL local + type-check + build) e, quando aplicável, testes na suite `tests/security`. Fica **um** item desta fase deliberadamente por fazer — **S11** (aceitação explícita de convites) — por exigir uma funcionalidade de UI real e teste do fluxo de autenticação (secção 4).

Migrações novas nesta fase: `0029_p1_hardening.sql` (S7, S10) e `0030_reservas_minimizacao.sql` (S9).

---

## 2. Bugs corrigidos

| ID | Correção | Onde | Testado |
|---|---|---|---|
| **S7** | Preferência de notificações grava para condóminos: política de auto-serviço em `user_tenants` + trigger que só deixa mudar `notificacoes_email` (bloqueia auto-promoção a admin); a action confirma que 1 linha foi atualizada. | `0029` + `notificacoes.ts` | ✅ SQL (própria OK, promoção bloqueada, linha alheia 0 rows, admin OK) + vitest |
| **S9** | Minimização de dados nas reservas: leitura direta só das próprias; disponibilidade (sem `user_id`/`motivo`/`num_pessoas`) via `disponibilidade_reservas`. Admin mantém dados completos. | `0030` + `reservas.ts` + UI | ✅ SQL (não-dono 0, ocupação sem dados pessoais, outro tenant 0, dono vê motivo) + vitest |
| **S10** | Cliente só insere mensagens `role='user'`; a resposta do assistente é escrita via service role. | `0029` + `ia-rag.ts` | ✅ SQL (user OK, assistant bloqueado) + vitest |
| **S12** | `escapeHtml(tenant.nome)` no email de nova ocorrência. | `notificacoes.ts` | ✅ revisão (único campo dinâmico não escapado) + build |
| **A1** | Indexação honesta: documentos só indexam título+descrição (`metadata.indexacao='metadados'`); UI de `/ia/configuracao` deixa-o explícito. | `ia-rag.ts` + page | ✅ build |
| **A2** | Reindexação não destrutiva: computa a nova geração antes de apagar a anterior; se o serviço de embeddings falhar, a base anterior é preservada. | `ia-rag.ts` | ✅ build + revisão lógica |
| **D4** | `.env.example` completo (9 variáveis) com obrigatória/opcional, build/runtime e consequência. | `.env.example` | ✅ conferido contra `grep process.env` |
| **A4** | Documentação do cron de renovação de contratos + estado **NÃO CONFIRMADO** do agendamento + 3 formas de o configurar/testar/monitorizar. | `docs/operations/contract-renewal-cron.md` | n/a (doc) |

---

## 3. Decisões tomadas

- **PDF (A1) — Opção B (Beta sem extração).** O repositório **não** tem infraestrutura de extração de texto de PDF para documentos (o `ingerirDocumento` só usa título+descrição; nem sequer está ligado à UI). Em vez de implementar uma extração frágil, a interface passa a dizer inequivocamente que só título e descrição são indexados. O regulamento é exceção: o seu **texto integral** já é extraído e indexado (mantém-se pesquisável).
- **Verificabilidade do voto (D6/C5) — não abordada nesta fase.** `registar_voto` (Fase 0) já devolve um hash de comprovativo; a decisão de expor verificabilidade real por hash ou remover a promessa (Tarefa 1.4) fica para uma iteração dedicada, depende de decisão de produto (D-A) e não bloqueia o Beta se as votações ficarem fora de âmbito.
- **Cron (A4) — NÃO CONFIRMADO.** Não há evidência no repositório de que o endpoint esteja agendado; muito provavelmente os avisos de renovação **não estão a acontecer**. Documentado como configurar; requer confirmação externa (dashboard).
- **Reservas admin (S9).** O admin mantém acesso aos dados completos (quem reservou, motivo) por necessidade operacional — via função separada `listarReservasAdmin` protegida por `requireAdmin`.

---

## 4. Item por fazer nesta fase — S11 (aceitação explícita de convites)

**Estado:** **NÃO implementado** (deliberadamente).

**Porquê deferido:** `aceitar_convites()` aceita hoje, de uma vez, **todos** os convites pendentes para o email autenticado, sem confirmação por convite. Corrigir isto bem exige:
1. uma função `aceitar_convite(p_convite_id)` / `recusar_convite(p_convite_id)` (aceitação por convite, com `aceite_em`/estado de recusa);
2. uma **UI real** que liste os convites pendentes e peça aceitação/recusa explícita de cada um (o fluxo atual processa tudo automaticamente ao definir a password);
3. teste do **fluxo de autenticação** (GoTrue), que não é exercitável no ambiente atual (sem Supabase local).

A auditoria classifica S11 como **P2 / baixo impacto** ("não há fuga de dados; é fricção de consentimento"). Optou-se por **não** entregar meia-funcionalidade (o plano proíbe deixar código morto ou funcionalidade parcialmente exposta). Plano concreto acima; recomenda-se fazê-lo como feature própria com o Supabase local a correr (Tarefa 2.6).

---

## 5. Testes executados

- **Migrações 0029 e 0030:** aplicam sem erros na cadeia completa (0001→0030) num cluster PostgreSQL 16 local descartável; comportamento validado com sessões `authenticated`/RLS (ver tabela §2).
- **Código:** `npm run type-check` limpo; `npm run build` verde em todos os commits.
- **Suite:** `tests/security/rls-p1.test.ts` cobre S7, S9, S10 (negativo+positivo). Carrega e faz skip sem env; execução contra PostgREST live depende de Supabase local (Tarefa 2.6/CI 2.4).

---

## 6. Limitações restantes (P1/P2 fora do âmbito entregue)

- **S11** — ver §4.
- **A3** (exportação de dados do condomínio / portabilidade RGPD) — Fase 3 (Tarefa 3.8) identifica os requisitos técnicos; não implementado.
- **A5** (reenvio/revogação de convite) — não abordado; melhoria de UX de onboarding.
- **C4** (histórico/calendário de reservas passadas) — não abordado; produto.
- **D6/C5** (verificabilidade do voto) — ver §3.

---

## 7. Confirmação

- **Produção não foi alterada.** Toda a validação em cluster local descartável (removido no fim) + type-check/build.
- Alterações no branch `claude/rls-multi-tenant-audit-ccw5iv` (PR #42).
