"use client";

import { useActionState, useState } from "react";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { sugerirResolucao } from "@/lib/actions/ia-rag";

interface SugestaoIAProps {
  ocorrenciaId: string;
}

export function SugestaoIA({ ocorrenciaId }: SugestaoIAProps) {
  const [mostrar, setMostrar] = useState(false);

  const [state, action, pending] = useActionState(
    async () => {
      return sugerirResolucao(ocorrenciaId);
    },
    undefined
  );

  return (
    <section className="bg-paper border border-warmBeige/20 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-oliveGray" />
        <h2 className="font-title text-h3 text-warmBeige">Assistente IA</h2>
      </div>

      {!mostrar ? (
        <button
          onClick={() => {
            setMostrar(true);
            // Trigger the action immediately on first reveal
            const form = document.getElementById("sugestao-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-warmBeige/30 font-body text-sm text-oliveGray hover:border-ink hover:text-ink transition-colors"
        >
          <Lightbulb className="w-4 h-4" />
          Pedir sugestão de resolução
        </button>
      ) : (
        <div>
          <form id="sugestao-form" action={action} className="hidden">
            <button type="submit" />
          </form>

          {pending && (
            <div className="flex items-center gap-2 text-oliveGray">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-body text-sm">A analisar ocorrências similares…</span>
            </div>
          )}

          {state?.error && (
            <p className="font-body text-sm text-alert">{state.error}</p>
          )}

          {state?.sugestao && (
            <div className="space-y-4">
              <div className="bg-cream/30 border-l-2 border-oliveGray p-4">
                <p className="font-body text-sm text-ink whitespace-pre-line">
                  {state.sugestao}
                </p>
              </div>

              {state.ocorrenciasRelacionadas && state.ocorrenciasRelacionadas.length > 0 && (
                <div>
                  <p className="font-body text-xs text-oliveGray uppercase tracking-wider mb-2">
                    Ocorrências relacionadas
                  </p>
                  <ul className="space-y-1">
                    {state.ocorrenciasRelacionadas.map((o) => (
                      <li key={o.id} className="font-body text-sm text-ink">
                        · {o.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => action()}
                disabled={pending}
                className="text-xs font-body text-oliveGray hover:text-ink underline transition-colors disabled:opacity-50"
              >
                {pending ? "A gerar…" : "Regenerar sugestão"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
