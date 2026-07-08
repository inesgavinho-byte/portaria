"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarOcorrencia,
  type OcorrenciaFormState,
} from "@/lib/actions/ocorrencias";
import {
  CATEGORIA_LABEL,
  CATEGORIAS,
  FOTOS_MAX,
  FOTO_MAX_MB,
} from "@/lib/ocorrencias";

interface OcorrenciaFormProps {
  /** Fração do membership do utilizador, se existir (ex.: "3.º Direito"). */
  fracao: string | null;
}

export function OcorrenciaForm({ fracao }: OcorrenciaFormProps) {
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
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {CATEGORIA_LABEL[categoria]}
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
          htmlFor="descricao"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          rows={6}
          maxLength={5000}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="Descreva o que observou: onde, desde quando, com que gravidade."
        />
        {state.fieldErrors?.descricao && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.descricao}
          </p>
        )}
      </div>

      {fracao && (
        <label className="flex items-center gap-3 font-body text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            name="associar_fracao"
            className="w-4 h-4 accent-warmBeige"
          />
          Relativa à minha fração ({fracao})
        </label>
      )}

      <div>
        <label
          htmlFor="fotografias"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Fotografias{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">
            (opcional)
          </span>
        </label>
        <input
          id="fotografias"
          name="fotografias"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="w-full file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-warmBeige file:text-paper file:font-body file:text-sm file:tracking-widest file:uppercase hover:file:bg-oliveGray file:transition-colors font-body text-sm text-oliveGray"
        />
        <p className="mt-2 text-xs text-oliveGray font-body">
          Até {FOTOS_MAX} imagens (JPEG, PNG ou WebP), máximo {FOTO_MAX_MB} MB cada.
        </p>
        {state.fieldErrors?.fotografias && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.fotografias}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A enviar..." : "Reportar ocorrência"}
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
