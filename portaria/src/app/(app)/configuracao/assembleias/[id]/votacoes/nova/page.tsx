import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { VotacaoNovaForm } from "@/components/admin/votacao-nova-form";

export default async function NovaVotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  return (
    <div>
      <Link
        href={`/configuracao/assembleias/${id}`}
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Nova votação</h1>
      <p className="font-body text-oliveGray mb-8">
        Crie uma votação anónima para a assembleia.
      </p>
      <VotacaoNovaForm assembleiaId={id} />
    </div>
  );
}
