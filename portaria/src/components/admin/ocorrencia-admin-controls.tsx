"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  alterarEstadoOcorrencia,
  adicionarNotaInterna,
  type OcorrenciaFormState,
} from "@/lib/actions/ocorrencias";
import { ESTADO_LABEL, ESTADOS } from "@/lib/ocorrencias";
import type { Ocorrencia } from "@/types/database";

/**
 * Controlos de administração no detalhe de uma ocorrência:
 * alterar estado e adicionar nota interna.
 */
export function OcorrenciaAdminControls({
  ocorrencia,
}: {
  ocorrencia: Ocorrencia;
}) {
  return (
    <div className="space-y-8">
      <EstadoForm ocorrencia={ocorrencia} />
      <NotaForm ocorrenciaId={ocorrencia.id} />
    </div>
  );
}

function EstadoForm({ ocorrencia }: { ocorrencia: Ocorrencia }) {
  const action = alterarEstadoOcorrencia.bind(null, ocorrencia.id);
  const [state, formAction, pending] = useActionState<
    OcorrenciaFormState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <label
        htmlFor="estado"
        className="block font-body text-xs tracking-widest uppercase text-oliveGray"
      >
        Alterar estado
      </label>
      <div className="flex items-center gap-3">
        <select
          id="estado"
          name="estado"
          defaultValue={ocorrencia.estado}
          className="flex-1 px-4 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige"
        >
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_LABEL[estado]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A guardar..." : "Guardar"}
        </button>
      </div>
      {state.error && (
        <p className="font-body text-sm text-alert">{state.error}</p>
      )}
    </form>
  );
}

function NotaForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const action = adicionarNotaInterna.bind(null, ocorrenciaId);
  const [state, formAction, pending] = useActionState<
    OcorrenciaFormState,
    FormData
  >(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <label
        htmlFor="nota"
        className="block font-body text-xs tracking-widest uppercase text-oliveGray"
      >
        Nota interna{" "}
        <span className="normal-case tracking-normal text-oliveGray/60">
          (invisível para condóminos)
        </span>
      </label>
      <textarea
        id="nota"
        name="nota"
        required
        rows={3}
        maxLength={2000}
        placeholder="Ex.: Canalizador contactado, aguarda visita na quinta-feira."
        className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
      >
        {pending ? "A guardar..." : "Adicionar nota"}
      </button>
      {state.error && (
        <p className="font-body text-sm text-alert">{state.error}</p>
      )}
    </form>
  );
}
