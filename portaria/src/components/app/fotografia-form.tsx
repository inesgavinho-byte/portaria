"use client";

import { useActionState, useRef, useEffect } from "react";
import { ImagePlus } from "lucide-react";
import {
  adicionarFotografias,
  type OcorrenciaFormState,
} from "@/lib/actions/ocorrencias";
import { FOTOS_MAX, FOTO_MAX_MB } from "@/lib/ocorrencias";

/**
 * Formulário compacto para juntar fotografias a uma ocorrência existente.
 * Usado no detalhe do condómino (nas suas ocorrências) e no detalhe admin.
 */
export function FotografiaForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const action = adicionarFotografias.bind(null, ocorrenciaId);
  const [state, formAction, pending] = useActionState<
    OcorrenciaFormState,
    FormData
  >(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o input de ficheiros após submissão bem-sucedida
  useEffect(() => {
    if (!pending && !state.error && !state.fieldErrors) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  const erro = state.error ?? state.fieldErrors?.fotografias;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          name="fotografias"
          type="file"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          aria-label="Fotografias a adicionar"
          className="file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-warmBeige file:text-paper file:font-body file:text-xs file:tracking-widest file:uppercase hover:file:bg-oliveGray file:transition-colors font-body text-xs text-oliveGray"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          {pending ? "A enviar..." : "Adicionar"}
        </button>
      </div>
      <p className="font-body text-xs text-oliveGray">
        Até {FOTOS_MAX} imagens por envio, máximo {FOTO_MAX_MB} MB cada.
      </p>
      {erro && <p className="font-body text-sm text-alert">{erro}</p>}
    </form>
  );
}
