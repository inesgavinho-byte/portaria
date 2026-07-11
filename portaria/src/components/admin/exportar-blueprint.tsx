"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FileDown, Check } from "lucide-react";
import {
  exportarBlueprintPdf,
  type ExportarState,
} from "@/lib/actions/blueprints";

export function ExportarBlueprint({
  blueprintId,
  numero,
  assunto,
}: {
  blueprintId: string;
  numero?: string | null;
  assunto?: string | null;
}) {
  const action = exportarBlueprintPdf.bind(null, blueprintId);
  const [state, formAction, pending] = useActionState<ExportarState, FormData>(
    action,
    {}
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <input type="hidden" name="numero" value={numero ?? ""} />
        <input type="hidden" name="assunto" value={assunto ?? ""} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          <FileDown className="w-3.5 h-3.5" />
          {pending ? "A gerar…" : "Exportar PDF"}
        </button>
      </form>

      {state.error && (
        <p className="font-body text-sm text-alert">{state.error}</p>
      )}

      {state.documentoId && (
        <div className="flex items-center gap-2 border-l-4 border-success bg-success/5 px-3 py-2">
          <Check className="w-4 h-4 text-success shrink-0" />
          <p className="font-body text-sm text-ink">
            PDF guardado em{" "}
            <Link
              href="/documentos?cat=circular"
              className="text-warmBeige hover:text-oliveGray underline"
            >
              Documentos
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
