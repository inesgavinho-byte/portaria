import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { detalheVotacao } from "@/lib/actions/votacoes";
import { VotacaoCondomino } from "@/components/app/votacao-condomino";

export default async function VotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const detalhe = await detalheVotacao(id);
  if (!detalhe) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/votacoes"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Todas as votações
      </Link>

      <h1 className="font-title text-h1 text-ink mb-8">{detalhe.votacao.titulo}</h1>

      <VotacaoCondomino
        votacao={detalhe.votacao}
        opcoes={detalhe.opcoes}
        jaVotou={detalhe.jaVotou}
      />
    </div>
  );
}
