# Auditoria Funcional — Lançamento Beta · Condomínio Europa

**Data:** 5 de agosto de 2026
**Âmbito:** repositório `inesgavinho-byte/portaria` @ `21649bd` (26 migrações, 33 páginas, 21 módulos de server actions)
**Perspetivas auditadas:** desenvolvedor · administração · condómino/inquilino · Portaria (fornecedor) · segurança multi-tenant

---

## 1. Veredicto

**A plataforma NÃO está pronta para Beta com utilizadores reais.** Não por falta de funcionalidade — essa está madura e bem construída — mas porque **seis falhas de isolamento multi-tenant permitem, hoje, que dados de um condomínio sejam lidos por qualquer pessoa com a chave pública da aplicação**, e que votações de assembleia sejam adulteradas por qualquer membro.

O que é preciso reter: **a qualidade do código da aplicação é alta e não é o problema.** As server actions validam sessão, papel e `tenant_id` de forma consistente e disciplinada. O problema é que a base de dados é acessível diretamente via PostgREST com a `anon key` — que está, por desenho, embutida no bundle do browser — e é o **RLS**, não as server actions, a única fronteira real. As migrações recentes (0023–0026: votações, RAG, notificações, reservas) abandonaram o rigor de RLS que as primeiras (0001–0009) tinham, e é aí que estão todas as falhas.

**Estimativa para Beta seguro:** 2–3 dias de trabalho, quase todo em SQL. Nenhuma reescrita de aplicação é necessária.

---

## 2. Perspetiva de desenvolvedor

### 2.1 O que está bem

| Área | Avaliação |
|---|---|
| Arquitetura | Next.js 15 App Router, Server Components por omissão, server actions para escrita. Coerente e moderna. |
| Isolamento por hostname | O middleware resolve o tenant por lookup à BD e **apaga** sempre o header `x-tenant-slug` que venha do cliente. Não deriva slug do hostname. Correto — bloqueia injeção de tenant. |
| `getCurrentUserInTenant()` | Fonte única de verdade: valida sessão **e** membership. Memoizada com `React.cache()`. Bom padrão. |
| Server actions | Filtram sempre por `.eq("tenant_id", ctx.tenant.id)`. Verifiquei os 21 módulos — a disciplina é consistente. |
| Storage | URLs assinados com TTL de 60 s (`documentos`, `ocorrencias`, regulamento). Bucket `publico` só para logótipo. Correto. |
| Open redirect | `/auth/confirm` valida `next` contra `//` e paths externos. Correto. |
| Build | `tsc --noEmit` limpo. `next build` verde. Sem erros de tipo. |
| Performance | Auth e tenant paralelizados; índices parciais afinados às queries quentes; região das Functions documentada. |

### 2.2 Lacunas de engenharia

| # | Achado | Severidade |
|---|---|---|
| D1 | **Zero testes automatizados.** Nenhum ficheiro `.test.*`/`.spec.*`, nenhuma dependência de teste. Para um produto que conta votos de assembleia e guarda dados pessoais, não há rede de segurança nenhuma. | Alta |
| D2 | **Sem CI.** Não existe `.github/workflows`. Nada impede que um commit que quebre o build ou o RLS chegue a produção. | Alta |
| D3 | **Migrações aplicadas à mão** no SQL Editor do Supabase (documentado nos cabeçalhos). Não há registo de qual migração está aplicada em que ambiente. Ao onboardar o 2.º condomínio isto torna-se um risco operacional sério. | Alta |
| D4 | **`.env.example` incompleto.** Declara 3 variáveis; o código usa 9. Faltam `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`. Um deploy novo arranca com email e IA silenciosamente desligados. | Média |
| D5 | Numeração de migrações salta 0010–0014 e 0019. Confirmei no histórico de git: **essas migrações nunca existiram** — é cosmético, não há schema em falta. Vale um comentário no repo para não assustar quem chegar depois. | Baixa |
| D6 | `verificarVoto()` está exportada mas **não é usada em nenhum componente**. A promessa de "voto verificável" não chega ao utilizador. Pior: se fosse ligada hoje, devolveria sempre `inválido` (ver S4). | Média |

---

## 3. Segurança multi-tenant — o núcleo do problema

> **Modelo de ameaça.** A `anon key` é pública por desenho (está no JavaScript servido a qualquer visitante). Qualquer pessoa pode fazer pedidos diretos a `https://<projeto>.supabase.co/rest/v1/<tabela>` com essa chave, sem passar pela aplicação Next.js. As validações nas server actions **não protegem nada** contra isto. Só o RLS protege. Os achados abaixo são todos exploráveis por esta via.

### P0 — Bloqueadores absolutos de lançamento

#### S1 · Qualquer visitante pode injetar notificações em qualquer utilizador de qualquer condomínio

`0025_notificacoes.sql`:
```sql
create policy "system insert notifications"
  on public.notificacoes for insert
  with check (true);
```

Sem cláusula `to`, a política aplica-se a `anon` e `authenticated`. `with check (true)` não valida nada — nem `user_id`, nem `tenant_id`, nem `tipo`.

**Exploração:** um `POST /rest/v1/notificacoes` com a anon key, `user_id` de qualquer utilizador, `titulo`/`corpo` arbitrários. Sem autenticação nenhuma.

**Impacto:** phishing dentro do produto — uma notificação falsa "Quota extraordinária: transferir para IBAN PT50…" aparece no painel do condómino com a credibilidade da plataforma. Agrava-se por a camada de notificações também enviar **email** a partir do domínio da Portaria: o atacante ganha um relay de spam autenticado com a reputação de envio da Portaria.

#### S2 · Duas funções RPC permitem notificar em massa qualquer condomínio, sem autenticação

`notificar_todos()` e `notificar_admins()` são `SECURITY DEFINER`, aceitam `p_tenant_id`, `p_titulo` e `p_corpo` como argumentos livres, **e não verificam quem chama**. As migrações 0023–0026 **não têm um único `revoke`/`grant`** — confirmado por inspeção. As funções ficam portanto com o `EXECUTE` que o Postgres dá a `PUBLIC` e que o Supabase dá a `anon`.

**Exploração:** `POST /rest/v1/rpc/notificar_todos` com a anon key → notificação forjada para **todos** os membros do condomínio indicado, de uma vez.

Isto é uma regressão direta: a migração `0006_harden_function_grants.sql` foi escrita precisamente para fechar este vetor nas três funções originais, com o raciocínio documentado. As oito funções `SECURITY DEFINER` criadas depois (`buscar_chunks`, `estado_conhecimento`, `notificar_todos`, `notificar_admins`, `total_permilagem_tenant`, `user_permilagem`, `verificar_disponibilidade`, `contar_reservas_semana`) nunca receberam o mesmo tratamento.

#### S3 · Fuga de dados entre condomínios pelo motor de busca da IA

`0024_ia_rag.sql`:
```sql
create or replace function public.buscar_chunks(
  p_tenant_id uuid, p_embedding vector(1536), ...
) ... security definer ...
  where e.tenant_id = p_tenant_id   -- o chamador escolhe o tenant
```

A função corre como `definer` (ignora RLS), recebe o `tenant_id` do chamador e **nunca verifica se o chamador pertence a esse tenant**. Sem `revoke` (ver S2), é chamável por `anon`.

**Exploração:** obter um embedding de 1536 dimensões (trivial) e chamar `buscar_chunks` com o `tenant_id` de outro condomínio — os `tenant_id` são enumeráveis porque `tenants` é publicamente legível por decisão consciente da 0003. Devolve o **texto integral do regulamento**, títulos e descrições de documentos, e o conteúdo de **ocorrências resolvidas** desse condomínio.

`estado_conhecimento()` tem a mesma assinatura e o mesmo problema.

**Isto é a falha mais grave da auditoria:** é uma quebra direta da promessa central do produto — que cada condomínio está isolado dos outros.

#### S4 · A integridade das votações de assembleia não é garantida

Três problemas compostos em `0023_votacoes.sql`:

```sql
create policy "system inserts votos"
  on public.votos for insert
  with check (tenant_id in (select public.user_tenant_ids()));
```

**(a) Enchimento de urna.** O comentário diz "apenas o sistema insere votos (via server action com service role)" — mas a action `votar()` usa o cliente normal, não o service role, e a política só exige que o `tenant_id` seja de um tenant do utilizador. Qualquer membro autenticado pode fazer `POST /rest/v1/votos` **N vezes**, escolhendo a opção. Não se valida que a votação está aberta, que o utilizador é participante, que ainda não votou, nem que `opcao_id` pertence a `votacao_id`.

**(b) Reset do registo de participação.**
```sql
create policy "users update own participacao"
  on public.votacao_participantes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```
Sem restrição de coluna, o utilizador pode pôr `votou_em` de novo a `null` e votar outra vez **pela própria UI**, repetidamente.

**(c) O anonimato torna isto indetetável.** `votos` não tem `user_id` — por desenho, e é a decisão certa. Mas significa que uma urna adulterada **não é auditável**: não há como saber que votos são legítimos. Uma votação comprometida não é corrigível a posteriori, só anulável.

**(d) A verificação prometida não funciona.** `votos` não tem política de `SELECT`, logo `verificarVoto()` — que consulta `votos` com o cliente do utilizador — devolve sempre `valido: false`. A função nem está ligada à UI (D6).

**Consequência legal:** as deliberações de assembleia de condomínio têm efeitos jurídicos vinculativos (Código Civil, art. 1430.º e ss.). Uma votação eletrónica cuja integridade não é demonstrável é **impugnável**, e a Portaria — como fornecedora do sistema de votação — fica exposta à impugnação. **Recomendação: não lançar o módulo de votações no Beta.** É a única funcionalidade que eu retiraria do âmbito.

#### S5 · Reservas cruzadas entre condomínios

`0026_reservas.sql`:
```sql
create policy "users create own reservas"
  on public.reservas for insert
  with check (user_id = auth.uid());
```

Valida o autor. **Não valida que `tenant_id` é um tenant do utilizador, nem que `espaco_id` pertence a esse `tenant_id`.**

**Exploração:** um membro do condomínio A insere uma reserva com `tenant_id` e `espaco_id` do condomínio B — ocupa a sala comum de B, e o trigger `reserva_notificar` notifica os administradores de B de uma reserva feita por alguém que não é condómino deles.

#### S6 · Os papéis `inquilino` e `comissao` não existem no RLS

O `user_role` enum tem quatro valores. As políticas RLS conhecem **dois conceitos**: "é admin" e "é membro". Confirmei por inspeção: `inquilino` aparece nas migrações apenas na linha que o adiciona ao enum; `comissao` apenas no comentário da 0001.

Toda a restrição do inquilino é **UI**: `redirect("/avisos")` em `documentos/page.tsx`, `assembleias/page.tsx` e no menu de navegação. Ao nível da base de dados, o inquilino é um membro de pleno direito e a política `"members see tenant documentos"` dá-lhe **acesso de leitura a todos os documentos do condomínio** — incluindo as categorias `conta`, `ata`, `contrato` e `apolice`.

**Exploração:** `GET /rest/v1/documentos` com a sessão de um inquilino → contas do condomínio, atas de assembleia, contratos com fornecedores. Depois, um URL assinado por cada ficheiro.

**Impacto:** as contas e as atas de um condomínio são informação dos **condóminos**, não dos arrendatários. Isto é uma divulgação indevida a terceiros contratualmente distintos, e a promessa "Sem financeiro nem assembleias" que o próprio código escreve no comentário do menu não é cumprida.

### P1 — Corrigir antes de escalar além do Europa

| # | Achado |
|---|---|
| S7 | **Preferência de notificações não grava para condóminos.** `atualizarPreferenciaNotificacoes()` faz `UPDATE` em `user_tenants`, mas as políticas dessa tabela só dão `UPDATE` a admins. Um condómino recebe "guardado" (`{ok:true}`) e nada é gravado — o `UPDATE` afeta 0 linhas sem erro. **Bug funcional visível ao utilizador**, com consequência de RGPD: o utilizador não consegue exercer a oposição ao tratamento por email que a interface lhe promete. |
| S8 | `user_permilagem(p_user_id, p_tenant_id)` é `SECURITY DEFINER` e aceita **qualquer** `user_id` — permite ler a permilagem (logo, a dimensão da fração) de qualquer utilizador. Sem `revoke`, por `anon`. |
| S9 | Toda a gente vê todas as reservas do condomínio, incluindo `user_id`, `motivo` e `num_pessoas` de terceiros. Necessário para mostrar disponibilidade, mas devia expor apenas o intervalo ocupado — não quem reservou nem para quê. Minimização de dados (RGPD art. 5.º-1-c). |
| S10 | `conversas_ia_mensagens` permite ao utilizador inserir mensagens com `role='assistant'` — pode fabricar respostas atribuídas ao assistente no seu próprio histórico. Relevante se essas conversas forem usadas como prova de que a plataforma informou algo. |
| S11 | Um admin pode convidar um email já registado com `role='admin'`; `aceitar_convites()` aceita todos os convites pendentes que correspondam ao email autenticado, sem confirmação explícita do convidado. Adesão silenciosa a um condomínio. Baixo impacto (não há fuga de dados), mas é fricção de consentimento. |
| S12 | `notificarNovaOcorrencia()` interpola `tenant.nome` no HTML do email sem passar por `escapeHtml()`, ao contrário dos restantes campos no mesmo ficheiro. Só explorável por um admin, mas é inconsistente. |

---

## 4. Perspetiva da administração (utilizador humano)

Esta é a perspetiva mais bem servida do produto. O painel é genuinamente completo: ocorrências com timeline e fotografias, assembleias com convocatória e ata, documentos com editor rico, avisos, frações com permilagem, fornecedores, contratos com aviso automático de renovação, contactos, conversas, blueprints com exportação para PDF, pesquisa transversal, calendário, timeline e assistente de IA. Para uma administração que hoje trabalha em email e Excel, o salto é real.

**Pontos fortes**

- O **Centro de Trabalho** (`/inicio`) dá o estado do prédio numa página.
- Os **Blueprints** com variáveis `{{...}}` substituídas no servidor são a melhor ideia do produto: transformam trabalho administrativo repetitivo em algo que se faz num clique.
- O **pré-visualizador de vistas** (admin/condómino/inquilino) mostra maturidade de produto — a administração vê o que o condómino vê.

**Atritos**

| # | Achado |
|---|---|
| A1 | **Ingestão de documentos para a IA só indexa título e descrição.** O comentário no código é explícito: *"Para documentos PDF, precisaríamos de extrair texto — por agora usa título + descrição"*. A administração vai carregar 50 atas em PDF, ver "50 documentos indexados", perguntar ao assistente sobre o conteúdo e receber "Não encontrei informação". **A funcionalidade parece funcionar e não funciona.** É a maior lacuna de expectativa do produto. |
| A2 | **Não há gestão de erro na reindexação.** `reindexarTenant()` apaga **todos** os embeddings do tenant e só depois reindexa. Se a chave da OpenAI falhar a meio, a base de conhecimento fica vazia sem aviso. |
| A3 | **Sem exportação de dados do condomínio.** Uma administração que queira sair não tem como levar os seus dados. Isto é simultaneamente um atrito comercial e uma obrigação (RGPD art. 20.º, portabilidade). |
| A4 | O cron de renovação de contratos exige um agendador externo com `CRON_SECRET`. Não há `.github/workflows` nem configuração de agendamento no repo — **provavelmente ninguém o está a chamar**, logo os avisos de renovação não estão a acontecer. |
| A5 | O convite não tem reenvio nem revogação visível no fluxo. Um email que caia no spam deixa o membro bloqueado sem caminho de recuperação para a administração. |

---

## 5. Perspetiva do condómino / inquilino (utilizador humano)

**Pontos fortes:** o Mural é a página certa como entrada. Submeter uma ocorrência com fotografia é simples e a timeline dá visibilidade real do estado — resolve a queixa clássica de "escrevi à administração e nunca soube de nada". A página de Regulamento com texto integral pesquisável e PDF para download é um serviço concreto.

**Atritos**

| # | Achado |
|---|---|
| C1 | **O botão de desligar notificações por email não funciona** (S7). O condómino desliga, vê confirmação, e continua a receber. É o tipo de falha que destrói confiança de forma desproporcionada ao seu tamanho técnico. |
| C2 | **O assistente de IA expõe ocorrências de vizinhos.** `ingerirOcorrenciasResolvidas()` indexa o título, a categoria e a **descrição** de ocorrências resolvidas em `conhecimento_embeddings`, cuja política é `"members read embeddings"` — **todos** os membros. Mas as ocorrências em si só são visíveis ao autor e aos admins. O RAG contorna essa restrição: um condómino pode perguntar ao assistente e receber o texto de queixas de vizinhos. Podem conter conflitos de vizinhança, dados de saúde, identificação de pessoas. **Fuga de dados pessoais dentro do condomínio, por desenho.** Agrava-se com `sugerirResolucao()`, que usa `getCurrentUserInTenant()` e não `requireAdmin()` — qualquer membro a pode invocar. |
| C3 | O inquilino vê no menu apenas Mural, Ocorrências e Regulamento, mas o acesso à BD é total (S6). O modelo de papéis prometido não é o modelo entregue. |
| C4 | Sem histórico de reservas passadas nem visão de calendário partilhado; `listarReservas()` filtra apenas estados ativos. |
| C5 | O voto não é verificável (S4d), apesar de o produto prometer verificabilidade. |

---

## 6. Perspetiva legal — Portaria como fornecedora de serviço

Esta secção é a que tem maior risco não mitigado, porque nenhuma destas peças existe no repositório.

### 6.1 Estrutura de responsabilidade RGPD — ausente

Na relação em análise, **cada condomínio é o responsável pelo tratamento** (controller) e a **Portaria é subcontratante** (processor). O art. 28.º do RGPD exige um **contrato escrito de subcontratação** entre ambos, com objeto, duração, natureza e finalidade do tratamento, categorias de titulares e dados, e as garantias do subcontratante.

**Não existe no repositório:** contrato de subcontratação, política de privacidade, termos de serviço, registo de subcontratantes ulteriores, nem qualquer página `/privacidade` ou `/termos`. Confirmei por busca em `src/` e `docs/`.

**Sem o contrato do art. 28.º assinado antes de o primeiro condómino do Europa iniciar sessão, o tratamento é ilícito**, independentemente da qualidade técnica da plataforma. É um bloqueador jurídico ao mesmo nível dos P0 técnicos.

### 6.2 Transferências para países terceiros — o problema mais difícil

O pipeline de IA envia conteúdo do condomínio para fora da UE:

| Destinatário | Dados enviados | Localização | Base de transferência |
|---|---|---|---|
| **DeepSeek** | Pergunta do utilizador + chunks do regulamento, documentos e **ocorrências resolvidas** (com dados pessoais) + histórico da conversa | **China** | **Nenhuma** |
| **OpenAI** | Texto a gerar embedding (todos os chunks indexados) + fallback de chat | EUA | Não documentada |

A China **não tem decisão de adequação** da Comissão Europeia. Uma transferência para a China exige um mecanismo do art. 46.º (cláusulas-tipo) **e** uma avaliação de impacto da transferência que demonstre proteção equivalente — exercício que, para a China, é reconhecidamente muito difícil de concluir favoravelmente.

O DeepSeek é o **provedor primário** (`enviarMensagem()` chama-o primeiro; a OpenAI é só fallback). Note-se que **é a OpenAI que gera todos os embeddings** — logo, todo o conteúdo indexado passa pelos EUA, mesmo quando o chat corre no DeepSeek.

**Recomendação:** para o Beta, substituir o DeepSeek por um provedor na UE ou coberto por adequação/SCC com avaliação feita. Em alternativa, desligar a IA no Beta. Manter o DeepSeek com dados reais de condóminos é, na minha leitura, o risco jurídico mais concreto de todo o projeto.

### 6.3 Afirmações da página pública — risco de prática comercial enganosa

`section-confianca.tsx` afirma a visitantes:

| Afirmação | Situação real |
|---|---|
| "Infraestrutura europeia" | Supabase em `eu-west-1` ✓. Mas o pipeline de IA envia conteúdo para a China e os EUA, e o email para o Resend. A afirmação, como está, induz em erro. |
| "Backups diários" | Não há evidência no repositório de backups configurados, verificados ou testados. Não pude confirmar. |
| "Só quem tem acesso, acessa" | Contradita por S1, S3, S5 e S6. |
| "Legislação portuguesa, sempre atualizada" | `src/lib/ai/legislacao.ts` contém texto legal estático. Não há processo de atualização. "Sempre atualizada" não é sustentável. |

Afirmações não substanciadas sobre segurança e conformidade em comunicação comercial expõem a Portaria ao regime das práticas comerciais desleais (DL 57/2008). Devem ser suavizadas para o que é demonstrável, ou substanciadas.

### 6.4 Outras obrigações em falta

| # | Achado |
|---|---|
| L1 | **Sem política de retenção.** Nada é apagado. Ocorrências, conversas de IA e notificações acumulam indefinidamente. Viola a limitação da conservação (art. 5.º-1-e). |
| L2 | **Sem mecanismo de exercício de direitos.** Não há acesso, portabilidade nem apagamento (arts. 15.º, 17.º, 20.º). Um condómino que peça os seus dados não tem resposta possível dentro do produto. |
| L3 | **Sem informação de tratamento pela IA.** O condómino não é informado de que a sua ocorrência será indexada e usada para alimentar um assistente automático acessível a outros. |
| L4 | **Sem registo de atividades de tratamento** (art. 30.º) nem procedimento de notificação de violação de dados em 72 h (art. 33.º). Se S3 for explorada hoje, a Portaria não tem processo para detetar nem notificar. |
| L5 | **Sem consentimento de cookies.** A aplicação usa cookies de sessão (estritamente necessários, isentos) e um cookie `portaria-vista` de preferência. Provavelmente isento, mas nunca avaliado nem documentado. |
| L6 | **Votações sem valor probatório defensável** (S4). A não lançar no Beta. |

---

## 7. Síntese priorizada

### Bloqueadores de lançamento (P0)

| ID | Achado | Natureza |
|---|---|---|
| S1 | Injeção de notificações por qualquer visitante | RLS |
| S2 | 8 funções `SECURITY DEFINER` executáveis por `anon` | Grants |
| S3 | **Fuga de dados entre condomínios via `buscar_chunks`** | RLS/RPC |
| S4 | Integridade de votações não garantida | RLS |
| S5 | Reservas cruzadas entre condomínios | RLS |
| S6 | `inquilino`/`comissao` sem RLS — acesso a contas e atas | RLS |
| C2 | Ocorrências privadas expostas a todos os membros via RAG | RLS/desenho |
| L-28 | **Contrato de subcontratação RGPD art. 28.º inexistente** | Legal |
| L-44 | **Transferência de dados pessoais para a China sem base legal** | Legal |

### Alta prioridade (P1)

S7 (preferência de email não grava) · S8 · S9 · S10 · A1 (**a IA não lê o conteúdo dos PDF**) · A2 · A4 (cron não agendado) · D1 (sem testes) · D2 (sem CI) · D3 (migrações à mão) · 6.3 (afirmações da landing) · L1 · L2 · L3

### Média (P2)

S11 · S12 · A3 · A5 · C4 · C5 · D4 · D6 · L4 · L5

---

## 8. Recomendação de âmbito para o Beta Europa

**Retirar do âmbito:**

1. **Votações eletrónicas** — o risco de impugnação de uma deliberação vinculativa não é aceitável antes de S4 estar resolvido e testado. É a única funcionalidade cuja falha tem consequência jurídica irreversível.
2. **Assistente de IA** — até resolver a transferência para a China (6.2), a fuga de ocorrências (C2) e a expectativa falsa da indexação de PDF (A1). Alternativa: manter só sobre o regulamento, com a ingestão de ocorrências desligada e um provedor na UE.

**Manter no âmbito** (depois dos P0 técnicos): Mural e avisos, documentos, ocorrências com timeline e fotografias, assembleias com convocatória e ata, regulamento, reservas, frações, fornecedores, contratos, contactos, conversas, blueprints, pesquisa, calendário, timeline.

Isto continua a ser um Beta forte. As duas funcionalidades a retirar são as duas mais recentes e menos maduras; o núcleo que resta é o que a administração usa todos os dias e é sólido.

---

*Auditoria conduzida por leitura integral das 26 migrações SQL, dos 21 módulos de server actions, do middleware e da camada de tenant, com verificação de build (`next build`) e tipos (`tsc --noEmit`). Não foi executada exploração ativa contra a instância de produção — os vetores descritos foram derivados por leitura das políticas RLS e dos grants, e cada um indica o ficheiro e a linha da política em causa.*
