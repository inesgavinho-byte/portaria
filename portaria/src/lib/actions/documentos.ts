"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Documento } from "@/types/database";

const CATEGORIAS_VALIDAS: Documento["categoria"][] = [
  "ata", "conta", "contrato", "regulamento", "manual", "apolice", "outro",
];

const TAMANHO_MAXIMO_MB = 25;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;

export type DocumentoFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"titulo" | "categoria" | "ficheiro" | "ano", string>
  >;
};

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
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
    return { error: "Sem permissões para esta operação." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const anoStr = String(formData.get("ano") ?? "").trim();
  const file = formData.get("ficheiro") as File | null;

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

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

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
      ficheiro_tamanho: file!.size,
      ficheiro_tipo: file!.type,
      upload_por: ctx.user.id,
    })
    .select()
    .single();

  if (insertError || !documento) {
    console.error("Erro insert documento:", insertError);
    return { error: "Erro ao criar registo." };
  }

  // 2. Sanitiza nome do ficheiro (remove acentos, espaços, etc.)
  const nomeOriginal = file!.name;
  const extensao = nomeOriginal.split(".").pop()?.toLowerCase() ?? "bin";
  const nomeSeguro = `${Date.now()}.${extensao}`;
  const path = `${ctx.tenant.id}/${documento.id}/${nomeSeguro}`;

  // 3. Upload para Storage
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file!, {
      contentType: file!.type,
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

  revalidatePath("/documentos");
  revalidatePath("/configuracao/documentos");
  redirect("/configuracao/documentos");
}

/**
 * Apaga um documento (DB row + ficheiro Storage).
 */
export async function apagarDocumento(id: string) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx || ctx.membership.role !== "admin") {
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
    .select("ficheiro_path, titulo")
    .eq("id", documentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (fetchError || !doc) return { error: "Documento não encontrado." };
  if (doc.ficheiro_path === "pending") return { error: "Upload incompleto." };

  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.ficheiro_path, 60, { download: doc.titulo });

  if (error || !data) return { error: "Erro ao gerar link." };

  return { url: data.signedUrl };
}
