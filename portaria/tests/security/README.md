# Testes de segurança (RLS) — matriz multi-tenant

Esta suite exerce o **PostgREST diretamente** (como faria um atacante com a
`anon key` pública), não as server actions. Prova que o isolamento
multi-tenant é imposto pela base de dados (RLS + grants), que é a única
fronteira real de segurança.

Organização:

| Ficheiro | Âmbito |
|---|---|
| `rls-p0.test.ts` | Bloqueadores P0 da auditoria original (S1–S6, S8, C2) |
| `rls-p0-financeiro.test.ts` | Views financeiras + RPCs `SECURITY DEFINER` (auditoria 2026-08) |
| `rls-p1.test.ts` | S7 (preferências), S9 (reservas), S10 (mensagens IA) |
| `rls-s11.test.ts` | Aceitação explícita de convites (20260902090000) |
| `rls-matriz-core.test.ts` | Matriz A2.2 — tabelas centrais (tenants, avisos, ocorrências, assembleias, convites, frações,…) |
| `rls-matriz-documentos.test.ts` | Matriz A2.2 — `documentos`, `documentos_administracao`, `conhecimento_embeddings` (tabela direta) |
| `rls-matriz-financeiro.test.ts` | Matriz A2.2 — tabelas financeiras (0027, 2026-08, despesas, contribuições) |
| `rls-matriz-processo.test.ts` | Matriz A2.2 — imputações, IA documental, contrato-memória, comunicações |
| `rls-matriz-operacoes.test.ts` | Matriz A2.2 — e-mail, manutenção, alertas, ausências, blueprints |
| `rls-matriz-rpc.test.ts` | Matriz A2.2 — RPCs de sessão, conhecimento, reservas, notificação |

Cada tabela da matriz tem, sempre que aplicável: um teste de **acesso
legítimo** (POS), um de **negação** ao papel sem direito (NEG) e um
**cross-tenant** (NEG). As perspetivas usadas: `anon`, condómino, inquilino,
comissão, admin e admin-de-outro-tenant.

## Mapa de cobertura (tabela → ficheiro → perspetivas)

Legenda: C=condómino, I=inquilino, A=admin, A≠=admin de outro tenant, K=comissão, ⊖=anon negado, ✎=INSERT/UPDATE testado.

| Tabela | Ficheiro | Perspetivas cobertas |
|---|---|---|
| `tenants` (SELECT/UPDATE) | matriz-core | ⊖/C/A SELECT público; ✎ A próprio; ✎ C e A≠ negados |
| `user_tenants` (SELECT) | p1, matriz-core | próprio (C), admin, A≠/⊖ negados; ✎ C só `notificacoes_email`, auto-promoção e linha alheia negadas (S7) |
| `avisos` | matriz-core | C ativos; inativos só A; I (como C); A≠/⊖ negados; ✎ C negado |
| `tenant_perfil` | matriz-core | A; C/I/A≠/⊖ negados |
| `espacos_comuns` | matriz-core | C/I ativos; A≠/⊖ negados |
| `fracoes` | matriz-core, p0-fin | A; C/I/A≠/⊖ negados |
| `documentos` | p0 (S6), matriz-documentos | C/K todas; I sem `conta`/`ata`/`contrato`/`apolice`; ⊖/A≠ negados; ✎ C negado, A OK |
| `documentos_administracao` | matriz-documentos | A; C/I/A≠/⊖ negados; ✎ C negado, A OK |
| `conhecimento_embeddings` (tabela) | matriz-documentos | C regulamento; C2 direto (⊖ ocorrência p/ C, ✓ p/ A); I só regulamento/legislação; A≠/⊖ negados; ✎ C negado |
| `conhecimento_embeddings` (RPC `buscar_chunks`/`estado_conhecimento`) | p0 (S3/C2), p0-fin, matriz-rpc | membership do próprio; cross-tenant 0; ⊖ negado — **ver achado A-1 abaixo** |
| `ocorrencias` | matriz-core | criador; outro membro do tenant negado; A; A≠/⊖ negados; ✎ criador não edita |
| `ocorrencia_eventos` | matriz-core | A tudo; criador sem notas internas; A≠/⊖ negados |
| `ocorrencia_fotografias` | matriz-core | criador e A; ⊖ negado |
| `assembleias` / `assembleia_pontos` | matriz-core | C publicadas; I negado (S6); rascunhos só A; A≠/⊖ negados; ✎ C negado |
| `votacoes` / `votacao_opcoes` | p0 (S6), matriz-core | C/K abertas+encerradas; I negado; A≠/⊖ negados |
| `votacao_participantes` (SELECT) | matriz-core | própria linha (C); A tudo; A≠/⊖ negados; UPDATE só via `registar_voto` (S4) |
| `votos` / `registar_voto` | p0 (S4) | voto único; fechada negada; ✎ INSERT direto negado |
| `reservas` (SELECT/INSERT) | p0 (S5), p1 (S9), matriz-core | próprio; I/A≠ alheias negadas; A tudo; ✎ cross-tenant e incoerência negados; `disponibilidade_reservas` sem dados pessoais |
| `espacos_comuns` RPCs (`verificar_disponibilidade`, `contar_reservas_semana`) | matriz-rpc | ⊖ e C sem EXECUTE (grants 0030) — ver achado A-4 |
| `conversas_ia` (SELECT) | matriz-core | próprio apenas; outro membro e ⊖ negados |
| `conversas_ia_mensagens` | p1 (S10) | ✎ `role='user'` OK; ✎ `assistant` negado |
| `notificacoes` | p0 (S1), p0-fin, matriz-rpc | ⊖/C ✎ negados; leitura própria OK; `notificar_*` negados a ⊖ e C |
| `convites` (SELECT) + `aceitar_convite`/`recusar_convite`/`convites_pendentes` | s11, matriz-core | convidado vê os seus; outro email negado; A≠/⊖ negados; fluxo completo S11 |
| `aceitar_convites` (antiga) | matriz-rpc | função removida pela S11; chamada negada (regressão da remoção) |
| `quotas_mensais` | matriz-financeiro | C fração própria; fração alheia e I negados; A tudo; A≠/⊖ negados |
| `configuracao_financeira` | p0-fin, matriz-financeiro | C/I leitura; A gestão; A≠/⊖ negados |
| `pagamentos` / `recibos` | matriz-financeiro | C fração própria; alheia negada; A tudo; ⊖ negado |
| `financeiro_exercicios` / `financeiro_contas_anuais` | matriz-financeiro | A SELECT+✎; C/A≠/⊖ negados; ✎ A≠ negado |
| `movimentos_bancarios` | matriz-financeiro | A; C/A≠/⊖ negados; ✎ C negado |
| `despesas` / `despesas_documentos` / `despesas_historico_estados` | matriz-financeiro | A; C/A≠/⊖ negados |
| `obrigacoes_recorrentes` | matriz-financeiro | A; C/A≠ negados |
| `contribuicoes_extraordinarias` / `contribuicao_prestacoes` / `contribuicao_prestacao_fracoes` | matriz-financeiro | A; C/A≠/⊖ negados; ✎ C negado |
| `vw_inadimplencia` / `vw_quotas_resumo_mes` | p0-fin | ⊖ negado; A filtrado ao tenant; C e A≠ sem linhas |
| RPC `gerar_quotas_mes` / `obter_proximo_numero_recibo` / `calcular_divida_fracao` | p0-fin | ⊖/C negados; A OK; A≠/fração alheia negados |
| RPC `user_tenant_ids` / `is_tenant_admin` / `user_tem_papel` | matriz-rpc | próprio OK; A≠/⊖ negados |
| RPC `user_permilagem` | p0 (S8) | própria OK; A≠ null |
| RPC `total_permilagem_tenant` | matriz-rpc | C OK; ⊖ negado — **ver achado A-3** |
| `imputacoes_posicoes` / `imputacoes_posicoes_evidencias` | matriz-processo | A SELECT; C sem linhas (RLS); ⊖ sem grant; ✎ sem grant INSERT (20260826020000); A≠ negado |
| `ia_documental_configuracoes` / `fontes` / `fonte_blocos` / `sessoes` / `mensagens` | matriz-processo | A; C/A≠/⊖ negados; ✎ C negado |
| `contrato_memoria_eventos` / `_evidencias` (leitura) | matriz-processo | C/A≠/⊖ sem linhas — escrita **não testável** (ver lacuna G-1) |
| `comunicacoes` / `comunicacao_destinatarios` / `comunicacao_documentos` | matriz-processo | A; C/A≠/⊖ negados; ✎ C negado |
| `email_caixas` / `email_mensagens` / `email_anexos` | matriz-operacoes | A; C/A≠/⊖ negados; ✎ C negado |
| `ativos_manutencao` | matriz-operacoes | A; C/A≠/⊖ negados; ✎ C negado |
| `planos_manutencao` / `tarefas_manutencao` | matriz-operacoes | negações (C/A≠/⊖) — POS **bloqueado** (ver lacuna G-2) |
| `alertas_operacionais` | matriz-operacoes | A; C/A≠/⊖ negados |
| `funcionarios_ausencias` | matriz-operacoes | C e I leem (mural); A✎ OK; ✎ C negado; A≠/⊖ negados |
| `blueprints` | matriz-operacoes | A; C/A≠/⊖ negados; ✎ C negado |

## Achados abertos (descobertos ao construir esta rede)

Estes achados foram confirmados contra um stack local reconstruído apenas a
partir de `supabase/migrations/` (0001 → 20260902090000). Estado em produção:
**não verificado** (as suites não se ligam a produção).

- **A-1 (alto) — `buscar_chunks` perdeu os filtros C2/S6.** A reescrita em
  `20260826030000_p0_security_hardening_views_rpc.sql` preservou a validação de
  membership mas perdeu o filtro C2 (`ocorrencia_resolvida` só admins) e o S6
  (inquilino só regulamento/legislação) que `0028` tinha introduzido. O teste
  C2 pré-existente em `rls-p0.test.ts` **falha** contra esta cadeia: qualquer
  membro volta a ler conteúdo de ocorrências resolvidas via RPC.
- **A-2 (alto para a funcionalidade) — `planos_manutencao` não aceita INSERT.**
  O trigger `validar_tenant_manutencao` (0038) corre sobre `planos` e
  `tarefas`; a condição da branch `tarefas` referencia `NEW.plano_id`, que não
  existe em `planos_manutencao` — todo o INSERT em planos falha com
  `42703 record "new" has no field "plano_id"`. Sem plano não há tarefas.
- **A-3 (baixo) — `total_permilagem_tenant` não valida membership** (desvio da
  matriz S2): devolve o somatório de permilagem de qualquer tenant a qualquer
  autenticado (fuga agregada, sem dados por membro). A função não é usada em
  `src/`.
- **A-4 (info) — `verificar_disponibilidade` / `contar_reservas_semana` sem
  EXECUTE para authenticated** (recriadas por 0030 depois do ciclo de grants de
  0028). Hardening efetivo — `src/` nunca as chama — mas a linha da matriz
  ("authenticated ✓") está desatualizada.
- **A-5 (info) — grants por omissão em `contrato_memoria_*`** (e restantes
  tabelas de 2026-08 não abrangidas por 20260826020000): `anon` mantém
  SELECT/INSERT/etc. ao nível do grant; o RLS (`is_tenant_admin`) devolve 0
  linhas, pelo que não há exposição — a segunda camada (revoke, padrão
  20260826020000) ficou por apertar.

## Lacunas de cobertura conhecidas

- **G-1 — `contrato_memoria_eventos`/`_evidencias`: só leitura.** As tabelas
  referenciam `public.contratos`, que **não existe** na cadeia de migrações
  (o schema de memória da contratação foi aplicado em produção fora do
  histórico). Sem a tabela `contratos`, é impossível semear eventos num
  ambiente reconstruído — os caminhos de escrita (política `admins manage`)
  ficam por exercitar. Ações possíveis: миграção que crie `contratos`, ou
  `NOT VALID`/remodelação da FK.
- **G-2 — POS de `planos_manutencao`/`tarefas_manutencao`** bloqueado pelo
  achado A-2 (teste marcado `it.skip` com a razão no título). Reativar após
  correção do trigger.
- **G-3 — Storage.** As políticas de buckets (`documentos`,
  `documentos-admin`, `ocorrencias`, `email-anexos`) não são exercidas: estas
  suites testam a API relacional (PostgREST), não uploads de Storage.
- **G-4 — Funções internas revogadas** (`executar_rotina_*`,
  `gerar_tarefas_manutencao_proximas`, `registar_pagamento_seed`,
  `adicionar_periodicidade`, triggers `validar_*`): sem teste dedicado
  de negação de EXECUTE; a revogação está nas migrações 0037–0039/20260826030000.
- **G-5 — Reruns da prova de regressão por tabela.** O mecanismo está provado
  (ver `docs/security/rls-regression-proof.md`); repetir o ciclo
  permissão→falha→reversão para cada tabela da matriz é trabalho mecânico
  pendente, recomendado apenas quando uma política específica estiver em
  alteração.

## Como correr

Requer um Supabase alcançável (recomendado: **Supabase local**) com todas as
migrações aplicadas.

```bash
# 1. Supabase local — aplica todas as migrações
supabase start
supabase db reset

# 2. Variáveis de ambiente (impressas por `supabase status`)
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="<anon/publishable key local>"
export SUPABASE_SERVICE_ROLE_KEY="<service/secret key local>"

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
- Cada ficheiro semeia os seus próprios tenants com UUIDs/códigos/emails
  únicos (`crypto.randomUUID` + carimbo), para poderem correr em paralelo
  contra o mesmo stack sem colisões.
- As chamadas usam `fetch` cru a `/rest/v1` e `/rest/v1/rpc` para os casos em
  que interessa o código HTTP (401/403 vs 200), e o cliente `@supabase/
  supabase-js` para asserções sobre linhas devolvidas.
- A prova de regressão intencional (reintroduzir política permissiva e ver a
  suite falhar) está registada com evidência em
  `docs/security/rls-regression-proof.md`.
