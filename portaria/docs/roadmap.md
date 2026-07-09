# PORTARIA — Roadmap

> **Documento vivo.** Esta ordem é a melhor hipótese atual, não um contrato.
> O Living Lab pode reordenar os slices sempre que o uso real demonstrar uma
> prioridade diferente. Alterações à ordem registam-se aqui e têm origem numa
> entrada de `docs/living-lab.md`.

## O enquadramento: Living Lab

A Portaria não é, hoje, um produto para vender. É um **Living Lab**: uma
plataforma usada de verdade para administrar o Edifício Europa. Por isso a
prioridade não é "o que impressiona" — é "o que eu, administradora, uso
amanhã de manhã".

### Critério de priorização (v2 — supera o anterior)

Antes de construir qualquer coisa, a pergunta é:

> **"Sem a Portaria, eu faria isto manualmente?"**

- **Sim** → bom candidato a evolução do produto. Substitui trabalho real.
- **Não** → questionar se a funcionalidade é sequer necessária.

### A regra do Living Lab (teste de fim de slice)

No fim de cada slice, perguntar:

> **"Se amanhã eu administrasse o Europa, teria aberto esta funcionalidade
> esta semana?"**

Se não — o slice está na ordem errada ou é grande demais. Corolário: se um
slice não couber numa demonstração de 2 minutos a uma administradora, deve
ser partido em dois.

### As quatro fases

1. **Operar** — conseguir gerir um condomínio real.
2. **Organizar** — reduzir trabalho administrativo.
3. **Compreender** — criar memória operacional.
4. **Assistir** — IA e automação.

Os cortes entre fases são pontos naturais de reavaliação: validar com a
administradora antes de abrir a fase seguinte.

---

## FASE I — Operar

### Slice 01 — Perfil do Condomínio
**Objetivo:** transformar o condomínio num espaço operacional completo,
configurável sem SQL.
**Constrói:**
- Dados gerais do condomínio
- Morada e contactos
- Seguradora
- Administrador
- Documentos institucionais
**Definition of Done:** o admin edita **todos** os dados do Edifício Europa
pela interface, sem tocar no Supabase. *(Provisionar tenants novos pela UI
fica fora de âmbito — é onboarding multi-condomínio, adiado para junto do
Slice 12.)*

### Slice 02 — Frações e Proprietários
**Objetivo:** representar corretamente a realidade do edifício.
**Constrói:**
- Frações
- Proprietários
- Permilagens
- Inquilinos
- Associação utilizador ↔ fração
**Definition of Done:** cada ocorrência, aviso e assembleia pode ser
relacionada com uma ou mais frações.

### Slice 03 — Centro de Trabalho ⭐
**Objetivo:** dar ao administrador um único ponto de entrada diário.
**Constrói:**
- Lista de ações pendentes (determinística, **pluggable** — cada slice
  futuro acrescenta fontes)
- Ocorrências abertas
- Convites pendentes
- Estado vazio ("Tudo concluído")
- Navegação rápida
**Definition of Done:** o administrador consegue começar o dia apenas a
partir desta página.

### Slice 04 — Biblioteca Documental
**Objetivo:** substituir as pastas tradicionais.
**Constrói:**
- Categorias
- Pesquisa
- Timeline documental
- Upload simplificado
- *(Versões: fora de âmbito nesta v1 — substituir ficheiro chega; o
  versionamento completo é uma iteração futura.)*
**Definition of Done:** nunca é necessário procurar um documento fora da
Portaria.

---

## FASE II — Organizar

### Slice 05 — Assembleias v1
**Objetivo:** preparar assembleias sem Word.
**Constrói:**
- Criar assembleia
- Ordem de trabalhos
- Convocatória
- Ata-base
- Publicação
**Definition of Done:** uma assembleia completa pode ser preparada dentro
da Portaria.

### Slice 06 — Conversas
**Objetivo:** criar a entidade Conversa antes da integração de email.
**Constrói:**
- Conversas
- Notas
- Anexos
- Ligação a ocorrências
- Histórico
- *(Adição mínima: email ao condómino na mudança de estado da sua
  ocorrência — a metade das notificações que o Centro de Trabalho não
  cobre, assente na mecânica de comunicação da Conversa.)*
**Definition of Done:** cada assunto passa a ter um histórico contínuo.

### Slice 07 — Contactos
**Objetivo:** centralizar pessoas e fornecedores.
**Constrói:**
- Fornecedores
- Contactos
- Empresas
- Telefones
- Relações
**Definition of Done:** todos os intervenientes existem apenas uma vez na
plataforma.

### Slice 08 — Contratos
**Objetivo:** eliminar contratos esquecidos.
**Constrói:**
- Contratos
- Datas
- Renovação
- Fornecedor
- Documentação
**Definition of Done:** a Portaria conhece todos os contratos ativos do
condomínio.

---

## FASE III — Compreender

### Slice 09 — Timeline do Condomínio ⭐⭐⭐
**Objetivo:** construir a memória operacional do edifício (o **passado**).
**Constrói:**
- Eventos
- Assembleias
- Ocorrências
- Documentos
- Decisões
**Definition of Done:** é possível compreender a história do condomínio
apenas pela timeline.

### Slice 10 — Pesquisa Global
**Objetivo:** encontrar qualquer informação em segundos.
**Constrói:**
- Pesquisa única
- Documentos
- Pessoas
- Ocorrências
- Assembleias
**Definition of Done:** não é necessário navegar para encontrar informação.

### Slice 11 — Calendário
**Objetivo:** concentrar obrigações futuras (o **futuro** — reaproveita a
estrutura de eventos da Timeline).
**Constrói:**
- Assembleias
- Contratos
- Seguros
- Tarefas
- Prazos
**Definition of Done:** todas as datas importantes vivem na Portaria.

### Slice 12 — Workspace Multi-condomínio
**Objetivo:** permitir gerir vários edifícios em simultâneo (Bloco C,
ADR-007).
**Constrói:**
- Lista de condomínios
- Mudança rápida (tenant no path: `app.portaria.pt/{slug}/…`)
- Estado global
- Pesquisa transversal
- Favoritos
**Definition of Done:** um administrador consegue gerir dezenas de edifícios
sem mudar de domínio.

---

## FASE IV — Assistir

### Slice 13 — Inbox Portaria
**Objetivo:** receber comunicações diretamente na plataforma (assenta na
entidade Conversa já consolidada no Slice 06).
**Constrói:**
- Endereço próprio
- Receção de emails
- Conversas
- Associação de contexto
- Resposta
**Definition of Done:** o administrador consegue trabalhar sem abrir o
Outlook para a maioria das comunicações.

### Slice 14 — Assistente Contextual
**Objetivo:** adicionar IA invisível.
**Constrói:**
- Sugestões (começar pela mais óbvia e mensurável: "ocorrência semelhante")
- Resumos
- Relações
- Alertas
- Explicações
**Definition of Done:** a IA reduz trabalho sem alterar o fluxo normal.

### Slice 15 — Centro de Conhecimento ⭐⭐⭐⭐⭐
**Objetivo:** transformar a Portaria na memória permanente do condomínio.
**Constrói:**
- Perguntar à Portaria
- Histórico contextual
- Decisões anteriores
- Respostas fundamentadas
- Navegação por contexto
**Definition of Done:** um novo administrador consegue compreender anos de
história do condomínio sem depender da transmissão oral.

---

## Dependências a respeitar

- Frações (02) são o pivô de contexto de quase tudo o que se segue.
- Contactos (07) → Contratos (08) → alimentam o Calendário (11).
- Conversas (06) precede a Inbox (13).
- Timeline (09, passado) precede o Calendário (11, futuro) — partilham a
  estrutura de eventos.

## Histórico de reordenações

*(Registar aqui cada alteração à ordem, com data e a entrada de
`living-lab.md` que a motivou.)*

- **2026-07-09** — versão inicial consolidada. Face à proposta técnica
  anterior: Centro de Trabalho subiu para Slice 03; Inbox desceu para
  Slice 13; adotado o enquadramento Living Lab e o critério "sem a Portaria,
  faria isto à mão?".
