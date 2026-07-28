"use client";

import Link from "next/link";
import type { Votacao } from "@/types/database";
import { VotacaoAdminActions } from "./votacao-admin-actions";

const ESTADO_LABEL: Record<Votacao["estado"], string> = {
  rascunho: "Rascunho",
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

interface VotacoesListaProps {
  votacoes: Array<
    Votacao & {
      votacao_opcoes: { id: string }[];
      votacao_participantes: { votou_em: string | null }[];
    }
  >;
  assembleiaId: string;
}

export function VotacoesLista({ votacoes, assembleiaId }: VotacoesListaProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-title text-h3 text-ink">Votações</h3>
        <Link
          href={`/configuracao/assembleias/${assembleiaId}/votacoes/nova`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          Nova votação
        </Link>
      </div>

      {votacoes.length === 0 ? (
        <p className="font-body text-oliveGray text-sm">
          Ainda não existem votações para esta assembleia.
        </p>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {votacoes.map((v) => {
            const votaram = v.votacao_participantes.filter((p) => p.votou_em).length;
            const total = v.votacao_participantes.length;

            return (
              <div key={v.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-title text-base text-ink truncate">
                      {v.titulo}
                    </h4>
                    <span className={`font-body text-xs uppercase tracking-widest ${ESTADO_COR[v.estado]}`}>
                      {ESTADO_LABEL[v.estado]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-body text-xs text-oliveGray">
                    <span>{v.votacao_opcoes.length} opções</span>
                    {(v.estado === "aberta" || v.estado === "encerrada") && (
                      <span>· {votaram} de {total} votaram</span>
                    )}
                    {v.peso_por_permilagem && <span>· Peso por permilagem</span>}
                  </div>
                </div>
                <VotacaoAdminActions votacao={v} assembleiaId={assembleiaId} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
