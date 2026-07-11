"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Loader2 } from "lucide-react";
import { perguntarConselheira, type Fonte } from "@/lib/actions/conhecimento";
import { contextoDaPagina } from "@/lib/ai/sugestoes";

type Troca = {
  pergunta: string;
  resposta: string;
  fontes: Fonte[];
};

/** Ícone da Portaria: um arco (arcada) desenhado em SVG. */
function ArcoPortaria({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M7 27V15a9 9 0 0 1 18 0v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M5 27h22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Conselheira() {
  const pathname = usePathname();
  const { contexto, sugestoes } = contextoDaPagina(pathname);

  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState<Troca[]>([]);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function perguntar(texto: string) {
    const p = texto.trim();
    if (!p || loading) return;
    setLoading(true);
    setAviso(null);
    setPergunta("");
    try {
      const res = await perguntarConselheira(p, contexto);
      if (res.indisponivel) {
        setAviso("A Conselheira ainda não está activa nesta instalação.");
      } else if (res.error) {
        setAviso(res.error);
      } else if (res.resposta) {
        setHistorico((h) => [
          ...h,
          { pergunta: p, resposta: res.resposta!, fontes: res.fontes ?? [] },
        ]);
      }
    } catch {
      setAviso("Não foi possível falar com a Conselheira agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir a Conselheira"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-ink text-paper shadow-lg hover:bg-oliveGray transition-colors"
        >
          {sugestoes.length > 0 && (
            <span className="absolute inset-0 rounded-full bg-warmBeige/50 animate-ping" />
          )}
          <ArcoPortaria className="w-7 h-7 relative" />
        </button>
      )}

      {/* Drawer */}
      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/20"
            onClick={() => setAberto(false)}
          />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-paper border-l border-warmBeige/30 shadow-2xl flex flex-col">
            <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-warmBeige/20">
              <div className="flex items-center gap-3">
                <ArcoPortaria className="w-6 h-6 text-warmBeige" />
                <div>
                  <h2 className="font-title text-lg text-ink leading-none">Conselheira</h2>
                  <p className="font-body text-[11px] tracking-widest uppercase text-oliveGray mt-1">
                    Portaria
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="p-2 text-oliveGray hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Sugestões proactivas do contexto */}
              {historico.length === 0 && (
                <div>
                  <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
                    Sugestões para esta página
                  </p>
                  <div className="space-y-2">
                    {sugestoes.map((s) => (
                      <button
                        key={s}
                        onClick={() => perguntar(s)}
                        disabled={loading}
                        className="block w-full text-left px-4 py-2.5 border border-warmBeige/30 bg-softCream/30 font-body text-sm text-ink hover:border-warmBeige hover:bg-softCream/60 transition-colors disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico da sessão */}
              {historico.map((t, i) => (
                <div key={i} className="space-y-2">
                  <p className="font-body text-sm text-oliveGray">
                    <span className="tracking-widest uppercase text-[11px] text-warmBeige">Pergunta</span>
                    <br />
                    {t.pergunta}
                  </p>
                  <div className="border-l-2 border-warmBeige/40 pl-4">
                    <p className="font-body text-ink whitespace-pre-line">{t.resposta}</p>
                    {t.fontes.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {t.fontes.map((f, j) => (
                          <li key={j} className="font-body text-xs text-oliveGray">
                            {f.fonte ? `${f.fonte} — ${f.titulo}` : f.titulo}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <p className="flex items-center gap-2 font-body text-sm text-oliveGray">
                  <Loader2 className="w-4 h-4 animate-spin" /> A consultar…
                </p>
              )}
              {aviso && <p className="font-body text-sm text-alert">{aviso}</p>}
            </div>

            {/* Campo de pergunta */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perguntar(pergunta);
              }}
              className="border-t border-warmBeige/20 p-4 flex items-center gap-2"
            >
              <input
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Pergunte sobre legislação ou o regulamento…"
                disabled={loading}
                className="flex-1 px-4 py-3 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige"
              />
              <button
                type="submit"
                disabled={loading || !pergunta.trim()}
                aria-label="Perguntar"
                className="p-3 bg-ink text-paper hover:bg-oliveGray transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
