"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { gerarLinkDownload } from "@/lib/actions/documentos";

export function DownloadButton({ documentoId }: { documentoId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    const result = await gerarLinkDownload(documentoId);

    if (result.error || !result.url) {
      setError(result.error ?? "Erro");
      setLoading(false);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Abrir URL assinado em nova janela — Supabase trata o download
    window.open(result.url, "_blank");
    setLoading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 font-body text-xs tracking-widest uppercase text-warmBeige hover:text-oliveGray transition-colors disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          A gerar...
        </>
      ) : error ? (
        <span className="text-alert">{error}</span>
      ) : (
        <>
          <Download className="w-3 h-3" />
          Descarregar
        </>
      )}
    </button>
  );
}
