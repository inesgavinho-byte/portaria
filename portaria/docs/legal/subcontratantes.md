# Registo de Subcontratantes Ulteriores — Anexo I

> **Estado: MINUTA (WRITTEN).** Registo operacional do Anexo I do contrato de
> subcontratação (`contrato-subcontratacao-rgpd.md`, cláusula 6.ª). Responde ao
> item **A1.3** do `docs/goal-portaria-1.0.md` e às secções 6.1 e 6.2 da
> `docs/auditoria-beta-europa.md`. **Não constitui aconselhamento jurídico.**
>
> Qualquer alteração a esta lista tem de ser comunicada a cada condomínio com
> **antecedência mínima de 30 dias** (cláusula 6.ª, n.º 2 do contrato).

| Versão | Data | Notas |
|---|---|---|
| 0.1 | 2026-09-02 | Minuta inicial a partir de verificação no repositório (`src/lib/`, `supabase/migrations/`, `netlify.toml`, `.env.example`). |

## Cadeia de responsabilidade

**Condomínio** (responsável pelo tratamento) → **Portaria** (subcontratante,
art. 28.º RGPD) → subcontratantes ulteriores listados abaixo (art. 28.º, n.º 2
e n.º 4). A Portaria mantém-se responsável perante o condomínio pelo cumprimento
das obrigações de cada um.

Convenção de estados: **Ativo** — integrado no código e em uso; **A confirmar** —
integrado no código, mas sem verificação possível a partir do repositório
(configuração de runtime, contrato/DPA do fornecedor, configuração no painel do
fornecedor). O que não for verificável no repositório está marcado «a confirmar»
e não é afirmado como facto.

## Lista

| # | Subcontratante | Serviço | Dados enviados | Localização do tratamento | Base de transferência (se país terceiro) | Estado |
|---|---|---|---|---|---|---|
| 1 | **Supabase** (Supabase, Inc.) | Base de dados (Postgres), autenticação, armazenamento de ficheiros | Todos os dados da plataforma: identificação e contacto dos membros, ocorrências, documentos, assembleias, votações, financeiro, conversas de IA, comunicações, anexos | Região `eu-west-1` (Irlanda) segundo a configuração do projeto (`netlify.toml`, comentário; `src/components/landing/section-confianca.tsx`). **Confirmação no painel Supabase pendente** | Não aplicável (intra-UE, se a região se confirmar) | **Ativo** (núcleo); região a confirmar no painel |
| 2 | **Netlify** | Alojamento da aplicação Next.js (SSR + funções serverless) | Dados em trânsito no processamento dos pedidos: tudo o que passa pelas páginas e server actions (incl. conteúdo do condomínio em memória, sem persistência própria conhecida) | Região das funções definida ao nível do site na dashboard; `netlify.toml` documenta a intenção de região europeia (Frankfurt/Irlanda) mas **o valor real da dashboard não é verificável no repositório** — por defeito as funções correm nos EUA | SCC da Netlify — **a confirmar** (DPA não arquivado no repositório) | **Ativo**; região a confirmar |
| 3 | **Resend** | Envio de email transacional (notificações) | Endereço de email do destinatário, assunto e corpo HTML da notificação (pode conter títulos/descrições de ocorrências, avisos, convites e nomes) | **A confirmar** (Resend é empresa dos EUA; residência de dados não documentada no repositório) | **A confirmar** (DPA/SCC do Resend não arquivados no repositório) | **Ativo** em código (`src/lib/email.ts`); sem `RESEND_API_KEY` o envio degrada para no-op |
| 4 | **OpenAI** | Embeddings (totalidade da indexação e pesquisa semântica), chat de recurso (fallback), transcrição de PDF (regulamento), extração de dados de contratos | Texto enviado a embeddings (máx. 8000 carateres por bloco): regulamento, título+descrição de documentos, **ocorrências resolvidas com dados pessoais**, perguntas dos utilizadores; PDF integral do regulamento (até 15 MB) e **PDF integral de contratos**; como fallback de chat: pergunta + blocos de contexto | EUA (endpoint `api.openai.com`); eventuais opções de residência UE **a confirmar com o fornecedor** | **Nenhuma documentada no repositório** (ver `decisao-ia-l44.md`) | **Ativo** (`src/lib/ai/openai.ts`; chamado de `src/lib/actions/ia-rag.ts`, `conhecimento.ts`, `extrair-contrato.ts`) |
| 5 | **DeepSeek** | Chat do assistente (**provedor primário**), geração de título de conversa, sugestões de resolução de ocorrências | Pergunta do utilizador + até 5 blocos de contexto (regulamento, documentos, ocorrências resolvidas) + últimas 10 mensagens da conversa + nome do condomínio; primeira mensagem de cada conversa (para título); título+descrição da ocorrência em análise + até 3 ocorrências resolvidas similares | **China** (endpoint `api.deepseek.com`) | **Nenhuma.** A China não tem decisão de adequação; o mecanismo do art. 46.º + avaliação de impacto da transferência **não existem** (ver `decisao-ia-l44.md`) | **Ativo em código** como primário (`src/lib/ai/deepseek.ts`; `src/lib/actions/ia-rag.ts`, `enviarMensagem()`); uso real depende de `DEEPSEEK_API_KEY` estar definida em produção — **a confirmar** |
| 6 | **Hostinger** | Caixas de correio externas (receção de email de fornecedores; ingestão server-side para `email_mensagens` + bucket `email-anexos`) | Mensagens de correio recebidas dos fornecedores do condomínio: remetente, assunto, corpo e anexos | **A confirmar** | **A confirmar** | **Ativo em código** (migração `0031_email_hostinger_inbox.sql`, `fornecedor default 'hostinger'`); uso real por condomínio **a confirmar** |

## Notas de verificação

1. **O que a OpenAI recebe, recebe-o sempre.** Mesmo quando o chat corre no
   DeepSeek, **todos os embeddings são gerados pela OpenAI** (`gerarEmbedding`
   é o único gerador de vetores do projeto) — logo, todo o conteúdo indexado
   sai para os EUA. É a constatação central da secção 6.2 da auditoria.
2. **Ordem de chamada do chat.** Em `enviarMensagem()` o DeepSeek é chamado
   primeiro; a OpenAI só é chamada em falha/ausência de chave. O fallback da
   OpenAI envia a pergunta e o contexto, mas **não** o histórico da conversa
   (o DeepSeek recebe as últimas 10 mensagens).
3. **Respeito pela preferência de email.** O pipeline de notificações consulta
   `user_tenants.notificacoes_email` e não envia email a quem a desativou
   (`src/lib/notificacoes.ts`).
4. **Catálogo de integrações da UI não é fluxo de dados.** `src/lib/integracoes.ts`
   lista conectores (Claude, ChatGPT, Google, Outlook, SIBS, Revolut…) apenas
   como catálogo estático de UI — **nenhum está ligado**; não são
   subcontratantes. Se algum for ativado, tem de ser acrescentado a esta lista
   com aviso prévio de 30 dias.
5. **Agendador de cron ainda não existe.** O endpoint de renovação de contratos
   (A4) prevê um agendador externo (cron-job.org/EasyCron ou GitHub Actions —
   `docs/operations/contract-renewal-cron.md`), ainda **não configurado**. Quando
   existir, avaliar se envia dados pessoais e acrescentar aqui.
6. **DPA com cada fornecedor.** Para além da base de transferência, falta
   arquivar no repositório (ou em dossier jurídico) o DPA/SCC de cada
   subcontratante ulterior — condição da cláusula 6.ª, n.º 3 do contrato.
   **Pendência humana:** recolher e arquivar.

## Transferências para países terceiros — resumo

| Destinatário | País terceiro | Base documentada hoje |
|---|---|---|
| OpenAI | EUA | Não |
| DeepSeek | China | Não |
| Netlify (se funções nos EUA) | EUA | Não (DPA a confirmar) |
| Resend | (a confirmar) | Não (DPA a confirmar) |

O estado desta matéria, as opções e a decisão pendente estão no dossier
`decisao-ia-l44.md`. **Critério de aceitação do Beta:** nenhum dado pessoal sai
da UE sem base de transferência documentada — ou a IA está desligada
(`docs/goal-beta-europa.md`, Fase 3).
