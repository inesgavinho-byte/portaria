import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { AssembleiaEditor } from "@/components/admin/assembleia-editor";
import { VotacoesLista } from "@/components/admin/votacoes-lista";
import type { Assembleia, AssembleiaPonto } from "@/types/database";

export default async function ConfigAssembleiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [
    { data: assembleia },
    { data: pontos },
    { data: votacoes },
  ] = await Promise.all([
    supabase.from("assembleias").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("assembleia_pontos").select("*").eq("assembleia_id", id).order("ordem", { ascending: true }),
    supabase
      .from("votacoes")
      .select("*, votacao_opcoes(id), votacao_participantes(id, votou_em)")
      .eq("assembleia_id", id)
      .eq("tenant_id", ctx.tenant.id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!assembleia) notFound();

  return (
    <div>
      <Link href="/configuracao/assembleias"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Todas as assembleias
      </Link>
      <h1 className="font-title text-h1 text-ink mb-8">{assembleia.titulo}</h1>
      <AssembleiaEditor
        assembleia={assembleia as Assembleia}
        pontos={(pontos ?? []) as AssembleiaPonto[]}
      />
      <div className="mt-12">
        <VotacoesLista votacoes={votacoes ?? []} assembleiaId={id} />
      </div>
    </div>
  );
}
