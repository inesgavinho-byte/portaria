import { ESTADO_LABEL } from "@/lib/ocorrencias";
import type { Ocorrencia } from "@/types/database";

const ESTADO_STYLE: Record<Ocorrencia["estado"], string> = {
  novo: "bg-alert/10 text-alert border-alert/30",
  em_curso: "bg-warmBeige/20 text-oliveGray border-warmBeige/40",
  aguarda_fornecedor: "bg-softCream text-oliveGray border-warmBeige/40",
  resolvido: "bg-success/10 text-success border-success/30",
  arquivado: "bg-ink/5 text-oliveGray border-ink/10",
};

export function OcorrenciaEstadoBadge({
  estado,
}: {
  estado: Ocorrencia["estado"];
}) {
  return (
    <span
      className={`${ESTADO_STYLE[estado]} inline-block border font-body text-xs tracking-widest uppercase px-3 py-1 whitespace-nowrap`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
