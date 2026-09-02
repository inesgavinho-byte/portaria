# Dossier de Decisão — IA e Transferência para Países Terceiros (L-44)

> **Estado: PROPOSTO — decisão pendente.** Responde ao item **A1.2 / L-44** do
> `docs/goal-portaria-1.0.md`, ao item **3.2** do `docs/goal-beta-europa.md` e à
> secção 6.2 da `docs/auditoria-beta-europa.md`. **Não constitui
> aconselhamento jurídico.** A decisão final é da GAVINHO, Arq.ª Inês Gavinho e
> está registada na secção «Decisão» no fim deste dossier.
>
> Convenção: o que está aqui descrito do pipeline foi **verificado no código**
> (ficheiros referenciados). Configurações de runtime e condições comerciais dos
> provedores estão marcadas «a confirmar».

## 1. Pipeline de IA atual (verificado no código)

Duas famílias de funcionalidades usam IA: o **assistente do condomínio** (RAG
sobre regulamento, documentos e ocorrências) e a **Conselheira / biblioteca
documental** (RAG sobre legislação canónica e regulamento) + **extração de dados
de contratos**.

### Quem gera embeddings — OpenAI, sempre

`src/lib/ai/openai.ts` (`gerarEmbedding`, modelo `text-embedding-3-small`, texto
truncado a 8000 carateres) é o **único** gerador de vetores do projeto. Todo o
conteúdo indexado passa pela API da OpenAI (`api.openai.com`, EUA):

| Conteúdo enviado | Origem |
|---|---|
| Blocos do regulamento do condomínio | `ingerirRegulamento()` — `src/lib/actions/ia-rag.ts` |
| Título + descrição de documentos (não o PDF — nota A1 em código) | `ingerirDocumento()` — `ia-rag.ts` |
| **Ocorrências resolvidas: título, categoria e descrição integral** (queixas com dados pessoais de terceiros) | `ingerirOcorrenciasResolvidas()` — `ia-rag.ts` |
| Pergunta do utilizador (embedding da query, a cada pesquisa/mensagem) | `enviarMensagem()`, `buscarDocumentos()` — `ia-rag.ts`; `sugerirResolucao()` — `ia-rag.ts` |
| Texto integral do regulamento extraído de PDF (até 15 MB) + blocos resultantes | `carregarRegulamento()`, `semearLegislacao()` — `src/lib/actions/conhecimento.ts` |
| Pergunta + contexto das sugestões da Conselheira | `perguntarConselheira()` — `conhecimento.ts` |

### Quem faz chat — DeepSeek primário, OpenAI recurso

`src/lib/ai/deepseek.ts` (`deepseekChat`, modelo por omissão `deepseek-chat`,
endpoint `api.deepseek.com`, **China**) é chamado **primeiro**; a OpenAI
(`chatTexto`, `gpt-4o`) é o fallback em falha ou ausência de chave:

| Chamada | O que é enviado ao provedor |
|---|---|
| `enviarMensagem()` — assistente (`ia-rag.ts`) | System prompt (com **nome do condomínio** + até 5 blocos de contexto), **últimas 10 mensagens da conversa**, pergunta atual → **DeepSeek**; fallback envia system prompt + pergunta (sem histórico) → OpenAI |
| `gerarTituloConversa()` — título da conversa (`ia-rag.ts` via `deepseek.ts`) | **Primeira mensagem do utilizador** → **DeepSeek** |
| `sugerirResolucao()` — sugestão para ocorrência (admin, `ia-rag.ts`) | Título, categoria e descrição da ocorrência + até 3 **ocorrências resolvidas similares** (descrições) → **DeepSeek**, fallback OpenAI |
| `perguntarConselheira()` — Conselheira (admin, `conhecimento.ts`) | Pergunta + até 4 blocos (legislação canónica e regulamento) → **OpenAI apenas** |
| `extrairDadosContrato()` — extração de contrato (`src/lib/actions/extrair-contrato.ts`) | **PDF integral do contrato** (base64, gpt-4o) → **OpenAI apenas** |
| `extrairTextoPdf()` — transcrição do regulamento (`conhecimento.ts`) | **PDF integral** (base64, gpt-4o) → **OpenAI apenas** |

Os vetores e os blocos de texto ficam armazenados no Supabase
(`conhecimento_embeddings`, `conhecimento_base`, tabelas `ia_documental_*`),
não nos provedores — na medida em que os provedores não retêm para treino,
condição a confirmar nos termos de cada DPA (nenhum DPA arquivado).

### Configuração de runtime

`DEEPSEEK_API_KEY` e `OPENAI_API_KEY` são opcionais (`.env.example`); sem elas,
as funcionalidades degradam graciosamente (`openaiConfigurado()`,
`deepseekConfigurado()`, devolução de `null`/`indisponivel`). Quais chaves estão
definidas no ambiente de produção **não é verificável a partir do repositório —
a confirmar**.

## 2. O problema (RGPD arts. 44.º–49.º)

1. **China (DeepSeek).** A China não tem decisão de adequação da Comissão
   Europeia. A transferência exige um mecanismo do art. 46.º (cláusulas-tipo) **e**
   uma avaliação de impacto da transferência (AIP) que demonstre proteção
   equivalente — exercício reconhecidamente muito difícil de concluir
   favoravelmente para a China (supervisão, acesso de autoridades, ausência de
   jurisprudência de reforço). **Nem SCC nem AIP existem hoje.** É o achado
   **L-44**, classificado P0 na auditoria.
2. **EUA (OpenAI).** Sem decisão de adequação vigente para o quadro atual
   (o Privacy Framework UE–EUA não cobre por si só o exportador aqui; a base
   teria de estar no DPA/SCC da OpenAI). **Nenhum DPA/SCC está arquivado no
   repositório.** E note-se: **mesmo desligando o DeepSeek, o problema dos EUA
   permanece**, porque todos os embeddings são gerados pela OpenAI.
3. **Consequência.** Enquanto isto se mantiver, o tratamento com IA envia dados
   pessoais de condóminos (descrições de ocorrências, perguntas com conteúdo
   pessoal, PDF de contratos) para fora da UE sem base legal documentada —
   tratamento ilícito por parte da Portaria (subcontratante) e risco direto para
   cada condomínio (responsável). É também o que torna insustentável qualquer
   afirmação pública de «infraestrutura europeia» (secção 6.3 da auditoria).

## 3. Opções

### Opção A — Provedores na UE

Substituir OpenAI e DeepSeek por provedores com processamento na UE (ex.: um
modelo europeu para embeddings+chat, ou cloud de hiperscaler com região UE e
DPA com cláusulas-tipo sem transferência efetiva). Exemplos a avaliar: Mistral
(FR), Azure OpenAI / AWS Bedrock com região de processamento UE e DPA firmado.

**Prós**
- Elimina na raiz o problema dos arts. 44.º–49.º; a afirmação «infraestrutura
  europeia» volta a ser sustentável.
- Mantém toda a funcionalidade de IA (assistente, Conselheira, extração).
- A migração é contenível: os pontos de chamada estão isolados em três módulos
  (`ai/openai.ts`, `ai/deepseek.ts`, `extrair-contrato.ts`) e a reindexação é
  não destrutiva (`reindexarOrigem` computa a nova geração antes de substituir).

**Contras**
- Custo e seleção de provedor — decisão comercial da Inês (goal: «contratar ou
  trocar provedores» é decisão humana).
- Mudança de modelo de embeddings implica reindexar tudo (mecânica existente,
  mas operação a fazer por condomínio).
- Qualidade/latência dos modelos alternativos a validar contra o atual.
- Continua a exigir DPA de cada provedor arquivado (mesmo intra-UE).

### Opção B — IA desligada no Beta

Não configurar `OPENAI_API_KEY` nem `DEEPSEEK_API_KEY` no ambiente de produção.
Verificado no código que as funcionalidades degradam com segurança: indexação e
pesquisa devolvem indisponível, `enviarMensagem()` devolve «Serviço de IA
indisponível», a Conselheira devolve `indisponivel`, a extração de contratos
devolve `indisponivel`. Nenhum dado sai da UE.

**Prós**
- **Zero risco de transferência** — resolve L-44 de imediato, sem contrato
  adicional nem AIP.
- É a recomendação de âmbito da auditoria (secção 8: retirar o assistente do
  âmbito do Beta) e compatível com o gate do goal-Beta («a IA fora do âmbito —
  ou dentro, mas sem ingestão de ocorrências, com provedor na UE...»).
- Reversível: é uma variável de ambiente, não código.
- Coerente com o estado das outras peças da IA (C2 — fuga de ocorrências via
  RAG, corrigida; A1 — a IA não lê PDFs de documentos; expectativas a alinhar).

**Contras**
- Retira funcionalidade que a plataforma apresenta (Conselheira, assistente);
  exige alinhar a UI/landing e a informação a condóminos (L3) com o que está
  ativo.
- A biblioteca documental e as sugestões contextuais ficam sem valor até
  reativação.
- Não resolve nada por si: é adiamento — o problema volta quando a IA for
  reativada, pelo que a Opção A continua a ser o destino.

### Opção C — Manter DeepSeek/OpenAI com SCC + AIP

Formalizar cláusulas-tipo com a DeepSeek (e DPA com a OpenAI) e concluir uma
avaliação de impacto da transferência favorável, mantendo o pipeline atual.

**Prós**
- Mantém a funcionalidade e os provedores atuais sem migração técnica.

**Contras**
- Para a **China**, a AIP tem forte probabilidade de não poder ser concluída
  favoravelmente (supervisão estatal, ausência de mecanismos de recurso
  equivalentes) — risco jurídico elevado e permanente, com responsabilidade
  solidária da Portaria e exposição dos responsáveis (condomínios).
- Custo jurídico contínuo (monitorização, renovação da avaliação) sem eliminar
  o risco de fundo.
- A auditoria considera «manter o DeepSeek com dados reais de condóminos» o
  risco jurídico mais concreto de todo o projeto. Recusa-se esta opção para o
  DeepSeek com dados pessoais.

## 4. Recomendação

**Adotar a Opção B para o Beta (IA desligada em produção: nenhuma chave de IA
configurada) e tratar a Opção A como estado-alvo antes de reativar.** É a única
combinação que cumpre hoje o critério de aceitação do goal («nenhum dado pessoal
sai da UE sem base de transferência documentada — ou a IA está desligada») sem
dependência de contratações externas. A Opção C é rejeitada para o DeepSeek;
para a OpenAI, só seria defensável com DPA/SCC arquivado e mesmo assim fica
subordinada à Opção A como destino.

Ação técnica associada à Opção B (quando aprovada): confirmar que as chaves de
IA não estão definidas no ambiente Netlify de produção, alinhar a UI para não
prometer o que está indisponível, e registar em `subcontratantes.md` os estados
de OpenAI/DeepSeek como «inativo (chave não configurada)».

---

## Decisão

*(A preencher pela GAVINHO, Arq.ª Inês Gavinho. Sem este registo, o estado da
matéria L-44 é PROPOSTO — não decidido.)*

| Campo | Registo |
|---|---|
| Opção escolhida (A / B / C / outra) | ____________________ |
| Âmbito e condições (ex.: B para o Beta; A antes de reativação) | ____________________ |
| Provedor-alvo, se A (a avaliar/contratar) | ____________________ |
| Data da decisão | ____/____/______ |
| Assinatura | ____________________ |

Notas da decisão:
_____________________________________________
_____________________________________________
