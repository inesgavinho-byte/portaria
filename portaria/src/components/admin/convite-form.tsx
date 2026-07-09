"use client";

import { useActionState } from "react";
import Link from "next/link";
import { convidarMembro, type ConviteFormState } from "@/lib/actions/membros";

const ROLES = [
  { value: "condomino", label: "Condómino" },
  { value: "comissao", label: "Comissão" },
  { value: "admin", label: "Administração" },
];

export function ConviteForm() {
  const [state, formAction, pending] = useActionState<
    ConviteFormState,
    FormData
  >(convidarMembro, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="nome@exemplo.pt"
        />
        {state.fieldErrors?.email && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="fracao"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Fração{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">
              (opcional)
            </span>
          </label>
          <input
            id="fracao"
            name="fracao"
            type="text"
            maxLength={50}
            placeholder="Ex.: 3.º Direito"
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.fracao && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.fracao}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="role"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue="condomino"
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.role && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.role}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A enviar..." : "Enviar convite"}
        </button>
        <Link
          href="/configuracao/membros"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
