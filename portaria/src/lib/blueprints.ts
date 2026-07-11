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
];

export type DadosAssembleia = { numero?: string | null; data?: string | null };
export type DadosCircular = { numero?: string | null; assunto?: string | null };

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
