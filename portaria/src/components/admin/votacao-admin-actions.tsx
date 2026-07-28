"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Play, Square, X, Trash2, BarChart3, Pencil } from "lucide-react";
import {
  abrirVotacao,
  encerrarVotacao,
  cancelarVotacao,
  apagarVotacao,
} from "@/lib/actions/votacoes";
import type { Votacao } from "@/types/database";

interface Props {
  votacao: Votacao;
  assembleiaId: string;
}

export function VotacaoAdminActions({ votacao, assembleiaId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleAbrir() {
    startTransition(async () => {
      await abrirVotacao(votacao.id);
    });
  }

  function handleEncerrar() {
    startTransition(async () => {
      await encerrarVotacao(votacao.id);
    });
  }

  function handleCancelar() {
    startTransition(async () => {
      await cancelarVotacao(votacao.id);
    });
  }

  function handleApagar() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      await apagarVotacao(votacao.id);
      setConfirmingDelete(false);
    });
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {votacao.estado === "rascunho" && (
        <>
          <button
            onClick={handleAbrir}
            disabled={isPending}
            className="p-2 text-success hover:text-ink hover:bg-softCream/50 rounded transition-colors disabled:opacity-50"
            title="Abrir votação"
          >
            <Play className="w-4 h-4" />
          </button>
          <Link
            href={`/configuracao/assembleias/${assembleiaId}/votacoes/${votacao.id}/editar`}
            className="p-2 text-oliveGray hover:text-ink hover:bg-softCream/50 rounded transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={handleApagar}
            disabled={isPending}
            className={`p-2 rounded transition-colors disabled:opacity-50 ${
              confirmingDelete
                ? "bg-alert text-paper"
                : "text-oliveGray hover:text-ink hover:bg-softCream/50"
            }`}
            title={confirmingDelete ? "Confirmar apagar" : "Apagar"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}

      {votacao.estado === "aberta" && (
        <>
          <button
            onClick={handleEncerrar}
            disabled={isPending}
            className="p-2 text-ink hover:text-paper hover:bg-ink rounded transition-colors disabled:opacity-50"
            title="Encerrar votação"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelar}
            disabled={isPending}
            className="p-2 text-alert hover:text-paper hover:bg-alert rounded transition-colors disabled:opacity-50"
            title="Cancelar votação"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}

      {votacao.estado === "encerrada" && (
        <Link
          href={`/configuracao/assembleias/${assembleiaId}/votacoes/${votacao.id}/resultados`}
          className="p-2 text-oliveGray hover:text-ink hover:bg-softCream/50 rounded transition-colors"
          title="Ver resultados"
        >
          <BarChart3 className="w-4 h-4" />
        </Link>
      )}

      {votacao.estado === "cancelada" && (
        <button
          onClick={handleApagar}
          disabled={isPending}
          className={`p-2 rounded transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "bg-alert text-paper"
              : "text-oliveGray hover:text-ink hover:bg-softCream/50"
          }`}
          title={confirmingDelete ? "Confirmar apagar" : "Apagar"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
