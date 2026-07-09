"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarContrato,
  atualizarContrato,
  type ContratoFormState,
} from "@/lib/actions/contratos";
import type { Contrato } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function ContratoForm({
  contrato,
  contactos,
}: {
  contrato?: Contrato;
  contactos: { id: string; nome: string }[];
}) {
  const isEdit = !!contrato;
  const action = isEdit ? atualizarContrato.bind(null, contrato.id) : criarContrato;
  const [state, formAction, pending] = useActionState<ContratoFormState, FormData>(
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
      <div>
        <label htmlFor="titulo" className={labelClass}>Título</label>
        <input id="titulo" name="titulo" required maxLength={200}
          placeholder="Manutenção de elevadores" defaultValue={contrato?.titulo ?? ""} className={inputClass} />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
        )}
      </div>
      <div>
        <label htmlFor="contacto_id" className={labelClass}>
          Fornecedor <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
        </label>
        <select id="contacto_id" name="contacto_id" defaultValue={contrato?.contacto_id ?? ""} className={inputClass}>
          <option value="">Nenhum</option>
          {contactos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="data_inicio" className={labelClass}>Início</label>
          <input id="data_inicio" name="data_inicio" type="date"
            defaultValue={contrato?.data_inicio ?? ""} className={inputClass} />
          {state.fieldErrors?.data_inicio && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.data_inicio}</p>
          )}
        </div>
        <div>
          <label htmlFor="data_fim" className={labelClass}>Fim / renovação</label>
          <input id="data_fim" name="data_fim" type="date"
            defaultValue={contrato?.data_fim ?? ""} className={inputClass} />
          {state.fieldErrors?.data_fim && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.data_fim}</p>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 items-end">
        <div>
          <label htmlFor="valor" className={labelClass}>
            Valor (€) <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
          </label>
          <input id="valor" name="valor" type="text" inputMode="decimal"
            defaultValue={contrato?.valor ?? ""} className={inputClass} />
          {state.fieldErrors?.valor && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.valor}</p>
          )}
        </div>
        <label className="flex items-center gap-3 font-body text-sm text-ink cursor-pointer py-3">
          <input type="checkbox" name="renovacao_automatica"
            defaultChecked={contrato?.renovacao_automatica ?? false}
            className="w-4 h-4 accent-warmBeige" />
          Renovação automática
        </label>
      </div>
      <div>
        <label htmlFor="descricao" className={labelClass}>Descrição / notas</label>
        <textarea id="descricao" name="descricao" rows={3}
          defaultValue={contrato?.descricao ?? ""} className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar contrato"}
        </button>
        <Link href="/configuracao/contratos"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
