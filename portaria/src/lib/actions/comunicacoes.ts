"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type {
  ComunicacaoCanal,
  ComunicacaoDestinatarioEstado,
  ComunicacaoEstado,
  ComunicacaoTipo,
} from "@/types/database";

const TIPOS: ComunicacaoTipo[] = [
  "circular", "convocatoria", "ata", "quotas", "obras_manutencao",
  "cobranca", "entrega_documental", "aviso", "geral", "outro",
];
const ESTADOS: ComunicacaoEstado[] = [
  "rascunho", "preparada", "em_envio", "concluida", "arquivada", "cancelada",
];
const CANAIS: ComunicacaoCanal[] = [
  "email", "correio_simples", "correio_registado", "entrega_em_mao", "portal", "outro",
];
const ESTADOS_DESTINATARIO: ComunicacaoDestinatarioEstado[] = [
  "pendente", "enviado", "entregue", "devolvido", "sem_contacto", "dispensado",
];
const PAPEIS = ["proprietario", "inquilino", "ambos", "representante", "outro"] as const;

type PapelDestinatario = (typeof PAPEIS)[number];

export type ComunicacaoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"assunto" | "data" | "fracoes" | "documento", string>>;
};

function texto(formData: FormData, campo: string, maximo: number) {
  return String(formData.get(campo) ?? "").trim().slice(0, maximo);
}

function dataValida(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
}

export async function criarComunicacao(
  _prev: ComunicacaoFormState,
  formData: FormData,
): Promise<ComunicacaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para criar comunicações." };

  const assunto = texto(formData, "assunto", 240);
  const descricao = texto(formData, "descricao", 8000) || null;
  const tipo = texto(formData, "tipo", 60) as ComunicacaoTipo;
  const estado = texto(formData, "estado", 60) as ComunicacaoEstado;
  const canal = texto(formData, "canal", 60) as ComunicacaoCanal;
  const papel = texto(formData, "papel_destinatario", 60) as PapelDestinatario;
  const dataComunicacao = texto(formData, "data_comunicacao", 10);
  const dataLimite = texto(formData, "data_limite", 10) || null;
  const documentoTipo = texto(formData, "documento_tipo", 40);
  const documentoId = texto(formData, "documento_id", 100) || null;
  const fracaoIds = [...new Set(formData.getAll("fracao_ids").map((valor) => String(valor)).filter(Boolean))];

  const fieldErrors: ComunicacaoFormState["fieldErrors"] = {};
  if (!assunto) fieldErrors.assunto = "O assunto é obrigatório.";
  if (!TIPOS.includes(tipo)) fieldErrors.assunto = "O tipo de comunicação é inválido.";
  if (!ESTADOS.includes(estado)) fieldErrors.assunto = "O estado da comunicação é inválido.";
  if (!CANAIS.includes(canal)) fieldErrors.assunto = "O canal de entrega é inválido.";
  if (!PAPEIS.includes(papel)) fieldErrors.assunto = "O destinatário indicado é inválido.";
  if (!dataValida(dataComunicacao)) fieldErrors.data = "Indique uma data de comunicação válida.";
  if (dataLimite && !dataValida(dataLimite)) fieldErrors.data = "Indique uma data-limite válida.";
  if (dataLimite && dataLimite < dataComunicacao) fieldErrors.data = "A data-limite não pode ser anterior à comunicação.";
  if (fracaoIds.length === 0) fieldErrors.fracoes = "Selecione pelo menos uma fração.";
  if (documentoId && !["publicado", "confidencial"].includes(documentoTipo)) {
    fieldErrors.documento = "A origem do documento associado é inválida.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: fracoes, error: erroFracoes } = await supabase
    .from("fracoes")
    .select("id, codigo, proprietario_nome, proprietario_email, proprietario_telefone, inquilino_nome")
    .eq("tenant_id", ctx.tenant.id)
    .in("id", fracaoIds);
  if (erroFracoes || !fracoes || fracoes.length !== fracaoIds.length) {
    return { error: "Uma ou mais frações selecionadas não pertencem ao condomínio." };
  }

  if (documentoId) {
    const tabela = documentoTipo === "confidencial" ? "documentos_administracao" : "documentos";
    const { data: documento } = await supabase
      .from(tabela)
      .select("id")
      .eq("id", documentoId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();
    if (!documento) return { fieldErrors: { documento: "O documento selecionado não está disponível neste condomínio." } };
  }

  const { data: comunicacao, error: erroComunicacao } = await supabase
    .from("comunicacoes")
    .insert({
      tenant_id: ctx.tenant.id,
      tipo,
      assunto,
      descricao,
      estado,
      data_comunicacao: dataComunicacao,
      data_limite: dataLimite,
      criado_por: ctx.user.id,
    })
    .select("id")
    .single();
  if (erroComunicacao || !comunicacao) return { error: "Não foi possível criar a comunicação." };

  const destinatarios = fracoes.map((fracao) => {
    const nome = papel === "inquilino" ? fracao.inquilino_nome : fracao.proprietario_nome;
    return {
      tenant_id: ctx.tenant.id,
      comunicacao_id: comunicacao.id,
      fracao_id: fracao.id,
      papel_destinatario: papel,
      destinatario_nome: nome ?? (papel === "ambos" ? `${fracao.proprietario_nome ?? ""}${fracao.inquilino_nome ? ` / ${fracao.inquilino_nome}` : ""}`.trim() || null : null),
      destinatario_email: fracao.proprietario_email,
      destinatario_telefone: fracao.proprietario_telefone,
      canal,
    };
  });
  const { error: erroDestinatarios } = await supabase.from("comunicacao_destinatarios").insert(destinatarios);
  if (erroDestinatarios) {
    await supabase.from("comunicacoes").delete().eq("id", comunicacao.id).eq("tenant_id", ctx.tenant.id);
    return { error: "Não foi possível preparar os destinatários; a comunicação não foi guardada." };
  }

  if (documentoId) {
    const { error: erroDocumento } = await supabase.from("comunicacao_documentos").insert({
      tenant_id: ctx.tenant.id,
      comunicacao_id: comunicacao.id,
      documento_id: documentoTipo === "publicado" ? documentoId : null,
      documento_administracao_id: documentoTipo === "confidencial" ? documentoId : null,
    });
    if (erroDocumento) return { error: "A comunicação foi criada, mas o documento não pôde ser associado." };
  }

  revalidatePath("/comunicacoes");
  for (const fracaoId of fracaoIds) revalidatePath(`/fracoes/${fracaoId}`);
  redirect(`/comunicacoes/${comunicacao.id}`);
}

export async function atualizarEstadoDestinatario(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const id = texto(formData, "destinatario_id", 100);
  const comunicacaoId = texto(formData, "comunicacao_id", 100);
  const estado = texto(formData, "estado", 60) as ComunicacaoDestinatarioEstado;
  const referenciaEnvio = texto(formData, "referencia_envio", 240) || null;
  const observacoes = texto(formData, "observacoes", 2000) || null;
  if (!id || !comunicacaoId || !ESTADOS_DESTINATARIO.includes(estado)) throw new Error("Atualização inválida.");

  const agora = new Date().toISOString();
  const atualizacao: Record<string, string | null> = { estado, referencia_envio: referenciaEnvio, observacoes };
  if (estado === "enviado") atualizacao.enviado_em = agora;
  if (estado === "entregue") {
    atualizacao.enviado_em = agora;
    atualizacao.entregue_em = agora;
  }

  const supabase = await createClient();
  const { data: destinatario, error } = await supabase
    .from("comunicacao_destinatarios")
    .update(atualizacao)
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .eq("comunicacao_id", comunicacaoId)
    .select("fracao_id")
    .maybeSingle();
  if (error || !destinatario) throw new Error("Não foi possível atualizar a entrega.");

  revalidatePath("/comunicacoes");
  revalidatePath(`/comunicacoes/${comunicacaoId}`);
  revalidatePath(`/fracoes/${destinatario.fracao_id}`);
}

export async function atualizarEstadoComunicacao(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões.");

  const id = texto(formData, "comunicacao_id", 100);
  const estado = texto(formData, "estado", 60) as ComunicacaoEstado;
  if (!id || !ESTADOS.includes(estado)) throw new Error("Atualização inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("comunicacoes")
    .update({ estado })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Não foi possível atualizar o estado da comunicação.");

  revalidatePath("/comunicacoes");
  revalidatePath(`/comunicacoes/${id}`);
}

export async function associarDocumentoComunicacao(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const comunicacaoId = texto(formData, "comunicacao_id", 100);
  const documentoId = texto(formData, "documento_id", 100);
  const documentoTipo = texto(formData, "documento_tipo", 40);
  const nota = texto(formData, "nota", 1000) || null;
  if (!comunicacaoId || !documentoId || !["publicado", "confidencial"].includes(documentoTipo)) {
    return { error: "Selecione um documento válido." };
  }

  const supabase = await createClient();
  const { data: comunicacao } = await supabase.from("comunicacoes").select("id")
    .eq("id", comunicacaoId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (!comunicacao) return { error: "Comunicação não encontrada." };

  const tabela = documentoTipo === "confidencial" ? "documentos_administracao" : "documentos";
  const { data: documento } = await supabase.from(tabela).select("id")
    .eq("id", documentoId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (!documento) return { error: "Documento não disponível." };

  const { error } = await supabase.from("comunicacao_documentos").insert({
    tenant_id: ctx.tenant.id,
    comunicacao_id: comunicacaoId,
    documento_id: documentoTipo === "publicado" ? documentoId : null,
    documento_administracao_id: documentoTipo === "confidencial" ? documentoId : null,
    nota,
  });
  if (error) return { error: "Não foi possível associar o documento. Verifique se já está ligado." };

  revalidatePath(`/comunicacoes/${comunicacaoId}`);
  return {};
}
