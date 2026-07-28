"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { criarEspaco } from "@/lib/actions/reservas";

async function criarEspacoAction(_prev: unknown, formData: FormData) {
  return criarEspaco(formData);
}

export function EspacoForm() {
  const [state, action, pending] = useActionState(criarEspacoAction, {});

  return (
    <div className="max-w-2xl">
      <Link
        href="/configuracao/reservas"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Reservas
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">Novo espaço comum</h1>
      <p className="font-body text-oliveGray mb-8">
        Configurar um novo espaço reservável.
      </p>

      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3 mb-6">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <form action={action} className="space-y-6">
        <div>
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            Nome
          </label>
          <input
            name="nome"
            required
            className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
          />
        </div>

        <div>
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            Descrição
          </label>
          <textarea
            name="descricao"
            rows={3}
            className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Capacidade
            </label>
            <input
              type="number"
              name="capacidade"
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Reservas/semana
            </label>
            <input
              type="number"
              name="reservas_semana"
              defaultValue={3}
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Duração mínima (min)
            </label>
            <input
              type="number"
              name="duracao_minima"
              defaultValue={60}
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Duração máxima (min)
            </label>
            <input
              type="number"
              name="duracao_maxima"
              defaultValue={120}
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
        </div>

        <div>
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            Antecedência mínima (horas)
          </label>
          <input
            type="number"
            name="antecedencia"
            defaultValue={24}
            className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
          />
        </div>

        {/* Horários */}
        <div className="space-y-3">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">
            Horário de funcionamento
          </p>
          {[
            { dia: "seg", label: "Segunda" },
            { dia: "ter", label: "Terça" },
            { dia: "qua", label: "Quarta" },
            { dia: "qui", label: "Quinta" },
            { dia: "sex", label: "Sexta" },
            { dia: "sab", label: "Sábado" },
            { dia: "dom", label: "Domingo" },
          ].map(({ dia, label }) => (
            <div key={dia} className="grid grid-cols-3 gap-2 items-center">
              <span className="font-body text-sm text-ink">{label}</span>
              <input
                type="time"
                name={`abertura_${dia}`}
                placeholder="Abertura"
                className="px-2 py-1 border border-warmBeige/30 bg-paper font-body text-sm"
              />
              <input
                type="time"
                name={`fecho_${dia}`}
                placeholder="Fecho"
                className="px-2 py-1 border border-warmBeige/30 bg-paper font-body text-sm"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A criar…" : "Criar espaço"}
        </button>
      </form>
    </div>
  );
}
