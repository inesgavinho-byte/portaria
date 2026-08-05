# Goal — Beta seguro para o Condomínio Europa

> Objetivo que eu (Claude) me comprometo a cumprir, derivado de `auditoria-beta-europa.md`.
> Escrito para ser verificável: cada fase tem critérios de aceitação que se conseguem
> comprovar, não apenas declarar.

---

## Declaração do goal

**Levar a plataforma Portaria de "funcionalmente rica mas insegura" a "lançável em Beta para o Edifício Europa", garantindo que nenhum dado de um condomínio é acessível a quem não pertence a esse condomínio, que cada papel só vê o que lhe compete, e que a Portaria tem a base legal necessária para tratar dados pessoais em nome dos condomínios que serve.**

O sucesso não é "o código compila". É: **um atacante com a chave pública da aplicação e uma sessão válida de um condomínio não consegue ler, escrever nem forjar nada fora do seu próprio condomínio e do seu próprio papel** — e essa afirmação está provada por testes que correm em CI.

### Princípios que me imponho

1. **O RLS é a fronteira, não a aplicação.** Cada correção é validada contra PostgREST direto com a anon key, não pela UI. Se só a UI bloqueia, não está corrigido.
2. **Nada de âmbito silenciosamente reduzido.** Se uma funcionalidade não puder ir segura para o Beta, digo-o explicitamente e proponho retirá-la — não a deixo meio-corrigida.
3. **Não aplico alterações à base de dados de produção sem aprovação explícita.** Escrevo as migrações, explico o efeito, espero luz verde.
4. **Não reescrevo o que está bom.** As server actions e a camada de tenant estão bem feitas. O trabalho é quase todo em SQL.
5. **Distingo o que verifiquei do que inferi.** Onde não puder confirmar (backups, cron agendado, chaves em produção), digo que não confirmei em vez de assumir.

---

## Fase 0 — Fechar o isolamento multi-tenant

**Entregável:** `supabase/migrations/0027_hardening_multitenant.sql`
**Depende de:** aprovação da Inês para aplicar em produção.

| # | Correção |
|---|---|
| 0.1 | **S1** — substituir `notificacoes` INSERT `with check (true)` por uma política que exija que a linha pertença ao tenant do autor e que o autor tenha legitimidade para notificar. Os triggers continuam a funcionar (correm como `definer`). |
| 0.2 | **S2** — `revoke execute ... from public, anon` nas 8 funções `SECURITY DEFINER` das migrações 0023–0026, com `grant` a `authenticated` apenas onde é necessário. `notificar_todos`/`notificar_admins` passam a `service_role` só. Repete o padrão já documentado na 0006. |
| 0.3 | **S3** — `buscar_chunks` e `estado_conhecimento` passam a validar `is_tenant_member(p_tenant_id)` internamente e a rejeitar chamadas de fora do tenant. Deixa de bastar passar um `tenant_id`. |
| 0.4 | **S4** — `votos` INSERT passa a exigir: votação `aberta`, do tenant do autor, autor é participante com `votou_em is null`, e `opcao_id` pertence a `votacao_id`. `votacao_participantes` UPDATE deixa de permitir reverter `votou_em` de não-nulo para nulo. |
| 0.5 | **S5** — `reservas` INSERT passa a exigir `tenant_id in user_tenant_ids()` **e** coerência `espaco_id → tenant_id`. Mesmo padrão que a 0003 aplicou às ocorrências. |
| 0.6 | **S6** — introduzir a noção de papel no RLS. Nova função `user_tem_papel(tenant_id, papeis[])`. `documentos` deixa de ser legível por `inquilino` nas categorias `conta`, `ata`, `contrato`, `apolice`; `assembleias`, `assembleia_pontos` e `votacoes` deixam de ser legíveis por `inquilino`. O modelo de papéis passa a ser real e não decorativo. |
| 0.7 | **C2** — parar a fuga de ocorrências pelo RAG: `conhecimento_embeddings` deixa de ser legível por membros na origem `ocorrencia_resolvida` (fica admin-only), e `sugerirResolucao()` passa a `requireAdmin()`. |
| 0.8 | **S8** — `user_permilagem` deixa de aceitar um `user_id` arbitrário de quem não seja admin do tenant. |

**Critérios de aceitação**

- [ ] Um script de verificação faz, contra PostgREST com a anon key e com sessões de teste, **uma tentativa por cada um de S1–S6, S8 e C2**, e todas falham com 401/403 ou 0 linhas.
- [ ] O mesmo script confirma que os caminhos legítimos continuam a funcionar (condómino cria ocorrência, vota uma vez, reserva um espaço; admin lê documentos; trigger de notificação dispara).
- [ ] `next build` e `tsc --noEmit` continuam verdes.
- [ ] Um inquilino de teste recebe 0 linhas em `GET /rest/v1/documentos?categoria=eq.conta`.
- [ ] `buscar_chunks` com o `tenant_id` de outro condomínio devolve 0 linhas.

---

## Fase 1 — Corrigir o que o utilizador vê quebrado

| # | Correção |
|---|---|
| 1.1 | **S7** — a preferência de notificações por email passa a gravar para condóminos: política de `UPDATE` em `user_tenants` restrita à própria linha e à coluna `notificacoes_email`. Sem isto, o produto promete um direito de oposição que não cumpre. |
| 1.2 | **A1** — resolver a expectativa falsa da indexação: extrair o texto real dos PDF na ingestão, **ou**, se a extração não entrar no âmbito do Beta, mudar a interface para dizer com honestidade que só título e descrição são indexados. Não fica ambíguo. |
| 1.3 | **A2** — `reindexarTenant()` deixa de apagar antes de saber se consegue reindexar. |
| 1.4 | **D6/C5** — ligar `verificarVoto()` à UI com uma política de `SELECT` que permita a verificação por hash sem revelar a urna, **ou** remover a função e a promessa de verificabilidade. Só depois de S4. |
| 1.5 | **S9** — a lista de disponibilidade de reservas deixa de expor `user_id`, `motivo` e `num_pessoas` de terceiros. |
| 1.6 | **S10, S11, S12** — `role='assistant'` só via servidor; convite passa a exigir aceitação explícita; `escapeHtml` em `tenant.nome`. |
| 1.7 | **D4** — `.env.example` passa a declarar as 9 variáveis que o código usa, com indicação de quais são obrigatórias para arrancar. |
| 1.8 | **A4** — confirmar se o cron de renovação de contratos está efetivamente agendado. Se não estiver, agendar e documentar. Se não puder confirmar, dizer que não confirmei. |

**Critérios de aceitação**

- [ ] Um condómino desliga as notificações por email, recarrega a página, e a preferência persiste.
- [ ] Nenhum ecrã afirma indexar conteúdo que não indexa.
- [ ] Falhar a chave da OpenAI a meio de uma reindexação deixa a base de conhecimento anterior intacta.
- [ ] `GET /rest/v1/reservas` como condómino não devolve `motivo` nem `user_id` de reservas de terceiros.

---

## Fase 2 — Rede de segurança de engenharia

| # | Correção |
|---|---|
| 2.1 | **D1** — suite de testes de RLS: para cada tabela, asserções de leitura/escrita nas perspetivas anon, condómino, inquilino, comissão, admin e admin-de-outro-tenant. Este é o teste que faltava e que teria apanhado S1–S6. |
| 2.2 | **D2** — CI no GitHub Actions: `tsc --noEmit`, `next build`, `next lint` e os testes de RLS em cada push. |
| 2.3 | **D3** — passar a Supabase CLI para migrações versionadas, com registo de estado por ambiente. Antes de onboardar o 2.º condomínio, não depois. |
| 2.4 | **D5** — nota no repositório a documentar que 0010–0014 e 0019 nunca existiram, para não parecer schema em falta. |

**Critérios de aceitação**

- [ ] A suite falha se qualquer uma das políticas da Fase 0 for revertida. Verifico isto revertendo uma de propósito.
- [ ] O CI corre verde no branch e bloqueia merge em vermelho.
- [ ] `supabase migration list` mostra o estado real de produção.

---

## Fase 3 — Base legal (Portaria como subcontratante)

Esta fase produz documentos, não código. Escrevo as minutas; a validação jurídica final não é minha e digo-o.

| # | Entregável |
|---|---|
| 3.1 | **L-28** — minuta de **contrato de subcontratação (RGPD art. 28.º)** entre a Portaria e cada condomínio: objeto, duração, natureza e finalidade, categorias de dados e titulares, medidas técnicas, subcontratantes ulteriores autorizados, apoio ao exercício de direitos, destino dos dados no fim. **Assinado antes do primeiro início de sessão real.** |
| 3.2 | **L-44** — decidir a IA. Recomendo substituir o DeepSeek por um provedor na UE, ou desligar a IA no Beta. Se a Inês quiser manter, escrevo a avaliação de impacto da transferência e as cláusulas-tipo — mas registo por escrito que considero o risco elevado e que a decisão é dela. |
| 3.3 | Registo de subcontratantes ulteriores: Supabase, Netlify, Resend, OpenAI, DeepSeek — com localização, finalidade e base de transferência de cada um. |
| 3.4 | Política de privacidade e termos de serviço, em `/privacidade` e `/termos`, com a informação do tratamento pela IA (**L3**). |
| 3.5 | **6.3** — corrigir as afirmações de `section-confianca.tsx` para o que é demonstrável. "Infraestrutura europeia" não é sustentável enquanto o pipeline de IA sair da UE; "sempre atualizada" não é sustentável sem processo de atualização. |
| 3.6 | **L1, L2** — política de retenção com prazos por tipo de dado, e exercício de direitos (acesso, portabilidade, apagamento) — que resolve também **A3**, a exportação que a administração precisa para não se sentir presa. |
| 3.7 | **L4** — registo de atividades de tratamento (art. 30.º) e procedimento de notificação de violação em 72 h (art. 33.º). |
| 3.8 | **L5** — avaliar os cookies e documentar a conclusão, mesmo que seja "todos isentos". |

**Critérios de aceitação**

- [ ] Contrato do art. 28.º assinado com o Europa antes do primeiro início de sessão de um condómino real.
- [ ] Nenhum dado pessoal sai da UE sem base de transferência documentada — ou a IA está desligada.
- [ ] Cada afirmação da página pública é sustentável por evidência.
- [ ] Um condómino que peça os seus dados tem um caminho concreto de resposta.

---

## Definição de pronto para o Beta Europa

O Beta lança quando **todas** estas condições se verificarem:

1. Fase 0 completa e provada pelo script de verificação, aplicada em produção.
2. Fase 1 completa — nada visível ao utilizador está quebrado ou promete o que não faz.
3. Fase 2.1 e 2.2 completas — os testes de RLS existem e correm em CI.
4. Fase 3.1 assinada e 3.2 decidida.
5. **Votações eletrónicas fora do âmbito do Beta** — ou dentro, mas só após S4 corrigido, testado e com verificabilidade a funcionar.
6. **Assistente de IA fora do âmbito** — ou dentro, mas sem ingestão de ocorrências, com provedor na UE e sem afirmar indexar o que não indexa.

## O que não faço sem perguntar

- Aplicar migrações à base de dados de produção.
- Alterar o texto público da landing page (é comunicação de marca, não é minha decisão).
- Decidir se as votações e a IA entram no Beta — recomendo, decide a Inês.
- Contratar ou trocar provedores.

## Sequência de trabalho

Fase 0 primeiro e sozinha — é o que separa "não lançável" de "lançável". Depois Fase 1 e Fase 2 em paralelo com a Fase 3, que depende mais de decisão do que de código. Reporto ao fim de cada fase com o que ficou provado e o que não consegui provar.
