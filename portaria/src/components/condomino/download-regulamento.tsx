"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { descarregarRegulamento } from "@/lib/actions/conhecimento";

export function DownloadRegulamento() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await descarregarRegulamento();
      if (res.url) window.open(res.url, "_blank");
      else setErro(res.error ?? "Erro.");
    } catch {
      setErro("Erro ao descarregar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={baixar}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Descarregar PDF
      </button>
      {erro && <p className="font-body text-xs text-alert">{erro}</p>}
    </div>
  );
}
