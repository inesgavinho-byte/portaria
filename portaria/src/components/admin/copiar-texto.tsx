"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopiarTexto({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem acesso à área de transferência — ignora em silêncio.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? "Copiado" : "Copiar texto"}
    </button>
  );
}
