"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant, requireAdmin } from "@/lib/supabase/tenant";
import { garantirFonte, sincronizarFonte } from "@/lib/fornecedores/fontes";
import { ingerirDocumento } from "@/lib/actions/ia-rag";
import { DOCUMENTO_TIPOS_VALIDOS } from "@/lib/documentos";
import type { Documento } from "@/types/database";

const CATEGORIAS_VALIDAS: Documento["categoria"][] = [
  "ata", "conta", "contrato", "regulamento", "manual", "apolice", "circular", "outro",
  // Categorias do dossiê documental. Um processo de empreitada vive de
  // comunicações, orçamentos e comprovativos — não de "outro".
  "comunicacao", "orcamento", "factura", "comprovativo", "ficha_tecnica",
  "parecer", "interpelacao",
];

const TAMANHO_MAXIMO_MB = 25;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;

export type DocumentoFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"titulo" | "categoria" | "ficheiro" | "ano" | "data_documento" | "n_mensagens" | "contraparte", string>
  >;
};

/**
 * Resumo criptográfico SHA-256 do ficheiro, em hexadecimal.
 *
 * Neste processo circularam três ficheiros distintos sob a mesma referência
 * 010125, divergentes em valor e cláusulas. Sem checksum, «o orçamento 010125»
 * é uma expressão ambígua; com ele, é um ficheiro exacto.
 */
async function checksumDe(ficheiro: File): Promise<string | null> {
  try {
    const bytes = await ficheiro.arrayBuffer();
    const digesto = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digesto))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/**
 * Faz upload de um documento.
 *
 * Convenção do path no Storage: documentos/{tenant_id}/{documento_id}/{filename}
 * As políticas RLS de Storage validam o tenant pela primeira pasta.
 */
export async function criarDocumento(
  _prev: DocumentoFormState,
  formData: FormData
): Promise<DocumentoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const anoStr = String(formData.get("ano") ?? "").trim();
  const file = formData.get("ficheiro") as File | null;
  // Associações opcionais (upload a partir do detalhe de fornecedor/contrato)
  const fornecedorId = String(formData.get("fornecedor_id") ?? "").trim() || null;
  const contratoId = String(formData.get("contrato_id") ?? "").trim() || null;
  // Metadados do documento em si, distintos dos do upload. A data de um email
  // não é a data em que foi arquivado, e é a primeira que importa ao dossiê.
  const dataDocumento = String(formData.get("data_documento") ?? "").trim() || null;
  const contraparte = String(formData.get("contraparte") ?? "").trim() || null;
  const nMensagensStr = String(formData.get("n_mensagens") ?? "").trim();
  const rawRedirect = String(formData.get("redirect_to") ?? "").trim();
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/configuracao/documentos";

  // Validações
  const fieldErrors: DocumentoFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo.";
  if (!CATEGORIAS_VALIDAS.includes(categoria as Documento["categoria"])) {
    fieldErrors.categoria = "Categoria inválida.";
  }
  if (!file || file.size === 0) {
    fieldErrors.ficheiro = "Selecione um ficheiro.";
  } else if (file.size > TAMANHO_MAXIMO_BYTES) {
    fieldErrors.ficheiro = `Ficheiro demasiado grande (máx. ${TAMANHO_MAXIMO_MB} MB).`;
  } else if (!DOCUMENTO_TIPOS_VALIDOS[file.type]) {
    fieldErrors.ficheiro = "Tipo não suportado. Use PDF, Word, Excel ou imagem.";
  }

  let ano: number | null = null;
  if (anoStr) {
    const parsed = parseInt(anoStr, 10);
    if (isNaN(parsed) || parsed < 1900 || parsed > 2100) {
      fieldErrors.ano = "Ano inválido.";
    } else {
      ano = parsed;
    }
  }

  let nMensagens: number | null = null;
  if (nMensagensStr) {
    const parsed = parseInt(nMensagensStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      fieldErrors.n_mensagens = "Número de mensagens inválido.";
    } else {
      nMensagens = parsed;
    }
  }

  if (dataDocumento && !/^\d{4}-\d{2}-\d{2}$/.test(dataDocumento)) {
    fieldErrors.data_documento = "Data inválida.";
  }

  const contraparteLimpa = contraparte?.trim() || null;
  if (contraparteLimpa && contraparteLimpa.length > 200) {
    fieldErrors.contraparte = "Contraparte demasiado longa.";
  }

  if (Object.keys(fieldErrors).length > 0 || !file) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const checksum = await checksumDe(file);

  // 1. Insere a linha primeiro para obter o ID (necessário para o path)
  const { data: documento, error: insertError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      descricao,
      categoria: categoria as Documento["categoria"],
      ano,
      ficheiro_path: "pending", // Atualizado a seguir
      ficheiro_tamanho: file.size,
      ficheiro_tipo: file.type,
      upload_por: ctx.user.id,
      fornecedor_id: fornecedorId,
      contrato_id: contratoId,
      data_documento: dataDocumento,
      contraparte: contraparteLimpa,
      n_mensagens: nMensagens,
      checksum,
    })
    .select()
    .single();

  if (insertError || !documento) {
    console.error("Erro insert documento:", insertError);
    return { error: "Erro ao criar registo." };
  }

  // 2. Nome seguro: timestamp + extensão derivada do MIME validado
  //    (nunca do nome original do ficheiro)
  const extensao = DOCUMENTO_TIPOS_VALIDOS[file.type];
  const nomeSeguro = `${Date.now()}.${extensao}`;
  const path = `${ctx.tenant.id}/${documento.id}/${nomeSeguro}`;

  // 3. Upload para Storage
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Erro upload Storage:", uploadError);
    // Cleanup: apaga o registo órfão
    await supabase.from("documentos").delete().eq("id", documento.id);
    return { error: "Erro ao carregar o ficheiro." };
  }

  // 4. Atualiza o path no registo
  const { error: updateError } = await supabase
    .from("documentos")
    .update({ ficheiro_path: path })
    .eq("id", documento.id);

  if (updateError) {
    console.error("Erro update path:", updateError);
    return { error: "Erro ao finalizar o upload." };
  }

  // 5. Ingestão ligada (Fase B — B1): um documento de fornecedor nasce com a
  // sua fonte na camada analítica — é o que torna o ficheiro citável a partir
  // do dossiê sem escrever SQL. Se falhar, o documento continua válido e a
  // ponte cria-se sob demanda, na primeira citação (garantirFonte).
  if (fornecedorId) {
    const { error: erroFonte } = await garantirFonte(supabase, ctx.tenant.id, ctx.user.id, documento.id);
    if (erroFonte) {
      console.error("Erro ao criar fonte documental do upload:", erroFonte);
    }
  }

  // 6. Ingestão na base de conhecimento do assistente (C1 — Fase C): PDFs
  //    têm o texto extraído localmente e indexado. Nunca bloqueia o upload —
  //    se a ingestão falhar (embeddings em baixo, PDF ilegível), o documento
  //    fica válido e pode ser reindexado mais tarde em /ia/configuracao.
  try {
    const ingestao = await ingerirDocumento(documento.id);
    if (ingestao.error) {
      console.error("Ingestão IA do novo documento:", ingestao.error);
    }
  } catch (err) {
    console.error("Ingestão IA do novo documento (excepção):", err);
  }

  revalidatePath("/documentos");
  revalidatePath("/configuracao/documentos");
  if (fornecedorId) revalidatePath(`/fornecedores/${fornecedorId}`);
  if (contratoId) revalidatePath(`/contratos/${contratoId}`);
  redirect(redirectTo);
}

/**
 * Atualiza um documento existente (metadados; ficheiro não é substituível).
 *
 * Aceita também os metadados do documento em si — data, contraparte, número de
 * mensagens — e, quando existe, traz a fonte da camada analítica ao dia: a
 * fonte é a leitura do documento, não pode ficar velha quando o documento é
 * corrigido (B1 do goal, correcção sem SQL).
 */
export async function atualizarDocumento(
  id: string,
  _prev: DocumentoFormState,
  formData: FormData
): Promise<DocumentoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const anoStr = String(formData.get("ano") ?? "").trim();
  const dataDocumento = String(formData.get("data_documento") ?? "").trim() || null;
  const contraparte = String(formData.get("contraparte") ?? "").trim() || null;
  const nMensagensStr = String(formData.get("n_mensagens") ?? "").trim();

  // Validações
  const fieldErrors: DocumentoFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo.";
  if (!CATEGORIAS_VALIDAS.includes(categoria as Documento["categoria"])) {
    fieldErrors.categoria = "Categoria inválida.";
  }

  let ano: number | null = null;
  if (anoStr) {
    const parsed = parseInt(anoStr, 10);
    if (isNaN(parsed) || parsed < 1900 || parsed > 2100) {
      fieldErrors.ano = "Ano inválido.";
    } else {
      ano = parsed;
    }
  }

  let nMensagens: number | null = null;
  if (nMensagensStr) {
    const parsed = parseInt(nMensagensStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      fieldErrors.n_mensagens = "Número de mensagens inválido.";
    } else {
      nMensagens = parsed;
    }
  }

  if (dataDocumento && !/^\d{4}-\d{2}-\d{2}$/.test(dataDocumento)) {
    fieldErrors.data_documento = "Data inválida.";
  }
  if (contraparte && contraparte.length > 200) {
    fieldErrors.contraparte = "Contraparte demasiado longa.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  const { data: documento, error: erroLeitura } = await supabase
    .from("documentos")
    .select("id,fornecedor_id,contrato_id")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (erroLeitura || !documento) {
    return { error: "Documento não encontrado." };
  }

  const { error } = await supabase
    .from("documentos")
    .update({
      titulo,
      descricao,
      categoria: categoria as Documento["categoria"],
      ano,
      data_documento: dataDocumento,
      contraparte,
      n_mensagens: nMensagens,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) {
    console.error("Erro update documento:", error);
    return { error: "Erro ao atualizar o documento." };
  }

  // A fonte existente acompanha a correcção; se ainda não existe, nada a fazer
  // — a ponte cria-se sob demanda, com os dados já corrigidos.
  await sincronizarFonte(supabase, ctx.tenant.id, documento.id, {
    titulo,
    data_documento: dataDocumento,
    contraparte,
    n_mensagens: nMensagens,
  });

  revalidatePath("/documentos");
  revalidatePath("/configuracao/documentos");
  if (documento.fornecedor_id) revalidatePath(`/fornecedores/${documento.fornecedor_id}`);
  if (documento.contrato_id) revalidatePath(`/contratos/${documento.contrato_id}`);
  redirect("/configuracao/documentos");
}

/**
 * Apaga um documento (DB row + ficheiro Storage).
 */
export async function apagarDocumento(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) {
    throw new Error("Sem permissões");
  }

  const supabase = await createClient();

  // 1. Buscar para saber o path
  const { data: doc } = await supabase
    .from("documentos")
    .select("ficheiro_path")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!doc) throw new Error("Documento não encontrado.");

  // 2. Apaga ficheiro do Storage
  if (doc.ficheiro_path && doc.ficheiro_path !== "pending") {
    await supabase.storage.from("documentos").remove([doc.ficheiro_path]);
  }

  // 3. Apaga registo
  const { error } = await supabase
    .from("documentos")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) throw new Error("Erro ao apagar.");

  revalidatePath("/documentos");
  revalidatePath("/configuracao/documentos");
}

/**
 * Gera URL assinado para download de documento.
 *
 * URLs assinados expiram em 60s — suficiente para o browser iniciar o download.
 * Esta abordagem é segura: não expõe URL público permanente.
 */
export async function gerarLinkDownload(documentoId: string): Promise<{
  url?: string;
  error?: string;
}> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();
  const { data: doc, error: fetchError } = await supabase
    .from("documentos")
    .select("ficheiro_path, titulo, ficheiro_tipo")
    .eq("id", documentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (fetchError || !doc) return { error: "Documento não encontrado." };
  if (doc.ficheiro_path === "pending") return { error: "Upload incompleto." };

  // Nome de download com extensão derivada do MIME (ex.: "Circular … 2026.pdf").
  const ext = doc.ficheiro_tipo
    ? DOCUMENTO_TIPOS_VALIDOS[doc.ficheiro_tipo]
    : undefined;
  const nomeDownload =
    ext && !doc.titulo.toLowerCase().endsWith(`.${ext}`)
      ? `${doc.titulo}.${ext}`
      : doc.titulo;

  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.ficheiro_path, 60, { download: nomeDownload });

  if (error || !data) return { error: "Erro ao gerar link." };

  return { url: data.signedUrl };
}
