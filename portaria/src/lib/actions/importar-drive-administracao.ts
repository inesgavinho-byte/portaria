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

export type DriveImportResultado = {
  importados: number;
  falhas: string[];
};

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

function nomeDoContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) { try { return decodeURIComponent(utf8); } catch { return utf8; } }
  return value.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
}

function extensaoPorMime(mime: string): string | null { return DOCUMENTO_TIPOS_VALIDOS[mime] ?? null; }

function tipoPorAssinatura(bytes: Uint8Array): { mime: string; extensao: string } | null {
  // PDF: %PDF-
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d)
    return { mime: "application/pdf", extensao: "pdf" };
  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mime: "image/jpeg", extensao: "jpg" };
  // PNG
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return { mime: "image/png", extensao: "png" };
  // Office Open XML (docx/xlsx) é ZIP; desambiguamos pelo nome remoto depois.
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
    jpg: { mime: "image/jpeg", extensao: "jpg" },
    jpeg: { mime: "image/jpeg", extensao: "jpg" },
    png: { mime: "image/png", extensao: "png" },
  };
  return ext ? tipos[ext] ?? null : null;
}

function categoriaAutomatica(nome: string): Documento["categoria"] {
  const normalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalizado.includes("ata")) return "ata";
  if (normalizado.includes("regulamento")) return "regulamento";
  if (normalizado.includes("contrato")) return "contrato";
  if (normalizado.includes("apolice") || normalizado.includes("seguro")) return "apolice";
  if (normalizado.includes("conta") || normalizado.includes("balancete") || normalizado.includes("orcamento") || normalizado.includes("quota") || normalizado.includes("extrato")) return "conta";
  if (normalizado.includes("circular") || normalizado.includes("comunicacao")) return "circular";
  return "outro";
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
      const tipo = extensaoHeader
        ? { mime: headerMime, extensao: extensaoHeader }
        : tipoPorAssinatura(new Uint8Array(data)) ?? tipoPorNome(nomeRemoto);
      if (!tipo) throw new Error(`tipo não suportado (${headerMime || "desconhecido"})`);

      const tituloBase = (item.titulo || nomeRemoto?.replace(/\.[^.]+$/, "") || `Documento Drive ${driveId}`).trim().slice(0, 200);
      const categoria = item.categoria && CATEGORIAS_VALIDAS.includes(item.categoria) ? item.categoria : categoriaAutomatica(nomeRemoto || tituloBase);
      const ano = item.ano && item.ano >= 1900 && item.ano <= 2100 ? item.ano : null;

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
