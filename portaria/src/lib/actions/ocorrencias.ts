"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant, requireAdmin } from "@/lib/supabase/tenant";
import {
  CATEGORIAS,
  ESTADOS,
  FOTOS_MAX,
  FOTOS_TOTAL_MAX,
  FOTO_MAX_MB,
  FOTO_TIPOS_VALIDOS,
} from "@/lib/ocorrencias";
import type { Ocorrencia } from "@/types/database";

export type OcorrenciaFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"titulo" | "descricao" | "categoria" | "fotografias", string>
  >;
};

const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validarFotografias(files: File[]): string | null {
  if (files.length > FOTOS_MAX) {
    return `Máximo ${FOTOS_MAX} fotografias por envio.`;
  }
  for (const file of files) {
    if (!FOTO_TIPOS_VALIDOS.includes(file.type)) {
      return "Apenas imagens JPEG, PNG ou WebP.";
    }
    if (file.size > FOTO_MAX_MB * 1024 * 1024) {
      return `Cada fotografia tem o máximo de ${FOTO_MAX_MB} MB.`;
    }
  }
  return null;
}

/**
 * Carrega fotografias para o Storage, regista-as na tabela e adiciona
 * o evento de timeline. Devolve mensagem de erro ou null em sucesso.
 */
async function guardarFotografias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  files: File[],
  tenantId: string,
  ocorrenciaId: string,
  userId: string
): Promise<string | null> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const extensao = EXTENSAO_POR_TIPO[file.type] ?? "jpg";
    const path = `${tenantId}/${ocorrenciaId}/${Date.now()}-${i}.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from("ocorrencias")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Erro upload fotografia:", uploadError);
      return "Erro ao carregar fotografia.";
    }

    const { error: insertError } = await supabase
      .from("ocorrencia_fotografias")
      .insert({
        tenant_id: tenantId,
        ocorrencia_id: ocorrenciaId,
        ficheiro_path: path,
        criado_por: userId,
      });

    if (insertError) {
      console.error("Erro registo fotografia:", insertError);
      await supabase.storage.from("ocorrencias").remove([path]);
      return "Erro ao registar fotografia.";
    }
  }

  const { error: eventoError } = await supabase
    .from("ocorrencia_eventos")
    .insert({
      tenant_id: tenantId,
      ocorrencia_id: ocorrenciaId,
      tipo: "fotografia",
      autor: userId,
    });

  if (eventoError) {
    console.error("Erro evento fotografia:", eventoError);
  }

  return null;
}

function revalidarOcorrencia(id: string) {
  revalidatePath("/ocorrencias");
  revalidatePath(`/ocorrencias/${id}`);
  revalidatePath("/configuracao/ocorrencias");
  revalidatePath(`/configuracao/ocorrencias/${id}`);
}

/**
 * Cria uma ocorrência (qualquer membro do tenant).
 * A fração associada, quando pedida, é sempre a do membership do autor —
 * nunca vem do input do utilizador.
 */
export async function criarOcorrencia(
  _prev: OcorrenciaFormState,
  formData: FormData
): Promise<OcorrenciaFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) {
    return { error: "Sessão inválida. Inicie sessão novamente." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "");
  const associarFracao = formData.get("associar_fracao") === "on";
  const files = formData
    .getAll("fotografias")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const fieldErrors: OcorrenciaFormState["fieldErrors"] = {};
  if (!titulo) fieldErrors.titulo = "O título é obrigatório.";
  if (titulo.length > 200) fieldErrors.titulo = "Título demasiado longo (máx. 200).";
  if (!descricao) fieldErrors.descricao = "A descrição é obrigatória.";
  if (descricao.length > 5000) {
    fieldErrors.descricao = "Descrição demasiado longa (máx. 5000).";
  }
  if (!CATEGORIAS.includes(categoria as Ocorrencia["categoria"])) {
    fieldErrors.categoria = "Categoria inválida.";
  }
  const erroFotos = validarFotografias(files);
  if (erroFotos) fieldErrors.fotografias = erroFotos;

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: ocorrencia, error: insertError } = await supabase
    .from("ocorrencias")
    .insert({
      tenant_id: ctx.tenant.id,
      titulo,
      descricao,
      categoria: categoria as Ocorrencia["categoria"],
      fracao: associarFracao ? ctx.membership.fracao : null,
      fracao_id: associarFracao ? ctx.membership.fracao_id : null,
      criado_por: ctx.user.id,
    })
    .select()
    .single();

  if (insertError || !ocorrencia) {
    console.error("Erro insert ocorrência:", insertError);
    return { error: "Erro ao criar a ocorrência. Tente novamente." };
  }

  const { error: eventoError } = await supabase
    .from("ocorrencia_eventos")
    .insert({
      tenant_id: ctx.tenant.id,
      ocorrencia_id: ocorrencia.id,
      tipo: "criada",
      autor: ctx.user.id,
    });

  if (eventoError) {
    console.error("Erro evento criada:", eventoError);
  }

  if (files.length > 0) {
    const erroUpload = await guardarFotografias(
      supabase,
      files,
      ctx.tenant.id,
      ocorrencia.id,
      ctx.user.id
    );
    if (erroUpload) {
      // A ocorrência ficou criada; o utilizador pode juntar fotos no detalhe
      revalidarOcorrencia(ocorrencia.id);
      redirect(`/ocorrencias/${ocorrencia.id}?fotos=erro`);
    }
  }

  revalidarOcorrencia(ocorrencia.id);
  redirect(`/ocorrencias/${ocorrencia.id}`);
}

/**
 * Adiciona fotografias a uma ocorrência existente
 * (criador da ocorrência ou admin do tenant).
 */
export async function adicionarFotografias(
  ocorrenciaId: string,
  _prev: OcorrenciaFormState,
  formData: FormData
): Promise<OcorrenciaFormState> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) {
    return { error: "Sessão inválida. Inicie sessão novamente." };
  }

  const supabase = await createClient();
  // RLS limita a leitura às ocorrências próprias ou, para admins, ao tenant
  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("id, criado_por")
    .eq("id", ocorrenciaId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  const isAdmin = ctx.membership.role === "admin";
  if (!ocorrencia || (!isAdmin && ocorrencia.criado_por !== ctx.user.id)) {
    return { error: "Ocorrência não encontrada." };
  }

  const files = formData
    .getAll("fotografias")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { fieldErrors: { fotografias: "Selecione pelo menos uma fotografia." } };
  }
  const erroFotos = validarFotografias(files);
  if (erroFotos) {
    return { fieldErrors: { fotografias: erroFotos } };
  }

  // Teto acumulado por ocorrência (o limite por envio não chega:
  // envios repetidos permitiriam crescimento sem limite)
  const { count } = await supabase
    .from("ocorrencia_fotografias")
    .select("id", { count: "exact", head: true })
    .eq("ocorrencia_id", ocorrenciaId);

  if ((count ?? 0) + files.length > FOTOS_TOTAL_MAX) {
    return {
      fieldErrors: {
        fotografias: `Limite de ${FOTOS_TOTAL_MAX} fotografias por ocorrência.`,
      },
    };
  }

  const erroUpload = await guardarFotografias(
    supabase,
    files,
    ctx.tenant.id,
    ocorrenciaId,
    ctx.user.id
  );
  if (erroUpload) return { error: erroUpload };

  revalidarOcorrencia(ocorrenciaId);
  return {};
}

/**
 * Altera o estado de uma ocorrência (apenas admin) e regista na timeline.
 */
export async function alterarEstadoOcorrencia(
  ocorrenciaId: string,
  _prev: OcorrenciaFormState,
  formData: FormData
): Promise<OcorrenciaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  const estado = String(formData.get("estado") ?? "");
  if (!ESTADOS.includes(estado as Ocorrencia["estado"])) {
    return { error: "Estado inválido." };
  }

  const supabase = await createClient();
  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("estado")
    .eq("id", ocorrenciaId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!ocorrencia) return { error: "Ocorrência não encontrada." };
  if (ocorrencia.estado === estado) return {};

  const { error: updateError } = await supabase
    .from("ocorrencias")
    .update({ estado, atualizado_em: new Date().toISOString() })
    .eq("id", ocorrenciaId)
    .eq("tenant_id", ctx.tenant.id);

  if (updateError) {
    console.error("Erro update estado:", updateError);
    return { error: "Erro ao alterar o estado." };
  }

  const { error: eventoError } = await supabase
    .from("ocorrencia_eventos")
    .insert({
      tenant_id: ctx.tenant.id,
      ocorrencia_id: ocorrenciaId,
      tipo: "estado",
      estado_anterior: ocorrencia.estado,
      estado_novo: estado,
      autor: ctx.user.id,
    });

  if (eventoError) {
    console.error("Erro evento estado:", eventoError);
  }

  revalidarOcorrencia(ocorrenciaId);
  return {};
}

/**
 * Adiciona uma nota interna (apenas admin; invisível para condóminos via RLS).
 */
export async function adicionarNotaInterna(
  ocorrenciaId: string,
  _prev: OcorrenciaFormState,
  formData: FormData
): Promise<OcorrenciaFormState> {
  const ctx = await requireAdmin();
  if (!ctx) {
    return { error: "Sem permissões para esta operação." };
  }

  const nota = String(formData.get("nota") ?? "").trim();
  if (!nota) return { error: "A nota não pode estar vazia." };
  if (nota.length > 2000) return { error: "Nota demasiado longa (máx. 2000)." };

  const supabase = await createClient();
  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("id")
    .eq("id", ocorrenciaId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!ocorrencia) return { error: "Ocorrência não encontrada." };

  const { error } = await supabase.from("ocorrencia_eventos").insert({
    tenant_id: ctx.tenant.id,
    ocorrencia_id: ocorrenciaId,
    tipo: "nota",
    nota,
    autor: ctx.user.id,
  });

  if (error) {
    console.error("Erro nota interna:", error);
    return { error: "Erro ao guardar a nota." };
  }

  revalidatePath(`/configuracao/ocorrencias/${ocorrenciaId}`);
  return {};
}
