"use client";

import { useState } from "react";
import { Eye, Loader2, X, FileWarning } from "lucide-react";
import {
  gerarPreviewDocumentoAdministracao,
  type DocumentoAdministracaoPreview,
} from "@/lib/actions/documentos-administracao";

export function DocumentoAdministracaoPreview({ documentoId }: { documentoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DocumentoAdministracaoPreview | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setAberto(true);
    setLoading(true);
    setErro(null);
    const resultado = await gerarPreviewDocumentoAdministracao(documentoId);
    if (resultado.error || !resultado.preview) setErro(resultado.error ?? "Não foi possível abrir o documento.");
    else setPreview(resultado.preview);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-widest text-oliveGray transition-colors hover:text-ink"
      >
        <Eye className="h-3.5 w-3.5" /> Ver
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4" role="dialog" aria-modal="true" aria-label="Pré-visualização de documento">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col bg-paper shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-warmBeige/25 px-5 py-4">
              <div className="min-w-0">
                <p className="font-body text-[11px] uppercase tracking-widest text-oliveGray">Arquivo confidencial</p>
                <h2 className="truncate font-title text-xl text-ink">{preview?.titulo ?? "A preparar visualização"}</h2>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="p-2 text-oliveGray hover:text-ink" aria-label="Fechar visualização">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-softCream/35 p-4">
              {loading && <p className="flex items-center gap-2 font-body text-sm text-oliveGray"><Loader2 className="h-4 w-4 animate-spin" />A preparar visualização segura…</p>}
              {erro && <p className="font-body text-sm text-alert">{erro}</p>}
              {!loading && preview?.tipo === "embed" && preview.url && (
                <iframe src={preview.url} title={preview.titulo} className="h-full min-h-[68vh] w-full border border-warmBeige/30 bg-paper" />
              )}
              {!loading && preview?.tipo === "html" && (
                <article className="prose prose-sm mx-auto max-w-4xl bg-paper p-8 font-body text-ink prose-headings:font-title" dangerouslySetInnerHTML={{ __html: preview.html ?? "" }} />
              )}
              {!loading && preview?.tipo === "tabela" && (
                <div className="space-y-4">
                  <div className="bg-paper p-4 font-body text-sm text-oliveGray">
                    {preview.folhas?.length ? `Folhas: ${preview.folhas.join(" · ")}` : "Folha de cálculo"}
                    {preview.mensagem && <span className="block mt-1 text-xs">{preview.mensagem}</span>}
                  </div>
                  <div className="overflow-auto border border-warmBeige/30 bg-paper">
                    <table className="min-w-full border-collapse font-body text-xs text-ink">
                      <tbody>
                        {(preview.dados ?? []).map((linha, linhaIndex) => (
                          <tr key={linhaIndex} className={linhaIndex === 0 ? "bg-softCream/60 font-medium" : "border-t border-warmBeige/15"}>
                            {linha.map((celula, celulaIndex) => <td key={celulaIndex} className="max-w-64 border-r border-warmBeige/10 px-3 py-2 align-top whitespace-pre-wrap">{celula}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!loading && preview?.tipo === "indisponivel" && (
                <div className="mx-auto max-w-lg bg-paper p-8 text-center">
                  <FileWarning className="mx-auto mb-3 h-7 w-7 text-warmBeige" />
                  <p className="font-body text-sm text-ink">{preview.mensagem}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
