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
const opcional = (
  <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
);

export function ContratoForm({
  contrato,
  fornecedores,
}: {
  contrato?: Contrato;
  fornecedores: { id: string; nome: string }[];
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
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="titulo" className={labelClass}>Título</label>
          <input id="titulo" name="titulo" required maxLength={200}
            placeholder="Manutenção de elevadores" defaultValue={contrato?.titulo ?? ""} className={inputClass} />
          {state.fieldErrors?.titulo && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
          )}
        </div>
        <div>
          <label htmlFor="referencia" className={labelClass}>Referência {opcional}</label>
          <input id="referencia" name="referencia" maxLength={100}
            defaultValue={contrato?.referencia ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="fornecedor_id" className={labelClass}>Fornecedor {opcional}</label>
        <select id="fornecedor_id" name="fornecedor_id" defaultValue={contrato?.fornecedor_id ?? ""} className={inputClass}>
          <option value="">Nenhum</option>
          {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        {fornecedores.length === 0 && (
          <p className="mt-2 font-body text-xs text-oliveGray">
            Ainda não há fornecedores. Crie-os em Fornecedores.
          </p>
        )}
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
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="valor" className={labelClass}>Valor (€) {opcional}</label>
          <input id="valor" name="valor" type="text" inputMode="decimal"
            defaultValue={contrato?.valor ?? ""} className={inputClass} />
          {state.fieldErrors?.valor && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.valor}</p>
          )}
        </div>
        <div>
          <label htmlFor="valor_anual" className={labelClass}>Valor anual (€) {opcional}</label>
          <input id="valor_anual" name="valor_anual" type="text" inputMode="decimal"
            defaultValue={contrato?.valor_anual ?? ""} className={inputClass} />
        </div>
      </div>
      <label className="flex items-center gap-3 font-body text-sm text-ink cursor-pointer">
        <input type="checkbox" name="renovacao_automatica"
          defaultChecked={contrato?.renovacao_automatica ?? false}
          className="w-4 h-4 accent-warmBeige" />
        Renovação automática
      </label>
      <div>
        <label htmlFor="descricao" className={labelClass}>Descrição {opcional}</label>
        <textarea id="descricao" name="descricao" rows={3}
          defaultValue={contrato?.descricao ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="notas_internas" className={labelClass}>
          Notas internas {opcional}
        </label>
        <textarea id="notas_internas" name="notas_internas" rows={3}
          placeholder="Visível apenas à administração."
          defaultValue={contrato?.notas_internas ?? ""} className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar contrato"}
        </button>
        <Link href={isEdit ? `/contratos/${contrato.id}` : "/contratos"}
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
