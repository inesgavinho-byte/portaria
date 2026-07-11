/**
 * Fontes canónicas de legislação portuguesa sobre propriedade horizontal,
 * incorporadas na Portaria (não dependem de upload). São resumos fiéis com
 * a citação do artigo em `fonte`; a Conselheira cita sempre a fonte e
 * nunca deve ir além do que aqui consta.
 *
 * Base legal: Código Civil (Arts. 1414.º–1438.º-A), Decreto-Lei n.º 268/94
 * e Lei n.º 8/2022.
 */

export type ChunkLegislacao = { titulo: string; conteudo_texto: string; fonte: string };

export const LEGISLACAO: ChunkLegislacao[] = [
  {
    titulo: "Noção de propriedade horizontal",
    conteudo_texto:
      "As fracções autónomas de um edifício, quando independentes, distintas e isoladas entre si, com saída própria para uma parte comum ou para a via pública, podem pertencer a proprietários diferentes em regime de propriedade horizontal. Cada condómino é proprietário exclusivo da sua fracção e comproprietário das partes comuns.",
    fonte: "Código Civil, Arts. 1414.º e 1420.º",
  },
  {
    titulo: "Partes comuns do edifício",
    conteudo_texto:
      "São comuns, entre outros, o solo, os alicerces, colunas, paredes mestras e todas as partes restantes que constituem a estrutura do prédio; o telhado ou os terraços de cobertura; as entradas, vestíbulos, escadas e corredores de uso comum; e, em geral, as coisas afectas ao uso comum. Presumem-se comuns as partes não afectadas ao uso exclusivo de um condómino.",
    fonte: "Código Civil, Art. 1421.º",
  },
  {
    titulo: "Encargos de conservação e despesas comuns",
    conteudo_texto:
      "As despesas necessárias à conservação e fruição das partes comuns e ao pagamento de serviços de interesse comum são pagas pelos condóminos na proporção do valor das suas fracções (permilagem), salvo disposição em contrário. As despesas relativas a partes comuns que sirvam apenas alguns condóminos (por exemplo, o elevador) ficam a cargo dos que delas se servem.",
    fonte: "Código Civil, Art. 1424.º",
  },
  {
    titulo: "Obras de inovação nas partes comuns",
    conteudo_texto:
      "As obras que constituam inovações dependem da aprovação da maioria dos condóminos, devendo essa maioria representar dois terços do valor total do prédio. Inovações são alterações que modificam a substância ou a forma das partes comuns além da mera conservação.",
    fonte: "Código Civil, Art. 1425.º",
  },
  {
    titulo: "Seguro obrigatório contra incêndio",
    conteudo_texto:
      "É obrigatório o seguro contra o risco de incêndio do edifício, quer quanto às fracções autónomas, quer quanto às partes comuns. Na falta de seguro, o administrador pode e deve promover a sua realização, repercutindo o custo pelos condóminos.",
    fonte: "Código Civil, Art. 1429.º",
  },
  {
    titulo: "Órgãos de administração do condomínio",
    conteudo_texto:
      "A administração das partes comuns compete à assembleia de condóminos e a um administrador. A assembleia é o órgão deliberativo; o administrador é o órgão executivo, que cumpre e faz cumprir as deliberações.",
    fonte: "Código Civil, Art. 1430.º",
  },
  {
    titulo: "Assembleia ordinária anual",
    conteudo_texto:
      "A assembleia de condóminos reúne-se obrigatoriamente na primeira quinzena de Janeiro para aprovação das contas do ano anterior e do orçamento das despesas do ano em curso. Pode ainda reunir extraordinariamente sempre que convocada pelo administrador ou por condóminos que representem, pelo menos, 25% do capital investido.",
    fonte: "Código Civil, Art. 1431.º",
  },
  {
    titulo: "Convocação, quórum e maiorias da assembleia",
    conteudo_texto:
      "A assembleia é convocada por carta registada, enviada com 10 dias de antecedência, ou por aviso convocatório com recibo de recepção, indicando dia, hora, local e ordem de trabalhos. As deliberações são tomadas por maioria dos votos representativos do capital investido (permilagem), salvo maioria qualificada exigida por lei. Se à hora marcada não houver quórum, a assembleia funciona em segunda convocação meia hora depois, podendo deliberar por maioria de votos dos presentes desde que representem, pelo menos, um quarto do valor total do prédio.",
    fonte: "Código Civil, Art. 1432.º",
  },
  {
    titulo: "Funções do administrador",
    conteudo_texto:
      "Compete ao administrador, entre outras funções: convocar a assembleia; elaborar o orçamento das receitas e despesas; cobrar as contribuições dos condóminos e realizar as despesas comuns; executar as deliberações da assembleia; representar o condomínio; guardar e manter os documentos; e prestar contas à assembleia.",
    fonte: "Código Civil, Art. 1436.º",
  },
  {
    titulo: "Fundo comum de reserva",
    conteudo_texto:
      "É obrigatória a constituição de um fundo comum de reserva para custear as despesas de conservação do edifício. Cada condómino contribui para esse fundo com uma quantia correspondente a, pelo menos, 10% da sua quota-parte nas restantes despesas do condomínio.",
    fonte: "Decreto-Lei n.º 268/94, Art. 4.º",
  },
  {
    titulo: "Actas da assembleia",
    conteudo_texto:
      "As deliberações da assembleia são reduzidas a acta, assinada por todos os condóminos que nela participaram. A acta deve identificar os presentes, as deliberações tomadas e os votos. As deliberações vinculam todos os condóminos, incluindo os ausentes, sem prejuízo do direito de impugnação nos termos da lei.",
    fonte: "Decreto-Lei n.º 268/94, Arts. 1.º e 6.º",
  },
  {
    titulo: "Alterações da Lei n.º 8/2022",
    conteudo_texto:
      "A Lei n.º 8/2022 alterou o regime da propriedade horizontal (Código Civil e Decreto-Lei n.º 268/94). Reforçou, nomeadamente, o dever de o administrador emitir declaração da dívida do condómino aquando da alienação da fracção, a responsabilidade pelas dívidas de condomínio na transmissão da fracção e as regras sobre comunicações, actas e prestação de contas. Em caso de venda, deve ser junta a declaração de encargos do condomínio.",
    fonte: "Lei n.º 8/2022",
  },
];
