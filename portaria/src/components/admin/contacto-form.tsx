"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarContacto,
  atualizarContacto,
  type ContactoFormState,
} from "@/lib/actions/contactos";
import { TIPO_LABEL, TIPOS } from "@/lib/contactos";
import type { Contacto } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function ContactoForm({ contacto }: { contacto?: Contacto }) {
  const isEdit = !!contacto;
  const action = isEdit ? atualizarContacto.bind(null, contacto.id) : criarContacto;
  const [state, formAction, pending] = useActionState<ContactoFormState, FormData>(
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
            defaultValue={contacto?.nome ?? ""} className={inputClass} />
          {state.fieldErrors?.nome && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.nome}</p>
          )}
        </div>
        <div>
          <label htmlFor="tipo" className={labelClass}>Tipo</label>
          <select id="tipo" name="tipo" defaultValue={contacto?.tipo ?? "fornecedor"} className={inputClass}>
            {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="papel" className={labelClass}>Papel / função</label>
          <input id="papel" name="papel" maxLength={100} placeholder="Canalizador, Advogado…"
            defaultValue={contacto?.papel ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="empresa" className={labelClass}>Empresa</label>
          <input id="empresa" name="empresa" maxLength={200}
            defaultValue={contacto?.empresa ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" maxLength={200}
            defaultValue={contacto?.email ?? ""} className={inputClass} />
          {state.fieldErrors?.email && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="telefone" className={labelClass}>Telefone</label>
          <input id="telefone" name="telefone" type="tel" maxLength={30}
            defaultValue={contacto?.telefone ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="notas" className={labelClass}>Notas</label>
        <textarea id="notas" name="notas" rows={3} maxLength={1000}
          defaultValue={contacto?.notas ?? ""} className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar contacto"}
        </button>
        <Link href="/configuracao/contactos"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
