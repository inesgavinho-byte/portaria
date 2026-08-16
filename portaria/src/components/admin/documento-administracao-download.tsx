"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { gerarLinkDownloadDocumentoAdministracao } from "@/lib/actions/documentos-administracao";

export function DocumentoAdministracaoDownload({ documentoId }: { documentoId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    const result = await gerarLinkDownloadDocumentoAdministracao(documentoId);
    if (result.error || !result.url) {
      setError(result.error ?? "Erro");
      setLoading(false);
      setTimeout(() => setError(null), 3000);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
    setLoading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-widest text-warmBeige transition-colors hover:text-oliveGray disabled:opacity-50"
    >
      {loading ? <><Loader2 className="h-3 w-3 animate-spin" />A gerar...</> : error ? <span className="text-alert">{error}</span> : <><Download className="h-3 w-3" />Descarregar</>}
    </button>
  );
}
