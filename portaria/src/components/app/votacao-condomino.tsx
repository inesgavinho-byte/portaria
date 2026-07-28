"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Votacao, VotacaoOpcao } from "@/types/database";
import { votar, type VotarFormState } from "@/lib/actions/votacoes";

interface Props {
  votacao: Votacao;
  opcoes: VotacaoOpcao[];
  jaVotou: boolean;
}

const ESTADO_LABEL: Record<Votacao["estado"], string> = {
  rascunho: "Em preparação",
  aberta: "Aberta",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const QUORUM_LABEL: Record<Votacao["tipo_quorum"], string> = {
  maioria_simples: "Maioria simples",
  maioria_qualificada: "Maioria qualificada",
  unanimidade: "Unanimidade",
};

export function VotacaoCondomino({ votacao, opcoes, jaVotou }: Props) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VotarFormState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVotar() {
    if (!selecionada) return;
    startTransition(async () => {
      const res = await votar(votacao.id, selecionada);
      setResultado(res);
    });
  }

  if (votacao.estado === "encerrada") {
    return (
      <div className="bg-paper border border-warmBeige/20 p-6">
        <p className="font-body text-oliveGray mb-4">
          Esta votação está encerrada.
        </p>
        <Link
          href={`/votacoes/${votacao.id}/resultados`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          Ver resultados
        </Link>
      </div>
    );
  }

  if (votacao.estado === "cancelada") {
    return (
      <div className="bg-paper border border-warmBeige/20 p-6">
        <p className="font-body text-oliveGray">
          Esta votação foi cancelada.
        </p>
      </div>
    );
  }

  if (jaVotou || resultado?.success) {
    return (
      <div className="bg-softCream/30 border border-warmBeige/20 p-6">
        <h3 className="font-title text-h3 text-success mb-2">Voto registado</h3>
        <p className="font-body text-sm text-oliveGray mb-4">
          O seu voto foi registado de forma anónima.
        </p>
        {resultado?.hash && (
          <div className="bg-paper border border-warmBeige/20 p-4 mb-4">
            <p className="font-body text-xs text-oliveGray mb-1">Hash de verificação (guarde para confirmar):</p>
            <code className="font-mono text-xs text-ink break-all">{resultado.hash}</code>
          </div>
        )}
        <p className="font-body text-xs text-oliveGray">
          Quando a votação for encerrada, poderá ver os resultados aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-body text-xs uppercase tracking-widest text-success">
          {ESTADO_LABEL[votacao.estado]}
        </span>
        <span className="font-body text-xs text-oliveGray">· {QUORUM_LABEL[votacao.tipo_quorum]}</span>
        {votacao.peso_por_permilagem && (
          <span className="font-body text-xs text-oliveGray">· Peso por permilagem</span>
        )}
      </div>

      {votacao.descricao && (
        <p className="font-body text-sm text-oliveGray mb-6">{votacao.descricao}</p>
      )}

      {resultado?.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3 mb-4">
          <p className="font-body text-sm text-alert">{resultado.error}</p>
        </div>
      )}

      <div className="space-y-3">
        {opcoes.map((opcao) => (
          <button
            key={opcao.id}
            onClick={() => setSelecionada(opcao.id)}
            className={`w-full text-left px-6 py-4 border transition-colors font-body text-ink ${
              selecionada === opcao.id
                ? "border-ink bg-softCream/40"
                : "border-warmBeige/40 bg-paper hover:border-warmBeige"
            }`}
          >
            {opcao.texto}
          </button>
        ))}
      </div>

      <button
        onClick={handleVotar}
        disabled={!selecionada || isPending}
        className="mt-6 px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
      >
        {isPending ? "A registar..." : "Confirmar voto"}
      </button>

      <p className="mt-4 font-body text-xs text-oliveGray">
        O voto é anónimo e irreversível. Não é possível alterar depois de confirmado.
      </p>
    </div>
  );
}
