"use client";

import { useActionState } from "react";
import Link from "next/link";
import { RichEditor } from "./rich-editor";
import {
  criarAviso,
  atualizarAviso,
  type AvisoFormState,
} from "@/lib/actions/avisos";
import type { Aviso } from "@/types/database";

interface AvisoFormProps {
  /**
   * Se fornecido, é edição (pré-preenche e usa atualizarAviso).
   * Se omitido, é criação.
   */
  aviso?: Aviso;
}

export function AvisoForm({ aviso }: AvisoFormProps) {
  const isEdit = !!aviso;

  // Bind do id para a action de update — useActionState recebe sempre
  // (prevState, formData), por isso "fechamos" o id no closure.
  const action = isEdit
    ? atualizarAviso.bind(null, aviso.id)
    : criarAviso;

  const [state, formAction, pending] = useActionState<
    AvisoFormState,
    FormData
  >(action, {});

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
          defaultValue={aviso?.titulo ?? ""}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="Ex.: Inspeção dos elevadores em 18 de maio"
        />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.titulo}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="prioridade"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Prioridade
        </label>
        <select
          id="prioridade"
          name="prioridade"
          defaultValue={aviso?.prioridade ?? "normal"}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        >
          <option value="normal">Normal</option>
          <option value="importante">Importante</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>

      <div>
        <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
          Conteúdo
        </label>
        <RichEditor
          name="conteudo"
          initialContent={aviso?.conteudo ?? ""}
          placeholder="Escreva o aviso aqui..."
        />
        {state.fieldErrors?.conteudo && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.conteudo}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending
            ? "A guardar..."
            : isEdit
            ? "Guardar alterações"
            : "Publicar aviso"}
        </button>
        <Link
          href="/configuracao/avisos"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
