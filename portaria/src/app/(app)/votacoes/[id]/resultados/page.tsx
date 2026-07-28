import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { resultadosVotacao } from "@/lib/actions/votacoes";

export default async function ResultadosVotacaoPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const { resultado, error } = await resultadosVotacao(id);
  if (error || !resultado) notFound();

  const { votacao, opcoes, totalVotos, totalParticipantes, quorumAtingido, quorumNecessario } = resultado;
  const participacao = totalParticipantes > 0 ? Math.round((totalVotos / totalParticipantes) * 1000) / 10 : 0;

  return (
    <div className="max-w-2xl">
      <Link
        href="/votacoes"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Todas as votações
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">{votacao.titulo}</h1>
      <p className="font-body text-oliveGray mb-8">Resultados da votação</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-paper border border-warmBeige/20 p-4 text-center">
          <p className="font-title text-2xl text-ink">{totalVotos}</p>
          <p className="font-body text-xs text-oliveGray uppercase tracking-widest">Votos</p>
        </div>
        <div className="bg-paper border border-warmBeige/20 p-4 text-center">
          <p className="font-title text-2xl text-ink">{participacao}%</p>
          <p className="font-body text-xs text-oliveGray uppercase tracking-widest">Participação</p>
        </div>
        <div className="bg-paper border border-warmBeige/20 p-4 text-center">
          <p className={`font-title text-2xl ${quorumAtingido ? "text-success" : "text-alert"}`}>
            {quorumAtingido ? "Sim" : "Não"}
          </p>
          <p className="font-body text-xs text-oliveGray uppercase tracking-widest">Quórum</p>
        </div>
      </div>

      <p className="font-body text-sm text-oliveGray mb-6">
        Tipo de quórum: {quorumNecessario}
      </p>

      <div className="space-y-4">
        {opcoes.map((opcao) => {
          const largura = totalVotos > 0 ? (opcao.count / totalVotos) * 100 : 0;
          return (
            <div key={opcao.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-sm text-ink">{opcao.texto}</span>
                <span className="font-body text-sm text-oliveGray">
                  {opcao.count} ({opcao.percentagem}%)
                </span>
              </div>
              <div className="h-8 bg-softCream/30 border border-warmBeige/20">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${largura}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
