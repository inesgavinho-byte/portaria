"use client";

import { useState, useTransition } from "react";
import { UserMinus, X } from "lucide-react";
import { removerMembro, anularConvite } from "@/lib/actions/membros";

/**
 * Remoção de membro com confirmação em dois tempos (Design Language P8).
 * O próprio utilizador não vê o botão (isSelf).
 */
export function MembroActions({
  membershipId,
  isSelf,
}: {
  membershipId: string;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isSelf) return null;

  function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      try {
        await removerMembro(membershipId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao remover.");
        setTimeout(() => setErro(null), 4000);
      }
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-3">
      {erro && <span className="font-body text-xs text-alert">{erro}</span>}
      <button
        onClick={handleRemove}
        disabled={isPending}
        className={`p-2 rounded transition-colors disabled:opacity-50 ${
          confirming
            ? "bg-alert text-paper"
            : "text-oliveGray hover:text-ink hover:bg-softCream/50"
        }`}
        title={confirming ? "Confirmar remoção" : "Remover acesso"}
        aria-label="Remover acesso"
      >
        <UserMinus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ConviteActions({ conviteId }: { conviteId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleCancel() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await anularConvite(conviteId);
      setConfirming(false);
    });
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className={`p-2 rounded transition-colors disabled:opacity-50 ${
        confirming
          ? "bg-alert text-paper"
          : "text-oliveGray hover:text-ink hover:bg-softCream/50"
      }`}
      title={confirming ? "Confirmar anulação" : "Anular convite"}
      aria-label="Anular convite"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
