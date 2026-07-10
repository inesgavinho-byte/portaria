"use client";

import { useActionState } from "react";
import {
  atualizarPreferenciaNotificacoes,
  type PreferenciaState,
} from "@/lib/actions/notificacoes";

export function NotificacoesForm({ inicial }: { inicial: boolean }) {
  const [state, formAction, pending] = useActionState<PreferenciaState, FormData>(
    atualizarPreferenciaNotificacoes,
    {}
  );

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}
      {state.ok && (
        <div className="border-l-4 border-success bg-success/5 px-4 py-3">
          <p className="font-body text-sm text-success">Preferência guardada.</p>
        </div>
      )}

      <label className="flex items-start gap-3 font-body text-ink cursor-pointer border border-warmBeige/30 p-5">
        <input
          type="checkbox"
          name="notificacoes_email"
          defaultChecked={inicial}
          className="w-4 h-4 accent-warmBeige mt-0.5"
        />
        <span>
          <span className="block text-ink">Receber notificações por email</span>
          <span className="block font-body text-sm text-oliveGray mt-1">
            Novas ocorrências e atualizações relevantes chegam ao seu email.
            Pode desligar a qualquer momento.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
      >
        {pending ? "A guardar..." : "Guardar preferência"}
      </button>
    </form>
  );
}
