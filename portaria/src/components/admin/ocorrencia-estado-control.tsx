"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alterarEstadoOcorrencia } from "@/lib/actions/ocorrencias";
import { OCORRENCIA_ESTADO_LABEL } from "@/components/app/ocorrencia-badges";
import type { OcorrenciaEstado } from "@/types/database";

const ESTADOS = Object.entries(OCORRENCIA_ESTADO_LABEL) as [
  OcorrenciaEstado,
  string,
][];

export function OcorrenciaEstadoControl({
  id,
  estadoAtual,
}: {
  id: string;
  estadoAtual: OcorrenciaEstado;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<OcorrenciaEstado>(estadoAtual);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function aplicar() {
    setError(null);
    startTransition(async () => {
      const res = await alterarEstadoOcorrencia(id, estado);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-xs tracking-widest uppercase text-oliveGray">
        Estado
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as OcorrenciaEstado)}
          disabled={pending}
          className="px-4 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige disabled:opacity-50"
        >
          {ESTADOS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={aplicar}
          disabled={pending || estado === estadoAtual}
          className="px-5 py-2 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-40"
        >
          {pending ? "A guardar..." : "Atualizar"}
        </button>
      </div>
      {error && <p className="font-body text-sm text-alert">{error}</p>}
    </div>
  );
}
