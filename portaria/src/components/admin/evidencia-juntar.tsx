"use client";

import { useActionState, useState } from "react";
import { Link2, Quote, Trash2, X } from "lucide-react";
import {
  juntarEvidencia,
  removerEvidencia,
  type EvidenciaFormState,
} from "@/lib/actions/dossier-evidencias";

export type DocumentoEscolha = { id: string; titulo: string; categoria: string };

const PAPEL_LABEL = {
  primaria: "Primária — o documento afirma-o",
  corroboracao: "Corroboração — reforça a afirmação",
  contradicao: "Contradição — contraria a afirmação",
} as const;

/**
 * Junta um documento do arquivo a um acontecimento, como evidência.
 *
 * A citação é obrigatória por desenho. Uma evidência sem citação é uma
 * remissão para um ficheiro; com citação é a passagem exacta que sustenta —
 * ou contraria — o que o acontecimento afirma. É essa exigência que permite
 * ler o dossiê sem reabrir os anexos.
 */
export function EvidenciaJuntar({
  eventoId,
  redirectTo,
  documentos,
}: {
  eventoId: string;
  redirectTo: string;
  documentos: DocumentoEscolha[];
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<EvidenciaFormState, FormData>(
    juntarEvidencia,
    {},
  );

  const campo =
    "w-full rounded-lg border border-britishGreen/15 bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none";
  const etiqueta =
    "mb-1.5 block font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray";

  if (documentos.length === 0) {
    return (
      <p className="font-body text-[0.7rem] italic text-oliveGray">
        Junte documentos ao arquivo para os poder citar aqui.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-britishGreen/20 px-2.5 py-1.5 font-body text-[0.7rem] font-semibold text-britishGreen transition-colors hover:bg-britishGreen/5"
      >
        {aberto ? <X className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
        {aberto ? "Cancelar" : "Juntar evidência"}
      </button>

      {aberto && (
        <form action={formAction} className="mt-3 rounded-xl border border-britishGreen/15 bg-white/60 p-4">
          <input type="hidden" name="evento_id" value={eventoId} />
          <input type="hidden" name="redirect_to" value={redirectTo} />

          {state.error && <p className="mb-3 font-body text-xs text-alert">{state.error}</p>}
          {state.ok && (
            <p className="mb-3 font-body text-xs text-britishGreen">Evidência juntada.</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={etiqueta} htmlFor={`ev-doc-${eventoId}`}>
                Documento do arquivo
              </label>
              <select id={`ev-doc-${eventoId}`} name="documento_id" required className={campo}>
                <option value="">Escolher…</option>
                {documentos.map((documento) => (
                  <option key={documento.id} value={documento.id}>
                    {documento.titulo}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.documento && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.documento}</p>
              )}
            </div>

            <div>
              <label className={etiqueta} htmlFor={`ev-papel-${eventoId}`}>
                Papel
              </label>
              <select
                id={`ev-papel-${eventoId}`}
                name="papel"
                defaultValue="primaria"
                className={campo}
              >
                {Object.entries(PAPEL_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={etiqueta} htmlFor={`ev-loc-${eventoId}`}>
                Localizador
              </label>
              <input
                id={`ev-loc-${eventoId}`}
                name="localizador"
                maxLength={240}
                placeholder="Ex.: email de 04-09-2025, 23:01 — ou pág. 5/8"
                className={campo}
              />
            </div>

            <div className="md:col-span-2">
              <label className={etiqueta} htmlFor={`ev-cit-${eventoId}`}>
                Citação <span className="normal-case tracking-normal">(obrigatória)</span>
              </label>
              <textarea
                id={`ev-cit-${eventoId}`}
                name="citacao"
                rows={3}
                required
                maxLength={2000}
                placeholder="A passagem exacta do documento que sustenta ou contraria a afirmação."
                className={campo}
              />
              {state.fieldErrors?.citacao && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.citacao}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-60"
          >
            <Quote className="h-3.5 w-3.5" />
            {pending ? "A juntar…" : "Juntar"}
          </button>
        </form>
      )}
    </div>
  );
}

export function EvidenciaRemover({
  evidenciaId,
  redirectTo,
}: {
  evidenciaId: string;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState<EvidenciaFormState, FormData>(
    removerEvidencia,
    {},
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="evidencia_id" value={evidenciaId} />
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <button
        type="submit"
        disabled={pending}
        title={state.error ?? "Remover evidência"}
        className="inline-flex items-center rounded p-1 text-oliveGray transition-colors hover:text-alert disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </form>
  );
}
