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

/**
 * Move um ficheiro previamente carregado para a pasta de importação do tenant
 * para o bucket confidencial e cria o respetivo registo administrativo.
 */
export async function migrarFicheiroHistoricoParaAdministracao(input: {
  ficheiroPath: string;
  titulo: string;
  descricao?: string;
  categoria: Documento["categoria"];
  ano?: number;
}): Promise<{ error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const prefixoPermitido = `${ctx.tenant.id}/historico_2026/`;
  if (!input.ficheiroPath.startsWith(prefixoPermitido)) {
    return { error: "O ficheiro não pertence à pasta de importação deste condomínio." };
  }
  if (!CATEGORIAS_VALIDAS.includes(input.categoria)) {
    return { error: "Categoria inválida." };
  }

  const supabase = await createClient();
  const { data: origem, error: origemError } = await supabase.storage
    .from("documentos")
    .list(`${ctx.tenant.id}/historico_2026`, { search: input.ficheiroPath.split("/").pop() });
  const objeto = origem?.find((item) => `${ctx.tenant.id}/historico_2026/${item.name}` === input.ficheiroPath);
  if (origemError || !objeto) return { error: "Ficheiro de origem não encontrado." };

  const { data: documento, error: insertError } = await supabase
    .from("documentos_administracao")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo: input.titulo.trim(),
      descricao: input.descricao?.trim() || null,
      categoria: input.categoria,
      ano: input.ano ?? null,
      ficheiro_path: "pending",
      ficheiro_tamanho: Number(objeto.metadata?.size ?? 0) || null,
      ficheiro_tipo: objeto.metadata?.mimetype ?? null,
      origem_partilhada_path: input.ficheiroPath,
      upload_por: ctx.user.id,
    })
    .select("id")
    .single();
  if (insertError || !documento) return { error: "Erro ao criar o registo confidencial." };

  const extensao = input.ficheiroPath.includes(".")
    ? input.ficheiroPath.slice(input.ficheiroPath.lastIndexOf(".")).toLowerCase()
    : "";
  const destino = `${ctx.tenant.id}/${documento.id}/${Date.now()}${extensao}`;
  const { error: moveError } = await supabase.storage
    .from("documentos")
    .move(input.ficheiroPath, destino, { destinationBucket: "documentos-admin" });
  if (moveError) {
    await supabase.from("documentos_administracao").delete().eq("id", documento.id);
    return { error: "Erro ao mover o ficheiro para o arquivo confidencial." };
  }

  const { error: updateError } = await supabase
    .from("documentos_administracao")
    .update({ ficheiro_path: destino })
    .eq("id", documento.id)
    .eq("tenant_id", ctx.tenant.id);
  if (updateError) return { error: "O ficheiro foi movido, mas o registo não foi finalizado." };

  revalidatePath("/configuracao/documentos-administracao");
  return {};
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


export type DocumentoAdministracaoLoteItem = {
  nome: string;
  path: string;
  tamanho: number;
  tipo: string;
};

export type DocumentoAdministracaoLoteResultado = {
  error?: string;
  carregados?: number;
  falhas?: string[];
};

function tituloDeFicheiro(nome: string): string {
  const semExtensao = nome.replace(/\.[^.]+$/, "");
  return semExtensao
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function categoriaPorFicheiro(nome: string, categoriaBase: Documento["categoria"]): Documento["categoria"] {
  if (categoriaBase !== "outro") return categoriaBase;
  const normalizado = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalizado.includes("ata")) return "ata";
  if (normalizado.includes("regulamento")) return "regulamento";
  if (normalizado.includes("contrato")) return "contrato";
  if (normalizado.includes("apolice") || normalizado.includes("seguro")) return "apolice";
  if (normalizado.includes("conta") || normalizado.includes("balancete") || normalizado.includes("orcamento") || normalizado.includes("quota")) return "conta";
  return "outro";
}

/**
 * Finaliza os registos de um lote já enviado diretamente do navegador para o
 * bucket privado. Evita enviar ficheiros grandes pelo pedido da server action.
 */
export async function finalizarDocumentosAdministracaoEmLote(input: {
  categoria: Documento["categoria"];
  descricao?: string;
  ano?: number | null;
  ficheiros: DocumentoAdministracaoLoteItem[];
}): Promise<DocumentoAdministracaoLoteResultado> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  if (!CATEGORIAS_VALIDAS.includes(input.categoria)) return { error: "Categoria inválida." };
  if (!Array.isArray(input.ficheiros) || input.ficheiros.length === 0 || input.ficheiros.length > 30) {
    return { error: "O lote tem de conter entre 1 e 30 ficheiros." };
  }
  if (input.descricao && input.descricao.length > 500) return { error: "Nota comum demasiado longa." };
  if (input.ano !== null && input.ano !== undefined && (input.ano < 1900 || input.ano > 2100)) {
    return { error: "Ano inválido." };
  }

  const prefixoPermitido = `${ctx.tenant.id}/lotes/`;
  const pathsVistos = new Set<string>();
  const falhas: string[] = [];
  const documentos = [] as Array<{
    tenant_id: string;
    titulo: string;
    descricao: string | null;
    categoria: Documento["categoria"];
    ano: number | null;
    ficheiro_path: string;
    ficheiro_tamanho: number;
    ficheiro_tipo: string;
    upload_por: string;
  }>;

  for (const ficheiro of input.ficheiros) {
    const titulo = tituloDeFicheiro(ficheiro.nome);
    if (!titulo || !ficheiro.path.startsWith(prefixoPermitido) || pathsVistos.has(ficheiro.path)) {
      falhas.push(`${ficheiro.nome}: referência de carregamento inválida.`);
      continue;
    }
    if (!Number.isFinite(ficheiro.tamanho) || ficheiro.tamanho <= 0 || ficheiro.tamanho > TAMANHO_MAXIMO_BYTES) {
      falhas.push(`${ficheiro.nome}: tamanho inválido.`);
      continue;
    }
    if (!DOCUMENTO_TIPOS_VALIDOS[ficheiro.tipo]) {
      falhas.push(`${ficheiro.nome}: tipo de ficheiro não suportado.`);
      continue;
    }
    pathsVistos.add(ficheiro.path);
    documentos.push({
      tenant_id: ctx.tenant.id,
      titulo,
      descricao: input.descricao?.trim() || null,
      categoria: categoriaPorFicheiro(ficheiro.nome, input.categoria),
      ano: input.ano ?? null,
      ficheiro_path: ficheiro.path,
      ficheiro_tamanho: ficheiro.tamanho,
      ficheiro_tipo: ficheiro.tipo,
      upload_por: ctx.user.id,
    });
  }

  if (documentos.length === 0) return { error: "Não existem ficheiros válidos para finalizar.", falhas };

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("documentos_administracao").insert(documentos);
  if (insertError) return { error: "Os ficheiros foram enviados, mas os registos não puderam ser finalizados.", falhas };

  revalidatePath("/configuracao/documentos-administracao");
  revalidatePath("/configuracao/documentos-administracao/lote");
  return { carregados: documentos.length, falhas };
}
