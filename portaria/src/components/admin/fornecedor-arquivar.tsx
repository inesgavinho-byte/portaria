"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { arquivarFornecedor } from "@/lib/actions/fornecedores";

export function FornecedorArquivar({
  fornecedorId,
  ativo,
}: {
  fornecedorId: string;
  ativo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => arquivarFornecedor(fornecedorId, !ativo))}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
    >
      {ativo ? (
        <><Archive className="w-3.5 h-3.5" /> Arquivar</>
      ) : (
        <><ArchiveRestore className="w-3.5 h-3.5" /> Reativar</>
      )}
    </button>
  );
}
