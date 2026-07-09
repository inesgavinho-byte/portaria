# PORTARIA — Diário do Living Lab

Diário operacional do produto. A Portaria é usada de verdade para administrar
o Edifício Europa; **cada fricção observada no uso real regista-se aqui**.

Este documento é a fonte das decisões de produto: o `docs/roadmap.md` é
reordenado a partir do que aqui se acumula, não a partir de intuição.

---

## Como usar

Sempre que algo no uso real incomodar — um passo a mais, uma dúvida, uma
ida a uma ferramenta fora da Portaria (Outlook, Excel, pasta de rede,
WhatsApp, papel) — regista uma entrada. Não é preciso solução; é preciso o
facto.

Cada entrada relaciona-se com um slice do roadmap (ou justifica um novo).

### Critério de triagem

Para cada fricção, a pergunta-mãe do roadmap:

> **"Sem a Portaria, eu faria isto manualmente?"**

- **Sim** → candidato legítimo. Ligar a um slice ou propor novo.
- **Não** → talvez a funcionalidade não seja necessária. Registar na mesma
  o porquê da dúvida.

---

## Modelo de entrada

```
### AAAA-MM-DD — Título curto da fricção

**Contexto:** o que estava a tentar fazer.
**Fricção:** o que correu mal, faltou, ou obrigou a sair da Portaria.
**Fiz isto à mão?** Sim / Não — e como.
**Slice relacionado:** #NN (ou "novo slice proposto: …").
**Prioridade sentida:** baixa / média / alta / bloqueante.
**Nota:** decisão ou observação (opcional).
```

---

## Registo

### 2026-07-09 — Abertura do diário

**Contexto:** roadmap consolidado (`docs/roadmap.md`), MVP em produção,
plataforma ainda virgem (0 dados reais).
**Fricção:** nenhuma ainda — o uso real começa agora.
**Fiz isto à mão?** N/A.
**Slice relacionado:** —
**Prioridade sentida:** —
**Nota:** primeira fricção esperada durante a configuração do Perfil do
Condomínio (Slice 01). A partir daqui, cada sessão de uso real deve deixar
pelo menos uma entrada — mesmo que seja "correu tudo bem".

### 2026-07-09 — Slice 01 concluído (Perfil do Condomínio)

**Teste do Living Lab:** *"Se amanhã eu administrasse o Europa, teria aberto
esta funcionalidade esta semana?"* → **Sim.** É o primeiro ecrã a abrir:
pôr a casa em ordem (morada, contactos, seguradora, administrador) antes de
a habitar. Sem a Portaria, estes dados viveriam num Word ou na memória de
alguém.
**Decisão de âmbito:** "Documentos institucionais" não gerou um segundo
sistema de documentos — o Perfil dá um atalho para a biblioteca (Documentos),
onde o regulamento/apólice/escritura já vivem. Evita duplicação (constituição:
o contexto vale mais do que o documento; um só sítio para documentos).
**Fricção a observar no uso real:** a validade da apólice é hoje um campo
solto — quando existir Calendário (Slice 11), deve gerar um lembrete
automático de renovação. Registar aqui se a Inês sentir falta disso antes.

### 2026-07-09 — Bug: upload de documento falhava (500)

**Contexto:** tentar carregar um documento em /configuracao/documentos/novo
(uso real: pôr um documento institucional na plataforma).
**Fricção:** ecrã branco + "Application error"; 500 no submit. Causa: o
limite default das Server Actions do Next é 1 MB — qualquer documento real
excede-o e é rejeitado antes de a action correr, apesar de a UI prometer
25 MB.
**Fiz isto à mão?** Sim — o documento continuaria numa pasta/email. É
exatamente o que a Portaria deve substituir; por isso é bloqueante.
**Correção:** `serverActions.bodySizeLimit = 25mb` no next.config; criada
também a página índice /configuracao (matava 404 de prefetch).
**Seguimento (candidato a slice):** a função serverless do hosting tem o
seu próprio limite de payload (tipicamente ~6 MB). Ficheiros grandes
(atas digitalizadas com muitas páginas) podem ainda falhar. A solução
robusta é **upload direto ao Supabase Storage** a partir do browser
(signed upload URL), que tira o ficheiro do corpo da função. Aplica-se
também às fotografias de ocorrências. Priorizar se o uso real bater no
teto.
**Prioridade sentida:** alta (bloqueava o Slice 04 / uso diário).

### 2026-07-09 — Slice 02 concluído (Frações e Proprietários)

**Teste do Living Lab:** *"Se amanhã eu administrasse o Europa, teria aberto
esta funcionalidade esta semana?"* → **Sim.** Registar as 26 frações com
proprietários e permilagens é trabalho de base — hoje viveria num Excel.
**Critério "faria isto à mão?":** Sim — a lista de frações/permilagens é a
espinha do condomínio (voto em assembleia, quotas). Substitui uma folha de
cálculo.
**Decisões de âmbito:**
- `fracoes` é admin-only (contactos de proprietários são sensíveis); o
  condómino vê só a sua fração via rótulo denormalizado no membership.
- Proprietário/inquilino ficam como campos na fração, não como entidade
  Pessoa — isso é o Slice 07 (Contactos). Quando chegar, normaliza-se.
- Ocorrência liga a UMA fração (a do autor, via checkbox). Muitas-para-
  muitas (uma infiltração em várias frações) fica para quando o uso pedir.
- Aviso↔fração e assembleia↔fração: a entidade está pronta a ser
  referenciada; ligam-se quando esses slices tocarem no tema (assembleias
  ainda não existem).
**Fricção antecipada:** inserir 26 frações uma a uma pode ser tedioso. Se a
Inês sentir, considerar importação em massa (candidato a melhoria, não slice).
**Prioridade sentida:** —
