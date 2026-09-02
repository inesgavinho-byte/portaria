# Conteúdo Integral — Páginas Públicas `/privacidade` e `/termos`

> **Estado: MINUTA (WRITTEN).** Texto pronto a colar nas páginas públicas
> `/privacidade` e `/termos` (item **A1.4 / 3.4** do goal; resolves o achado
> **L3** da auditoria — informação do tratamento pela IA). **Não constitui
> aconselhamento jurídico**; a validação final é humana.
>
> Antes de publicar:
> 1. Preencher todos os campos `[entre parêntesis retos]` (contactos, entidade).
> 2. Na secção «Inteligência artificial» da política de privacidade, escolher a
>    **Variante 1 ou a Variante 2** conforme a decisão registada em
>    `decisao-ia-l44.md` — apagar a variante não aplicada.
> 3. Confirmar que a lista de destinatários coincide com a versão vigente de
>    `subcontratantes.md` e os prazos com `retencao-e-direitos.md`.
> 4. Estas páginas descrevem a plataforma; a política de retenção e a lista de
>    subcontratantes só são vinculativas na versão anexada a cada contrato.

---

## PÁGINA 1 — `/privacidade`

# Política de Privacidade

*Versão de [data de publicação]. Aplica-se à plataforma PORTARIA (a
«Plataforma»), explorada por [GAVINHO, Arq.ª Inês Gavinho, NIPC, morada —
«Portaria»].*

## 1. Quem trata os seus dados

Cada condomínio que usa a Plataforma é o **responsável pelo tratamento** dos
dados pessoais dos seus condóminos, inquilinos, membros de comissões e
contactos: é a administração do seu condomínio que decide que dados são
recenseados e com que fins. A **Portaria** é **subcontratante** (prestadora de
serviço): trata esses dados por conta e ordem do condomínio, e é também
responsável pelo tratamento dos dados de acesso à própria Plataforma (email,
sessão, preferências).

Em caso de dúvida sobre quem decidiu um determinado tratamento, comece pela
administração do seu condomínio; a Portaria apoia tecnicamente ambos.

## 2. Que dados são tratados

- **Identificação e contacto:** nome, fração, email, telefone; qualidade
  (proprietário, inquilino, comissão, administração).
- **Dados da fração e do condomínio:** permilagem, frações, logótipo,
  regulamento.
- **Conteúdo submetido:** ocorrências (com descrições e fotografias), avisos e
  mural, documentos (incluindo atas, contas, contratos e apólices em área
  confidencial), convocatórias e atas de assembleias, comunicações formais.
- **Dados financeiros do condomínio:** quotas, pagamentos, recibos, despesas,
  obrigações e contribuições; memória e imputações de processos de fornecedores.
- **Reservas de espaços comuns** e **votações**, quando estas funcionalidades
  estiverem ativas.
- **Conversas com o assistente de inteligência artificial** (perguntas,
  respostas e fontes citadas).
- **Email:** os emails dos membros são usados para enviar notificações do
  condomínio; caixas de correio ligadas à Plataforma podem receber mensagens de
  fornecedores (com anexos).
- **Dados técnicos:** sessão de início de sessão, data e hora, preferências
  (ex.: vista e receção de email).

A Plataforma não recolhe propositadamente categorias especiais de dados
(ex.: saúde, opiniões políticas). O conteúdo de livre descrição pode contê-las
por iniciativa de quem escreve; evite incluir este tipo de informação em
ocorrências e notas.

## 3. Finalidades e bases legais

| Finalidade | Base legal |
|---|---|
| Gestão do condomínio: membros, frações, ocorrências, documentos, assembleias, financeiro, reservas, comunicações | Execução do contrato entre o responsável (condomínio) e a Portaria; interesse legítimo do funcionamento do condomínio |
| Notificações por email sobre atividade do condomínio | Execução do contrato; pode desativar (ver secção 7) |
| Assistente de IA, Conselheira e biblioteca documental | Interesse legítimo na prestação do serviço; o conteúdo do seu condomínio só é usado para servir o próprio condomínio |
| Segurança, isolamento entre condomínios e prevenção de abuso | Interesse legítimo; obrigação legal de segurança (RGPD art. 32.º) |
| Faturação do serviço ao condomínio | Obrigação legal e execução do contrato |

## 4. Quem recebe os dados

A Portaria recorre a um número limitado de prestadores («subcontratantes
ulteriores»), contratados com as garantias do artigo 28.º do RGPD. A lista
vigente, com serviço e condições, é mantida no registo da Portaria
(`docs/legal/subcontratantes.md`) e anexada a cada contrato de subcontratação.
Em síntese, à data desta versão:

- **Supabase** — alojamento da base de dados, autenticação e ficheiros (União
  Europeia, região eu-west-1/Irlanda);
- **Netlify** — alojamento da aplicação;
- **Resend** — envio de email transacional (endereço de email e conteúdo das
  notificações);
- **Hostinger** — caixas de correio externas ligadas ao condomínio, quando
  ativas;
- **Provedores de IA** — conforme a secção 5.

Os provedores de IA ativos em cada momento constam da mesma lista; qualquer
alteração é comunicada aos condomínios com 30 dias de antecedência.

## 5. Inteligência artificial — Variante 1

*(Aplicar esta variante se a decisão registada em `decisao-ia-l44.md` for «IA
desligada no Beta» ou «apenas provedores que tratam na UE».)*

### Variante 1 — IA desligada (ou exclusivamente na UE)

As funcionalidades de inteligência artificial da Plataforma estão
[indesativadas nesta fase / asseguradas apenas por provedores que tratam os
dados na União Europeia]. O conteúdo que submete (ocorrências, documentos,
perguntas) **não é enviado** para prestadores fora da União Europeia. Se isto
mudar, esta página será atualizada e os condomínios serão informados com 30
dias de antecedência.

## 5. Inteligência artificial — Variante 2

*(Aplicar esta variante apenas se a decisão registada em `decisao-ia-l44.md`
mantiver provedores fora da UE com base de transferência documentada.)*

### Variante 2 — IA ativa com provedores fora da UE

O assistente e a pesquisa semântica podem processar partes do conteúdo do seu
condomínio — por exemplo, descrições de ocorrências resolvidas, perguntas
escritas e documentos publicados pela administração — usando serviços de
inteligência artificial prestados por [OpenAI (EUA) e/ou DeepSeek (China)],
nos termos da lista de destinatários (secção 4) e com as garantias de
transferência [cláusulas contratuais-tipo e avaliação de impacto — indicar a
base vigente]. O conteúdo do seu condomínio não é usado para treinar modelos.

**Se se opuser a este processamento**, envie um email para
[email de contacto] com o assunto «Oposição — IA». A sua oposição é
transmitida à administração do seu condomínio, que determina a exclusão do
conteúdo do âmbito da IA; e, para as notificações por email, pode desativá-las
imediatamente nas definições do seu perfil (ver secção 7).

*(A versão publicada mantém apenas uma das duas variantes da secção 5.)*

## 6. Durante quanto tempo conservamos os dados

Os prazos de conservação são definidos pelo responsável (o seu condomínio), com
os valores por omissão propostos pela Portaria na política de retenção
(`docs/legal/retencao-e-direitos.md`), anexa a cada contrato. Em síntese: dados
de conta enquanto o acesso estiver ativo; ocorrências até 5 anos após
resolução; conversas de IA até 12 meses (e apagáveis por si a qualquer
momento); notificações e reservas até 12 meses; documentos e dados financeiros
enquanto o condomínio os tiver de conservar por lei; caixas de correio e
convites por prazos curtos definidos na mesma política. No fim do contrato com
um condomínio, os dados são devolvidos ou eliminados, nos termos contratuais.

## 7. Os seus direitos e como exercê-los

Pode pedir à administração do seu condomínio, ou enviar à Portaria
([email de contacto]), um pedido de **acesso, retificação, apagamento,
limitação, portabilidade ou oposição** quanto aos seus dados.

- A resposta é dada pela administração do seu condomínio, com apoio técnico da
  Portaria, no prazo legal de **1 mês**.
- Se o pedido chegar diretamente à Portaria, é reencaminhado à administração do
  seu condomínio no prazo máximo de 5 dias úteis.
- **Notificações por email:** pode desativá-las sozinho, a qualquer momento, nas
  definições do seu perfil na Plataforma (preferência «receber email deste
  prédio»). A desativação cessa o envio de emails, mantendo as notificações
  dentro da aplicação.
- **Conversas de IA:** pode apagar as suas conversas na própria aplicação.
- Tem direito a apresentar reclamação à **Comissão Nacional de Proteção de
  Dados (CNPD)**, em `www.cnpd.pt`.

## 8. Segurança

A Plataforma isola cada condomínio ao nível da base de dados (políticas de
acesso por linha, testadas automaticamente em cada alteração), restringe
documentos sensíveis por perfil, serve ficheiros privados por endereços
temporários de curta duração e nunca expõe chaves de administração ao navegador.
Os cookies utilizados são estritamente necessários (sessão) e de preferência de
visualização; não há publicidade nem rastreio de terceiros.

## 9. Contacto

- **Administração do seu condomínio:** [contacto a indicar pelo condomínio]
- **Portaria (subcontratante):** [nome e email de contacto]
- **CNPD:** Comissão Nacional de Proteção de Dados, `www.cnpd.pt`

---

## PÁGINA 2 — `/termos`

# Termos de Serviço

*Versão de [data de publicação]. Estes termos regem a utilização da plataforma
PORTARIA («Plataforma»), explorada por [GAVINHO, Arq.ª Inês Gavinho, NIPC,
morada — «Portaria»]. O contrato de prestação de serviços e o contrato de
subcontratação de tratamento de dados entre a Portaria e cada condomínio
prevalecem sobre estes termos em caso de conflito.*

## 1. O que é a Plataforma

A Portaria é um serviço de administração de condomínios: gestão de membros e
frações, ocorrências, documentos, assembleias, financeiro, reservas,
comunicações e ferramentas de apoio, incluindo funcionalidades de inteligência
artificial quando ativas. Cada condomínio é um espaço isolado; o que lhe diz
respeito só é visível dentro do seu condomínio.

## 2. Acesso e conta

1. O acesso é feito por **convite** da administração do condomínio, com o email
   que esta indicar, e depende da aceitação do convite.
2. Cada utilizador tem um papel definido pela administração (administração,
   comissão, condómino, inquilino), que determina o que pode ver e fazer.
   Inquilinos não acedem a documentos confidenciais da administração (contas,
   atas, contratos, apólices).
3. É responsável pela confidencialidade da sua palavra-passe e pela veracidade
   dos dados que submete.

## 3. Utilização da Plataforma

Compromete-se a não: aceder a espaços de outros condomínios; tentar contornar
os controlos de acesso; injetar conteúdo malicioso; tratar a Plataforma como
canal oficial de convocatórias ou deliberações sem que o condomínio assim o
configure; nem usar o serviço para fins ilícitos. A administração do condomínio
é responsável pela veracidade dos dados que recenseia e pelas comunicações que
faz através da Plataforma.

## 4. Conteúdo submetido

Os documentos, fotografias, ocorrências e textos que submete pertencem a quem
os submeteu ou a quem este representa. Ao carregá-los, autoriza a Portaria a
armazená-los e tratá-los para prestar o serviço ao seu condomínio — nada mais.
A Portaria não utiliza o conteúdo de um condomínio para servir outro
condomínio. A administração responde pela licitude dos documentos que publica
internamente (ex.: ter autorização para publicar uma ata ou um contrato).

## 5. Inteligência artificial

As funcionalidades de IA (assistente, Conselheira, pesquisa semântica, extração
de dados de contratos), quando ativas:

- respondem com base nos documentos e informações do **seu** condomínio e
  citam as fontes quando existem;
- **podem enganar-se** ou não encontrar a informação; não substituem
  aconselhamento jurídico nem a leitura dos documentos originais;
- podem processar partes do conteúdo do condomínio através de prestadores de
  serviços de IA, nos termos da Política de Privacidade (secção 5) e da lista
  de destinatários vigente;
- as extrações automáticas de contratos são **rascunhos de apoio**: a
  administração confirma sempre os dados extraídos antes de os tratar como
  corretos.

## 6. Dados pessoais

O tratamento de dados pessoais rege-se pela Política de Privacidade publicada
em `/privacidade`, pelo contrato de subcontratação entre a Portaria e o
condomínio e pelos documentos aí referidos (retenção, direitos, subcontratantes).

## 7. Disponibilidade

A Plataforma está em evolução contínua e fases de acesso limitado (beta).
Não há garantia de disponibilidade ininterrupta; podem existir interrupções
para manutenção. As funcionalidades dependem de serviços externos (email,
inteligência artificial): quando um serviço externo está indisponível ou não
configurado, a funcionalidade correspondente fica temporariamente inativa,
sem perda dos dados.

## 8. Propriedade intelectual da Plataforma

O software, o desenho e a marca da Portaria pertencem à sua autora. Estes termos
não transferem qualquer direito sobre a Plataforma; concedem-lhe apenas o
direito de a usar enquanto membro de um condomínio cliente.

## 9. Limitação de responsabilidade

Na máxima extensão permitida por lei, a Portaria não responde por danos
indiretos, perda de dados imputável à administração do condomínio, nem por
decisões tomadas com base nas informações apresentadas pela Plataforma
(incluindo respostas de IA). A responsabilidade da Portaria perante o
condomínio encontra-se regulada no contrato de prestação de serviços.

## 10. Cessação

A administração do condomínio pode remover um membro a qualquer momento, e o
próprio membro pode deixar de ter acesso a pedido da administração. No fim do
contrato entre a Portaria e o condomínio, os dados são devolvidos ou
eliminados nos termos contratuais.

## 11. Alterações destes termos

Alterações relevantes são publicadas nesta página com aviso prévio razoável e
comunicadas aos condomínios; alterações ao conjunto de subcontratantes têm 30
dias de aviso prévio, nos termos contratuais.

## 12. Lei aplicável

Aplica-se a lei portuguesa. Contacto: [nome e email de contacto da Portaria].
