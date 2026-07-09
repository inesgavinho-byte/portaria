"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarFracao,
  atualizarFracao,
  type FracaoFormState,
} from "@/lib/actions/fracoes";
import type { Fracao } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function FracaoForm({ fracao }: { fracao?: Fracao }) {
  const isEdit = !!fracao;
  const action = isEdit ? atualizarFracao.bind(null, fracao.id) : criarFracao;
  const [state, formAction, pending] = useActionState<FracaoFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-10">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <section className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Campo id="codigo" label="Identificação" erro={state.fieldErrors?.codigo}>
            <input
              id="codigo"
              name="codigo"
              type="text"
              required
              maxLength={50}
              defaultValue={fracao?.codigo ?? ""}
              className={inputClass}
              placeholder="3.º Dto"
            />
          </Campo>
          <Campo id="piso" label="Piso">
            <input
              id="piso"
              name="piso"
              type="text"
              maxLength={30}
              defaultValue={fracao?.piso ?? ""}
              className={inputClass}
              placeholder="3.º"
            />
          </Campo>
          <Campo id="tipologia" label="Tipologia">
            <input
              id="tipologia"
              name="tipologia"
              type="text"
              maxLength={30}
              defaultValue={fracao?.tipologia ?? ""}
              className={inputClass}
              placeholder="T2"
            />
          </Campo>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Campo
            id="permilagem"
            label="Permilagem"
            erro={state.fieldErrors?.permilagem}
          >
            <input
              id="permilagem"
              name="permilagem"
              type="text"
              inputMode="decimal"
              defaultValue={fracao?.permilagem ?? ""}
              className={inputClass}
              placeholder="38.50"
            />
          </Campo>
          <Campo id="descricao" label="Descrição">
            <input
              id="descricao"
              name="descricao"
              type="text"
              maxLength={300}
              defaultValue={fracao?.descricao ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
      </section>

      <section className="space-y-6 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige">Proprietário</h2>
        <Campo id="proprietario_nome" label="Nome">
          <input
            id="proprietario_nome"
            name="proprietario_nome"
            type="text"
            maxLength={200}
            defaultValue={fracao?.proprietario_nome ?? ""}
            className={inputClass}
          />
        </Campo>
        <div className="grid md:grid-cols-2 gap-6">
          <Campo
            id="proprietario_email"
            label="Email"
            erro={state.fieldErrors?.proprietario_email}
          >
            <input
              id="proprietario_email"
              name="proprietario_email"
              type="email"
              maxLength={200}
              defaultValue={fracao?.proprietario_email ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo id="proprietario_telefone" label="Telefone">
            <input
              id="proprietario_telefone"
              name="proprietario_telefone"
              type="tel"
              maxLength={30}
              defaultValue={fracao?.proprietario_telefone ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
      </section>

      <section className="space-y-6 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige">Inquilino</h2>
        <Campo id="inquilino_nome" label="Nome (se aplicável)">
          <input
            id="inquilino_nome"
            name="inquilino_nome"
            type="text"
            maxLength={200}
            defaultValue={fracao?.inquilino_nome ?? ""}
            className={inputClass}
          />
        </Campo>
      </section>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar fração"}
        </button>
        <Link
          href="/fracoes"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Campo({
  id,
  label,
  erro,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {erro && <p className="mt-2 text-sm text-alert font-body">{erro}</p>}
    </div>
  );
}
