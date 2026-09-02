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

*(Preenchido fase a fase, com estados de evidência — WRITTEN/APPLIED/VERIFIED
/etc. — não linguagem vaga.)*
