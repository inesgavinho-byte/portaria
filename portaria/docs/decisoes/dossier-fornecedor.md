# Ficha de fornecedor — o que este processo obrigou a mudar

A reconciliação do processo Pinturas Verticais — 201 mensagens em 43 fios, 70
ficheiros, 104 acontecimentos — expôs limites da ficha de fornecedor que só
aparecem quando um dossiê passa de uma dúzia de registos para uma centena.
Estas são as alterações e o motivo de cada uma.

---

## 1. O arquivo estava desligado do histórico

**O problema.** A interface carregava ficheiros para `documentos`. As citações
do histórico apontam para `contrato_memoria_evidencias.fonte_id`, que referencia
`ia_documental_fontes`. As duas tabelas não tinham qualquer ligação.

Consequência prática: **um documento carregado pela interface nunca podia
tornar-se prova de uma afirmação.** Toda a reconciliação deste processo teve de
ser feita por SQL, migração a migração. Não era uma limitação de interface — era
o modelo de dados a impedi-lo.

**A alteração.** `ia_documental_fontes` passa a ter `documento_id`,
`fornecedor_id` e `data_documento`, com chaves estrangeiras compostas por
tenant. Um índice único em `(tenant_id, documento_id)` garante que um ficheiro
tem no máximo uma fonte.

As duas camadas mantêm-se distintas de propósito, porque servem coisas
diferentes: `documentos` guarda o original; `ia_documental_fontes` guarda a
leitura — o que o documento diz, o localizador da passagem, o papel que
desempenha. A ponte cria-se sob demanda, quando se cita pela primeira vez.

## 2. As categorias não continham nada do que o processo era feito

O enum tinha `{ata, conta, contrato, regulamento, manual, apolice, outro, obra,
seguro, circular}`. Um processo de empreitada é feito de comunicações,
orçamentos, facturas, comprovativos, fichas técnicas, pareceres e
interpelações — e nenhuma dessas existia. Todas caíam em «outro», o que torna o
arquivo inútil precisamente quando é preciso encontrar algo para citar.

Acrescentadas as sete. `CATEGORIA_LABEL` passou a ser tipada sobre
`DocumentoCategoria`, pelo que acrescentar uma categoria ao enum agora falha a
compilação até lhe ser dado um rótulo. O tipo apanhou de imediato os três sítios
que tinham mapas duplicados.

## 3. Uma comunicação não é um ficheiro com título

Uma comunicação tem data própria, contraparte e, se for um fio, um número de
mensagens. A data do email não é a data do upload, e é a primeira que importa ao
dossiê. `documentos` recebeu `data_documento`, `contraparte`, `n_mensagens` e
`checksum`.

O `checksum` não é acessório. Neste processo circularam **três ficheiros
distintos sob a mesma referência 010125**, divergentes em valor, prazo, cláusula
de IVA e materiais. Sem resumo criptográfico, «o orçamento 010125» é uma
expressão ambígua.

## 4. Citar passou a ser possível na interface

Nova acção `juntarEvidencia`: escolhe-se um documento do arquivo, o localizador,
a citação e o papel — primária, corroboração ou contradição. A fonte é criada a
partir do documento se ainda não existir.

**A citação é obrigatória por desenho.** Uma evidência sem citação é uma
remissão para um anexo; com citação é a passagem exacta que sustenta ou
contraria o que o acontecimento afirma. É essa exigência que permite ler o
dossiê inteiro sem reabrir um único PDF — e foi o que permitiu, neste processo,
detectar que a folha de adjudicação de 03-06-2025 está aposta a um corpo
entregue em 04-09-2025.

O papel `contradicao` é o mais importante dos três e o menos óbvio: é ele que
permite guardar, no mesmo acontecimento, o documento que o afirma e o documento
que o desmente, sem que o sistema escolha um vencedor.

## 5. Cada documento mostra quantas vezes é citado

Um documento que ninguém cita é um ficheiro, não uma prova. A contagem aparece
em cada linha do arquivo, e «não citado» aparece em vermelho — não porque seja
erro, mas porque é trabalho por fazer.

## 6. O histórico não escalava

Com 104 acontecimentos, filtrar por grupo não chega. Acrescentado:

- **filtro por natureza** — Pendentes, Conflitos, Inferências, Factos, com
  contagem. A ordem é a da utilidade: primeiro o que está em aberto;
- **busca** que percorre títulos, resumos **e citações** — procurar «Hidrostop»
  encontra o acontecimento pela evidência, não pelo título;
- **contador de resultados** quando há filtro, para que ninguém confunda uma
  vista filtrada com o dossiê inteiro;
- filtros combináveis e preservados na URL, portanto partilháveis.

## 7. As pendências são a lista de trabalho

Catorze pendências dispersas numa lista cronológica de 104 registos são
invisíveis. Passam a ter painel próprio no topo, com valor quando existe, e
ligação para a vista filtrada. Desaparece quando há filtro activo, para não
competir com o que se está a ver.

## 8. A tríade declarado / comprovado / facturado subiu a indicador

Era a conclusão analítica mais importante do processo e estava num parágrafo
cinzento. São agora três dos seis mosaicos de topo:

| | |
| --- | --- |
| **Facturado** | documento fiscal emitido |
| **Comprovado** | débito com prova bancária |
| **Declarado** | consta de mapa, sem prova bancária |

Neste processo: 15.900 € facturados, 6.360 € comprovados, 45.000 € declarados.
Os três números lado a lado dizem o que o processo é. Um deles sozinho não diz
nada.

## 9. Largura e adaptabilidade

- Contentor de `max-w-5xl` (1024 px) para `max-w-[1680px]`. Um dossiê de 104
  registos com resumos longos numa coluna de 600 px é ilegível, e num ecrã de
  1440 px sobrava metade do espaço vazio.
- Grelha principal passa a `xl:[1fr 340px]` e `2xl:[1fr 380px]`. Abaixo de `xl`
  empilha, em vez de comprimir a barra lateral a 280 px.
- Mosaicos de indicadores: 2 colunas no telefone, 3 no tablet, 6 no ecrã largo.
- Linha do acontecimento: a data e o ícone recuperam largura no desktop; no
  telefone o valor passa para baixo do texto em vez de espremer a coluna. Deixa
  de haver quatro colunas fixas num ecrã de 375 px.
- O arquivo saiu da barra lateral, onde o formulário não cabia, para o corpo
  principal, com grelha de 12 colunas no formulário de upload.

---

## O que fica para depois

- **Transcrição de digitalizações.** Quatro dos ficheiros deste processo não têm
  camada de texto, entre eles a acta da AGO n.º 24, que é a peça que funda
  juridicamente a obra. Um campo de transcrição na fonte resolveria — a estrutura
  já o suporta (`conteudo_markdown`), falta a interface.
- **Upload múltiplo.** Quarenta ficheiros de uma vez, um a um, é fricção real.
- **Detecção de duplicados por checksum** no momento do upload, avisando que o
  ficheiro já existe no arquivo com outro nome — foi o que aconteceu várias vezes
  neste processo.
- **Exportação do dossiê** com as citações, para anexar a uma peça processual.
