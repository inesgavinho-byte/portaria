# Política de Retenção e Exercício de Direitos — Anexo II

> **Estado: MINUTA (WRITTEN).** Anexo II do contrato de subcontratação
> (`contrato-subcontratacao-rgpd.md`, cláusulas 7.ª e 10.ª). Responde aos itens
> **A1.5 / L1 / L2** do `docs/goal-portaria-1.0.md`, ao item **3.6** do
> `docs/goal-beta-europa.md` e às secções 6.1 (L1, L2) e 6.4 da
> `docs/auditoria-beta-europa.md`. **Não constitui aconselhamento jurídico.**
>
> Convenção de estados: **[IMPLEMENTADO]** — verificado no código; **[FALTA]** —
> não existe hoje, é trabalho identificado; **[PROPOSTA]** — prazo sugerido,
> pendente de aprovação humana (ver «Pendências humanas»).

---

## Parte I — Política de retenção

### Princípio

Nada na plataforma é hoje apagado automaticamente: **não existe nenhum job de
eliminação de dados** (o `pg_cron` existente, migrações `0037`/`0038`, serve
apenas alertas de calendário e manutenção preventiva). Isto viola a limitação da
conservação (RGPD art. 5.º-1-e) enquanto não for corrigido — é o achado **L1**
da auditoria. Os prazos abaixo são a política proposta; a execução técnica
está discriminada na última coluna.

Os prazos são definidos **pelo responsável** (cada condomínio), não pela
Portaria; a Portaria propõe os valores por omissão abaixo e aplica a política
escolhida. Um condomínio pode fixar prazos diferentes por escrito.

### Prazos por tipo de dado

| Tipo de dado | Onde vive (tabelas/buckets, migrações) | Prazo [PROPOSTA] | O que acontece hoje | Execução |
|---|---|---|---|---|
| Conta e acesso (email, sessão) | `auth.users` (Supabase Auth); `user_tenants` (0001) | Enquanto a membership estiver ativa; **[FALTA]** eliminação da conta de autenticação após remoção do membro | `removerMembro()` apaga a linha `user_tenants`; **o utilizador em `auth.users` permanece** (não existe chamada `deleteUser` em todo o `src/`) | [FALTA] eliminação de conta; ver Parte II |
| Ocorrências | `ocorrencias`, `ocorrencia_eventos`, `ocorrencia_fotografias` (0002); bucket `ocorrencias` (privado) | 5 anos após resolução; fotografias eliminadas com a ocorrência | Acumulam indefinidamente; nenhum mecanismo de eliminação | [FALTA] job de eliminação + UI de purga |
| Conversas do assistente de IA | `conversas_ia`, `conversas_ia_mensagens` (0024) | 12 meses; o titular pode apagar as suas conversas a qualquer momento | **O titular já pode apagar cada conversa** (`apagarConversa`, `ia-rag.ts` — apaga em cascata as mensagens). Não há purga automática | Parcialmente [IMPLEMENTADO] (manual); [FALTA] purga automática |
| Base de conhecimento de IA (embeddings) | `conhecimento_embeddings` (0024), `conhecimento_base` (biblioteca documental, 0040–0041) | Vivem enquanto a fonte existir; eliminados com a origem (regulamento substituído, ocorrência apagada — **ligação [FALTA]**: apagar uma ocorrência hoje não apaga o respetivo embedding) | `reindexarOrigem` substitui por origem; embeddings de ocorrências apagadas por via alternativa ficam órfãos | [FALTA] cascata origem→embedding |
| Biblioteca documental de IA | `ia_documental_configuracoes/fontes/fonte_blocos/sessoes/mensagens` (0040–0041) | 12 meses após a última sessão (sessões e mensagens); fontes enquanto ativas | Sem purga automática | [FALTA] job de eliminação |
| Notificações in-app | `notificacoes` (0015/0025) | 12 meses | Acumulam indefinidamente | [FALTA] job de eliminação |
| Avisos e mural | `avisos` (0001), `mural*` (0020) | Enquanto o condomínio os mantiver (conteúdo de gestão, não vitalício por omissão) | Eliminação manual pelo admin | [IMPLEMENTADO] (manual, por desenho) |
| Documentos | bucket `documentos` (0001, privado, URLs assinados 60 s); classe confidencial `documentos-admin` (0032–0034) | Enquanto o condomínio os conservar; na cessação do contrato, destino nos termos da cláusula 8.ª | Upload/download manuais; sem eliminação automática | [IMPLEMENTADO] (gestão manual é o desenho) |
| Regulamento | `tenant_perfil.regulamento_texto/pdf` (0007); bucket `documentos` | Substituído a cada carregamento (`carregarRegulamento` apaga os blocos anteriores) | **[IMPLEMENTADO]** substituição | — |
| Votações | `votacoes`, `votacao_opcoes`, `votos`, `votacao_participantes` (0023) | **Fora do âmbito do Beta** (decisão do goal). Quando ativas: conservação enquanto o condomínio existir (valor probatório de deliberações) | Funcionalidade existente mas desaconselhada antes de S4 | Congelado; rever no desbloqueio |
| Reservas | `espacos_comuns`, `reservas` (0026; minimização 0030) | 12 meses após a data da reserva | Acumulam | [FALTA] job de eliminação |
| Financeiro (quotas, pagamentos, recibos, despesas, obrigações) | `configuracao_financeira`, `quotas_mensais`, `pagamentos`, `recibos` (0027), `despesas*`, `obrigacoes_recorrentes` (0035), `contribuicoes_extraordinarias*` (0044) | 10 anos (prazos de conservação de documentos contabilísticos aplicáveis ao condomínio) | Conservados enquanto o contrato durar; eliminação só na cessação (cláusula 8.ª) | [FALTA] procedimento de cessação |
| Processo de fornecedor: memória, evidências, movimentos, imputações | `contrato_memoria_eventos/evidencias` (20260823175458, 20260824090500), movimentos bancários de fornecedor (20260824090000+), `imputacoes_posicoes` + evidências (20260826000000) | Enquanto o processo estiver ativo + 10 anos (prescrição/contencioso; contém prova de pagamentos e deliberações) | Conservados; são dados de gestão com possível referência a frações e pagamentos | [FALTA] procedimento de arquivo/cessação |
| Comunicações formais e auditoria de destinatários | `comunicacoes`, `comunicacao_destinatarios`, `comunicacao_documentos` (0042–0043) | Enquanto o condomínio existir (registo formal tem valor probatório) | Conservados | [FALTA] procedimento de cessação |
| Caixa de correio externa | `email_caixas`, `email_mensagens` (0031); bucket `email-anexos` | Mensagens 12 meses; anexos não triados eliminados após triagem ou 6 meses | Sem purga automática | [FALTA] job de eliminação |
| Convites | `convites` (0005, 20260902090000) | 90 dias após emissão/expiração | Existe `expira_em` para validação e eliminação manual de convites pendentes (`membros.ts`); **sem purga automática** | Parcial [IMPLEMENTADO]; [FALTA] purga automática |
| Registos técnicos de sessão | Cookies de sessão Supabase (estritamente necessários); cookie de preferência `portaria-vista` | Duração da sessão; preferência 12 meses (cookie) | Sem registos de auditoria de acesso persistentes identificados no repositório | Avaliar registo de acessos (L4) |

### Cópia de segurança

**[FALTA]** Não há evidência no repositório de backups configurados, verificados
ou testados (secção 6.3 da auditoria). A política de retenção deve dizer, quando
existirem: os backups obedecem a um ciclo de rotação definido e os dados
eliminados são removidos no ciclo seguinte, permanecendo protegidos entretanto.

### Execução da eliminação

**[FALTA]** O mecanismo proposto é um job agendado (pg_cron ou equivalente)
que executa a política por tipo de dado, com registo do que foi eliminado.
Este trabalho não existe e é pré-requisito para declarar L1 cumprida.

---

## Parte II — Procedimento de exercício de direitos

Âmbito: acesso (art. 15.º), portabilidade (art. 20.º), apagamento (art. 17.º),
com referência aos restantes (retificação, limitação, oposição).

### Quem pede

1. **Via normal:** o titular pede à **administração do seu condomínio**
   (responsável pelo tratamento), por qualquer meio — presencialmente, por email
   ou através da plataforma.
2. **Via direta à Portaria:** se o pedido chegar diretamente à Portaria (email
   de contacto indicado na página `/privacidade`), a Portaria **não responde ao
   titular por conta do responsável**: reencaminha o pedido à administração do
   condomínio no prazo máximo de **5 dias úteis** e informa o titular de que o
   fez (cláusula 7.ª, n.º 3 do contrato).

### Quem responde

**A administração do condomínio** é quem responde ao titular. A Portaria presta
o apoio técnico (extração, eliminação), na medida do que a plataforma permite
hoje (ver limitações abaixo).

### Prazo de resposta

**1 mês** desde a receção do pedido pelo responsável (RGPD art. 12.º-3),
prorrogável por 2 meses em pedidos complexos, com informação ao titular dentro
do primeiro mês.

### Execução por direito

| Direito | Como se executa hoje | Estado |
|---|---|---|
| **Acesso** | **[FALTA]** Não existe exportação no produto. Execução possível hoje: extração manual pela Portaria (consulta SQL às tabelas do condomínio relativas ao titular + ficheiros dos buckets). O objetivo de produto é a exportação self-service da administração (A3, Fase B do goal 1.0) | [FALTA] |
| **Portabilidade** | **[FALTA]** Mesma via: extração manual em formato estruturado (CSV/JSON + originais dos documentos). A portabilidade estrita pressupõe tratamento automatizado com consentimento ou contrato; na prática, a exportação de acesso cobre a necessidade | [FALTA] |
| **Apagamento — conversas de IA** | O próprio titular apaga cada conversa na UI; elimina conversa + mensagens em cascata (`apagarConversa`, `ia-rag.ts`) | [IMPLEMENTADO] |
| **Apagamento — membership** | A administração remove o membro (`removerMembro`, `membros.ts`): apaga `user_tenants` e perde o acesso. **Não apaga** o conteúdo submetido (ocorrências, mensagens) nem a conta de autenticação | Parcial [IMPLEMENTADO] |
| **Apagamento — conta de autenticação** | **[FALTA]** Não existe `auth.admin.deleteUser` em `src/`. Eliminar um titular de `auth.users` exige operação manual da Portaria no Supabase, a pedido da administração, com registo escrito do pedido e da execução | [FALTA] |
| **Apagamento — conteúdo submetido** | **[FALTA]** Ocorrências, mensagens e fotografias de um titular não têm eliminação em cascata por titular. Execução hoje: extração manual orientada (SQL) pela Portaria. Nota: apagar uma ocorrência não apaga o seu embedding de `ocorrencia_resolvida` (ver Parte I) | [FALTA] |
| **Retificação** | **[FALTA]** Não há edição self-service generalizada de dados pessoais (nome, email) pelo próprio; hoje depende da administração/Portaria | [FALTA] |
| **Oposição a notificações por email** | O próprio utilizador desativa `notificacoes_email` no produto; o pipeline respeita a preferência (`src/lib/notificacoes.ts`) | [IMPLEMENTADO] |
| **Oposição ao processamento por IA (L3)** | O titular é informado na `/privacidade` de que conteúdo pode ser indexado e processado por IA. **[FALTA]** Não existe hoje exclusão individual do âmbito da IA (ex.: não indexar ocorrências de um titular específico); a alternativa operacional é a administração não indexar ocorrências / a IA estar desligada (ver `decisao-ia-l44.md`) | Parcial [FALTA] |

### Registo do pedido

**[FALTA]** Cada pedido de direitos deve ser registado (data de receção, pedido,
resposta, data de execução, execução técnica feita). Não existe registo hoje.
Formato mínimo proposto: ficheiro por condomínio no dossier jurídico da Portaria
até existir funcionalidade no produto.

---

## Pendências humanas

| # | Decisão | Dono |
|---|---|---|
| 1 | Aprovar (ou ajustar) os prazos [PROPOSTA] da Parte I — são política do responsável; a Portaria aplica o que for acordado com cada condomínio | Inês Gavinho, por condomínio |
| 2 | Definir o email de contacto para pedidos de direitos (publicado na `/privacidade`) | Inês Gavinho |
| 3 | Aprovar o trabalho técnico das [FALTA]: jobs de eliminação, eliminação de conta, exportação, cascata origem→embedding, registo de pedidos | Inês Gavinho (priorização; Fase B do goal 1.0 inclui a exportação A3) |
| 4 | Validar a wording jurídica deste anexo | Inês Gavinho / advogado |
