"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarFornecedor,
  atualizarFornecedor,
  type FornecedorFormState,
} from "@/lib/actions/fornecedores";
import { CATEGORIAS_FORNECEDOR } from "@/lib/fornecedores";
import type { Fornecedor } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function FornecedorForm({ fornecedor }: { fornecedor?: Fornecedor }) {
  const isEdit = !!fornecedor;
  const action = isEdit
    ? atualizarFornecedor.bind(null, fornecedor.id)
    : criarFornecedor;
  const [state, formAction, pending] = useActionState<FornecedorFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="nome" className={labelClass}>Nome</label>
          <input id="nome" name="nome" required maxLength={200}
            defaultValue={fornecedor?.nome ?? ""} className={inputClass} />
          {state.fieldErrors?.nome && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.nome}</p>
          )}
        </div>
        <div>
          <label htmlFor="categoria" className={labelClass}>Categoria</label>
          <select id="categoria" name="categoria"
            defaultValue={fornecedor?.categoria ?? "Outros"} className={inputClass}>
            {CATEGORIAS_FORNECEDOR.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contacto_nome" className={labelClass}>Responsável</label>
          <input id="contacto_nome" name="contacto_nome" maxLength={200}
            defaultValue={fornecedor?.contacto_nome ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="telefone" className={labelClass}>Telefone</label>
          <input id="telefone" name="telefone" type="tel" maxLength={30}
            defaultValue={fornecedor?.telefone ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" maxLength={200}
            defaultValue={fornecedor?.email ?? ""} className={inputClass} />
          {state.fieldErrors?.email && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="nif" className={labelClass}>NIF</label>
          <input id="nif" name="nif" maxLength={20}
            defaultValue={fornecedor?.nif ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="morada" className={labelClass}>Morada</label>
        <input id="morada" name="morada" maxLength={300}
          defaultValue={fornecedor?.morada ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="notas" className={labelClass}>Notas</label>
        <textarea id="notas" name="notas" rows={3} maxLength={1000}
          defaultValue={fornecedor?.notas ?? ""} className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar fornecedor"}
        </button>
        <Link href={isEdit ? `/fornecedores/${fornecedor.id}` : "/fornecedores"}
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
