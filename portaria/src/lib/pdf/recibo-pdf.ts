import {
  escaparHtml,
  localidadeDeMorada,
  type DadosCondominio,
  type DadosPerfil,
} from "@/lib/blueprints";
import { carregarLogoDataUri } from "@/lib/pdf/documento-blueprint";
import { renderBlueprintPdf } from "@/lib/pdf/blueprint-pdf";
import { formatarEuros, periodoLabel, METODO_LABEL } from "@/lib/financeiro/recibo-automatico";

/**
 * Compositor do documento de recibo.
 *
 * Mesma doutrina dos blueprints: UM HTML serve a pré-visualização e o PDF
 * (react-pdf-html). Tudo é gerado no servidor a partir de dados de confiança;
 * os valores dinâmicos passam por escaparHtml.
 */

const REGUA = `<div style="border-bottom:1pt solid #8B8670;margin-top:26px;margin-bottom:8px"></div>`;

export type LinhaQuotaRecibo = { ano: number; mes: number; valorCents: number };

export type DadosReciboDocumento = {
  tenant: DadosCondominio;
  perfil: DadosPerfil;
  logoDataUri?: string | null;
  hoje: string;
  recibo: { numero: string; valorCents: number; emitidoEm?: string | null };
  fracao: { codigo: string; proprietario: string };
  pagamento: {
    metodo: string | null;
    referencia: string | null;
    dataPagamento: string | null;
  };
  quotas: LinhaQuotaRecibo[];
};

export function montarReciboHtml({
  tenant,
  perfil,
  logoDataUri,
  hoje,
  recibo,
  fracao,
  pagamento,
  quotas,
}: DadosReciboDocumento): string {
  const nome = tenant.nome || "";
  const morada = tenant.morada || "";
  const localidade = localidadeDeMorada(tenant.morada);
  const nif = perfil?.nif || "";
  const email = tenant.email || "";
  const administrador = perfil?.administrador_nome || perfil?.administrador_empresa || "";

  // ---- Cabeçalho (idêntico ao dos documentos) ----
  const marca = logoDataUri
    ? `<div style="text-align:center;margin-bottom:6px"><img src="${logoDataUri}" style="height:50px;max-width:230px;object-fit:contain" /></div>`
    : `<div style="text-align:center;font-family:Times-Roman;font-size:26px;letter-spacing:6px;margin-bottom:4px">${escaparHtml(nome.toUpperCase())}</div>`;
  const linhaMorada = morada
    ? `<div style="text-align:center;font-size:9px;color:#8B8670;margin-bottom:10px">${escaparHtml(morada)}</div>`
    : "";
  const cabecalho = `${marca}${linhaMorada}<div style="border-bottom:1pt solid #8B8670;margin-bottom:14px"></div>`;

  // ---- Título + data ----
  const titulo = `<div style="text-align:right;margin-bottom:16px"><span style="font-weight:bold;letter-spacing:2px">RECIBO n.º ${escaparHtml(recibo.numero)}</span><br/><span style="color:#8B8670">${
    localidade ? escaparHtml(localidade) + ", " : ""
  }${escaparHtml(hoje)}</span></div>`;

  // ---- Corpo ----
  const total = formatarEuros(recibo.valorCents);
  const declaracao = `<p style="font-size:12px;margin-bottom:12px">Recebi(emos) de <strong>${escaparHtml(
    fracao.proprietario
  )}</strong>, condómino(a) da fração <strong>${escaparHtml(
    fracao.codigo
  )}</strong>, o valor de <strong>${escaparHtml(total)}</strong>, referente às seguintes quotas de condomínio:</p>`;

  const linhas = quotas.length
    ? quotas
        .map(
          (q) =>
            `<tr><td style="padding:4px 8px">${escaparHtml(periodoLabel(q.ano, q.mes))}</td><td style="padding:4px 8px;text-align:right">${escaparHtml(formatarEuros(q.valorCents))}</td></tr>`
        )
        .join("")
    : `<tr><td style="padding:4px 8px;color:#8B8670">Quotas de condomínio</td><td style="padding:4px 8px;text-align:right">${escaparHtml(total)}</td></tr>`;
  const tabela = `<table style="width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:11px"><tbody>${linhas}<tr><td style="padding:6px 8px;border-top:1pt solid #8B8670;font-weight:bold">TOTAL</td><td style="padding:6px 8px;border-top:1pt solid #8B8670;text-align:right;font-weight:bold">${escaparHtml(total)}</td></tr></tbody></table>`;

  const metodo = pagamento.metodo
    ? (METODO_LABEL[pagamento.metodo] ?? pagamento.metodo)
    : null;
  const partesPagamento = [
    metodo ? `Forma de pagamento: ${metodo}` : "",
    pagamento.dataPagamento ? `Data do pagamento: ${pagamento.dataPagamento}` : "",
    pagamento.referencia ? `Referência: ${pagamento.referencia}` : "",
  ].filter(Boolean);
  const linhaPagamento = partesPagamento.length
    ? `<p style="font-size:10px;color:#4a4741">${partesPagamento
        .map((p) => escaparHtml(p))
        .join("<br/>")}</p>`
    : "";

  // ---- Assinatura + rodapé ----
  const assinatura = administrador
    ? `${REGUA}<div style="text-align:center"><strong>${escaparHtml(administrador)}</strong><br/><span style="font-style:italic">A Administração</span></div>`
    : "";
  const partes = [morada, nif ? `NIF ${nif}` : "", email].filter(Boolean);
  const rodape = partes.length
    ? `${REGUA}<div style="text-align:center;font-size:8px;font-style:italic;color:#8B8670">${partes
        .map((p) => escaparHtml(p))
        .join(" · ")}</div>`
    : "";

  return `${cabecalho}${titulo}${declaracao}${tabela}${linhaPagamento}${assinatura}${rodape}`;
}

/** Gera o Buffer do PDF a partir do HTML composto (mesma engine dos blueprints). */
export async function gerarReciboPdf(html: string): Promise<Buffer> {
  return renderBlueprintPdf(html);
}

/** Reexportado por conveniência para quem compõe e gera em sequência. */
export { carregarLogoDataUri };
