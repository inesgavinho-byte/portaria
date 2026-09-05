import type { Tenant, TenantPerfil } from "@/types/database";

/**
 * Document Blueprints — modelos de documento em HTML (editados no Tiptap)
 * com variáveis {{...}} substituídas pelos dados reais do condomínio, no
 * servidor. A integração Google Docs foi descartada: os modelos vivem
 * nativamente na Portaria.
 */

export type BlueprintBase = {
  tipo: string;
  nome: string;
  conteudo_template: string;
  variaveis: string[];
};

/** Variáveis disponíveis, para o painel do editor e validação. */
export const VARIAVEIS_DISPONIVEIS: { token: string; label: string }[] = [
  { token: "condominio.nome", label: "Nome do condomínio" },
  { token: "condominio.morada", label: "Morada" },
  { token: "condominio.nif", label: "NIF" },
  { token: "condominio.iban", label: "IBAN" },
  { token: "condominio.email", label: "Email" },
  { token: "condominio.administrador", label: "Administrador" },
  { token: "data.hoje", label: "Data de hoje" },
  { token: "circular.numero", label: "N.º da circular" },
  { token: "circular.assunto", label: "Assunto da circular" },
  { token: "assembleia.numero", label: "N.º de assembleia" },
  { token: "assembleia.data", label: "Data da assembleia" },
];

/** Tipos oferecidos ao criar um novo blueprint. */
export const TIPOS_BLUEPRINT: { valor: string; label: string }[] = [
  { valor: "circular", label: "Circular" },
  { valor: "convocatoria", label: "Convocatória" },
  { valor: "ata", label: "Ata" },
  { valor: "outro", label: "Outro" },
];

// Nota: os templates guardam apenas o CORPO do documento. O cabeçalho
// (logótipo, morada, n.º de circular, data), o bloco de assinaturas e o
// rodapé são gerados à volta do corpo pelo compositor (documento-blueprint),
// a partir dos dados do condomínio — não se editam aqui.

const CIRCULAR_QUOTAS = `<p><strong>ASSUNTO:</strong> {{circular.assunto}}</p>
<p>Exmos. Senhores Condóminos,</p>
<p>Encontram-se a pagamento as quotizações do condomínio em vigor, conforme os valores abaixo indicados.</p>
<p><strong>Valores a pagar por tipologia de fracção</strong></p>
<table><tbody><tr><th>Fracção</th><th>Quota</th><th>Total a pagar</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<p><strong>Dados para pagamento por transferência bancária</strong></p>
<p>IBAN: {{condominio.iban}}<br>Titular: {{condominio.nome}}<br>NIF: {{condominio.nif}}</p>
<p>Solicita-se que, no descritivo da transferência, seja indicada a identificação da respectiva fracção.</p>
<p>Com os melhores cumprimentos,</p>`;

const CONVOCATORIA = `<h2>Convocatória — Assembleia de Condóminos n.º {{assembleia.numero}}</h2>
<p>Nos termos da lei e do regulamento do condomínio, convocam-se os Exmos. Senhores Condóminos para a Assembleia de Condóminos a realizar no dia {{assembleia.data}}.</p>
<p><strong>Ordem de trabalhos</strong></p>
<ol><li>&nbsp;</li><li>&nbsp;</li><li>Outros assuntos de interesse para o condomínio.</li></ol>
<p>Não se verificando quórum à hora marcada, a Assembleia reunirá trinta minutos depois, no mesmo local, com qualquer número de condóminos presentes.</p>
<p>Com os melhores cumprimentos,</p>`;

const ATA = `<h2>Ata da Assembleia de Condóminos n.º {{assembleia.numero}}</h2>
<p>No dia {{assembleia.data}}, reuniu a Assembleia de Condóminos do {{condominio.nome}}, sito em {{condominio.morada}}, para deliberar sobre a ordem de trabalhos constante da respectiva convocatória.</p>
<p><strong>Presenças</strong></p>
<p>Estiveram presentes ou devidamente representados os condóminos correspondentes às permilagens registadas na folha de presenças, que fica anexa a esta ata.</p>
<p><strong>Deliberações</strong></p>
<ol><li>&nbsp;</li><li>&nbsp;</li></ol>
<p>Nada mais havendo a tratar, foi encerrada a reunião, da qual se lavrou a presente ata que vai ser assinada.</p>`;

const CIRCULAR_QUOTAS_ATRASO = `<p><strong>ASSUNTO:</strong> {{circular.assunto}}</p>
<p>Exmos. Senhores Condóminos,</p>
<p>Verificámos que se encontram em atraso as quotas de algumas fracções, cujo pagamento é indispensável à manutenção corrente do edifício.</p>
<p><strong>Situação de quotas em atraso</strong></p>
<table><tbody><tr><th>Fracção</th><th>Período em atraso</th><th>Valor em dívida</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<p><strong>Pagamento</strong></p>
<p>IBAN: {{condominio.iban}}<br>Titular: {{condominio.nome}}<br>NIF: {{condominio.nif}}</p>
<p>Solicita-se a regularização até ao fim do mês corrente. Para combinar um plano de pagamento, os condóminos interessados deverão contactar a administração — é sempre preferível a um incumprimento prolongado. Se a situação já se encontrar regularizada, pedimos que ignorem esta comunicação.</p>
<p>Com os melhores cumprimentos,</p>`;

const CIRCULAR_OBRAS = `<p><strong>ASSUNTO:</strong> {{circular.assunto}}</p>
<p>Exmos. Senhores Condóminos,</p>
<p>Vimos informar que vão realizar-se trabalhos nas partes comuns do edifício, na sequência de deliberação da assembleia / nos termos do regulamento do condomínio:</p>
<table><tbody><tr><th>Trabalhos</th><th>Período previsto</th><th>Horário</th><th>Empresa</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<p>Pede-se que durante os trabalhos fiquem livres os acessos indicados pela empresa e que sejam adoptadas as precauções habituais. Eventuais alterações ao previsto serão comunicadas atempadamente.</p>
<p>Agradecemos a compreensão e colaboração de todos.</p>`;

const CIRCULAR_INFORMATIVA = `<p><strong>ASSUNTO:</strong> {{circular.assunto}}</p>
<p>Exmos. Senhores Condóminos,</p>
<p>Vimos informar o seguinte:</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>Agradecemos a atenção de todos. Para qualquer esclarecimento, contacte a administração.</p>
<p>Com os melhores cumprimentos,</p>`;

const CONVOCATORIA_EXTRAORDINARIA = `<h2>Convocatória — Assembleia de Condóminos Extraordinária n.º {{assembleia.numero}}</h2>
<p>Nos termos da lei e do regulamento do condomínio, convocam-se os Exmos. Senhores Condóminos para a Assembleia Extraordinária a realizar no dia {{assembleia.data}}, no local habitual, com a seguinte ordem de trabalhos:</p>
<p><strong>Ordem de trabalhos</strong></p>
<ol><li>&nbsp;</li><li>&nbsp;</li><li>Outros assuntos de interesse para o condomínio.</li></ol>
<p>Não se verificando quórum à hora marcada, a Assembleia reunirá trinta minutos depois, no mesmo local, com qualquer número de condóminos presentes.</p>
<p>Com os melhores cumprimentos,</p>`;

const PEDIDO_ORCAMENTO = `<p>Exmos. Senhores,</p>
<p>A administração do {{condominio.nome}}, sito em {{condominio.morada}} (NIF {{condominio.nif}}), solicita a apresentação de orçamento para a seguinte intervenção nas partes comuns do edifício:</p>
<table><tbody><tr><th>Descrição dos trabalhos</th><th>Local</th><th>Prazo pretendido</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<p>Agradecemos que o orçamento indique o preço total e discriminado (materiais, mão de obra e IVA à taxa em vigor), o prazo de execução após adjudicação e a garantia oferecida.</p>
<p>A adjudicação carece de aprovação do condomínio e não gera, por si, obrigação de contratação. Contactos para esclarecimentos: {{condominio.email}}.</p>
<p>Com os melhores cumprimentos,</p>`;

const COMUNICACAO_DIVIDA = `<p>Ex.mo(a) Senhor(a),</p>
<p>Proprietário(a) da fracção n.º ____</p>
<p>Apesar da comunicação anterior, permanece por regularizar a dívida de quotas deste condomínio no valor de ____ , assim discriminada:</p>
<table><tbody><tr><th>Período</th><th>Quota</th><th>Valor em dívida</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<p>O pagamento das quotas destinadas às despesas comuns constitui obrigação de todo o condómino. Solicita-se a regularização integral até ____ , por transferência bancária para o IBAN {{condominio.iban}} (Titular: {{condominio.nome}}; NIF: {{condominio.nif}}).</p>
<p>Decorrido o prazo sem pagamento nem acordo escrito, a administração ver-se-á obrigada a promover a cobrança coerciva da dívida, com acréscimo de juros de mora e encargos associados.</p>
<p>Com os melhores cumprimentos,</p>`;

export const BLUEPRINTS_BASE: BlueprintBase[] = [
  {
    tipo: "circular",
    nome: "Circular de Quotas",
    conteudo_template: CIRCULAR_QUOTAS,
    variaveis: [
      "circular.numero",
      "circular.assunto",
      "condominio.nome",
      "condominio.nif",
      "condominio.iban",
      "condominio.administrador",
      "data.hoje",
    ],
  },
  {
    tipo: "convocatoria",
    nome: "Convocatória",
    conteudo_template: CONVOCATORIA,
    variaveis: [
      "condominio.nome",
      "condominio.morada",
      "condominio.nif",
      "condominio.administrador",
      "data.hoje",
      "assembleia.numero",
      "assembleia.data",
    ],
  },
  {
    tipo: "ata",
    nome: "Ata",
    conteudo_template: ATA,
    variaveis: [
      "condominio.nome",
      "condominio.morada",
      "condominio.nif",
      "condominio.administrador",
      "data.hoje",
      "assembleia.numero",
      "assembleia.data",
    ],
  },
  {
    tipo: "circular",
    nome: "Circular de Quotas em Atraso",
    conteudo_template: CIRCULAR_QUOTAS_ATRASO,
    variaveis: ["circular.assunto", "condominio.nome", "condominio.nif", "condominio.iban"],
  },
  {
    tipo: "circular",
    nome: "Circular de Aviso de Obras",
    conteudo_template: CIRCULAR_OBRAS,
    variaveis: ["circular.assunto"],
  },
  {
    tipo: "circular",
    nome: "Circular Informativa",
    conteudo_template: CIRCULAR_INFORMATIVA,
    variaveis: ["circular.assunto"],
  },
  {
    tipo: "convocatoria",
    nome: "Convocatória — Assembleia Extraordinária",
    conteudo_template: CONVOCATORIA_EXTRAORDINARIA,
    variaveis: ["assembleia.numero", "assembleia.data"],
  },
  {
    tipo: "outro",
    nome: "Pedido de Orçamento",
    conteudo_template: PEDIDO_ORCAMENTO,
    variaveis: ["condominio.nome", "condominio.morada", "condominio.nif", "condominio.email"],
  },
  {
    tipo: "outro",
    nome: "Comunicação de Dívida de Quotas",
    conteudo_template: COMUNICACAO_DIVIDA,
    variaveis: ["condominio.nome", "condominio.nif", "condominio.iban"],
  },
];

export type DadosAssembleia = { numero?: string | null; data?: string | null };
export type DadosCircular = { numero?: string | null; assunto?: string | null };

/** Tokens {{...}} do corpo que existem em VARIAVEIS_DISPONIVEIS, sem repetidos. */
export function variaveisUsadas(conteudo: string): string[] {
  const validos = new Set(VARIAVEIS_DISPONIVEIS.map((v) => v.token));
  return [
    ...new Set(
      [...conteudo.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
        .map((m) => m[1])
        .filter((t) => validos.has(t))
    ),
  ];
}

/** Linha em branco para o utilizador completar (nunca deixamos {{token}}). */
const POR_PREENCHER = "____________";

export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Localidade derivada da morada (último segmento após a vírgula). */
export function localidadeDeMorada(morada: string | null): string {
  if (!morada) return "";
  const partes = morada.split(",").map((s) => s.trim()).filter(Boolean);
  return partes.length > 0 ? partes[partes.length - 1] : "";
}

export type DadosCondominio = Pick<Tenant, "nome" | "morada" | "email">;
export type DadosPerfil = Pick<
  TenantPerfil,
  "nif" | "iban" | "administrador_nome" | "administrador_empresa"
> | null;

/**
 * Substitui as variáveis {{...}} pelo valor real (escapado para HTML).
 * Valores em falta e tokens desconhecidos passam a uma linha em branco —
 * nunca fica um placeholder {{...}} visível no documento.
 *
 * Opera sobre o HTML do CORPO do template; o resultado deve ainda passar
 * por sanitizarHtml antes de ser renderizado.
 */
export function preencherBlueprint(
  template: string,
  tenant: DadosCondominio,
  perfil: DadosPerfil,
  hoje: string,
  extras?: { assembleia?: DadosAssembleia; circular?: DadosCircular }
): string {
  const administrador =
    perfil?.administrador_nome || perfil?.administrador_empresa || "";

  const mapa: Record<string, string> = {
    "condominio.nome": tenant.nome || "",
    "condominio.morada": tenant.morada || "",
    "condominio.nif": perfil?.nif || "",
    "condominio.iban": perfil?.iban || "",
    "condominio.email": tenant.email || "",
    "condominio.administrador": administrador,
    "data.hoje": hoje,
    "circular.numero": extras?.circular?.numero || "",
    "circular.assunto": extras?.circular?.assunto || "",
    "assembleia.numero": extras?.assembleia?.numero || "",
    "assembleia.data": extras?.assembleia?.data || "",
  };

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_todo, chave: string) => {
    const valor = mapa[chave];
    if (valor === undefined || valor === "") return POR_PREENCHER;
    return escaparHtml(valor);
  });
}
