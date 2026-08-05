# Inventário de RLS e Grants — Preparação da migração de hardening

**Tarefa:** 0.0 — Mapear o estado atual do RLS e das funções
**Âmbito:** migrações `0023_votacoes.sql`, `0024_ia_rag.sql`, `0025_notificacoes.sql`, `0026_reservas.sql`, funções auxiliares de membership/papéis, políticas das tabelas afetadas e grants das funções `SECURITY DEFINER`.
**Data:** 5 de agosto de 2026
**Estado:** Inventário apenas. **Nenhum SQL foi alterado nesta tarefa.**

> **Fonte primária.** Todos os achados abaixo citam diretamente o SQL das migrações no repositório. Onde é referido comportamento de server actions, cita-se o ficheiro e a linha (`src/lib/actions/…`). Não é assumido comportamento não confirmado pelo código.

---

## 0. Nota crítica de numeração — conflito no ficheiro `0027`

O plano (Tarefa 0.1) pede a criação de `supabase/migrations/0027_hardening_multitenant.sql`. **Esse número já está ocupado:** existe `supabase/migrations/0027_financeiro.sql` (gestão financeira: quotas, pagamentos, recibos). Criar um segundo `0027_*` produz duas migrações com o mesmo número de sequência, o que quebra qualquer ferramenta de ordenação (Supabase CLI incluído) e o histórico manual.

**Recomendação:** a migração de hardening deve ser **`0028_hardening_multitenant.sql`** (o próximo número livre), mantendo embora os identificadores de auditoria S1–S6/C2/S8 nos blocos internos. Este relatório mantém o nome lógico "migração de hardening" para não ficar preso ao número; a decisão final de numeração fica registada aqui para a Tarefa 0.1.

> Nota adicional: `0027_financeiro.sql` introduz as suas próprias funções `SECURITY DEFINER` (`gerar_quotas_mes`, `calcular_divida_fracao`, `obter_proximo_numero_recibo`) **também sem `revoke`/`grant`** — mesmo padrão de S2. Estão **fora do âmbito** das Tarefas 0.0–0.11 (que cobrem 0023–0026), mas ficam assinaladas aqui como dívida de segurança conhecida a tratar antes de o módulo financeiro entrar no Beta.

---

## 1. Modelo de referência (o que as migrações 0001–0009 fazem bem)

Para calibrar o "correto", estas são as fundações herdadas:

| Objeto | Definição | Papéis com EXECUTE |
|---|---|---|
| `public.user_tenant_ids()` | `security definer`, `set search_path = public`; devolve os `tenant_id` de `auth.uid()`. | `authenticated` apenas — `revoke … from public, anon` na `0006`. |
| `public.is_tenant_admin(uuid)` | `security definer`, `set search_path = public`; testa `role='admin'` para `auth.uid()`. | `authenticated` apenas — `revoke … from public, anon` na `0006`. |
| `public.aceitar_convites()` | `security definer`, valida email autenticado. | `authenticated` apenas — `revoke all from public` + `grant … to authenticated` na `0005`. |

**Princípio estabelecido pela `0006` (e abandonado a partir da 0023):** toda a função `SECURITY DEFINER` deve `revoke execute … from public, anon` e conceder EXECUTE só ao papel mínimo. As funções de 0023–0026 **nunca receberam este tratamento** (secção 4).

**`user_role` enum** (`0001` + `0021`): `admin`, `comissao`, `condomino`, `inquilino`. As políticas RLS só distinguem **dois** conceitos — `is_tenant_admin()` (admin) e "é membro" (`tenant_id in (select public.user_tenant_ids())`). Os papéis `comissao` e `inquilino` **não têm expressão no RLS** (S6).

---

## 2. Inventário por tabela

Legenda de "Papel abrangido": `anon` = chave anónima pública (bundle do browser); `auth` = qualquer utilizador autenticado; `membro` = autenticado com membership no tenant; `admin` = `is_tenant_admin()`; `service_role` = ignora sempre RLS.

### 2.1 `public.notificacoes` (0025)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| SELECT | `"users read own notifications"` — `using (user_id = auth.uid())` | membro (próprias) | — | Manter. |
| **INSERT** | `"system insert notifications"` — `with check (true)`, sem `to` | **`anon` + `auth`** | **S1** — `with check (true)` não valida nada; sem cláusula `to`, aplica-se a anon. Qualquer visitante faz `POST /rest/v1/notificacoes` com `user_id`/`tipo`/`corpo` arbitrários. | Remover a política permissiva. Notificações sistémicas passam a ser criadas só por triggers/funções `SECURITY DEFINER` controladas (que correm como owner, contornando RLS). Se um INSERT direto por cliente for mesmo necessário, restringir a `to authenticated` e `with check (user_id = auth.uid() and tenant_id in (select public.user_tenant_ids()))`. |
| UPDATE | `"users mark own notifications read"` — `using / with check (user_id = auth.uid())` | membro (próprias) | Menor: permite alterar qualquer coluna da própria linha (ex.: `titulo`, `corpo`), não só `lida`. Baixo impacto (só a própria notificação). | Opcional: restringir colunas ou aceitar como risco baixo. |
| DELETE | `"users delete own notifications"` — `using (user_id = auth.uid())` | membro (próprias) | — | Manter. |

**Triggers legítimos que inserem em `notificacoes`** (têm de continuar a funcionar após remover a política de INSERT — funcionam porque são `SECURITY DEFINER` e correm como owner): `trigger_ocorrencia_notificar` (via `notificar_admins` + insert direto), `trigger_aviso_notificar` (via `notificar_todos`), `trigger_votacao_notificar` (via `notificar_todos`), `trigger_reserva_notificar` (insert direto + `notificar_admins`).

### 2.2 `public.votos` (0023)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| SELECT | *(nenhuma política)* — RLS ativo ⇒ ninguém lê pelo cliente | ninguém | Efeito colateral: `verificarVoto()` (que consulta `votos` com o cliente do utilizador) devolve sempre `false` (S4d / D6). | Tratado na Tarefa 1.4 (D6/C5): ou RPC de verificação por hash, ou remover a promessa. |
| **INSERT** | `"system inserts votos"` — `with check (tenant_id in (select public.user_tenant_ids()))` | **`auth` (qualquer membro)** | **S4(a)** — apesar do comentário "apenas o sistema insere via service role", a política só exige tenant do utilizador. `votar()` usa o **cliente normal** (não service role). Um membro faz `POST /rest/v1/votos` N vezes, escolhendo `opcao_id`. Não valida: votação aberta, participação, `votou_em is null`, coerência `opcao_id`↔`votacao_id`, coerência opção↔tenant. | Remover o INSERT direto. Criar RPC transacional `SECURITY DEFINER` `registar_voto(p_votacao_id, p_opcao_id)` que valida tudo (membership, votação aberta, participante, ainda não votou, opção da votação) e faz insert do voto + update de `votou_em` **atomicamente** com lock. `revoke … from public, anon`; `grant … to authenticated`. |

### 2.3 `public.votacao_participantes` (0023)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| SELECT | `"users see own participacoes"` (`user_id = auth.uid()`) + `"admins see all participacoes"` | membro (próprias) / admin | — | Manter. |
| INSERT/ALL | `"admins manage participacoes"` — `for all`, `is_tenant_admin` | admin | — | Manter. |
| **UPDATE** | `"users update own participacao"` — `using / with check (user_id = auth.uid())` | membro (própria) | **S4(b)** — sem restrição de coluna: o utilizador pode repor `votou_em = null` e votar de novo, pela própria UI. Pode também alterar `votacao_id`/`tenant_id` da sua linha. | Remover/estreitar esta política. Se o voto passar a ser feito pela RPC transacional (`registar_voto`), o cliente **não precisa** de UPDATE nesta tabela — remover a política de UPDATE de membro por completo. Bloquear o reset de `votou_em` (uma vez não-nulo, não volta a null). |

### 2.4 `public.reservas` (0026)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"users read own reservas"` — `using (user_id = auth.uid() or tenant_id in (select public.user_tenant_ids()))` | membro (todas as do tenant) | **S9** (P1) — expõe `user_id`, `motivo`, `num_pessoas` de terceiros a todos os membros. Necessário só o intervalo ocupado. | Tarefa 1.5: view/RPC de disponibilidade que projeta só `espaco_id`, `data_inicio`, `data_fim`, `estado`; restringir a leitura de linhas completas ao próprio + admin. |
| **INSERT** | `"users create own reservas"` — `with check (user_id = auth.uid())` | **membro** | **S5** — valida o autor mas **não** que `tenant_id` é do utilizador nem que `espaco_id` pertence a esse `tenant_id`. Membro de A insere reserva no espaço de B. | `with check (user_id = auth.uid() and tenant_id in (select public.user_tenant_ids()) and exists (select 1 from espacos_comuns e where e.id = espaco_id and e.tenant_id = reservas.tenant_id))`. |
| UPDATE | `"users update own reservas"` — `user_id = auth.uid() and estado in ('pendente','confirmada')` | membro (próprias) | Menor: `with check` não reforça coerência tenant/espaço num UPDATE. | Adicionar as mesmas condições de coerência ao `with check`. |
| DELETE | `"users delete own reservas"` | membro (próprias) | — | Manter. |
| ALL | `"admins manage reservas"` — `is_tenant_admin` | admin | — | Manter. |

*Nota:* o trigger `validar_reserva()` (BEFORE INSERT/UPDATE) valida duração/antecedência/horário/limite semanal, **mas não** coerência tenant↔espaço↔utilizador — daí S5 não ser mitigado por ele.

### 2.5 `public.documentos` (0001 + `assembleia_id` da 0009)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"members see tenant documentos"` — `using (tenant_id in (select public.user_tenant_ids()))` | **membro (inclui inquilino)** | **S6** — o `inquilino` é membro de pleno direito no RLS; lê **todas** as categorias, incluindo `conta`, `ata`, `contrato`, `apolice`. A restrição é só UI (`redirect` em `documentos/page.tsx`). | Introduzir política que exclua `inquilino` das categorias sensíveis (ver função `user_tem_papel` na Tarefa 0.7). Ex.: membro não-inquilino vê tudo; inquilino vê apenas `regulamento`/`manual`/`outro`. |
| ALL | `"admins manage documentos"` — `is_tenant_admin` | admin | — | Manter. |
| Storage `documentos` | `"members download tenant documentos"` (SELECT em `storage.objects`, path `{tenant_id}/…`) | membro | **S6 (storage)** — mesma fuga ao nível do ficheiro: inquilino gera URL assinado de qualquer documento do tenant. | Alinhar a política de storage com a de tabela (excluir inquilino das categorias sensíveis, ou validar categoria via join a `documentos`). |

### 2.6 `public.assembleias` (0009)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"members see published assembleias"` — `estado <> 'rascunho' and tenant_id in (select public.user_tenant_ids())` + `"admins see all assembleias"` | **membro (inclui inquilino)** / admin | **S6** — inquilino lê convocatórias e atas de assembleia (informação dos condóminos, não dos arrendatários). Restrição é só UI. | Excluir `inquilino` da política de leitura de membro (via `user_tem_papel`). |
| ALL | `"admins manage assembleias"` — `is_tenant_admin` | admin | — | Manter. |

### 2.7 `public.assembleia_pontos` (0009)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"members see published pontos"` — via `exists` de assembleia não-rascunho do tenant + `"admins see all pontos"` | **membro (inclui inquilino)** / admin | **S6** — mesma exposição que 2.6 para a ordem de trabalhos. | Alinhar com a correção de `assembleias` (excluir inquilino). |
| ALL | `"admins manage pontos"` — `is_tenant_admin` | admin | — | Manter. |

### 2.8 `public.votacoes` (0023)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"members see active votacoes"` — `estado in ('aberta','encerrada') and tenant_id in (…)` + `"admins see all votacoes"` | **membro (inclui inquilino)** / admin | **S6** — inquilino vê votações abertas/encerradas. Deliberações são dos condóminos. | Excluir `inquilino` da leitura de membro (via `user_tem_papel`). |
| ALL | `"admins manage votacoes"` — `is_tenant_admin` | admin | — | Manter. |

*(`votacao_opcoes` segue o mesmo padrão de `votacoes` e herda a mesma questão S6; incluir na correção por consistência.)*

### 2.9 `public.conhecimento_embeddings` (0024)

| Operação | Política / grant atual | Papel abrangido | Falha | Correção proposta |
|---|---|---|---|---|
| **SELECT** | `"members read embeddings"` — `using (tenant_id in (select public.user_tenant_ids()))` | **membro (todos)** | **C2** — inclui chunks com `origem = 'ocorrencia_resolvida'` (título + categoria + **descrição** de ocorrências de vizinhos, indexados por `ingerirOcorrenciasResolvidas`, `ia-rag.ts:176`). Ocorrências em si só são visíveis ao autor/admin; o RAG contorna isso. Fuga de dados pessoais dentro do condomínio. | Restringir `origem = 'ocorrencia_resolvida'` a admins: política de membro passa a `tenant_id in (…) and origem <> 'ocorrencia_resolvida'`; política adicional dá `origem = 'ocorrencia_resolvida'` só a `is_tenant_admin`. Reforçar em `buscar_chunks` (S3) e em `sugerirResolucao()` (passar a `requireAdmin()`). |
| ALL | `"admins manage embeddings"` — `is_tenant_admin` | admin | — | Manter. |

---

## 3. `conversas_ia` / `conversas_ia_mensagens` (0024) — contexto S10

| Objeto / Operação | Política atual | Papel | Falha | Correção proposta |
|---|---|---|---|---|
| `conversas_ia` SELECT/INSERT/DELETE | `user_id = auth.uid()` | membro (próprias) | — | Manter. |
| `conversas_ia_mensagens` SELECT | via `exists` conversa do próprio | membro (próprias) | — | Manter. |
| **`conversas_ia_mensagens` INSERT** | `"users create own messages"` — `with check (exists (… c.user_id = auth.uid()))` | membro | **S10** (P1) — não valida `role`; o utilizador insere mensagens com `role='assistant'` no seu próprio histórico (respostas forjadas atribuídas ao assistente). | Adicionar `and role = 'user'` ao `with check`. Mensagens `assistant`/`system` só por caminho servidor controlado (service role ou RPC definer). Proteger também UPDATE de `role` se existir. |

*(S10 é P1 / Tarefa 1.6, fora dos P0, mas incluído por estar na mesma migração e ser relevante ao inventário.)*

---

## 4. Inventário de funções `SECURITY DEFINER` (0023–0026) — grants

**Estado de grants — confirmado por inspeção:** nenhuma das migrações 0023–0026 contém `revoke` ou `grant` (`grep` sobre `supabase/migrations/` só devolve grants em `0005` e `0006`). Logo, para **todas** as funções abaixo:

- **PUBLIC:** tem `EXECUTE` (default do Postgres ao criar função). ⇒ **falha.**
- **`anon`:** tem `EXECUTE` (default privileges do Supabase concedem a anon/authenticated). ⇒ **falha (S2).**
- **`authenticated`:** tem `EXECUTE`.
- **`service_role`:** tem `EXECUTE` (sempre).

Todas têm `set search_path = public` fixado (bom) e correm como owner (ignoram RLS).

| Função | Assinatura | Corre como | EXECUTE atual | Falha | Correção proposta |
|---|---|---|---|---|---|
| `buscar_chunks` | `(p_tenant_id uuid, p_embedding vector, p_limite int, p_threshold float)` | definer | PUBLIC, anon, auth, service_role | **S2 + S3** — anon chama com `tenant_id` de outro condomínio (tenants são enumeráveis, `0003`) e recebe regulamento, documentos e **ocorrências resolvidas** alheias. Não valida que `auth.uid()` pertence a `p_tenant_id`. | `revoke … from public, anon`; `grant … to authenticated`. **No corpo**, validar `exists (select 1 from user_tenants where user_id = auth.uid() and tenant_id = p_tenant_id)` e devolver 0 linhas caso contrário. Excluir `origem='ocorrencia_resolvida'` para não-admins (C2). |
| `estado_conhecimento` | `(p_tenant_id uuid)` | definer | PUBLIC, anon, auth, service_role | **S2 + S3** — mesma assinatura, mesmo problema; revela contagens por origem de qualquer tenant. | Igual a `buscar_chunks`: `revoke`/`grant authenticated` + validação de membership no corpo. |
| `notificar_todos` | `(p_tenant_id, p_tipo, p_titulo, p_corpo, p_entidade_tipo, p_entidade_id, p_metadata, p_excluir_user_id)` | definer | PUBLIC, anon, auth, service_role | **S2** — anon faz `POST /rest/v1/rpc/notificar_todos` ⇒ notificação forjada para todos os membros de qualquer condomínio (relay de spam com email da Portaria). | `revoke … from public, anon, authenticated`. Chamável só internamente pelos triggers (que correm como owner e não precisam de grant) e/ou por `service_role`. **Não** conceder a `authenticated`. |
| `notificar_admins` | `(p_tenant_id, p_tipo, p_titulo, p_corpo, p_entidade_tipo, p_entidade_id, p_metadata)` | definer | PUBLIC, anon, auth, service_role | **S2** — igual a `notificar_todos` mas dirigido aos admins. | Igual: `revoke … from public, anon, authenticated`; só triggers/service_role. |
| `total_permilagem_tenant` | `(p_tenant_id uuid)` | definer | PUBLIC, anon, auth, service_role | **S2** — anon lê a permilagem total de qualquer tenant (baixa sensibilidade, mas é enumeração cross-tenant). | `revoke … from public, anon`; `grant … to authenticated` com validação de membership no corpo (só do próprio tenant). |
| `user_permilagem` | `(p_user_id uuid, p_tenant_id uuid)` | definer | PUBLIC, anon, auth, service_role | **S2 + S8** — aceita **qualquer** `p_user_id`; lê permilagem (⇒ dimensão da fração) de qualquer utilizador. Sem revoke, por anon. | `revoke … from public, anon`; `grant … to authenticated`. **No corpo:** só devolver se `p_user_id = auth.uid()` **ou** `is_tenant_admin(p_tenant_id)`; negar acesso cross-tenant. |
| `verificar_disponibilidade` | `(p_espaco_id uuid, p_data_inicio, p_data_fim)` | definer | PUBLIC, anon, auth, service_role | **S2** — anon testa disponibilidade de qualquer espaço (fuga menor; permite sondar padrões de ocupação). Não valida membership no tenant do espaço. | `revoke … from public, anon`; `grant … to authenticated`. Validar no corpo que `auth.uid()` é membro do tenant do `p_espaco_id`. |
| `contar_reservas_semana` | `(p_user_id uuid, p_espaco_id uuid, p_data_ref)` | definer | PUBLIC, anon, auth, service_role | **S2** — aceita qualquer `p_user_id`; anon conta reservas de qualquer utilizador. | `revoke … from public, anon`; `grant … to authenticated`. Restringir a `p_user_id = auth.uid()` ou admin do tenant. |

### Triggers `SECURITY DEFINER` (0025, 0026) — não são chamáveis por RPC

`trigger_ocorrencia_notificar`, `trigger_aviso_notificar`, `trigger_votacao_notificar`, `trigger_reserva_notificar`, `validar_reserva` são funções de trigger (`returns trigger`) — não expostas via PostgREST/RPC e disparadas pelo motor. Correm como owner e continuarão a inserir em `notificacoes` mesmo depois de S1 remover a política de INSERT de cliente. **Não precisam de grant.** Nenhuma ação de hardening de grants é necessária sobre elas.

---

## 5. Mapa de resumo — funções por papel executável (estado atual vs. alvo)

| Função | anon (atual) | authenticated (atual) | anon (alvo) | authenticated (alvo) | Nota do alvo |
|---|---|---|---|---|---|
| `user_tenant_ids` | ✗ (já revogado) | ✓ | ✗ | ✓ | Já correto (0006). |
| `is_tenant_admin` | ✗ (já revogado) | ✓ | ✗ | ✓ | Já correto (0006). |
| `aceitar_convites` | ✗ (já revogado) | ✓ | ✗ | ✓ | Já correto (0005). Fluxo revisto na Tarefa 1.7 (S11). |
| `buscar_chunks` | **✓** | ✓ | ✗ | ✓ + validação membership | S2/S3 |
| `estado_conhecimento` | **✓** | ✓ | ✗ | ✓ + validação membership | S2/S3 |
| `notificar_todos` | **✓** | ✓ | ✗ | **✗** | S2 — só triggers/service_role |
| `notificar_admins` | **✓** | ✓ | ✗ | **✗** | S2 — só triggers/service_role |
| `total_permilagem_tenant` | **✓** | ✓ | ✗ | ✓ + validação membership | S2 |
| `user_permilagem` | **✓** | ✓ | ✗ | ✓ + validação próprio/admin | S2/S8 |
| `verificar_disponibilidade` | **✓** | ✓ | ✗ | ✓ + validação membership | S2 |
| `contar_reservas_semana` | **✓** | ✓ | ✗ | ✓ + validação próprio/admin | S2 |
| *(registar_voto — nova)* | — | — | ✗ | ✓ + validação completa | S4 (RPC transacional a criar) |

> `service_role` mantém EXECUTE em todas (ignora RLS por natureza; só é usado server-side, nunca no browser).

---

## 6. Relação dos achados com a auditoria (S1–S6, S8, C2)

| ID | Objeto(s) | Onde vive a falha | Tarefa que corrige |
|---|---|---|---|
| **S1** | `notificacoes` INSERT | `0025:68` `with check (true)` | 0.2 |
| **S2** | 8 funções definer | ausência de `revoke`/`grant` em 0023–0026 | 0.3 |
| **S3** | `buscar_chunks`, `estado_conhecimento` | `0024:136`, `0024:176` — sem validação de membership | 0.4 |
| **S4** | `votos` INSERT, `votacao_participantes` UPDATE | `0023:178`, `0023:202` — sem integridade nem atomicidade | 0.5 |
| **S5** | `reservas` INSERT | `0026:113` — sem coerência tenant↔espaço | 0.6 |
| **S6** | `documentos`, `assembleias`, `assembleia_pontos`, `votacoes` (+ storage) | políticas de "membro" não distinguem `inquilino`/`comissao` | 0.7 |
| **C2** | `conhecimento_embeddings` SELECT + `sugerirResolucao()` | `0024:82` + `ia-rag.ts:517` (usa `getCurrentUserInTenant`, não `requireAdmin`) | 0.8 |
| **S8** | `user_permilagem` | `0023:110` — aceita qualquer `p_user_id` | 0.9 |

**Achados relacionados fora do conjunto P0 (registados para contexto):** S9 (`reservas` SELECT, minimização — Tarefa 1.5), S10 (`conversas_ia_mensagens` INSERT sem validação de `role` — Tarefa 1.6), S7 (`user_tenants` UPDATE — Tarefa 1.1). Funções definer de `0027_financeiro.sql` sem grants (mesmo padrão de S2, fora de âmbito 0023–0026).

---

## 7. Decisões em aberto assinaladas para a Tarefa 0.1

1. **Numeração:** usar `0028_hardening_multitenant.sql` (0027 ocupado). *(secção 0)*
2. **`comissao`:** o RLS atual trata `comissao` como membro comum (sem privilégios extra). A auditoria e o plano (Tarefa 0.7) confirmam que o comportamento da comissão **não está especificado** no código. Nesta fase, tratar `comissao` como não-inquilino (acesso de condómino), sem inventar privilégios — decisão de produto pendente da Inês.
3. **Voto (S4):** a correção requer RPC transacional nova (`registar_voto`), não apenas ajuste de política — confirmado pela janela de corrida entre INSERT em `votos` e UPDATE de `votou_em`.
4. **`notificar_todos`/`notificar_admins`:** a decisão é **não** conceder a `authenticated` (apenas triggers/service_role). Confirmar que nenhuma server action as chama diretamente com o cliente do utilizador antes de fechar (a rever na Tarefa 0.3).

---

## 8. Confirmação de âmbito

- **Nenhum SQL foi alterado.** Este documento é exclusivamente inventário.
- **Nada foi aplicado em produção.**
- Fontes: `supabase/migrations/0001,0002,0003,0005,0006,0008,0009,0021,0023,0024,0025,0026,0027`; `src/lib/actions/ia-rag.ts`; `src/lib/supabase/tenant`. Cada achado cita o SQL/linha correspondente.
