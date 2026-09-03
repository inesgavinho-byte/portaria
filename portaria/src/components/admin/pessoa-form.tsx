"use client";

import { useActionState } from "react";
import { atualizarPessoa, type PessoaFormState } from "@/lib/actions/pessoas";
import type { Pessoa } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function PessoaForm({ pessoa }: { pessoa: Pessoa }) {
  const action = atualizarPessoa.bind(null, pessoa.id);
  const [state, formAction, pending] = useActionState<PessoaFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6 space-y-6">
        <div>
          <label htmlFor="nome" className={labelClass}>Nome</label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            maxLength={200}
            defaultValue={pessoa.nome}
            className={inputClass}
          />
          {state.fieldErrors?.nome && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.nome}</p>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className={labelClass}>E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={200}
              defaultValue={pessoa.email ?? ""}
              className={inputClass}
            />
            {state.fieldErrors?.email && (
              <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="telefone" className={labelClass}>Telefone</label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              maxLength={30}
              defaultValue={pessoa.telefone ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="notas" className={labelClass}>Notas</label>
          <textarea
            id="notas"
            name="notas"
            maxLength={500}
            rows={3}
            defaultValue={pessoa.notas ?? ""}
            className={inputClass}
          />
        </div>
      </section>

      <p className="font-body text-sm text-oliveGray">
        As alterações aos contactos propagam-se às frações onde esta pessoa é
        proprietária vigente.
      </p>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-60"
        >
          {pending ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
