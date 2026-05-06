"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { apagarDocumento } from "@/lib/actions/documentos";

export function DocumentoActions({ documentoId }: { documentoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await apagarDocumento(documentoId);
      setConfirming(false);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`p-2 rounded transition-colors disabled:opacity-50 ${
        confirming
          ? "bg-alert text-paper"
          : "text-oliveGray hover:text-ink hover:bg-softCream/50"
      }`}
      title={confirming ? "Confirmar apagar" : "Apagar"}
      aria-label="Apagar"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
