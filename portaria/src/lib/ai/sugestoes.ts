/**
 * Sugestões proactivas da Conselheira por contexto de página.
 * Puro (client-safe): mapeia o pathname a um contexto e a perguntas úteis.
 * A IA é invisível até ser útil — as sugestões aparecem onde fazem sentido.
 */

export type ContextoPagina = {
  chave: string;
  contexto: string; // pista de contexto para a pesquisa
  sugestoes: string[];
};

const GERAL: ContextoPagina = {
  chave: "geral",
  contexto: "Gestão de condomínio",
  sugestoes: [
    "O fundo comum de reserva é obrigatório? De quanto?",
    "Que maioria é precisa para aprovar obras nas partes comuns?",
    "Com que antecedência se convoca a assembleia?",
  ],
};

const CONTEXTOS: { prefixos: string[]; ctx: ContextoPagina }[] = [
  {
    prefixos: ["/assembleias", "/configuracao/assembleias"],
    ctx: {
      chave: "assembleias",
      contexto: "Assembleia de condóminos: quórum, maiorias e prazos",
      sugestoes: [
        "Que quórum e maioria são precisos para aprovar o orçamento?",
        "Com que antecedência tenho de convocar a assembleia?",
        "O que pode ser deliberado em segunda convocação?",
        "Que maioria aprova obras de inovação nas partes comuns?",
      ],
    },
  },
  {
    prefixos: ["/contratos"],
    ctx: {
      chave: "contratos",
      contexto: "Contratos de prestação de serviços do condomínio",
      sugestoes: [
        "Qual o prazo de pré-aviso para não renovar um contrato?",
        "O que implica a renovação automática de um contrato?",
        "Que cuidados ter antes de renovar um contrato de manutenção?",
      ],
    },
  },
  {
    prefixos: ["/ocorrencias", "/configuracao/ocorrencias"],
    ctx: {
      chave: "ocorrencias",
      contexto: "Ocorrências, responsabilidade e conservação do edifício",
      sugestoes: [
        "De quem é a responsabilidade numa infiltração entre frações?",
        "Quem paga a reparação de uma parte comum?",
        "O seguro de incêndio do condomínio é obrigatório?",
      ],
    },
  },
  {
    prefixos: ["/fracoes"],
    ctx: {
      chave: "fracoes",
      contexto: "Frações, permilagens e repartição de despesas",
      sugestoes: [
        "Como se repartem as despesas comuns pelas frações?",
        "Como funcionam as permilagens no pagamento de quotas?",
        "O fundo de reserva é obrigatório e de quanto?",
      ],
    },
  },
];

export function contextoDaPagina(pathname: string): ContextoPagina {
  for (const { prefixos, ctx } of CONTEXTOS) {
    if (prefixos.some((p) => pathname.startsWith(p))) return ctx;
  }
  return GERAL;
}
