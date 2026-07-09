import type { Contacto } from "@/types/database";

export const TIPO_LABEL: Record<Contacto["tipo"], string> = {
  fornecedor: "Fornecedor",
  empresa: "Empresa",
  pessoa: "Pessoa",
  outro: "Outro",
};

export const TIPOS = Object.keys(TIPO_LABEL) as Contacto["tipo"][];
