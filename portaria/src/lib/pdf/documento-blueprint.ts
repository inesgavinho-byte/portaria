import {
  preencherBlueprint,
  escaparHtml,
  localidadeDeMorada,
  type DadosCondominio,
  type DadosPerfil,
} from "@/lib/blueprints";
import { sanitizarHtml } from "@/lib/sanitize";

/**
 * Compositor do documento de um Blueprint.
 *
 * Junta o CORPO editável (Tiptap, com variáveis já substituídas e
 * sanitizadas) ao cabeçalho, bloco de assinaturas e rodapé — gerados
 * aqui a partir dos dados do condomínio. Devolve UM HTML, usado tanto
 * pela pré-visualização (browser) como pelo PDF (react-pdf-html), para
 * que ambos mostrem exactamente o mesmo documento.
 *
 * O cabeçalho/rodapé são de confiança (gerados no servidor); os valores
 * inseridos são escapados. O corpo, esse, é sempre sanitizado.
 */

const REGUA = `<div style="border-bottom:1pt solid #8B8670;margin-top:26px;margin-bottom:8px"></div>`;

/** Descarrega o logótipo (PNG/JPEG) como data URI, para embutir no HTML.
 *  Data URI funciona tanto no browser como no react-pdf. Outros formatos
 *  (SVG/WebP) não são embutidos no PDF — cai-se no nome como marca. */
export async function carregarLogoDataUri(
  logoUrl: string | null
): Promise<string | null> {
  if (!logoUrl) return null;
  const semQuery = logoUrl.split("?")[0].toLowerCase();
  let mime: string | null = null;
  if (semQuery.endsWith(".png")) mime = "image/png";
  else if (semQuery.endsWith(".jpg") || semQuery.endsWith(".jpeg")) mime = "image/jpeg";
  if (!mime) return null;

  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch (err) {
    console.error("Erro a carregar logótipo:", err);
    return null;
  }
}

export type CamposDocumento = {
  tenant: DadosCondominio;
  perfil: DadosPerfil;
  bodyTemplate: string;
  hoje: string;
  ano: number;
  numero?: string | null;
  assunto?: string | null;
  logoDataUri?: string | null;
};

export function montarDocumentoHtml({
  tenant,
  perfil,
  bodyTemplate,
  hoje,
  ano,
  numero,
  assunto,
  logoDataUri,
}: CamposDocumento): string {
  const nome = tenant.nome || "";
  const morada = tenant.morada || "";
  const localidade = localidadeDeMorada(tenant.morada);
  const nif = perfil?.nif || "";
  const email = tenant.email || "";
  const administrador =
    perfil?.administrador_nome || perfil?.administrador_empresa || "";

  // ---- Cabeçalho ----
  const marca = logoDataUri
    ? `<div style="text-align:center;margin-bottom:6px"><img src="${logoDataUri}" style="height:50px;max-width:230px;object-fit:contain" /></div>`
    : `<div style="text-align:center;font-family:Times-Roman;font-size:26px;letter-spacing:6px;margin-bottom:4px">${escaparHtml(nome.toUpperCase())}</div>`;
  const linhaMorada = morada
    ? `<div style="text-align:center;font-size:9px;color:#8B8670;margin-bottom:10px">${escaparHtml(morada)}</div>`
    : "";
  const cabecalho = `${marca}${linhaMorada}<div style="border-bottom:1pt solid #8B8670;margin-bottom:14px"></div>`;

  // ---- Bloco n.º de circular + data (direita) ----
  const linhaNumero = numero
    ? `<span style="font-weight:bold">Circular n.º ${escaparHtml(numero)}/${ano}</span><br/>`
    : "";
  const linhaData = `<span style="color:#8B8670">${
    localidade ? escaparHtml(localidade) + ", " : ""
  }${escaparHtml(hoje)}</span>`;
  const referencia = `<div style="text-align:right;margin-bottom:16px">${linhaNumero}${linhaData}</div>`;

  // ---- Corpo (editável, substituído + sanitizado) ----
  const corpo = sanitizarHtml(
    preencherBlueprint(bodyTemplate, tenant, perfil, hoje, {
      circular: { numero, assunto },
    })
  );

  // ---- Assinatura ----
  const assinatura = administrador
    ? `${REGUA}<div style="text-align:center"><strong>${escaparHtml(
        administrador
      )}</strong><br/><span style="font-style:italic">A Administração</span></div>`
    : "";

  // ---- Rodapé ----
  const partes = [morada, nif ? `NIF ${nif}` : "", email].filter(Boolean);
  const rodape = partes.length
    ? `${REGUA}<div style="text-align:center;font-size:8px;font-style:italic;color:#8B8670">${partes
        .map((p) => escaparHtml(p))
        .join(" · ")}</div>`
    : "";

  return `${cabecalho}${referencia}${corpo}${assinatura}${rodape}`;
}
