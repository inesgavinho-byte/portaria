# Goal — Portaria 1.0: o Europa opera sem SQL, o Beta fica lançável

> Aprovado pela Inês a 2026-09-02. Deriva da análise de desenvolvimento desse dia
> (Slices 01–11 fechados, goal-beta-europa executado até à Fase 2, e o processo
> Pinturas Verticais a provar que cada ato operacional exige um programador a
> escrever SQL). Escrito para ser verificável, no mesmo formato do
> `goal-beta-europa.md`.

---

## Declaração do goal

**Levar a Portaria de "plataforma rica operada por um programador" a "produto
operado pela administradora": todo o ciclo que o processo Pinturas Verticais
provou ser necessário — dossiê de fornecedor de ponta a ponta — executável 100%
pela interface, enquanto o gate legal e técnico do Beta Europa, herdado do
`goal-beta-europa.md`, fica fechado e provado.**

O sucesso não é "há páginas novas". É: **um conflito novo com um fornecedor novo
é registado, reconciliado e reportado pela administradora, sozinha, sem uma
linha de SQL — e um condómino real pode iniciar sessão porque a base legal e a
segurança estão provadas, não prometidas.**

### Princípios

1. **Produção não se toca sem PR aprovado** — regra do workspace, mantida.
2. **O RLS continua a ser a fronteira.** Tudo o que a Fase B expõe pela UI é
   validado contra PostgREST, não só contra a aplicação.
3. **Nada de meio-corrigido.** Se um item não puder ir completo, fica fora e
   registado — como o S11 foi no goal anterior.
4. **Decisões de produto são da Inês** (provedor de IA, assinatura do contrato
   art. 28.º). O resto resolve-se por evidência.

---

## Fase A — Fechar o gate do Beta (completa o `goal-beta-europa.md`)

| # | Item | Entregável |
|---|---|---|
| A1.1 | **L-28** — minuta de contrato de subcontratação (RGPD art. 28.º) Portaria ↔ condomínio. | `docs/legal/contrato-subcontratacao-rgpd.md` (minuta; assinatura é da Inês) |
| A1.2 | **L-44** — dossier de decisão de IA: opções (provedor UE / desligar), riscos, recomendação. Decisão final registada pela Inês. | `docs/legal/decisao-ia-l44.md` |
| A1.3 | Registo de subcontratantes ulteriores (Supabase, Netlify, Resend, provedores de IA), com finalidade, localização e base de transferência. | `docs/legal/subcontratantes.md` |
| A1.4 | Política de privacidade e termos de serviço, páginas `/privacidade` e `/termos`, com informação do tratamento pela IA. | páginas + `docs/legal/` |
| A1.5 | **L1/L2** — política de retenção com prazos por tipo de dado e procedimento de exercício de direitos (acesso, portabilidade, apagamento). | `docs/legal/retencao-e-direitos.md` |
| A1.6 | **6.3** — afirmações de `section-confianca.tsx` corrigidas para o demonstrável. | código |
| A2.1 | **S11** — aceitação explícita por convite: `aceitar_convite(id)`/`recusar_convite(id)` + UI de convites pendentes. | migration + código + teste |
| A2.2 | Matriz de testes RLS expandida (todas as tabelas multi-tenant × 6 perspetivas) + prova de regressão registada. | `tests/security/` + `docs/security/rls-regression-proof.md` |
| A2.3 | Primeira execução real do CI num runner; branch protection proposta/aplicada. | CI verde no PR |

**Critério de aceitação:** as condições de "Definição de pronto para o Beta
Europa" do `goal-beta-europa.md` verificadas com evidência. O que exigir ação
humana (assinatura, decisão L-44) fica marcado como decisão pendente — a
plataforma fica pronta para ambas as respostas.

## Fase B — Operação sem SQL: o dossiê como produto

As estruturas já existem e são genéricas por desenho
(`contrato_memoria_eventos`, `contrato_memoria_evidencias`, posições de
imputação, ponte `documentos` ↔ `ia_documental_fontes`). O que falta é a
interface:

| # | Item |
|---|---|
| B1 | **Ingestão:** upload pela UI cria/liga a fonte (`data_documento`, contraparte, checksum) — sem SQL. |
| B2 | **Registo do processo:** acontecimentos, evidências com localizador citado, posições de cada parte, imputação de pagamentos a facturas — tudo pela UI, com RLS equivalente ao das migrações `2026082602/03`. |
| B3 | **Relatório:** o relatório de fornecedor (screen + print) gerado a partir do registado pela UI. |
| B4 | **Correção:** retificar um registo sem escrever migração (posições retiradas/superadas mantêm histórico). |

**Critério de aceitação (regra do Living Lab):** um processo novo, do upload da
primeira comunicação ao PDF do relatório, feito pela administradora num dia,
sem programador. É a demonstração de 2 minutos do roadmap.

## Fase C — Fundação para Assistir (desbloqueia Slices 14–15)

| # | Item |
|---|---|
| C1 | Extração de texto de PDF na ingestão (fecha a A1 da auditoria a sério — hoje: só título+descrição, exceto regulamento). |
| C2 | Pipeline de embeddings estendido ao texto integral, não-destrutivo (A2 já feito), com provedor substituível conforme a decisão L-44. |

Os Slices 13–15 propriamente ditos ficam para o goal seguinte (infra de email
de entrada + decisão de IA).

## Fora de âmbito

- Slice 12 (multi-condomínio) — retido até existir 2.º edifício.
- Votações no Beta.
- Venda do produto.
- Migrações a produção fora do fluxo (branch → validação → PR → produção).

## Sequência

Fase B é o núcleo (o valor que o uso real já exige); Fase A corre em paralelo
porque é sobretudo documentos e decisões; C por último. O Beta só lança com A
fechada.

## Registo de execução

*(Execução de 2026-09-02, no branch `feat/goal-1.0`. Estados de evidência
honestos — WRITTEN ≠ IMPLEMENTED ≠ TESTED ≠ APPLIED ≠ VERIFIED.)*

### Fase A — gate do Beta

| Item | Estado | Evidência |
|---|---|---|
| A1.1 contrato art. 28.º | WRITTEN (minuta) | `docs/legal/contrato-subcontratacao-rgpd.md`; assinatura pendente (humano) |
| A1.2 decisão IA L-44 | WRITTEN (dossier + recomendação) | `docs/legal/decisao-ia-l44.md`; pipeline verificado no código; **decisão pendente (Inês)** |
| A1.3 subcontratantes | WRITTEN | `docs/legal/subcontratantes.md` — 6 registos, factos verificados no código; DPA/localizações «a confirmar» |
| A1.4 /privacidade + /termos | IMPLEMENTED, build verde | páginas no grupo `(landing)` + links nos rodapés; placeholders `[a indicar]` para NIPC/email/contacto (dados que só a Inês tem) |
| A1.5 retenção e direitos | WRITTEN | `docs/legal/retencao-e-direitos.md`; prazos `[PROPOSTA]` pendem aprovação do responsável |
| A1.6 afirmações da landing | IMPLEMENTED | `section-confianca.tsx` só afirma o demonstrável; comentário no ficheiro trava regressão |
| A2.1 S11 convites | IMPLEMENTED + TESTED local | migração `20260902090000` exercitada em cluster descartável (16/16); suite `rls-s11` (9 testes); UI `/convite/pendentes`; `aceitar_convites()` removida |
| A2.2 matriz RLS | IMPLEMENTED + TESTED | 58 tabelas + 20 RPCs cobertos; **262/262 testes a passar** contra stack local; prova de regressão registada e executada (`docs/security/rls-regression-proof.md`) |
| A2.3 CI primeira execução | VERIFIED — CI VERDE | primeira execução real no PR #91; revelou e corrigiu: `ci.yml` fora da raiz do repo, cadeia de migrações não reprouzível, Node 20 sem WebSocket nativo |

**Bónus da A2.2:** a matriz apanhou **duas regressões reais** na cadeia de
migrações — A-1 (a `20260826030000` tinha perdido os filtros C2/S6 do
`buscar_chunks`: fuga de ocorrências privadas pelo RAG) e A-2 (trigger de
0038 impedia criar planos de manutenção). Corrigidas em `20260902310000`–
`20260902330000` e testadas (262/262). É a prova de que a rede de segurança
serve.

### Fase B — dossiê pela UI

| Item | Estado | Evidência |
|---|---|---|
| Reconhecimento | VERIFIED | já existia de agosto: evidências pela UI, dossiê/timeline, relatório a ler das tabelas certas — verificado por inspecção, não duplicado |
| B2 registo do processo | IMPLEMENTED + TESTED | `criarAcontecimento`, `corrigirAcontecimento`, `registarPosicao`, `mudarEstadoPosicao`, `imputarMovimentoADespesa` + componentes; 150 testes unitários verdes |
| B1 ingestão ligada | IMPLEMENTED | upload cria/atualiza fonte em `ia_documental_fontes` (checksum SHA-256, data_documento, contraparte) |
| B3 relatório | VERIFIED (já lia das tabelas certas) | `relatorio/page.tsx` lê memória+evidências+posições+movimentos |
| B4 correção sem SQL | IMPLEMENTED | posições `retirada`/`superada` com histórico; sem hard-delete |
| Grants de escrita | WRITTEN + TESTED local | migração `20260902400000`; POS/NEG exercidos pela suite (admin escreve, condómino negado pela RLS com grant na mão) |

### Fase C — fundação para Assistir

| Item | Estado | Evidência |
|---|---|---|
| C1 extração de PDF | IMPLEMENTED + TESTED local | `unpdf` (extração 100% local, sem LLM); contrato de indexação `texto`/`metadados`; PDFs sem camada de texto ficam com estado explícito; 8 testes novos; limites: 80 páginas / 200k caracteres |
| C2 pipeline | PRESERVADO | reindexação não-destrutiva mantida (A2); provedor de embeddings inalterado até decisão L-44 |

### Verificação integrada (2026-09-02, actualizada no fim do dia)

- `tsc --noEmit`: limpo. `next build`: verde (inclui `/privacidade`, `/termos`).
- Unitários: 150/150 (11 ficheiros). Segurança: **262/262** contra stack
  Supabase local com a cadeia 0001→`20260902400000`.
- **CI verde pela primeira vez** (PR #91, run 33667766965): type-check, lint,
  build, `supabase start` (aplica a cadeia do zero) e suite de segurança —
  tudo no runner GitHub. Consta ainda que o `ci.yml` vivia em
  `portaria/.github/workflows/` (o Actions só lê da raiz do repo) e nunca
  tinha corrido; movido para a raiz.
- **Cadeia de migrações reprouzível do zero** (era o defeito que a primeira
  execução do CI expôs): `0019_fornecedores_contratos_base.sql` versiona
  `fornecedores`/`contratos` (nunca tinham entrado no histórico) e repõe a
  postura de grants-padrão do Supabase; pgvector fixado em `extensions`;
  `btree_gist` versionado na 0026; ambiguidade de `tenant_id` e UUID de
  produção hardcoded reparados nas migrações de dados de agosto. Detalhe em
  `supabase/migrations/README.md`. A suite de segurança corre verde contra a
  reconstrução limpa — 262/262.
- **Deploy Netlify**: a falha do preview era o `pnpm-lock.yaml` sem o `unpdf`
  (Netlify deteta pnpm e congela o lockfile); reconciliado — previews
  `ready` nos commits seguintes.

### Não feito / pendente de humano

- **Produção intocada** — e o estado real das migrações em produção é
  DESCONHECIDO a partir do repo; verificar no fluxo pós-merge. Migrações
  pendentes de aplicação: `20260902090000`, `20260902310000`–`20260902330000`,
  `20260902400000`.
- Decisão L-44 (provedor de IA) — secção 5 da página de privacidade foi
  publicada com a variante honesta face à realidade atual (IA ativa, base de
  transferência por fechar); atualizar quando a decisão for registada.
- Assinatura do contrato art. 28.º; aprovação dos prazos de retenção; NIPC,
  email e contactos nas páginas públicas (placeholders visíveis).
- Branch protection no GitHub (requer admin) — configuração documentada em
  `docs/engineering/branch-protection.md`.
- A-4 da matriz (alinhar linha documental de `verificar_disponibilidade`) —
  documental, fica para o próximo toque na matriz.
- Follow-ups registados: `atualizarDocumento` não re-ingere (cobre-se com
  reindexação); extração de DOCX; latência de upload com atas grandes a
  monitorar em produção.
