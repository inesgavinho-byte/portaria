import type {
  OcorrenciaEstado,
  OcorrenciaCategoria,
} from "@/types/database";

export const OCORRENCIA_ESTADO_LABEL: Record<OcorrenciaEstado, string> = {
  novo: "Novo",
  em_curso: "Em curso",
  aguarda_fornecedor: "Aguarda fornecedor",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

export const OCORRENCIA_CATEGORIA_LABEL: Record<OcorrenciaCategoria, string> = {
  infiltracao: "Infiltração",
  elevador: "Elevador",
  ruido: "Ruído",
  limpeza: "Limpeza",
  iluminacao: "Iluminação",
  porta: "Porta",
  esclarecimento: "Esclarecimento",
  outro: "Outro",
};

const ESTADO_STYLES: Record<OcorrenciaEstado, string> = {
  novo: "bg-ink text-paper",
  em_curso: "bg-oliveGray text-paper",
  aguarda_fornecedor: "bg-warmBeige text-paper",
  resolvido: "bg-success text-paper",
  arquivado: "bg-warmBeige/30 text-oliveGray",
};

export function EstadoBadge({ estado }: { estado: OcorrenciaEstado }) {
  return (
    <span
      className={`${ESTADO_STYLES[estado]} font-body text-xs tracking-widest uppercase px-3 py-1 whitespace-nowrap`}
    >
      {OCORRENCIA_ESTADO_LABEL[estado]}
    </span>
  );
}
