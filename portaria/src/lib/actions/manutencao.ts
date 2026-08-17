"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { AtivoManutencao, CategoriaAtivoManutencao, PlanoManutencao, TarefaManutencao } from "@/types/database";

export type ManutencaoFormState = { error?: string; success?: boolean; id?: string };
export type OpcaoManutencao = { id: string; nome: string };

const CATEGORIAS_ATIVO: CategoriaAtivoManutencao[] = [
  "elevadores", "cobertura", "fachada", "bombas", "extintores", "portas", "eletricidade", "agua", "outro",
];
const PERIODICIDADES = ["mensal", "trimestral", "semestral", "anual", "pontual"] as const;

function texto(valor: FormDataEntryValue | null) {
  const resultado = String(valor ?? "").trim();
  return resultado || null;
}

function proximaData(data: string, periodicidade: PlanoManutencao["periodicidade"]) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const base = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const meses = { mensal: 1, trimestral: 3, semestral: 6, anual: 12, pontual: 0 }[periodicidade];
  base.setUTCMonth(base.getUTCMonth() + meses);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}

async function pertenceAoTenant(tabela: "fornecedores" | "contratos" | "ativos_manutencao" | "planos_manutencao", id: string | null, tenantId: string) {
  if (!id) return true;
  const supabase = await createClient();
  const { data } = await supabase.from(tabela).select("id").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  return Boolean(data);
}

export async function listarAtivosManutencao(): Promise<AtivoManutencao[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("ativos_manutencao")
    .select("*, fornecedores(nome), contratos(titulo)")
    .eq("tenant_id", ctx.tenant.id)
    .order("categoria")
    .order("nome");
  return (data ?? []) as unknown as AtivoManutencao[];
}

export async function listarPlanosManutencao(): Promise<PlanoManutencao[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("planos_manutencao")
    .select("*, ativos_manutencao(nome), fornecedores(nome), contratos(titulo)")
    .eq("tenant_id", ctx.tenant.id)
    .order("proxima_execucao");
  return (data ?? []) as unknown as PlanoManutencao[];
}

export async function listarTarefasManutencao(): Promise<TarefaManutencao[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tarefas_manutencao")
    .select("*, ativos_manutencao(nome), fornecedores(nome), planos_manutencao(titulo)")
    .eq("tenant_id", ctx.tenant.id)
    .order("data_planeada")
    .limit(100);
  return (data ?? []) as unknown as TarefaManutencao[];
}

export async function listarOpcoesManutencao(): Promise<{ fornecedores: OpcaoManutencao[]; contratos: OpcaoManutencao[] }> {
  const ctx = await requireAdmin();
  if (!ctx) return { fornecedores: [], contratos: [] };
  const supabase = await createClient();
  const [fornecedores, contratos] = await Promise.all([
    supabase.from("fornecedores").select("id, nome").eq("tenant_id", ctx.tenant.id).eq("ativo", true).order("nome"),
    supabase.from("contratos").select("id, titulo").eq("tenant_id", ctx.tenant.id).order("titulo"),
  ]);
  return {
    fornecedores: (fornecedores.data ?? []) as OpcaoManutencao[],
    contratos: (contratos.data ?? []).map((item) => ({ id: item.id, nome: item.titulo })),
  };
}

export async function criarAtivoManutencao(formData: FormData): Promise<ManutencaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "outro") as CategoriaAtivoManutencao;
  const fornecedorId = texto(formData.get("fornecedor_id"));
  const contratoId = texto(formData.get("contrato_id"));
  if (!nome) return { error: "O nome do ativo é obrigatório." };
  if (!CATEGORIAS_ATIVO.includes(categoria)) return { error: "Categoria de ativo inválida." };
  if (!(await pertenceAoTenant("fornecedores", fornecedorId, ctx.tenant.id)) || !(await pertenceAoTenant("contratos", contratoId, ctx.tenant.id))) {
    return { error: "Fornecedor ou contrato não pertence a este condomínio." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("ativos_manutencao").insert({
    tenant_id: ctx.tenant.id, nome, categoria, fornecedor_id: fornecedorId, contrato_id: contratoId,
    localizacao: texto(formData.get("localizacao")), codigo_interno: texto(formData.get("codigo_interno")),
    notas: texto(formData.get("notas")), criado_por: ctx.user.id,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Não foi possível criar o ativo." };
  revalidatePath("/configuracao/manutencao");
  return { success: true, id: data.id };
}

export async function criarPlanoManutencao(formData: FormData): Promise<ManutencaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  const ativoId = String(formData.get("ativo_id") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const periodicidade = String(formData.get("periodicidade") ?? "mensal") as PlanoManutencao["periodicidade"];
  const proximaExecucao = String(formData.get("proxima_execucao") ?? "").trim();
  const fornecedorId = texto(formData.get("fornecedor_id"));
  const contratoId = texto(formData.get("contrato_id"));
  const antecedencia = Number.parseInt(String(formData.get("antecedencia_alerta_dias") ?? "14"), 10);
  if (!ativoId || !titulo || !proximaExecucao) return { error: "Ativo, título e próxima execução são obrigatórios." };
  if (!PERIODICIDADES.includes(periodicidade)) return { error: "Periodicidade inválida." };
  if (!Number.isInteger(antecedencia) || antecedencia < 1 || antecedencia > 90) return { error: "A antecedência deve estar entre 1 e 90 dias." };
  const relacoes = await Promise.all([
    pertenceAoTenant("ativos_manutencao", ativoId, ctx.tenant.id),
    pertenceAoTenant("fornecedores", fornecedorId, ctx.tenant.id),
    pertenceAoTenant("contratos", contratoId, ctx.tenant.id),
  ]);
  if (relacoes.some((valor) => !valor)) return { error: "Uma relação não pertence a este condomínio." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("planos_manutencao").insert({
    tenant_id: ctx.tenant.id, ativo_id: ativoId, fornecedor_id: fornecedorId, contrato_id: contratoId,
    titulo, periodicidade, proxima_execucao: proximaExecucao, antecedencia_alerta_dias: antecedencia,
    instrucoes: texto(formData.get("instrucoes")), criado_por: ctx.user.id,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Não foi possível criar o plano." };
  revalidatePath("/configuracao/manutencao");
  return { success: true, id: data.id };
}

export async function atualizarEstadoTarefaManutencao(tarefaId: string, estado: TarefaManutencao["estado"]): Promise<ManutencaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!["agendada", "em_curso", "cancelada"].includes(estado)) return { error: "Use a conclusão formal para encerrar uma tarefa." };
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas_manutencao").update({ estado }).eq("id", tarefaId).eq("tenant_id", ctx.tenant.id).in("estado", ["planeada", "agendada", "em_curso"]);
  if (error) return { error: error.message };
  revalidatePath("/configuracao/manutencao");
  return { success: true };
}

export async function concluirTarefaManutencao(tarefaId: string, dataConclusao: string, observacoes?: string): Promise<ManutencaoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." };
  if (!dataConclusao) return { error: "Indique a data de conclusão." };
  const supabase = await createClient();
  const { data: tarefa } = await supabase.from("tarefas_manutencao").select("id, plano_id, data_planeada, planos_manutencao(periodicidade, proxima_execucao)").eq("id", tarefaId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (!tarefa) return { error: "Tarefa não encontrada." };
  const { error } = await supabase.from("tarefas_manutencao").update({ estado: "concluida", data_conclusao: dataConclusao, observacoes: observacoes?.trim() || null, concluida_por: ctx.user.id }).eq("id", tarefaId).eq("tenant_id", ctx.tenant.id).in("estado", ["planeada", "agendada", "em_curso"]);
  if (error) return { error: error.message };
  const plano = tarefa.planos_manutencao as unknown as Pick<PlanoManutencao, "periodicidade" | "proxima_execucao"> | null;
  if (plano?.periodicidade && plano.periodicidade !== "pontual") {
    await supabase.from("planos_manutencao").update({ ultima_execucao: dataConclusao, proxima_execucao: proximaData(tarefa.data_planeada, plano.periodicidade) }).eq("id", tarefa.plano_id).eq("tenant_id", ctx.tenant.id);
  } else if (plano) {
    await supabase.from("planos_manutencao").update({ ultima_execucao: dataConclusao, estado: "terminado" }).eq("id", tarefa.plano_id).eq("tenant_id", ctx.tenant.id);
  }
  revalidatePath("/configuracao/manutencao");
  revalidatePath("/configuracao/financeiro");
  return { success: true };
}
