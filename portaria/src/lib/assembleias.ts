import type { Assembleia } from "@/types/database";

export const TIPO_LABEL: Record<Assembleia["tipo"], string> = {
  ordinaria: "Ordinária",
  extraordinaria: "Extraordinária",
};

export const ESTADO_LABEL: Record<Assembleia["estado"], string> = {
  rascunho: "Rascunho",
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const ESTADOS = Object.keys(ESTADO_LABEL) as Assembleia["estado"][];
