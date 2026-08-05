"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant, requireAdmin } from "@/lib/supabase/tenant";
import type { EspacoComum, Reserva } from "@/types/database";

// ---------------------------------------------------------------------------
// ESPAÇOS COMUNS
// ---------------------------------------------------------------------------

export async function listarEspacos(): Promise<EspacoComum[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("espacos_comuns")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("ativo", true)
    .order("nome");

  return (data ?? []) as EspacoComum[];
}

export async function detalheEspaco(espacoId: string): Promise<EspacoComum | null> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("espacos_comuns")
    .select("*")
    .eq("id", espacoId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return (data as EspacoComum) ?? null;
}

export async function criarEspaco(
  formData: FormData
): Promise<{ id?: string; error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const payload = {
    tenant_id: ctx.tenant.id,
    nome: formData.get("nome") as string,
    descricao: (formData.get("descricao") as string) || null,
    capacidade: parseInt(formData.get("capacidade") as string) || null,
    duracao_minima_minutos: parseInt(formData.get("duracao_minima") as string) || 60,
    duracao_maxima_minutos: parseInt(formData.get("duracao_maxima") as string) || 120,
    antecedencia_minima_horas: parseInt(formData.get("antecedencia") as string) || 24,
    reservas_por_semana: parseInt(formData.get("reservas_semana") as string) || 3,
    abertura_seg: (formData.get("abertura_seg") as string) || null,
    fecho_seg: (formData.get("fecho_seg") as string) || null,
    abertura_ter: (formData.get("abertura_ter") as string) || null,
    fecho_ter: (formData.get("fecho_ter") as string) || null,
    abertura_qua: (formData.get("abertura_qua") as string) || null,
    fecho_qua: (formData.get("fecho_qua") as string) || null,
    abertura_qui: (formData.get("abertura_qui") as string) || null,
    fecho_qui: (formData.get("fecho_qui") as string) || null,
    abertura_sex: (formData.get("abertura_sex") as string) || null,
    fecho_sex: (formData.get("fecho_sex") as string) || null,
    abertura_sab: (formData.get("abertura_sab") as string) || null,
    fecho_sab: (formData.get("fecho_sab") as string) || null,
    abertura_dom: (formData.get("abertura_dom") as string) || null,
    fecho_dom: (formData.get("fecho_dom") as string) || null,
  };

  const { data, error } = await supabase
    .from("espacos_comuns")
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/configuracao/reservas");
  return { id: data.id };
}

export async function atualizarEspaco(
  espacoId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };

  const supabase = await createClient();

  const payload = {
    nome: formData.get("nome") as string,
    descricao: (formData.get("descricao") as string) || null,
    capacidade: parseInt(formData.get("capacidade") as string) || null,
    duracao_minima_minutos: parseInt(formData.get("duracao_minima") as string) || 60,
    duracao_maxima_minutos: parseInt(formData.get("duracao_maxima") as string) || 120,
    antecedencia_minima_horas: parseInt(formData.get("antecedencia") as string) || 24,
    reservas_por_semana: parseInt(formData.get("reservas_semana") as string) || 3,
    abertura_seg: (formData.get("abertura_seg") as string) || null,
    fecho_seg: (formData.get("fecho_seg") as string) || null,
    abertura_ter: (formData.get("abertura_ter") as string) || null,
    fecho_ter: (formData.get("fecho_ter") as string) || null,
    abertura_qua: (formData.get("abertura_qua") as string) || null,
    fecho_qua: (formData.get("fecho_qua") as string) || null,
    abertura_qui: (formData.get("abertura_qui") as string) || null,
    fecho_qui: (formData.get("fecho_qui") as string) || null,
    abertura_sex: (formData.get("abertura_sex") as string) || null,
    fecho_sex: (formData.get("fecho_sex") as string) || null,
    abertura_sab: (formData.get("abertura_sab") as string) || null,
    fecho_sab: (formData.get("fecho_sab") as string) || null,
    abertura_dom: (formData.get("abertura_dom") as string) || null,
    fecho_dom: (formData.get("fecho_dom") as string) || null,
    ativo: formData.get("ativo") === "on",
  };

  const { error } = await supabase
    .from("espacos_comuns")
    .update(payload)
    .eq("id", espacoId)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/configuracao/reservas");
  return {};
}

export async function apagarEspaco(espacoId: string): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx) return;

  const supabase = await createClient();
  await supabase
    .from("espacos_comuns")
    .delete()
    .eq("id", espacoId)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/configuracao/reservas");
}

// ---------------------------------------------------------------------------
// RESERVAS
// ---------------------------------------------------------------------------

/**
 * S9 — dados de disponibilidade minimizados: só espaço/início/fim/estado,
 * SEM user_id/motivo/num_pessoas de terceiros. Usado para pintar os slots
 * ocupados. Obtido via a função disponibilidade_reservas (o RLS já não deixa
 * um membro ler as reservas dos outros diretamente).
 */
export type OcupacaoReserva = Pick<
  Reserva,
  "espaco_id" | "data_inicio" | "data_fim" | "estado"
>;

export async function listarReservas(
  espacoId?: string,
  dataInicio?: string,
  dataFim?: string
): Promise<OcupacaoReserva[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("disponibilidade_reservas", {
    p_espaco_id: espacoId ?? null,
    p_from: dataInicio ?? null,
    p_to: dataFim ?? null,
  });

  return (data ?? []) as OcupacaoReserva[];
}

/**
 * Versão administrativa com os dados completos (quem reservou, motivo, etc.).
 * Só para admins — a gestão operacional das reservas exige-o. O RLS
 * "admins manage reservas" garante o acesso; requireAdmin protege a action.
 */
export async function listarReservasAdmin(
  espacoId?: string,
  dataInicio?: string,
  dataFim?: string
): Promise<Reserva[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const supabase = await createClient();
  let query = supabase
    .from("reservas")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .in("estado", ["pendente", "confirmada"])
    .order("data_inicio", { ascending: true });

  if (espacoId) query = query.eq("espaco_id", espacoId);
  if (dataInicio) query = query.gte("data_inicio", dataInicio);
  if (dataFim) query = query.lte("data_fim", dataFim);

  const { data } = await query;
  return (data ?? []) as Reserva[];
}

export async function listarMinhasReservas(): Promise<Reserva[]> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id)
    .order("data_inicio", { ascending: true });

  return (data ?? []) as Reserva[];
}

export async function criarReserva(payload: {
  espaco_id: string;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
  num_pessoas?: number;
}): Promise<{ id?: string; error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .insert({
      tenant_id: ctx.tenant.id,
      user_id: ctx.user.id,
      fracao_id: ctx.membership.fracao_id,
      espaco_id: payload.espaco_id,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      motivo: payload.motivo || null,
      num_pessoas: payload.num_pessoas || null,
    })
    .select()
    .single();

  if (error) {
    // Traduzir mensagens de erro comuns do trigger
    const msg = error.message;
    if (msg.includes("Duração mínima")) return { error: msg };
    if (msg.includes("Duração máxima")) return { error: msg };
    if (msg.includes("Antecedência")) return { error: msg };
    if (msg.includes("Limite")) return { error: msg };
    if (msg.includes("Fechado")) return { error: msg };
    if (msg.includes("Fora do horário")) return { error: msg };
    if (msg.includes("overlap")) return { error: "Horário já reservado." };
    return { error: "Erro ao criar reserva." };
  }

  revalidatePath("/reservas");
  return { id: data.id };
}

export async function cancelarReserva(reservaId: string): Promise<{ error?: string }> {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return { error: "Não autenticado." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservaId)
    .eq("user_id", ctx.user.id)
    .eq("tenant_id", ctx.tenant.id);

  if (error) return { error: error.message };
  revalidatePath("/reservas");
  return {};
}
