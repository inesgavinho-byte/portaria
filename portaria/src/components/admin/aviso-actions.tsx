"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { desativarAviso, reativarAviso } from "@/lib/actions/avisos";
import type { Aviso } from "@/types/database";

export function AvisoActions({ aviso }: { aviso: Aviso }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleArchive() {
    if (!confirming) {
      setConfirming(true);
      // Reset após 3 segundos se utilizador não confirmar
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await desativarAviso(aviso.id);
      setConfirming(false);
    });
  }

  function handleRestore() {
    startTransition(async () => {
      await reativarAviso(aviso.id);
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href={`/configuracao/avisos/${aviso.id}/editar`}
        className="p-2 text-oliveGray hover:text-ink hover:bg-softCream/50 rounded transition-colors"
        title="Editar"
        aria-label="Editar"
      >
        <Pencil className="w-4 h-4" />
      </Link>

      {aviso.ativo ? (
        <button
          onClick={handleArchive}
          disabled={isPending}
          className={`p-2 rounded transition-colors disabled:opacity-50 ${
            confirming
              ? "bg-alert text-paper"
              : "text-oliveGray hover:text-ink hover:bg-softCream/50"
          }`}
          title={confirming ? "Confirmar arquivar" : "Arquivar"}
          aria-label="Arquivar"
        >
          <Archive className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="p-2 text-oliveGray hover:text-ink hover:bg-softCream/50 rounded transition-colors disabled:opacity-50"
          title="Restaurar"
          aria-label="Restaurar"
        >
          <ArchiveRestore className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
