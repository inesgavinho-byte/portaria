import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { listarVotacoesPublicas } from "@/lib/actions/votacoes";
import { Vote, ChevronRight } from "lucide-react";
import type { Votacao } from "@/types/database";

const ESTADO_LABEL: Record<Votacao["estado"], string> = {
  rascunho: "Em preparação",
  aberta: "Aberta",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const ESTADO_COR: Record<Votacao["estado"], string> = {
  rascunho: "text-oliveGray",
  aberta: "text-success",
  encerrada: "text-ink",
  cancelada: "text-alert",
};

export default async function VotacoesPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const votacoes = await listarVotacoesPublicas();

  return (
    <div className="max-w-3xl">
      <h1 className="font-title text-h1 text-ink mb-8">Votações</h1>

      {votacoes.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <Vote className="w-8 h-8 text-warmBeige mx-auto mb-4" />
          <p className="font-body text-oliveGray">
            Não existem votações abertas ou encerradas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {votacoes.map((v) => (
            <Link
              key={v.id}
              href={`/votacoes/${v.id}`}
              className="group flex items-center justify-between gap-4 border border-warmBeige/30 bg-paper px-6 py-5 hover:border-warmBeige hover:bg-softCream/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-title text-base text-ink truncate">{v.titulo}</h2>
                  <span className={`font-body text-xs uppercase tracking-widest ${ESTADO_COR[v.estado]}`}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                </div>
                {v.descricao && (
                  <p className="font-body text-sm text-oliveGray truncate">{v.descricao}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-oliveGray shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
