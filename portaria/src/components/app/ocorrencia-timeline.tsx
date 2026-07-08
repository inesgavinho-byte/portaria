import { ESTADO_LABEL } from "@/lib/ocorrencias";
import type { OcorrenciaEvento } from "@/types/database";

/**
 * Timeline de uma ocorrência.
 *
 * Recebe os eventos já filtrados por RLS: um condómino nunca recebe
 * eventos do tipo 'nota' (política "creators see public eventos"),
 * pelo que este componente pode renderizar tudo o que lhe chega.
 */
export function OcorrenciaTimeline({
  eventos,
}: {
  eventos: OcorrenciaEvento[];
}) {
  if (eventos.length === 0) return null;

  return (
    <ol className="relative border-l border-warmBeige/30 space-y-6 pl-6">
      {eventos.map((evento) => (
        <li key={evento.id} className="relative">
          <span className="absolute -left-[1.85rem] top-1.5 w-2.5 h-2.5 rounded-full bg-warmBeige" />
          <p className="font-body text-sm text-ink">{descreverEvento(evento)}</p>
          {evento.tipo === "nota" && evento.nota && (
            <p className="font-body text-sm text-oliveGray mt-1 border-l-2 border-warmBeige/30 pl-3 whitespace-pre-line">
              {evento.nota}
            </p>
          )}
          <p className="font-body text-xs text-oliveGray mt-1">
            {formatarData(evento.criado_em)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function descreverEvento(evento: OcorrenciaEvento): string {
  switch (evento.tipo) {
    case "criada":
      return "Ocorrência criada";
    case "fotografia":
      return "Fotografia adicionada";
    case "nota":
      return "Nota interna";
    case "estado":
      if (evento.estado_novo === "resolvido") return "Ocorrência resolvida";
      if (evento.estado_novo === "arquivado") return "Ocorrência arquivada";
      return `Estado alterado${
        evento.estado_anterior
          ? ` de ${ESTADO_LABEL[evento.estado_anterior]}`
          : ""
      } para ${evento.estado_novo ? ESTADO_LABEL[evento.estado_novo] : "—"}`;
  }
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
