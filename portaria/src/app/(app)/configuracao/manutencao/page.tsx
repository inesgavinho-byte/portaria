import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { listarAtivosManutencao, listarOpcoesManutencao, listarPlanosManutencao, listarTarefasManutencao } from "@/lib/actions/manutencao";
import { ManutencaoPreventivaPainel } from "@/components/admin/manutencao-preventiva-painel";

export const metadata = { title: "Manutenção preventiva — Portaria" };

export default async function ManutencaoPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  const [ativos, planos, tarefas, opcoes] = await Promise.all([
    listarAtivosManutencao(),
    listarPlanosManutencao(),
    listarTarefasManutencao(),
    listarOpcoesManutencao(),
  ]);

  return <ManutencaoPreventivaPainel ativos={ativos} planos={planos} tarefas={tarefas} fornecedores={opcoes.fornecedores} contratos={opcoes.contratos} />;
}
