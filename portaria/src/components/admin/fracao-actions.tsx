"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { apagarFracao } from "@/lib/actions/fracoes";

export function FracaoActions({ fracaoId }: { fracaoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await apagarFracao(fracaoId);
      setConfirming(false);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={`/fracoes/${fracaoId}/editar`}
        className="rounded-full p-2 text-oliveGray transition-colors hover:bg-britishGreenSoft hover:text-doorkeeperTurquoise"
        title="Editar"
        aria-label="Editar"
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`rounded-full p-2 transition-colors disabled:opacity-50 ${
          confirming
            ? "bg-alert text-paper"
            : "text-oliveGray hover:bg-doorkeeperTerracotta/10 hover:text-doorkeeperTerracotta"
        }`}
        title={confirming ? "Confirmar eliminação" : "Apagar"}
        aria-label="Apagar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
