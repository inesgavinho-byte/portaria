"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  CATEGORIAS,
  CONECTORES,
  type Categoria,
  type Conector,
} from "@/lib/integracoes";

export function IntegracoesView() {
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState<Categoria | null>(null);
  const [aberto, setAberto] = useState<Conector | null>(null);

  const filtrados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    return CONECTORES.filter((c) => {
      if (cat && c.categoria !== cat) return false;
      if (q && !`${c.nome} ${c.fornecedor}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [termo, cat]);

  // Agrupa por categoria, preservando a ordem definida
  const grupos = CATEGORIAS.map((categoria) => ({
    categoria,
    itens: filtrados.filter((c) => c.categoria === categoria),
  })).filter((g) => g.itens.length > 0);

  return (
    <div>
      {/* Pesquisa + filtro */}
      <div className="mb-10 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oliveGray" />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Procurar ferramenta…"
            className="w-full pl-11 pr-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip ativo={!cat} onClick={() => setCat(null)}>Todas</Chip>
          {CATEGORIAS.map((c) => (
            <Chip key={c} ativo={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="font-body text-oliveGray">Nenhuma ferramenta corresponde à pesquisa.</p>
      ) : (
        <div className="space-y-12">
          {grupos.map((g) => (
            <section key={g.categoria}>
              <h2 className="font-body text-xs tracking-widest uppercase text-oliveGray mb-4">
                {g.categoria}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {g.itens.map((c) => (
                  <Card key={c.id} conector={c} onConfigurar={() => setAberto(c)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PainelConfigurar conector={aberto} onFechar={() => setAberto(null)} />
    </div>
  );
}

function Card({
  conector,
  onConfigurar,
}: {
  conector: Conector;
  onConfigurar: () => void;
}) {
  return (
    <div className="bg-paper border border-warmBeige/20 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Logo sigla={conector.sigla} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-title text-lg text-ink truncate">{conector.nome}</h3>
          </div>
          <p className="font-body text-xs text-oliveGray">{conector.fornecedor}</p>
        </div>
        <span className="shrink-0 font-body text-[0.65rem] tracking-widest uppercase px-2.5 py-1 border border-ink/10 bg-ink/5 text-oliveGray">
          Por configurar
        </span>
      </div>
      <p className="font-body text-sm text-oliveGray flex-1">{conector.descricao}</p>
      <button
        onClick={onConfigurar}
        className="self-start px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
      >
        Configurar
      </button>
    </div>
  );
}

function Logo({ sigla }: { sigla: string }) {
  return (
    <span
      aria-hidden
      className="shrink-0 w-11 h-11 rounded-lg bg-softCream border border-warmBeige/30 flex items-center justify-center font-title text-warmBeige text-sm"
    >
      {sigla}
    </span>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 border font-body text-xs tracking-widest uppercase transition-colors ${
        ativo
          ? "bg-ink text-paper border-ink"
          : "border-warmBeige/40 text-oliveGray hover:text-ink hover:border-warmBeige"
      }`}
    >
      {children}
    </button>
  );
}

function PainelConfigurar({
  conector,
  onFechar,
}: {
  conector: Conector | null;
  onFechar: () => void;
}) {
  const aberto = !!conector;

  return (
    <>
      {aberto && (
        <div onClick={onFechar} className="fixed inset-0 z-40 bg-ink/30" aria-hidden />
      )}
      <aside
        className={`fixed top-0 right-0 z-50 h-svh w-full max-w-md bg-paper border-l border-warmBeige/20 shadow-[0_0_60px_-20px_rgba(0,0,0,0.4)] transition-transform ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!aberto}
      >
        {conector && (
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between p-6 border-b border-warmBeige/10">
              <div className="flex items-center gap-4">
                <Logo sigla={conector.sigla} />
                <div>
                  <h2 className="font-title text-h3 text-ink">{conector.nome}</h2>
                  <p className="font-body text-xs text-oliveGray">{conector.fornecedor}</p>
                </div>
              </div>
              <button onClick={onFechar} aria-label="Fechar" className="p-1 text-oliveGray hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <p className="font-body text-sm text-oliveGray">{conector.descricao}</p>

              {conector.metodo === "api_key" ? (
                <div>
                  <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
                    Chave de API
                  </label>
                  <input
                    type="password"
                    disabled
                    placeholder="sk-…"
                    className="w-full px-4 py-3 border border-warmBeige/40 bg-softCream/40 font-body text-ink disabled:cursor-not-allowed"
                  />
                  <p className="mt-2 font-body text-xs text-oliveGray">
                    A chave será guardada de forma segura no servidor. (Ainda não ativo.)
                  </p>
                </div>
              ) : (
                <div className="border border-warmBeige/30 bg-softCream/30 p-5 text-center">
                  <p className="font-body text-sm text-ink mb-4">
                    Ligar via {conector.fornecedor} (OAuth).
                  </p>
                  <button
                    disabled
                    className="px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase opacity-50 cursor-not-allowed"
                  >
                    Ligar conta
                  </button>
                  <p className="mt-3 font-body text-xs text-oliveGray">
                    O fluxo de autorização será ativado numa fase seguinte.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-warmBeige/10">
              <p className="font-body text-xs text-oliveGray">
                Estado atual:{" "}
                <span className="tracking-widest uppercase">Por configurar</span>
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
