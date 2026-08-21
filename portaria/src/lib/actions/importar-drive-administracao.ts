"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { DOCUMENTO_TIPOS_VALIDOS, temaPorDocumento } from "@/lib/documentos";
import type { Documento } from "@/types/database";

const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024;
const MAX_ITENS = 20;
const CATEGORIAS_VALIDAS: Documento["categoria"][] = [
  "ata", "conta", "contrato", "regulamento", "manual", "apolice", "circular", "outro",
];

export type DriveImportItem = {
  url: string;
  titulo?: string;
  categoria?: Documento["categoria"];
  ano?: number | null;
  descricao?: string;
};

export type DriveImportResultado = { importados: number; falhas: string[] };

function extrairGoogleDriveId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["drive.google.com", "docs.google.com"].includes(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/(?:file\/d|document\/d|spreadsheets\/d|presentation\/d)\/([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];
    const id = parsed.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  } catch { return null; }
}

function corrigirMojibake(valor: string): string {
  if (!/[ÃÂâ]/.test(valor)) return valor;
  try {
    const bytes = Uint8Array.from(Array.from(valor), (char) => char.charCodeAt(0) & 0xff);
    const corrigido = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return corrigido.includes("�") ? valor : corrigido;
  } catch {
    return valor;
  }
}

function nomeDoContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return corrigirMojibake(decodeURIComponent(utf8)); } catch { return corrigirMojibake(utf8); }
  }
  const simples = value.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
  return simples ? corrigirMojibake(simples) : null;
}

function extensaoPorMime(mime: string): string | null { return DOCUMENTO_TIPOS_VALIDOS[mime] ?? null; }

function tipoPorAssinatura(bytes: Uint8Array): { mime: string; extensao: string } | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d)
    return { mime: "application/pdf", extensao: "pdf" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mime: "image/jpeg", extensao: "jpg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return { mime: "image/png", extensao: "png" };
  return null;
}

function tipoPorNome(nome: string | null): { mime: string; extensao: string } | null {
  const ext = nome?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const tipos: Record<string, { mime: string; extensao: string }> = {
    pdf: { mime: "application/pdf", extensao: "pdf" },
    doc: { mime: "application/msword", extensao: "doc" },
    docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extensao: "docx" },
    xls: { mime: "application/vnd.ms-excel", extensao: "xls" },
    xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensao: "xlsx" },
    jpg: { mime: "image/jpeg", extensao: "jpg" }, jpeg: { mime: "image/jpeg", extensao: "jpg" },
    png: { mime: "image/png", extensao: "png" },
  };
  return ext ? tipos[ext] ?? null : null;
}

function normalizarNome(nome: string): string {
  return corrigirMojibake(nome)
    .replace(/^fwd:\s*/i, "")
    .replace(/^edif[ií]cio europa\s*[-–—:]\s*/i, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(nome: string): Set<string> {
  return new Set(nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

function categoriaAutomatica(nome: string): Documento["categoria"] {
  const texto = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const palavras = tokens(nome);
  if (palavras.has("regulamento")) return "regulamento";
  if (palavras.has("contrato")) return "contrato";
  if (palavras.has("apolice") || palavras.has("seguro") || palavras.has("seguros")) return "apolice";
  if (palavras.has("balancete") || palavras.has("extrato") || palavras.has("quotizacao") || palavras.has("quotizacoes") || palavras.has("quota") || palavras.has("quotas") || palavras.has("pagamento") || palavras.has("pagamentos") || palavras.has("conta") || palavras.has("contas") || palavras.has("orcamento")) return "conta";
  if (palavras.has("ata") || /^ata\s+(n|nº|no)?\.?\s*\d/i.test(texto)) return "ata";
  if (palavras.has("circular") || palavras.has("comunicacao")) return "circular";
  return "outro";
}

function anoAutomatico(nome: string): number | null {
  const anos = nome.match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? [];
  return anos.length ? Math.max(...anos) : null;
}

export async function importarDriveParaAdministracao(itens: DriveImportItem[]): Promise<DriveImportResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { importados: 0, falhas: ["Sem permissões para esta operação."] };
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > MAX_ITENS)
    return { importados: 0, falhas: [`Indique entre 1 e ${MAX_ITENS} ficheiros.`] };

  const supabase = await createClient();
  let importados = 0;
  const falhas: string[] = [];

  for (const item of itens) {
    const driveId = extrairGoogleDriveId(item.url);
    if (!driveId) { falhas.push(`${item.titulo || item.url}: link Google Drive inválido.`); continue; }

    try {
      const downloadUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`;
      const response = await fetch(downloadUrl, { redirect: "follow", cache: "no-store" });
      if (!response.ok) throw new Error(`Drive respondeu ${response.status}`);

      const headerMime = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > TAMANHO_MAXIMO_BYTES) throw new Error("ficheiro excede 25 MB");

      const data = await response.arrayBuffer();
      if (data.byteLength === 0) throw new Error("ficheiro vazio");
      if (data.byteLength > TAMANHO_MAXIMO_BYTES) throw new Error("ficheiro excede 25 MB");

      const nomeRemoto = nomeDoContentDisposition(response.headers.get("content-disposition"));
      const extensaoHeader = extensaoPorMime(headerMime);
      const tipo = extensaoHeader ? { mime: headerMime, extensao: extensaoHeader } : tipoPorAssinatura(new Uint8Array(data)) ?? tipoPorNome(nomeRemoto);
      if (!tipo) throw new Error(`tipo não suportado (${headerMime || "desconhecido"})`);

      const nomeFonte = item.titulo ? corrigirMojibake(item.titulo) : (nomeRemoto ?? `Documento Drive ${driveId}`);
      const tituloBase = normalizarNome(nomeFonte).slice(0, 200);
      const categoria = item.categoria && CATEGORIAS_VALIDAS.includes(item.categoria) ? item.categoria : categoriaAutomatica(tituloBase);
      const ano = item.ano && item.ano >= 1900 && item.ano <= 2100 ? item.ano : anoAutomatico(tituloBase);

      const { data: documento, error: insertError } = await supabase.from("documentos_administracao").insert({
        tenant_id: ctx.tenant.id,
        titulo: tituloBase,
        descricao: item.descricao?.trim() || "Migrado do Google Drive. Original preservado no arquivo privado do PORTARIA.",
        categoria,
        tema: temaPorDocumento({ titulo: tituloBase, categoria }),
        ano,
        ficheiro_path: "pending",
        ficheiro_tamanho: data.byteLength,
        ficheiro_tipo: tipo.mime,
        origem_partilhada_path: item.url,
        upload_por: ctx.user.id,
      }).select("id").single();

      if (insertError || !documento) throw new Error("não foi possível criar o registo documental");
      const path = `${ctx.tenant.id}/${documento.id}/${Date.now()}.${tipo.extensao}`;
      const { error: uploadError } = await supabase.storage.from("documentos-admin").upload(path, data, { contentType: tipo.mime, cacheControl: "3600", upsert: false });
      if (uploadError) { await supabase.from("documentos_administracao").delete().eq("id", documento.id); throw new Error("falha ao gravar o original no arquivo privado"); }

      const { error: updateError } = await supabase.from("documentos_administracao").update({ ficheiro_path: path }).eq("id", documento.id).eq("tenant_id", ctx.tenant.id);
      if (updateError) throw new Error("ficheiro gravado, mas o registo não foi finalizado");
      importados += 1;
    } catch (error) {
      const motivo = error instanceof Error ? error.message : "erro desconhecido";
      falhas.push(`${item.titulo || item.url}: ${motivo}. Confirme que o ficheiro está partilhado por link.`);
    }
  }

  revalidatePath("/configuracao/documentos-administracao");
  revalidatePath("/configuracao/documentos-administracao/importar-drive");
  return { importados, falhas };
}
