import type { Tenant, TenantPerfil } from "@/types/database";

/**
 * Document Blueprints — modelos de documento com variáveis {{...}}
 * substituídas pelos dados reais do condomínio, no servidor.
 *
 * As variáveis disponíveis são:
 *   {{condominio.nome}}        {{condominio.morada}}
 *   {{condominio.nif}}         {{condominio.iban}}
 *   {{condominio.administrador}}
 *   {{data.hoje}}
 *   {{assembleia.numero}}      {{assembleia.data}}
 */

export type BlueprintBase = {
  tipo: string;
  nome: string;
  conteudo_template: string;
  variaveis: string[];
};

const CIRCULAR_QUOTAS = `{{condominio.nome}}
{{condominio.morada}}
NIF {{condominio.nif}}

CIRCULAR — QUOTIZAÇÕES

{{data.hoje}}

Exmos. Senhores Condóminos,

Vimos por este meio recordar os valores das quotas de condomínio em vigor e as respetivas instruções de pagamento.

O pagamento deve ser efetuado por transferência bancária para o IBAN do condomínio:

IBAN: {{condominio.iban}}

Solicitamos que na descrição da transferência seja indicada a fração correspondente, para facilitar a conciliação dos pagamentos.

Com os melhores cumprimentos,

A Administração
{{condominio.administrador}}`;

const CONVOCATORIA = `{{condominio.nome}}
{{condominio.morada}}
NIF {{condominio.nif}}

CONVOCATÓRIA — ASSEMBLEIA DE CONDÓMINOS N.º {{assembleia.numero}}

Nos termos da lei e do regulamento do condomínio, convocam-se os Exmos. Senhores Condóminos para a Assembleia de Condóminos a realizar no dia {{assembleia.data}}.

ORDEM DE TRABALHOS
1.
2.
3. Outros assuntos de interesse para o condomínio.

Não se verificando quórum à hora marcada, a Assembleia reunirá trinta minutos depois, no mesmo local, com qualquer número de condóminos presentes.

{{condominio.morada}}, {{data.hoje}}

A Administração
{{condominio.administrador}}`;

const ATA = `{{condominio.nome}}
NIF {{condominio.nif}}

ATA DA ASSEMBLEIA DE CONDÓMINOS N.º {{assembleia.numero}}

No dia {{assembleia.data}}, reuniu a Assembleia de Condóminos do {{condominio.nome}}, sito em {{condominio.morada}}, para deliberar sobre a ordem de trabalhos constante da respetiva convocatória.

PRESENÇAS
Estiveram presentes ou devidamente representados os condóminos correspondentes às permilagens registadas na folha de presenças, que fica anexa a esta ata.

DELIBERAÇÕES
1.
2.

Nada mais havendo a tratar, foi encerrada a reunião, da qual se lavrou a presente ata que vai ser assinada.

{{data.hoje}}

A Administração
{{condominio.administrador}}`;

export const BLUEPRINTS_BASE: BlueprintBase[] = [
  {
    tipo: "circular_quotas",
    nome: "Circular de Quotas",
    conteudo_template: CIRCULAR_QUOTAS,
    variaveis: [
      "condominio.nome",
      "condominio.morada",
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

/** Linha em branco para o utilizador completar (nunca deixamos {{token}}). */
const POR_PREENCHER = "____________";

/**
 * Substitui as variáveis {{...}} pelo valor real. Valores em falta e
 * tokens desconhecidos passam a uma linha em branco — nunca fica um
 * placeholder {{...}} visível no documento.
 */
export function preencherBlueprint(
  template: string,
  tenant: Pick<Tenant, "nome" | "morada">,
  perfil: Pick<TenantPerfil, "nif" | "iban" | "administrador_nome" | "administrador_empresa"> | null,
  hoje: string,
  assembleia?: DadosAssembleia
): string {
  const administrador =
    perfil?.administrador_nome || perfil?.administrador_empresa || "";

  const mapa: Record<string, string> = {
    "condominio.nome": tenant.nome || "",
    "condominio.morada": tenant.morada || "",
    "condominio.nif": perfil?.nif || "",
    "condominio.iban": perfil?.iban || "",
    "condominio.administrador": administrador,
    "data.hoje": hoje,
    "assembleia.numero": assembleia?.numero || "",
    "assembleia.data": assembleia?.data || "",
  };

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_todo, chave: string) => {
    const valor = mapa[chave];
    if (valor === undefined || valor === "") return POR_PREENCHER;
    return valor;
  });
}
