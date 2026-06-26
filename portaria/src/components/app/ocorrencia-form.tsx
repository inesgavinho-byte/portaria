"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarOcorrencia,
  type OcorrenciaFormState,
} from "@/lib/actions/ocorrencias";
import { OCORRENCIA_CATEGORIA_LABEL } from "@/components/app/ocorrencia-badges";
import type { OcorrenciaCategoria } from "@/types/database";

const CATEGORIAS = Object.entries(OCORRENCIA_CATEGORIA_LABEL) as [
  OcorrenciaCategoria,
  string,
][];

type FracaoOption = { id: string; identificacao: string };

export function OcorrenciaForm({ fracoes }: { fracoes: FracaoOption[] }) {
  const [state, formAction, pending] = useActionState<
    OcorrenciaFormState,
    FormData
  >(criarOcorrencia, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="titulo"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          maxLength={200}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="Ex.: Infiltração no teto da garagem"
        />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.titulo}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="categoria"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Categoria
          </label>
          <select
            id="categoria"
            name="categoria"
            required
            defaultValue=""
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {CATEGORIAS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoria && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.categoria}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="fracao_id"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Fração{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">
              (se aplicável)
            </span>
          </label>
          <select
            id="fracao_id"
            name="fracao_id"
            defaultValue=""
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            <option value="">Não associada a uma fração</option>
            {fracoes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.identificacao}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="descricao"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Descrição{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">
            (opcional)
          </span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige resize-none"
          placeholder="Descreva o que se passa, onde e desde quando."
        />
      </div>

      <div>
        <label
          htmlFor="fotos"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Fotografias{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">
            (opcional)
          </span>
        </label>
        <input
          id="fotos"
          name="fotos"
          type="file"
          accept="image/*"
          multiple
          className="w-full file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-warmBeige file:text-paper file:font-body file:text-sm file:tracking-widest file:uppercase hover:file:bg-oliveGray file:transition-colors font-body text-sm text-oliveGray"
        />
        <p className="mt-2 text-xs text-oliveGray font-body">
          Até 6 imagens, máximo 10 MB cada.
        </p>
        {state.fieldErrors?.fotos && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.fotos}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A submeter..." : "Submeter ocorrência"}
        </button>
        <Link
          href="/ocorrencias"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
