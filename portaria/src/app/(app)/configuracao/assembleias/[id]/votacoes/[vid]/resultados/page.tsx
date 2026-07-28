import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { resultadosVotacao } from "@/lib/actions/votacoes";

export default async function ResultadosVotacaoPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const { resultado, error } = await resultadosVotacao(vid);
  if (error || !resultado) notFound();

  const { votacao, opcoes, totalVotos, totalParticipantes, quorumAtingido, quorumNecessario } = resultado;
  const participacao = totalParticipantes > 0 ? Math.round((totalVotos / totalParticipantes) * 1000) / 10 : 0;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/configuracao/assembleias/${id}`}
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">{votacao.titulo}</h1>
      <p className="font-body text-oliveGray mb-8">
        Resultados da votação
      </p>

      {/* Estatísticas */}
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

      {/* Gráfico de barras */}
      <div className="space-y-4 mb-10">
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

      {/* Lista de hashes para verificação */}
      <div className="bg-softCream/30 border border-warmBeige/20 p-6">
        <h3 className="font-title text-h3 text-ink mb-4">Verificação de integridade</h3>
        <p className="font-body text-sm text-oliveGray mb-4">
          Cada voto tem um hash único que permite ao votante verificar que o voto foi contado corretamente.
          Os votos são anónimos — não é possível ligar um hash a um condómino específico.
        </p>
        <div className="font-mono text-xs text-oliveGray space-y-1 max-h-48 overflow-y-auto">
          <p className="font-body text-xs text-oliveGray mb-2">
            Total de hashes: {totalVotos}
          </p>
        </div>
      </div>
    </div>
  );
}
