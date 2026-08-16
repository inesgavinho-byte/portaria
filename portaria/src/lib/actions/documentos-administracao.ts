"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { DOCUMENTO_TIPOS_VALIDOS } from "@/lib/documentos";
import type { Documento } from "@/types/database";

const CATEGORIAS_VALIDAS: Documento["categoria"][] = [
  "ata", "conta", "contrato", "regulamento", "manual", "apolice", "circular", "outro",
];
const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024;

export type DocumentoAdministracaoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"titulo" | "categoria" | "ficheiro" | "ano", string>>;
};

/**
 * Cria um documento confidencial. O bucket e a tabela são independentes da
 * biblioteca partilhada e as políticas RLS permitem acesso apenas a admins.
 */
export async function criarDocumentoAdministracao(
  _prev: DocumentoAdministracaoFormState,
  formData: FormData
): Promise<DocumentoAdministracaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "");
  const anoStr = String(formData.get("ano") ?? "").trim();
  const file = formData.get("ficheiro") as File | null;

  const fieldErrors: DocumentoAdministracaoFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo.";
  if (!CATEGORIAS_VALIDAS.includes(categoria as Documento["categoria"])) {
    fieldErrors.categoria = "Categoria inválida.";
  }
  if (!file || file.size === 0) {
    fieldErrors.ficheiro = "Selecione um ficheiro.";
  } else if (file.size > TAMANHO_MAXIMO_BYTES) {
    fieldErrors.ficheiro = "Ficheiro demasiado grande (máx. 25 MB).";
  } else if (!DOCUMENTO_TIPOS_VALIDOS[file.type]) {
    fieldErrors.ficheiro = "Tipo não suportado. Use PDF, Word, Excel ou imagem.";
  }

  let ano: number | null = null;
  if (anoStr) {
    const parsed = Number.parseInt(anoStr, 10);
    if (Number.isNaN(parsed) || parsed < 1900 || parsed > 2100) {
      fieldErrors.ano = "Ano inválido.";
    } else {
      ano = parsed;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !file) return { fieldErrors };

  const supabase = await createClient();
  const { data: documento, error: insertError } = await supabase
    .from("documentos_administracao")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      descricao,
      categoria: categoria as Documento["categoria"],
      ano,
      ficheiro_path: "pending",
      ficheiro_tamanho: file.size,
      ficheiro_tipo: file.type,
      upload_por: ctx.user.id,
    })
    .select("id")
    .single();

  if (insertError || !documento) return { error: "Erro ao criar o registo confidencial." };

  const extensao = DOCUMENTO_TIPOS_VALIDOS[file.type];
  const path = `${ctx.tenant.id}/${documento.id}/${Date.now()}.${extensao}`;
  const { error: uploadError } = await supabase.storage
    .from("documentos-admin")
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (uploadError) {
    await supabase.from("documentos_administracao").delete().eq("id", documento.id);
    return { error: "Erro ao carregar o ficheiro confidencial." };
  }

  const { error: updateError } = await supabase
    .from("documentos_administracao")
    .update({ ficheiro_path: path })
    .eq("id", documento.id)
    .eq("tenant_id", ctx.tenant.id);

  if (updateError) return { error: "Erro ao finalizar o carregamento." };

  revalidatePath("/configuracao/documentos-administracao");
  redirect("/configuracao/documentos-administracao");
}

export async function gerarLinkDownloadDocumentoAdministracao(documentoId: string): Promise<{
  url?: string;
  error?: string;
}> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const supabase = await createClient();
  const { data: doc, error: fetchError } = await supabase
    .from("documentos_administracao")
    .select("ficheiro_path, ficheiro_tipo, titulo")
    .eq("id", documentoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (fetchError || !doc || doc.ficheiro_path === "pending") {
    return { error: "Documento confidencial não encontrado." };
  }

  const ext = doc.ficheiro_tipo ? DOCUMENTO_TIPOS_VALIDOS[doc.ficheiro_tipo] : undefined;
  const nomeDownload = ext && !doc.titulo.toLowerCase().endsWith(`.${ext}`)
    ? `${doc.titulo}.${ext}`
    : doc.titulo;
  const { data, error } = await supabase.storage
    .from("documentos-admin")
    .createSignedUrl(doc.ficheiro_path, 60, { download: nomeDownload });

  if (error || !data) return { error: "Erro ao gerar link de descarga." };
  return { url: data.signedUrl };
}
