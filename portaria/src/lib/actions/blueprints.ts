"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { redirect } from "next/navigation";
import { preencherBlueprint, TIPOS_BLUEPRINT } from "@/lib/blueprints";
import { renderBlueprintPdf, type LogoPdf } from "@/lib/pdf/blueprint-pdf";
import { sanitizarHtml, htmlVazio } from "@/lib/sanitize";
import type { Blueprint, TenantPerfil } from "@/types/database";

export type ExportarState = {
  error?: string;
  documentoId?: string;
};

/** Deriva um nome de ficheiro seguro a partir do nome do modelo + ano. */
function nomeFicheiro(nome: string, ano: number): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "Documento"}-${ano}`;
}

/**
 * Só embutimos o logótipo no PDF se for raster (PNG/JPEG) — o react-pdf
 * não trata SVG/WebP como imagem. Devolve null se não aplicável.
 */
async function carregarLogo(logoUrl: string | null): Promise<LogoPdf | null> {
  if (!logoUrl) return null;
  const semQuery = logoUrl.split("?")[0].toLowerCase();
  let format: "png" | "jpg" | null = null;
  if (semQuery.endsWith(".png")) format = "png";
  else if (semQuery.endsWith(".jpg") || semQuery.endsWith(".jpeg")) format = "jpg";
  if (!format) return null;

  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, format };
  } catch (err) {
    console.error("Erro a carregar logótipo para PDF:", err);
    return null;
  }
}

/**
 * Gera o PDF de um Blueprint preenchido e guarda-o na biblioteca de
 * Documentos (categoria "circular"), ligado ao modelo por blueprint_id.
 */
export async function exportarBlueprintPdf(
  blueprintId: string,
  _prev: ExportarState,
  _formData: FormData
): Promise<ExportarState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const supabase = await createClient();
  const [{ data: blueprint }, { data: perfil }] = await Promise.all([
    supabase
      .from("blueprints")
      .select("*")
      .eq("id", blueprintId)
      .eq("tenant_id", ctx.tenant.id)
      .single(),
    supabase
      .from("tenant_perfil")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .single(),
  ]);

  if (!blueprint) return { error: "Modelo não encontrado." };
  const bp = blueprint as Blueprint;

  const agora = new Date();
  const ano = agora.getFullYear();
  const hoje = agora.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = sanitizarHtml(
    preencherBlueprint(
      bp.conteudo_template,
      { nome: ctx.tenant.nome, morada: ctx.tenant.morada },
      (perfil as TenantPerfil) ?? null,
      hoje
    )
  );

  const logo = await carregarLogo(ctx.tenant.logo_url);

  let pdf: Buffer;
  try {
    pdf = await renderBlueprintPdf({ html, logo });
  } catch (err) {
    console.error("Erro a gerar PDF do blueprint:", err);
    return { error: "Erro ao gerar o PDF." };
  }

  const titulo = `${bp.nome} — ${ano}`;

  // 1. Regista o documento (path preenchido depois, como no upload normal)
  const { data: documento, error: insertError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      categoria: "circular",
      ano,
      ficheiro_path: "pending",
      ficheiro_tamanho: pdf.length,
      ficheiro_tipo: "application/pdf",
      upload_por: ctx.user.id,
      blueprint_id: bp.id,
    })
    .select()
    .single();

  if (insertError || !documento) {
    console.error("Erro insert documento (blueprint):", insertError);
    return { error: "Erro ao registar o documento." };
  }

  // 2. Upload do PDF para o bucket privado dos documentos
  const path = `${ctx.tenant.id}/${documento.id}/${nomeFicheiro(bp.nome, ano)}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("Erro upload PDF (blueprint):", uploadError);
    await supabase.from("documentos").delete().eq("id", documento.id);
    return { error: "Erro ao guardar o PDF." };
  }

  // 3. Finaliza o path
  const { error: updateError } = await supabase
    .from("documentos")
    .update({ ficheiro_path: path })
    .eq("id", documento.id);

  if (updateError) {
    console.error("Erro update path (blueprint):", updateError);
    return { error: "Erro ao finalizar o documento." };
  }

  revalidatePath("/documentos");
  revalidatePath("/configuracao/documentos");
  revalidatePath(`/blueprints/${bp.id}`);

  return { documentoId: documento.id };
}

export type TemplateFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"nome" | "tipo" | "conteudo", string>>;
};

const TIPOS_VALIDOS = TIPOS_BLUEPRINT.map((t) => t.valor);

/** Guarda o HTML de um template existente (editor Tiptap). */
export async function guardarTemplate(
  id: string,
  _prev: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const conteudo = String(formData.get("conteudo") ?? "");
  if (htmlVazio(conteudo)) {
    return { fieldErrors: { conteudo: "O template não pode estar vazio." } };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprints")
    .update({
      conteudo_template: sanitizarHtml(conteudo),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro guardar template:", error);
    return { error: "Erro ao guardar o template." };
  }

  revalidatePath(`/blueprints/${id}`);
  redirect(`/blueprints/${id}`);
}

/** Cria um novo blueprint a partir do zero. */
export async function criarBlueprint(
  _prev: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const conteudo = String(formData.get("conteudo") ?? "");

  const fieldErrors: TemplateFormState["fieldErrors"] = {};
  if (!nome) fieldErrors.nome = "O nome é obrigatório.";
  else if (nome.length > 120) fieldErrors.nome = "Nome demasiado longo (máx. 120).";
  if (!TIPOS_VALIDOS.includes(tipo)) fieldErrors.tipo = "Tipo inválido.";
  if (htmlVazio(conteudo)) fieldErrors.conteudo = "O template não pode estar vazio.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      tenant_id: ctx.tenant.id,
      nome,
      tipo,
      conteudo_template: sanitizarHtml(conteudo),
      variaveis: [],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Erro criar blueprint:", error);
    return { error: "Erro ao criar o modelo." };
  }

  revalidatePath("/blueprints");
  redirect(`/blueprints/${data.id}`);
}
