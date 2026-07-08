# PORTARIA — Design Language v1.0

*Documento fundador da identidade digital. Não é um style guide: é um sistema
de pensamento. Qualquer ecrã desenhado daqui a cinco anos deve parecer
naturalmente parte do mesmo produto — não por usar os mesmos pixels, mas por
obedecer às mesmas convicções.*

---

## 1. Filosofia

### Como deve fazer sentir

Entrar na Portaria deve sentir-se como entrar num prédio bem administrado:
o chão está limpo, a luz acende, o correio está arrumado, e alguém — discreto,
competente — já tratou do que havia a tratar. Não se repara na administração;
repara-se na ordem.

A sensação-mãe do produto, aquela contra a qual tudo se mede:

> **"Finalmente tenho isto controlado."**

Não é entusiasmo. Não é surpresa. É alívio — o momento em que se pousa uma
pasta pesada que se carregava há anos.

### Como nunca deve fazer sentir

- **Como software.** O utilizador não quer "usar uma plataforma"; quer saber
  do seu prédio.
- **Como urgência.** Nada pisca, nada conta em vermelho, nada acumula badges.
  A urgência artificial é uma dívida de atenção que o produto nunca contrai.
- **Como um exame.** Nenhum ecrã deve fazer o utilizador sentir que pode
  errar, que devia saber onde clicar, que precisava de formação.
- **Como marketing.** Dentro do produto, ninguém está a vender nada a ninguém.

### O que significa "clareza" neste produto

Clareza não é minimalismo estético. É a resposta imediata a três perguntas,
em qualquer ecrã, sem procurar:

1. **Onde estou?** (que parte da vida do prédio é esta)
2. **O que aconteceu?** (qual é o estado das coisas)
3. **O que falta?** (há algo que dependa de mim?)

Se um ecrã responde às três à primeira vista, é claro. Se obriga a ler duas
vezes, não é — por muito bonito que seja.

### O que significa "tranquilidade" numa interface

Tranquilidade é a **ausência de dívida de atenção**. A interface nunca deixa
o utilizador com a suspeita de que há algo escondido, por ler, por tratar,
noutro sítio. O que está tratado sai do primeiro plano. O que está pendente
diz claramente com quem está. O vazio não é falha de conteúdo: é a interface
a dizer *"está tudo em ordem"* — e essa é a mensagem mais valiosa que o
produto pode dar.

---

## 2. Princípios de Design

### P1 — A calma é o produto

**Explicação.** A concorrência vende funcionalidades; a Portaria vende a
sensação de controlo. Cada decisão de design deve aumentar a calma ou é
rejeitada, mesmo que "funcione".

**Impacto.** Menos elementos por ecrã do que o confortável para quem desenha.
Notificações raras e dignas de existir. Nenhum mecanismo de engagement.

**Aplicação.** O mural de avisos mostra avisos — não mostra contadores de
avisos não lidos. Uma ocorrência resolvida serena-se visualmente em vez de
celebrar.

### P2 — Mostrar o estado antes de pedir ação

**Explicação.** O utilizador chega para saber, não para trabalhar. Primeiro
a fotografia da situação; só depois, se fizer sentido, o convite a agir.

**Impacto.** Ecrãs começam por informação, nunca por formulários. Botões de
criação existem, mas nunca são o elemento dominante.

**Aplicação.** A lista de ocorrências abre no estado das ocorrências, com
"Nova ocorrência" presente mas discreto. Um futuro dashboard diz "está tudo
em ordem" antes de listar o que quer que seja.

### P3 — Uma ideia por ecrã

**Explicação.** Cada ecrã responde a uma pergunta e propõe, no máximo, uma
ação principal. Se um ecrã precisa de duas ações principais, são dois ecrãs.

**Impacto.** Um único botão de tinta por vista. As restantes ações são
secundárias na forma (texto, contorno) e na posição.

**Aplicação.** "Reportar ocorrência" é um ecrã com um propósito. O detalhe
de uma ocorrência, para o admin, tem uma ação dominante por estado — mudar
o estado — e as restantes (nota, fotografias) em segundo plano.

### P4 — O histórico é sagrado

**Explicação.** A Portaria é a memória do prédio. Memória não se apaga:
arquiva-se, serena-se, mas permanece consultável. Quem chega amanhã tem de
poder perceber o que aconteceu ontem.

**Impacto.** Soft delete por omissão. Timelines em vez de estados soltos.
Datas sempre presentes. Nada de "limpar histórico".

**Aplicação.** Avisos arquivam-se, não se apagam. A timeline de uma
ocorrência regista tudo, por ordem, para sempre. Quando existirem atas e
decisões, cada uma saberá de onde veio.

### P5 — O silêncio também comunica

**Explicação.** O espaço vazio não é desperdício: é pontuação. Uma página
com margens largas diz "isto está sob controlo"; uma página cheia diz
"boa sorte".

**Impacto.** O espaço negativo é orçamentado antes do conteúdo, não com as
sobras. Estados vazios são desenhados com o mesmo cuidado que estados cheios.

**Aplicação.** "Não existem avisos publicados de momento" ocupa uma área
generosa e serena — não um aviso apologético num canto.

### P6 — A interface nunca compete com a informação

**Explicação.** Molduras, sombras, cores e ícones existem para hierarquizar
o conteúdo, nunca para decorar. Se um elemento visual não ajuda a ler, está
a atrapalhar.

**Impacto.** Superfícies quase planas, separação por espaço e por linhas
finas antes de caixas e sombras. Cor com significado ou cor nenhuma.

**Aplicação.** Uma lista de documentos é tipografia bem espaçada com linhas
divisórias ténues — não uma grelha de cartões com sombra.

### P7 — Palavras de administrador, não de software

**Explicação.** A interface fala como um bom administrador de condomínio
explicaria ao vizinho do 3.º esquerdo: concreto, calmo, sem jargão técnico
nem burocratês.

**Impacto.** Nenhum termo de sistema chega ao utilizador. Erros dizem o que
aconteceu e o que fazer. Títulos são substantivos do mundo real.

**Aplicação.** "Ocorrências", nunca "Tickets". "Aguarda fornecedor", nunca
"Pending — external". "Não conseguimos guardar. Tente novamente." — nunca
"Erro 500".

### P8 — Prudência nas ações que não voltam atrás

**Explicação.** Confiança constrói-se sabendo que é difícil estragar. As
ações destrutivas ou públicas pedem um segundo gesto; as reversíveis fluem
sem fricção.

**Impacto.** Confirmação em dois tempos no próprio elemento (tocar, tocar
de novo) em vez de diálogos modais para tudo. Reversível ≠ irreversível
têm pesos diferentes.

**Aplicação.** Arquivar um aviso: dois toques no mesmo botão. Publicar algo
que todos os condóminos verão: momento de confirmação explícito.

### P9 — A inovação é invisível

**Explicação.** O utilizador nunca deve sentir que está a aprender uma nova
forma de trabalhar. A tecnologia aparece como resultado — nunca como feature.
A IA, quando chegar, será uma resposta certa a uma pergunta natural, não um
chatbot com nome e avatar.

**Impacto.** Padrões familiares (listas, formulários, pesquisa) mesmo quando
a mecânica por trás é nova. Nenhuma funcionalidade se apresenta a si própria.

**Aplicação.** "Perguntar à Portaria…" é um campo de texto simples. A resposta
é uma resposta — não uma conversa com uma personagem.

### P10 — Desenhar para o condómino de 60 anos

**Explicação.** O utilizador de referência não é quem compra o software; é o
condómino menos digital que o vai usar. O que funciona para ele funciona para
todos — o inverso é falso.

**Impacto.** Alvos de toque generosos. Texto legível sem esforço. Um caminho
óbvio por tarefa. Nada dependente de hover, gestos ou convenções de poder.

**Aplicação.** Reportar uma infiltração cabe em três decisões: o que é, onde
é, fotografia. Tudo o resto é opcional ou automático.

---

## 3. Hierarquia Visual

**Contraste.** Tinta sobre papel: a leitura assenta em texto quase-preto
(`ink`) sobre fundos claros e quentes. Existe **um** nível de destaque por
vista; se dois elementos gritam, nenhum é ouvido. O contraste forte
reserva-se para o conteúdo — a moldura vive em cinzas e beges ténues.

**Escala.** Cada página tem um título sereno e grande — e depois cai
deliberadamente para uma escala de leitura confortável. A escala intermédia
é escassa por decisão: ou é título, ou é conteúdo. Saltos de escala são
grandes e raros, nunca graduais e frequentes.

**Tipografia.** Duas vozes, sempre as mesmas:

- **Serifada (títulos)** — a voz da memória e da dignidade. Usa-se em títulos
  de página e de secção, e em raros momentos cerimoniais ("Bom dia.").
- **Sans (corpo)** — a voz da clareza. Todo o texto funcional, formulários,
  listas, botões, labels.

Nunca se invertem os papéis. As labels usam a sans em caixa alta pequena e
espaçada — o "carimbo" discreto da casa. *Itálico e negrito são condimentos,
não pratos.*

**Densidade.** A densidade por omissão é a de uma carta bem dactilografada,
não a de uma folha de cálculo. Linhas de lista com respiração; tabelas densas
só onde a comparação o exige (e ver §5). Perante a dúvida, menos por ecrã e
mais ecrãs.

**Espaço negativo.** Margens são a moldura do quadro: generosas, constantes,
inegociáveis. O conteúdo vive numa coluna de leitura confortável mesmo em
ecrãs largos — largura disponível não é obrigação de a preencher.

**Ritmo vertical.** Grelha de espaçamento consistente com três pausas:
pequena (entre elementos irmãos), média (entre grupos), grande (entre
assuntos). A pausa grande é o parágrafo da interface — usa-se com a mesma
intenção com que um bom escritor muda de parágrafo.

---

## 4. Motion Language

O movimento na Portaria é **transição de estado, nunca ornamento**. A regra
de ouro: o utilizador deve perceber *o que mudou* sem nunca reparar *que
houve uma animação*.

**Como entra um painel ou conteúdo.** Nasce do sítio onde pertence: um fade
curto com uma deslocação mínima na direção de origem. Nada entra a voar de
fora do ecrã. Conteúdo carregado de novo aparece; não "faz uma entrada".

**Como desaparece uma tarefa ou item.** Em dois tempos: primeiro perde
presença (atenua), depois o espaço fecha-se suavemente. Nunca desaparece de
forma instantânea deixando a página aos saltos — o desaparecimento é a
interface a arrumar, e arrumar faz-se com cuidado.

**Como responder a uma ação do utilizador.** Reconhecimento imediato
(≈100–150 ms) no próprio elemento tocado — nunca noutro sítio do ecrã.
Estados de espera são serenos: um "a guardar…" no botão, não spinners a
dominar a página. A conclusão de uma ação nota-se pelo resultado (a lista
atualizou), não por fanfarra.

**Quando não deve existir animação.** Em tudo o que é leitura: scroll,
navegação entre páginas, abertura de listas. Nada se move em loop, nunca —
movimento contínuo é ansiedade contínua. Nenhum parallax dentro do produto.
E `prefers-reduced-motion` não é um caso especial: é a prova de que a
interface funciona perfeitamente imóvel — se sem animação um ecrã perde
sentido, o problema não era da animação.

*(O sítio público pode ser mais cinematográfico; a aplicação é mais quieta
que a montra. Dentro de casa, a calma manda.)*

---

## 5. Componentes Fundamentais

*Funções, não desenhos. O desenho decorre da função.*

- **Botão** — a próxima ação sensata. Um botão de tinta (primário) por vista,
  no máximo; os restantes são texto ou contorno. O rótulo é um verbo no
  infinitivo que descreve o resultado ("Publicar aviso", nunca "Submeter").

- **Cartão** — a unidade de *assunto*: agrupa o que pertence junto quando a
  separação por espaço já não chega. Não é decoração de lista: se tudo é
  cartão, nada é cartão.

- **Lista** — a forma por omissão de mostrar coleções. Cada linha responde
  "o quê, quando, em que estado" num olhar, e leva a um detalhe. Ordenação
  cronológica inversa salvo forte razão em contrário.

- **Tabela** — apenas quando o utilizador precisa de *comparar colunas*
  (quotas, contas). Se não há comparação, é uma lista. Nunca é a forma de
  parecer "profissional".

- **Timeline** — a memória de um objeto: quem fez o quê, quando. Lê-se como
  uma história, do início para o fim. É o componente mais "Portaria" de
  todos: onde a promessa de memória se torna visível.

- **Pesquisa** — o sítio onde se faz uma pergunta como se faz a um bom
  administrador. Hoje filtra; amanhã responde (IA). A forma mantém-se: um
  campo calmo, uma resposta direta — nunca uma "experiência".

- **Formulário** — uma conversa, não um impresso. Uma coluna, uma pergunta
  de cada vez na medida do possível, opcionais claramente marcados como tal,
  erros junto do campo e em linguagem de gente.

- **Diálogo (modal)** — uma interrupção, portanto raro. Reserva-se para
  decisões que não podem esperar nem acontecer noutro sítio. Se cabe na
  página ou num painel, não é um diálogo.

- **Painel lateral** — contexto sem perder o lugar: detalhe rápido,
  consulta paralela. Desliza do lado, não rouba a página inteira, fecha-se
  sem cerimónia.

- **Navegação** — o mapa fixo da casa: um só nível visível, palavras
  concretas do mundo do condomínio (Avisos, Documentos, Ocorrências…),
  nunca mais de 8 entradas, nunca metáforas abstratas ("Governação",
  "Conhecimento"). A navegação não se reinventa: aprende-se uma vez.

---

## 6. Linguagem

A Portaria escreve em português europeu, como um administrador competente e
próximo explicaria — nem técnico, nem burocrático, nem publicitário.

**Regras.**

1. Frases curtas. Uma ideia por frase.
2. Verbos naturais: "guardar", "enviar", "arquivar" — nunca "submeter",
   "processar", "executar".
3. Zero jargão técnico: o utilizador nunca lê "erro", "inválido", "sessão",
   "upload", "sincronizar".
4. Zero burocratês: nada de "V. Exa.", "supracitado", "proceder a".
5. Datas por extenso onde a leitura agradece ("15 de maio às 16:30").
6. Números com contexto ("Seguro termina em 19 dias", não "19d").
7. Erros dizem o que aconteceu e o que fazer a seguir — nunca culpam.
8. O tom não muda com as más notícias: calmo quando está tudo bem, calmo
   quando não está.

**Exemplos.**

| Em vez de… | A Portaria escreve… |
|---|---|
| "Erro 500 — Internal Server Error" | "Não conseguimos guardar. Tente novamente." |
| "Campo obrigatório inválido" | "O título é obrigatório." |
| "Ticket #4211 atualizado com sucesso" | "Ocorrência atualizada." |
| "Não existem registos na base de dados" | "Ainda não há documentos. Quando a administração os carregar, aparecem aqui." |
| "A sua sessão expirou. Autentique-se novamente." | "Por segurança, precisa de entrar de novo." |
| "Upload concluído" | "Documento guardado." |
| "Feature premium! Faça upgrade já!" | *(isto nunca aparece dentro do produto)* |

---

## 7. Fotografias

**Quando usar.** No sítio público de cada prédio (a identidade do edifício
merece fotografia real) e na montra do produto. Dentro da aplicação, quase
nunca — com uma exceção: fotografias *funcionais*, tiradas pelos próprios
utilizadores (a infiltração, o elevador), que são documento e não decoração.

**Quando não usar.** Para encher espaço, ilustrar conceitos ("segurança",
"comunidade") ou humanizar artificialmente. Nenhuma fotografia de banco de
imagem com pessoas a apertar mãos, alguma vez, em lado nenhum.

**Estilo.** Arquitetura habitada: o edifício como é vivido, não como foi
vendido. Sinais de vida (uma planta, correio, uma bicicleta no pátio) sem
pessoas em pose.

**Enquadramento.** Geometria calma — linhas verticais direitas, composição
com ar, detalhes em vez de grandes angulares agressivas. O edifício
fotografa-se com o respeito com que se fotografa um retrato.

**Iluminação.** Luz natural, de preferência a luz baixa e quente do início
ou do fim do dia. Sombra e luz em contraste suave — a assinatura visual da
marca. Nunca flash, nunca HDR, nunca céus saturados.

---

## 8. Ícones

**Espessura e estilo.** Traço fino e constante (linha, não preenchimento),
geometria simples, cantos suavemente arredondados. Uma única família de
ícones em todo o produto — mistura de famílias é ruído imediato.

**Quando usar.** Como aceleradores de reconhecimento ao lado de palavras:
numa linha de lista (o tipo de documento), numa ação repetida (editar,
arquivar), num estado. O ícone acompanha; raramente substitui.

**Quando evitar.** Nunca como decoração ("dar vida" a uma secção). Nunca
três ícones onde bastava um. Nunca sozinho numa ação primária — botões
principais têm sempre palavras. Nunca ícones "criativos" para conceitos que
têm palavra simples: a palavra ganha.

*Teste rápido: tapando o ícone, o ecrã perde clareza? Se não perde, o ícone
está a mais.*

---

## 9. Cor

A cor na Portaria é **função emocional antes de ser paleta**. A lógica:

- **Papel (branco quente)** — a verdade. O fundo do trabalho quotidiano,
  onde a informação vive. Branco é "não há nada entre si e os factos".
- **Creme suave** — o acolhimento. Zonas de pausa, fundos de secção,
  estados vazios. É a cor de "esteja à vontade".
- **Bege quente** — a assinatura. A cor da casa: acentos, momentos de
  atenção serena, a luz da marca. Atenção sem alarme.
- **Cinza-oliva** — a voz secundária. Tudo o que apoia sem competir:
  legendas, metadados, texto de apoio.
- **Tinta (quase-preto)** — a palavra. Texto principal e a ação principal.
  O que é tinta, é para ler ou para fazer.
- **Escuro (noite)** — o palco. Foco e cerimónia: a montra pública, raros
  momentos imersivos. Dentro da aplicação de trabalho, o escuro é exceção
  deliberada, nunca rotina.
- **Verde silencioso** — o descanso. "Resolvido", "em dia". Aparece pequeno
  e raro: o estado bom é o estado por omissão, não uma conquista.
- **Vermelho-tijolo** — a exceção verdadeira. Urgência real e ações
  destrutivas, e mais nada. É queimado com parcimónia absoluta: se tudo é
  urgente, nada é urgente.

**Regra de proporção.** Numa vista típica: ~90% neutros (papel, creme,
tinta, oliva), ~9% bege de assinatura, ~1% cor semântica (verde/vermelho).
Quando um ecrã parece "sem graça", a resposta é melhor tipografia e melhor
hierarquia — nunca mais cor.

---

## 10. Ritmo

Uma página da Portaria lê-se como uma página de um bom livro: título,
respiração, conteúdo, pausa.

**Alternância entre denso e vazio.** Cada zona densa (uma lista, uma tabela)
é precedida e seguida de espaço generoso. Nunca duas zonas densas encostadas:
entre dois assuntos há sempre um silêncio.

**Momentos de pausa.** Cada ecrã tem pelo menos um: o espaço à volta do
título, um estado vazio bem tratado, a margem larga de um detalhe. A pausa
é onde o utilizador confirma que está tudo bem.

**Leitura.** O olhar entra pelo título, desce pela coluna principal e
encontra as ações onde as esperava. Percursos em Z e zig-zags de atenção são
sinal de hierarquia falhada. Informação relacionada vive junta; navegar com
os olhos não deve exigir mais esforço do que navegar com o dedo.

**Scroll.** O scroll é leitura, não espetáculo: dentro da aplicação nada o
sequestra, nada muda de posição durante, nada aparece "aos poucos" para
criar drama. Uma página longa é uma página honesta — o utilizador sabe
sempre quanto falta.

---

## 11. Anti-padrões

O que **nunca** aparece na Portaria:

1. Dashboards cheios de gráficos — um número com contexto vale mais do que
   quatro donuts.
2. Grelhas de cartões com sombra para tudo o que é lista.
3. Badges de contagem vermelhos a acumular culpa ("23 por ler").
4. Ícones decorativos, ilustrações de "pessoas felizes", emojis na interface.
5. Efeitos chamativos: parallax na app, gradientes animados, confetti,
   skeletons a piscar agressivamente.
6. Animações gratuitas — tudo o que se move sem transmitir mudança de estado.
7. Linguagem de marketing dentro do produto ("Descubra!", "Novo!", upsells).
8. Dark patterns de qualquer espécie: urgência falsa, opt-outs escondidos,
   confirmshaming ("Não, não quero poupar tempo").
9. Modais em cascata; modais para o que cabia na página.
10. Onboarding em carrossel, tooltips em tour, "dicas" a perseguir o
    utilizador — se precisa de tour, o ecrã falhou.
11. Vocabulário abstrato na navegação ("Hub", "Central", "Governação",
    "Conhecimento").
12. Densidade como prova de seriedade — parecer Excel não é parecer
    profissional.
13. Sons de interface.
14. Qualquer elemento cuja remoção ninguém notaria — se ninguém dá pela
    falta, não devia lá estar.

---

## 12. Checklist

*Avaliar qualquer novo ecrã antes de existir. Uma resposta "não" é um
problema a resolver, não uma nota de rodapé.*

1. Este ecrã responde a **uma** pergunta clara? Qual?
2. Reduz carga cognitiva em relação a como o utilizador resolvia isto antes
   (papel, email, WhatsApp)?
3. Existe apenas **uma** ação principal — e está onde o olhar acaba?
4. O estado das coisas é visível **antes** de qualquer pedido de ação?
5. Há espaço suficiente para respirar? (Se tudo encolhesse 10%, ficava
   melhor? Então há elementos a mais.)
6. A informação está hierarquizada — título, essencial, apoio — ou está
   apenas *presente*?
7. O estado vazio foi desenhado com o mesmo cuidado que o estado cheio?
8. Cada animação transmite uma mudança de estado? O ecrã funciona perfeito
   sem nenhuma?
9. A cor semântica (verde/vermelho) aparece só onde há significado real?
10. Todos os textos passariam pela voz de um bom administrador? (Ler em voz
    alta ao vizinho do 3.º esquerdo.)
11. O que este ecrã regista ficará legível daqui a cinco anos como memória
    do prédio?
12. **Um administrador de 60 anos compreenderia isto sem formação — à
    primeira vez, ao telemóvel, com pressa?**

---

*PORTARIA Design Language v1.0 — julho de 2026.
Este documento evolui por revisão deliberada, não por erosão. Qualquer
exceção a esta linguagem é uma decisão registada, nunca um acidente.*
