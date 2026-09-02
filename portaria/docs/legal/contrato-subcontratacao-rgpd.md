# Contrato de Subcontratação de Tratamento de Dados Pessoais

> **Estado: MINUTA (WRITTEN).** Este documento é uma minuta de trabalho preparada
> a partir do repositório da plataforma. **Não constitui aconselhamento jurídico.**
> A validação final da wording e a assinatura são atos humanos da responsabilidade
> da GAVINHO, Arq.ª Inês Gavinho e de cada condomínio (e, quando aplicável, de
> advogado). Responde ao item **A1.1 / L-28** do `docs/goal-portaria-1.0.md` e à
> secção 6.1 da `docs/auditoria-beta-europa.md`.
>
> **Condição de lançamento:** assinado com cada condomínio **antes do primeiro
> início de sessão real** de um condómino desse condomínio.

---

## Entre:

**[CONDOMÍNIO — designação completa a preencher: Edifício [nome], com sede/
administrador em [morada], NIPC [a preencher], representado pela administração
em exercício]**

— em adelante, **o Responsável** —

e

**GAVINHO, Arq.ª Inês Gavinho, [NIPC a preencher], com sede em [morada a
preencher]**, exploradora da plataforma PORTARIA (a "Plataforma")

— em adelante, **o Subcontratante** —

## Preâmbulo

O Responsável administra um condomínio e necessita de tratar dados pessoais dos
seus condóminos, inquilinos, membros de comissões e contactos para fins de
gestão do condomínio. O Subcontratante disponibiliza a Plataforma, um serviço
de administração de condomínios multi-tenant que trata esses dados **por conta
e ordem do Responsável**.

Nos termos do artigo 28.º do Regulamento (UE) 2016/679 (RGPD), as partes
celebram o presente contrato de subcontratação de tratamento, que rege todas as
operações de tratamento efetuadas pelo Subcontratante no âmbito da Plataforma.

## Cláusula 1.ª — Objeto e duração

1. O presente contrato tem por objeto a subcontratação do tratamento de dados
   pessoais pelo Subcontratante, através da Plataforma, em favor do Responsável.
2. O contrato entra em vigor na data da assinatura e mantém-se pela duração da
   prestação do serviço ao Responsável, cessando com a rescisão ou término do
   contrato de prestação de serviços entre as partes, sem prejuízo das
   obrigações de devolução e eliminação previstas na cláusula 8.ª.
3. As cláusulas 6.ª, 7.ª e 8.ª sobrevivem à cessação do contrato.

## Cláusula 2.ª — Natureza e finalidade do tratamento

1. **Natureza:** tratamento por conta do Responsável, em ambiente tecnológico
   partilhado (multi-tenant), com separação lógica por condomínio.
2. **Finalidade:** gestão administrativa do condomínio, incluindo:
   - gestão de membros (condóminos, inquilinos, comissão) e respetivas frações e
     permilagens;
   - registo e acompanhamento de ocorrências, com fotografias;
   - publicação de avisos, documentos e regulamento do condomínio;
   - organização de assembleias (convocatórias, pontos, ata) e, quando ativado,
     votações;
   - gestão de frações comuns e reservas;
   - gestão financeira do condomínio (quotas, pagamentos, recibos, despesas);
   - gestão de fornecedores, contratos e contactos;
   - registo formal de comunicações;
   - apoio documental e de pesquisa, incluindo funcionalidades de inteligência
     artificial (assistente e biblioteca documental), nos termos da cláusula 5.ª
     e do dossier `decisao-ia-l44.md`.

## Cláusula 3.ª — Categorias de dados e de titulares

1. **Categorias de titulares:** condóminos, inquilinos, membros de comissões e
   administração do condomínio; contactos de fornecedores e prestadores;
   pessoas identificadas no conteúdo submetido (ex.: descrições de ocorrências).
2. **Categorias de dados:** identificação (nome, fração); contacto (email,
   telefone); dados de acesso (email, registo de sessão); permilagem e dados da
   fração; conteúdo submetido pelos utilizadores (ocorrências, avisos,
   documentos, atas, comunicados, mensagens); dados financeiros do condomínio
   (quotas, pagamentos, recibos, despesas); mensagens e histórico de conversas
   com o assistente de IA; metadados técnicos (registos de data/hora,
   identificadores de sessão).
3. **Dados especiais (art. 9.º):** a Plataforma não recolhe propositadamente
   categorias especiais de dados. O Responsável conhece, todavia, que o conteúdo
   de livre descrição (ex.: ocorrências) **pode conter** este tipo de dados por
   iniciativa dos titulares, e obriga-se a não subir deliberadamente para a
   Plataforma categorias especiais sem base legal e sem informação prévia ao
   Subcontratante.

## Cláusula 4.ª — Obrigações do Subcontratante

O Subcontratante obriga-se a:

1. Tratar os dados exclusivamente nas finalidades da cláusula 2.ª e segundo as
   instruções documentadas do Responsável; informar o Responsável se, no seu
   entender, alguma instrução infrinjir o RGPD.
2. Garantir que as pessoas autorizadas a tratar os dados se comprometem com a
   confidencialidade ou estão sujeitas a dever legal de confidencialidade.
3. Adotar as medidas de segurança previstas na cláusula 5.ª.
4. Não subcontratar ulteriormente o tratamento senão nas condições da
   cláusula 6.ª.
5. Prestar apoio ao Responsável no exercício dos direitos dos titulares e nas
   obrigações dos artigos 32.º a 36.º do RGPD, nos termos da cláusula 7.ª.
6. Notificar o Responsável, sem demora injustificada e por escrito, após tomar
   conhecimento de uma violação de dados pessoais, com a informação disponível
   (natureza, categorias e número aproximado de titulares e registos,
   consequências prováveis, medidas tomadas), de forma a permitir ao Responsável
   cumprir o seu dever de notificação à CNPD no prazo de 72 horas.
7. Acompanhar as auditorias e inspeções do Responsável previstas no artigo
   28.º, n.º 3, alínea h), mediante agendamento razoável, disponibilizando a
   documentação necessária para demonstrar o cumprimento das obrigações.
8. Eliminar ou devolver todos os dados pessoais no fim do contrato, nos termos
   da cláusula 8.ª.
9. Manter um registo das categorias de atividades de tratamento efetuadas por
   conta do Responsável (RGPD art. 30.º, n.º 2) e disponibilizá-lo a pedido.

## Cláusula 5.ª — Medidas técnicas e organizativas

As medidas abaixo correspondem ao que a Plataforma **implementa e verifica no
seu repositório de código** (referências entre parênteses). O Subcontratante
compromete-se a mantê-las e a informar o Responsável da sua alteração material.

1. **Isolamento multi-tenant por RLS (Row Level Security):** cada condomínio é
   um *tenant* isolado ao nível da base de dados (Postgres/Supabase); todas as
   tabelas multi-tenant aplicam políticas RLS baseadas na membership do
   utilizador autenticado (`supabase/migrations/`, políticas `tenant_id in
   user_tenant_ids()`; migrações de hardening `0028`/`0029`).
2. **Controlo de acesso por papel:** papéis `admin`, `comissao`, `condomino` e
   `inquilino`, com restrições ao nível da base de dados (ex.: documentos
   sensíveis — contas, atas, contratos, apólices — não legíveis por inquilinos;
   migração `0028`).
3. **Autenticação por sessão:** autenticação por email e palavra-passe com
   sessão por cookies (Supabase Auth); recuperação de palavra-passe.
4. **Ficheiros privados com acesso temporário:** documentos e fotografias em
   buckets privados; download por URL assinado com validade de 60 segundos
   (`src/lib/actions/documentos.ts`, `documentos-administracao.ts`,
   `conhecimento.ts`). Existe um único bucket público, destinado ao logótipo do
   condomínio (migração `0016`).
5. **Documentos de administração confidenciais:** classe de documentos
   administrativos em bucket próprio, privado, com limite de dimensão e tipo de
   ficheiro (migrações `0032`–`0034`).
6. **Chaves de privilégio restritas:** a chave *service role* (que ignora RLS) é
   usada apenas em caminhos server-side controlados (persistência da resposta do
   assistente, envio de email, contagem de votos) e nunca é exposta ao cliente
   (`.env.example`; comentários em `src/lib/actions/ia-rag.ts`).
7. **Testes automatizados de isolamento:** suíte de testes de RLS por tabela e
   por perspetiva (anon, condómino, inquilino, comissão, admin,
   admin-de-outro-tenant), corrida em CI em cada *push* (`tests/security/`,
   `.github/workflows/ci.yml`).
8. **Integridade das mensagens do assistente:** mensagens atribuídas ao
   assistente só podem ser escritas pelo servidor, não pelo cliente (migração
   `0029`).
9. **Papéis de notificação:** a preferência de receção de email é controlada
   pelo próprio utilizador e respeitada pelo pipeline de envio
   (`user_tenants.notificacoes_email`; `src/lib/notificacoes.ts`).

**Nota:** o repositório não evidencia, à data desta minuta, processos de backup
verificados, testes de penetração externos ou certificação. Afirmações sobre
estes pontos não fazem parte das garantias deste contrato até serem
substanciadas (ver secção 6.3 da auditoria).

## Cláusula 6.ª — Subcontratantes ulteriores

1. O Responsável autoriza, desde já, o Subcontratante a recorrer aos
   subcontratantes ulteriores constantes do **Anexo I** (registo mantido em
   `docs/legal/subcontratantes.md`), nas condições aí descritas.
2. O Subcontratante informará o Responsável de qualquer alteração prevista ao
   Anexo I com **antecedência mínima de 30 dias**, dando ao Responsável
   oportunidade de se opor; em caso de oposição fundamentada, as partes
   encontrarão solução alternativa e, na sua falta, o Responsável pode cessar o
   contrato.
3. O Subcontratante impõe a cada subcontratante ulterior obrigações de proteção
   de dados equivalentes às do presente contrato, mantendo-se responsável perante
   o Responsável pelo cumprimento.
4. Transferências de dados para países terceiros só ocorrem com base de
   transferência válida (artigos 44.º a 49.º do RGPD) documentada no Anexo I. O
   estado atual das transferências no âmbito da IA está analisado em
   `docs/legal/decisao-ia-l44.md`.

## Cláusula 7.ª — Apoio ao exercício de direitos

1. O Subcontratante presta ao Responsável toda a assistência necessária para
   que este dê resposta aos pedidos dos titulares (acesso, retificação,
   apagamento, limitação, portabilidade, oposição), no âmbito da Plataforma.
2. O procedimento concreto — quem pede, quem responde, prazos e execução
   técnica — está definido em `docs/legal/retencao-e-direitos.md`, que as partes
   aceitam como procedimento operacional deste contrato.
3. Recebido um pedido de titular diretamente pelo Subcontratante, este
   reencaminha-o ao Responsável no prazo máximo de **5 dias úteis**, sem responder
   ao titular por conta do Responsável salvo instrução em contrário.

## Cláusula 8.ª — Fim do contrato: destino dos dados

1. No termo do contrato, o Responsável escolhe, por escrito, entre:
   a. **Devolução/exportação** dos seus dados em formato estruturado e de uso
      corrente (ex.: ficheiros CSV/JSON e os documentos originais carregados); ou
   b. **Eliminação** de todos os dados pessoais do seu condomínio.
2. A escolha da alínea a) não dispensa a eliminação posterior: após a
   devolução, o Subcontratante elimina os dados do ambiente de produção num
   prazo máximo de **[30/60 — a acordar] dias** após confirmação escrita da
   devolução, mantendo apenas o que for obrigatório por lei e com informação ao
   Responsável.
3. A eliminação compreende a base de dados, os ficheiros (buckets) e, na
   medida tecnicamente disponível, cópias de segurança e caches dos
   subcontratantes ulteriores; quando a eliminação em cópias de segurança não
   for imediata, os dados permanecem protegidos pelas mesmas medidas e são
   eliminados no ciclo de rotação normal de backups.
4. Os dados constantes de registos de faturação e contabilidade do
   Subcontratante (ex.: dados de faturação do Responsável) conservam-se pelo
   prazo legal, separados dos dados de conteúdo da Plataforma.

## Cláusula 9.ª — Responsabilidade e indemnização

1. O Subcontratante só responde perante o Responsável pelos danos causados pelo
   tratamento nas condições do artigo 82.º do RGPD, na medida em que não
   respeite as obrigações do RGPD dirigidas especificamente aos subcontratantes
   ou tenha atuado fora das instruções licítitas do Responsável.
2. O Responsável responde perante os titulares e a CNPD pelas decisões de
   tratamento que lhe competem (bases legais, informação aos titulares,
   definição de finalidades e prazos de conservação).

## Cláusula 10.ª — Disposições finais

1. O direito aplicável é o português; é competente o tribunal da comarca da
   sede do Subcontratante, salvo competência imperativa diferente.
2. Quaisquer alterações a este contrato constam de aditamento escrito assinado
   por ambas as partes.
3. Fazem parte integrante deste contrato os documentos: **Anexo I** — registo de
   subcontratantes ulteriores (`docs/legal/subcontratantes.md`);
   **Anexo II** — política de retenção e procedimento de direitos
   (`docs/legal/retencao-e-direitos.md`).

---

## Assinaturas

| | O Responsável | O Subcontratante |
|---|---|---|
| Nome | ____________________ | Inês Gavinho |
| Qualidade | Administração de [condomínio] | GAVINHO, Arq.ª Inês Gavinho |
| Data | ____/____/______ | ____/____/______ |
| Assinatura | ____________________ | ____________________ |

## Anexo I — Subcontratantes ulteriores autorizados

Ver `docs/legal/subcontratantes.md` (versão vigente à data da assinatura é
anexada em papel ou referenciada por data/versão).

## Anexo II — Retenção e direitos

Ver `docs/legal/retencao-e-direitos.md` (versão vigente à data da assinatura).
