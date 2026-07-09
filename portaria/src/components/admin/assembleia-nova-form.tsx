"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarAssembleia,
  type AssembleiaFormState,
} from "@/lib/actions/assembleias";

export function AssembleiaNovaForm() {
  const [state, formAction, pending] = useActionState<AssembleiaFormState, FormData>(
    criarAssembleia,
    {}
  );

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}
      <div>
        <label htmlFor="titulo" className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
          Título
        </label>
        <input id="titulo" name="titulo" required maxLength={200}
          placeholder="Assembleia Geral Ordinária 2026"
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige" />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
        )}
      </div>
      <div>
        <label htmlFor="tipo" className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
          Tipo
        </label>
        <select id="tipo" name="tipo" defaultValue="ordinaria"
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige">
          <option value="ordinaria">Ordinária</option>
          <option value="extraordinaria">Extraordinária</option>
        </select>
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A criar..." : "Criar assembleia"}
        </button>
        <Link href="/configuracao/assembleias"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
