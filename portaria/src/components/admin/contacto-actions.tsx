"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { apagarContacto } from "@/lib/actions/contactos";

export function ContactoActions({ contactoId }: { contactoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      await apagarContacto(contactoId);
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link href={`/contactos/${contactoId}/editar`}
        className="p-2 text-oliveGray hover:text-ink hover:bg-softCream/50 rounded transition-colors"
        title="Editar" aria-label="Editar">
        <Pencil className="w-4 h-4" />
      </Link>
      <button onClick={handleDelete} disabled={isPending}
        className={`p-2 rounded transition-colors disabled:opacity-50 ${
          confirming ? "bg-alert text-paper" : "text-oliveGray hover:text-ink hover:bg-softCream/50"
        }`}
        title={confirming ? "Confirmar" : "Apagar"} aria-label="Apagar">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
