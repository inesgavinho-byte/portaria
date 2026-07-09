"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarConversa, type ConversaFormState } from "@/lib/actions/conversas";

export function ConversaNovaForm({
  ocorrencias,
}: {
  ocorrencias: { id: string; titulo: string }[];
}) {
  const [state, formAction, pending] = useActionState<ConversaFormState, FormData>(
    criarConversa,
    {}
  );
  const inputClass =
    "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
  const labelClass =
    "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}
      <div>
        <label htmlFor="assunto" className={labelClass}>Assunto</label>
        <input id="assunto" name="assunto" required maxLength={200}
          placeholder="Ex.: Infiltração garagem — canalizador" className={inputClass} />
        {state.fieldErrors?.assunto && (
          <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.assunto}</p>
        )}
      </div>
      <div>
        <label htmlFor="ocorrencia_id" className={labelClass}>
          Ligar a uma ocorrência <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
        </label>
        <select id="ocorrencia_id" name="ocorrencia_id" defaultValue="" className={inputClass}>
          <option value="">Nenhuma</option>
          {ocorrencias.map((o) => (
            <option key={o.id} value={o.id}>{o.titulo}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="mensagem" className={labelClass}>
          Primeira nota <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
        </label>
        <textarea id="mensagem" name="mensagem" rows={3} className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A criar..." : "Criar conversa"}
        </button>
        <Link href="/conversas"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
