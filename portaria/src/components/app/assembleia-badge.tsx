import { ESTADO_LABEL, TIPO_LABEL } from "@/lib/assembleias";
import type { Assembleia } from "@/types/database";

const ESTADO_STYLE: Record<Assembleia["estado"], string> = {
  rascunho: "bg-ink/5 text-oliveGray border-ink/10",
  agendada: "bg-warmBeige/20 text-oliveGray border-warmBeige/40",
  realizada: "bg-success/10 text-success border-success/30",
  cancelada: "bg-alert/10 text-alert border-alert/30",
};

export function AssembleiaBadge({ estado }: { estado: Assembleia["estado"] }) {
  return (
    <span className={`${ESTADO_STYLE[estado]} inline-block border font-body text-xs tracking-widest uppercase px-3 py-1 whitespace-nowrap`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return "Data por marcar";
  return new Date(iso).toLocaleString("pt-PT", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export { TIPO_LABEL };
